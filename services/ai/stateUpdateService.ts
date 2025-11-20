import { generateJson } from '../core/geminiClient';
import { GameState, DynamicStateUpdateResponse, EncyclopediaEntriesUpdateResponse, CharacterStateUpdateResponse, EncyclopediaOptimizationResponse, EncyclopediaData } from '../../types';
import { 
    getDynamicStateUpdatePrompt, 
    getEncyclopediaUpdatePrompt, 
    getCharacterStateUpdatePrompt,
    getOptimizeEncyclopediaPrompt,
    analyticalCallConfig
} from '../../prompts/analysisPrompts';

export const updateDynamicStateFromNarration = async (gameState: GameState, lastNarration: string): Promise<DynamicStateUpdateResponse | null> => {
    const { prompt, schema } = getDynamicStateUpdatePrompt(gameState, lastNarration);
    try {
        return await generateJson<DynamicStateUpdateResponse>(prompt, schema, undefined, 'gemini-2.5-flash', analyticalCallConfig);
    } catch (error) {
        console.error("Lỗi khi cập nhật Trạng thái động (Pha 2):", error);
        return null;
    }
};

export const updateEncyclopediaEntriesFromNarration = async (gameState: GameState, lastNarration: string): Promise<EncyclopediaEntriesUpdateResponse | null> => {
    const { prompt, schema } = getEncyclopediaUpdatePrompt(gameState, lastNarration);
    try {
        return await generateJson<EncyclopediaEntriesUpdateResponse>(prompt, schema, undefined, 'gemini-2.5-flash', analyticalCallConfig);
    } catch (error) {
        console.error("Lỗi khi cập nhật Bách khoa (Pha 2):", error);
        return null;
    }
};

export const updateCharacterStateFromNarration = async (gameState: GameState, lastNarration: string): Promise<CharacterStateUpdateResponse | null> => {
    const { prompt, schema } = getCharacterStateUpdatePrompt(gameState, lastNarration);
    try {
        const response = await generateJson<CharacterStateUpdateResponse>(prompt, schema, undefined, 'gemini-2.5-flash', analyticalCallConfig);
        // Strip tags from new core memories to ensure clean storage and display.
        if (response.newMemories) {
            response.newMemories = response.newMemories.map(mem => mem.replace(/<[^>]*>/g, ''));
        }
        return response;
    } catch (error) {
        console.error("Lỗi khi cập nhật Nhân vật (Pha 2):", error);
        return null;
    }
};

export const optimizeEncyclopediaWithAI = (gameState: GameState): Promise<EncyclopediaOptimizationResponse> => {
    const { encounteredNPCs, encounteredFactions, discoveredEntities, inventory, companions, quests, character } = gameState;
    const { skills } = character;
    const dataToOptimize: EncyclopediaData = { encounteredNPCs, encounteredFactions, discoveredEntities, inventory, companions, quests, skills };
    
    const { prompt, schema } = getOptimizeEncyclopediaPrompt(dataToOptimize);

    return generateJson<EncyclopediaOptimizationResponse>(prompt, schema, undefined, 'gemini-2.5-pro');
};
