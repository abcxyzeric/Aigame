import { GoogleGenAI, HarmCategory, HarmBlockThreshold, type SafetySetting } from "@google/genai";
import { getSettings } from '../settingsService';
import { AiPerformanceSettings, SafetySettingsConfig } from '../../types';
import { DEFAULT_AI_PERFORMANCE_SETTINGS } from '../../constants';
import { processNarration } from '../../utils/aiResponseProcessor';

let ai: GoogleGenAI | null = null;
let currentApiKey: string | null = null;
let keyIndex = 0;

const UNRESTRICTED_SAFETY_SETTINGS: SafetySetting[] = [
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
];

function getAiInstance(): GoogleGenAI {
  const { apiKeyConfig } = getSettings();
  const keys = apiKeyConfig.keys.filter(Boolean);

  if (keys.length === 0) {
    throw new Error('Không tìm thấy API Key nào. Vui lòng thêm API Key trong phần Cài đặt.');
  }
  
  if (keyIndex >= keys.length) {
    keyIndex = 0;
  }
  const apiKey = keys[keyIndex];
  
  if (ai && currentApiKey === apiKey) {
    keyIndex++;
    return ai;
  }

  ai = new GoogleGenAI({ apiKey });
  currentApiKey = apiKey;
  keyIndex++;
  return ai;
}

function handleApiError(error: unknown, safetySettings: SafetySettingsConfig): Error {
    const rawMessage = error instanceof Error ? error.message : String(error);
    console.error('Gemini API Error:', error);

    try {
        const errorJson = JSON.parse(rawMessage);
        if (errorJson.error && (errorJson.error.code === 429 || errorJson.error.status === 'RESOURCE_EXHAUSTED')) {
            return new Error(
                'Bạn đã vượt quá hạn mức yêu cầu API (Lỗi 429/RESOURCE_EXHAUSTED). Vui lòng đợi một lát rồi thử lại.'
            );
        }
    } catch (e) {
        // Not a JSON error message, proceed with other checks
    }

    const isSafetyBlock = /safety/i.test(rawMessage) || /blocked/i.test(rawMessage);
    if (safetySettings.enabled && isSafetyBlock) {
        return new Error("Nội dung của bạn có thể đã bị chặn bởi bộ lọc an toàn. Vui lòng thử lại với nội dung khác hoặc tắt bộ lọc an toàn trong mục Cài Đặt để tạo nội dung tự do hơn.");
    }

    return new Error(`Lỗi từ Gemini API: ${rawMessage}`);
}

function createDetailedErrorFromResponse(candidate: any, safetySettings: SafetySettingsConfig, isJson: boolean): Error {
    const finishReason = candidate?.finishReason;
    const safetyRatings = candidate?.safetyRatings;
    const responseType = isJson ? "JSON" : "";

    switch (finishReason) {
        case 'SAFETY':
            console.error(`Gemini API ${responseType} response blocked due to safety settings.`, { finishReason, safetyRatings });
            let blockDetails = "Lý do: Bộ lọc an toàn.";
            if (safetyRatings && safetyRatings.length > 0) {
                const blockedCategories = safetyRatings.filter((r: any) => r.blocked).map((r: any) => r.category).join(', ');
                if (blockedCategories) {
                    blockDetails += ` Các danh mục bị chặn: ${blockedCategories}.`;
                }
            }
            if (safetySettings.enabled) {
                return new Error(`Phản hồi ${responseType} từ AI đã bị chặn bởi bộ lọc an toàn. Vui lòng thử lại với nội dung khác hoặc tắt bộ lọc an toàn trong mục Cài Đặt. ${blockDetails}`);
            } else {
                return new Error(`Phản hồi ${responseType} từ AI đã bị chặn vì lý do an toàn nội bộ của mô hình, ngay cả khi bộ lọc đã tắt. Điều này có thể xảy ra với nội dung cực kỳ nhạy cảm. Vui lòng điều chỉnh lại hành động. ${blockDetails}`);
            }
        
        case 'MAX_TOKENS':
            return new Error("Phản hồi từ AI đã bị cắt ngắn vì đạt đến giới hạn token tối đa (Max Output Tokens). Bạn có thể tăng giá trị này trong 'Cài đặt > Cài đặt Hiệu suất AI' để nhận được phản hồi dài hơn.");
            
        case 'RECITATION':
             return new Error("Phản hồi từ AI đã bị dừng vì có dấu hiệu lặp lại nội dung từ các nguồn khác. Vui lòng thử lại với một hành động khác để thay đổi hướng câu chuyện.");

        case 'OTHER':
        default:
            const reason = finishReason || 'Không rõ lý do';
            console.error(`Gemini API returned no text. Finish reason: ${reason}`, candidate);
            if (!safetySettings.enabled) {
                return new Error(`Phản hồi ${responseType} từ AI trống. Lý do: ${reason}. Điều này có thể do bộ lọc an toàn nội bộ của mô hình. Nếu bạn đã bật nội dung 18+, hãy thử diễn đạt lại hành động của mình một cách "văn học" hơn để vượt qua bộ lọc.`);
            } else {
                return new Error(`Phản hồi ${responseType} từ AI trống. Lý do kết thúc: ${reason}.`);
            }
    }
}


