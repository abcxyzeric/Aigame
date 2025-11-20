import { GoogleGenAI } from "@google/genai";
import { getSettings } from '../settingsService';
import { SafetySetting, SafetySettingsConfig, AiPerformanceSettings } from '../../types';
import { DEFAULT_AI_PERFORMANCE_SETTINGS } from '../../constants';
import { processNarration } from '../../utils/aiResponseProcessor';

let ai: GoogleGenAI | null = null;
let currentApiKey: string | null = null;
let keyIndex = 0;

function getAiInstance(): GoogleGenAI {
  const { apiKeyConfig } = getSettings();
  const keys = apiKeyConfig.keys.filter(Boolean);

  if (keys.length === 0) {
    throw new Error('Không tìm thấy API Key nào. Vui lòng thêm API Key trong phần Cài đặt.');
  }
  
  // Rotate key
  if (keyIndex >= keys.length) {
    keyIndex = 0;
  }
  const apiKey = keys[keyIndex];
  
  // If the key is the same, reuse the instance. If different, create a new one.
  // We increment keyIndex here so the *next* call that fails will try a new key.
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

    // Try to parse the error message as JSON for specific codes
    try {
        const errorJson = JSON.parse(rawMessage);
        if (errorJson.error && (errorJson.error.code === 429 || errorJson.error.status === 'RESOURCE_EXHAUSTED')) {
            return new Error(
                'Bạn đã vượt quá hạn mức yêu cầu API (Lỗi 429). Vui lòng đợi một lát rồi thử lại. ' +
                'Nếu lỗi này xảy ra thường xuyên, hãy thêm nhiều API key khác nhau trong phần Cài đặt để phân bổ yêu cầu.'
            );
        }
    } catch (e) {
        // Not a JSON error message, proceed with other checks
    }

    // Check if the error is due to a safety block and if the filter is enabled by the user
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
    const activeSafetySettings = safetySettings.enabled ? safetySettings.settings : [];
    const perfSettings = aiPerformanceSettings || DEFAULT_AI_PERFORMANCE_SETTINGS;
    
    const keys = apiKeyConfig.keys.filter(Boolean);
    const MAX_RETRIES = Math.max(keys.length, 3); // At least 3 retries, but enough to cycle all keys.
    let lastError: Error | null = null;
  
    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        const aiInstance = getAiInstance(); // Get a potentially new key on each retry
  
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
            if (i < MAX_RETRIES - 1) await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
            continue; // Retry
        }
  
        const rawText = response.text.trim();
        return rawText; // Success! Return raw text without processing.
  
      } catch (error) {
        console.error(`Error in generate attempt ${i + 1}:`, error);
        lastError = handleApiError(error, safetySettings);
        
        const rawMessage = lastError.message.toLowerCase();
        // Retry on API key issues, rate limits, or resource exhausted errors
        if ((rawMessage.includes('api key') || /429|rate limit|resource_exhausted/.test(rawMessage)) && i < MAX_RETRIES - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            continue; // Retry with next key
        } else {
            throw lastError; // Don't retry for other errors (e.g. safety)
        }
      }
    }
  
    throw lastError || new Error("AI không thể tạo phản hồi sau nhiều lần thử.");
}

export async function generateJson<T>(prompt: string, schema: any, systemInstruction?: string, model: 'gemini-2.5-flash' | 'gemini-2.5-pro' = 'gemini-2.5-flash', overrideConfig?: Partial<AiPerformanceSettings>): Promise<T> {
    const { safetySettings, aiPerformanceSettings, apiKeyConfig } = getSettings();
    const activeSafetySettings = safetySettings.enabled ? safetySettings.settings : [];
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
            if (i < MAX_RETRIES - 1) await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
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
              if (i < MAX_RETRIES - 1) await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
              continue;
            }
            throw e;
        }
  
      } catch (error) {
        console.error(`Error in generateJson attempt ${i + 1}:`, error);
        lastError = handleApiError(error, safetySettings);
        
        const rawMessage = lastError.message.toLowerCase();
        if ((rawMessage.includes('api key') || /429|rate limit|resource_exhausted/.test(rawMessage)) && i < MAX_RETRIES - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            continue;
        } else {
            throw lastError;
        }
      }
    }
  
    throw lastError || new Error("AI không thể tạo phản hồi JSON sau nhiều lần thử.");
}