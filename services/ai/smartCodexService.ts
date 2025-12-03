
import { generateJson } from '../core/geminiClient';
import { getSmartCodexPrompt } from '../../prompts/smartCodexPrompts';
import { AiPerformanceSettings } from '../../types';

// Cấu hình riêng cho Worker AI: Ưu tiên tốc độ, chi phí thấp, nhưng output JSON chính xác.
const workerAiConfig: Partial<AiPerformanceSettings> = {
    maxOutputTokens: 2048,
    thinkingBudget: 0, // Flash không cần thinking cho task này
    selectedModel: 'gemini-2.5-flash' // Force Flash model
};

export interface SmartCodexResult {
    type: 'Item' | 'Skill' | 'Faction' | 'NPC';
    data: {
        name: string;
        description: string;
        quantity?: number;
        details?: {
            rarity?: string;
            stats?: string;
            effects?: string;
            subType?: string;
        };
        personality?: string;
        tags?: string[];
        customCategory?: string;
    };
    ownerContext: {
        isPlayer: boolean;
        npcName?: string | null;
    };
}

export const createCodexFromCommand = async (command: string): Promise<SmartCodexResult> => {
    const { prompt, schema } = getSmartCodexPrompt(command);
    
    try {
        const result = await generateJson<SmartCodexResult>(
            prompt, 
            schema, 
            "Bạn là một trợ lý nhập liệu game RPG chuyên nghiệp. Nhiệm vụ của bạn là chuyển đổi ngôn ngữ tự nhiên thành dữ liệu JSON cấu trúc.", // System Instruction
            'gemini-2.5-flash', 
            workerAiConfig, 
            1 // Retry 1 lần nếu lỗi
        );
        return result;
    } catch (error) {
        console.error("Lỗi Smart Codex Worker:", error);
        throw error;
    }
};