export async function generate(prompt: string, systemInstruction?: string): Promise<string> {
    const { safetySettings, aiPerformanceSettings, apiKeyConfig } = getSettings();
    const activeSafetySettings = safetySettings.enabled ? safetySettings.settings : UNRESTRICTED_SAFETY_SETTINGS;
    const perfSettings = aiPerformanceSettings || DEFAULT_AI_PERFORMANCE_SETTINGS;
    
    const keys = apiKeyConfig.keys.filter(Boolean);
    const MAX_RETRIES = Math.max(keys.length, 3);
    let lastError: Error | null = null;
  
    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        const aiInstance = getAiInstance();
  
        const response = await aiInstance.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction,
                safetySettings: activeSafetySettings as unknown as SafetySetting[],
                maxOutputTokens: perfSettings.maxOutputTokens,
                thinkingConfig: { thinkingBudget: perfSettings.thinkingBudget }
            }
        });
        
        const candidate = response.candidates?.[0];
  
        if (!response.text) {
            lastError = createDetailedErrorFromResponse(candidate, safetySettings, false);
            console.error(`Gemini API returned no text on attempt ${i + 1}.`, { finishReason: candidate?.finishReason, safetyRatings: candidate?.safetyRatings });
            continue;
        }
  
        return response.text.trim();
  
      } catch (error) {
        console.error(`Error in generate attempt ${i + 1}:`, error);
        lastError = handleApiError(error, safetySettings);
        
        if (i < MAX_RETRIES - 1) {
            const rawMessage = lastError.message.toLowerCase();
            if (/429|rate limit|resource_exhausted|503/.test(rawMessage)) {
                const delay = 1500 * Math.pow(2, i);
                console.warn(`Rate limit/server error on attempt ${i + 1}. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.warn(`Error on attempt ${i + 1}. Trying next key immediately...`);
            }
            continue;
        } else {
            throw lastError;
        }
      }
    }
  
    throw lastError || new Error("AI không thể tạo phản hồi sau nhiều lần thử.");
}

export async function generateJson<T>(prompt: string, schema: any, systemInstruction?: string, model: 'gemini-2.5-flash' | 'gemini-2.5-pro' = 'gemini-2.5-flash', overrideConfig?: Partial<AiPerformanceSettings>): Promise<T> {
    const { safetySettings, aiPerformanceSettings, apiKeyConfig } = getSettings();
    const activeSafetySettings = safetySettings.enabled ? safetySettings.settings : UNRESTRICTED_SAFETY_SETTINGS;
    const perfSettings = aiPerformanceSettings || DEFAULT_AI_PERFORMANCE_SETTINGS;
  
    const keys = apiKeyConfig.keys.filter(Boolean);
    const MAX_RETRIES = Math.max(keys.length, 3);
    let lastError: Error | null = null;
  
    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        const aiInstance = getAiInstance();
        
        const response = await aiInstance.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
                safetySettings: activeSafetySettings as unknown as SafetySetting[],
                maxOutputTokens: overrideConfig?.maxOutputTokens ?? perfSettings.maxOutputTokens,
                thinkingConfig: { thinkingBudget: overrideConfig?.thinkingBudget ?? perfSettings.thinkingBudget }
            }
         });
  
        const candidate = response.candidates?.[0];
        const jsonString = response.text;
  
        if (!jsonString) {
            lastError = createDetailedErrorFromResponse(candidate, safetySettings, true);
            console.error(`Gemini API returned no JSON text on attempt ${i + 1}.`, { finishReason: candidate?.finishReason, safetyRatings: candidate?.safetyRatings });
            continue;
        }
        
        try {
          const parsedJson = JSON.parse(jsonString) as T;
          
          if (typeof parsedJson === 'object' && parsedJson !== null && 'narration' in parsedJson && typeof (parsedJson as any).narration === 'string') {
              (parsedJson as any).narration = processNarration((parsedJson as any).narration);
          }
      
          return parsedJson;
        } catch (e) {
            if (e instanceof SyntaxError) {
              console.error(`JSON Parsing Error on attempt ${i + 1}:`, e);
              console.error('Malformed JSON string from AI:', jsonString);
              lastError = new Error(`Lỗi phân tích JSON từ AI: ${e.message}. Chuỗi nhận được: "${jsonString.substring(0, 100)}..."`);
              continue;
            }
            throw e;
        }
  
      } catch (error) {
        console.error(`Error in generateJson attempt ${i + 1}:`, error);
        lastError = handleApiError(error, safetySettings);
        
        if (i < MAX_RETRIES - 1) {
            const rawMessage = lastError.message.toLowerCase();
            if (/429|rate limit|resource_exhausted|503/.test(rawMessage)) {
                const delay = 1500 * Math.pow(2, i);
                console.warn(`Rate limit/server error on attempt ${i + 1}. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.warn(`Error on attempt ${i + 1}. Trying next key immediately...`);
            }
            continue;
        } else {
            throw lastError;
        }
      }
    }
  
    throw lastError || new Error("AI không thể tạo phản hồi JSON sau nhiều lần thử.");
}

