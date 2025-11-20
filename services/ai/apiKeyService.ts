import { GoogleGenAI } from "@google/genai";
import { getSettings } from '../settingsService';

type KeyValidationResult = 'valid' | 'invalid' | 'rate_limited';

export async function testApiKeys(): Promise<string> {
    const { apiKeyConfig } = getSettings();
    const keys = apiKeyConfig.keys.filter(Boolean);

    if (keys.length === 0) {
        return "Không có API key nào được lưu để kiểm tra.";
    }

    const results: string[] = [];
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const result = await testSingleKey(key);
        switch (result) {
            case 'valid':
                results.push(`Key ${i + 1}: Hợp lệ ✅`);
                break;
            case 'rate_limited':
                results.push(`Key ${i + 1}: Bị giới hạn yêu cầu (Rate Limited) ⚠️`);
                break;
            case 'invalid':
                results.push(`Key ${i + 1}: Không hợp lệ ❌`);
                break;
        }
    }

    return `Kết quả kiểm tra:\n\n${results.join('\n')}`;
}

export async function testSingleKey(key: string): Promise<KeyValidationResult> {
    if (!key || !key.trim()) {
        return 'invalid';
    }
    try {
        const testAi = new GoogleGenAI({ apiKey: key });
        await testAi.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: "test"
        });
        return 'valid';
    } catch (error) {
        console.error("Single key test failed:", error);
        const rawMessage = error instanceof Error ? error.message : String(error);
        try {
            const errorJson = JSON.parse(rawMessage);
            if (errorJson.error && (errorJson.error.code === 429 || errorJson.error.status === 'RESOURCE_EXHAUSTED')) {
                return 'rate_limited';
            }
        } catch (e) {
            // Not a JSON error, or not a rate limit error
        }
        return 'invalid';
    }
}