export async function generateEmbedding(text: string): Promise<number[]> {
    const { apiKeyConfig } = getSettings();
    const keys = apiKeyConfig.keys.filter(Boolean);
    if (keys.length === 0) {
        throw new Error('Không có API Key nào được cấu hình để tạo embeddings.');
    }
    const MAX_RETRIES = Math.max(keys.length, 3);
    let lastError: Error | null = null;
    
    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            const aiInstance = getAiInstance(); // Rotates key
            const result = await aiInstance.models.embedContent({
                model: "text-embedding-004",
// FIX: The parameter name for the content to be embedded is 'contents', not 'content'.
                contents: text,
            });
// FIX: The response object contains an array of embeddings under the 'embeddings' property. Since a single string is passed, the result is the first element of this array.
            const embedding = result.embeddings[0];
            if (embedding?.values) {
                return embedding.values;
            }
            throw new Error("API không trả về embedding hợp lệ.");
        } catch (error) {
            console.error(`Error in generateEmbedding attempt ${i + 1}:`, error);
            lastError = handleApiError(error, getSettings().safetySettings);
            
            if (i < MAX_RETRIES - 1) {
                const rawMessage = lastError.message.toLowerCase();
                if (/429|rate limit|resource_exhausted|503/.test(rawMessage)) {
                    const delay = 1500 * Math.pow(2, i);
                    console.warn(`Embedding rate limit/server error on attempt ${i + 1}. Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                continue;
            } else {
                throw lastError;
            }
        }
    }
    throw lastError || new Error("Không thể tạo embedding sau nhiều lần thử.");
}
