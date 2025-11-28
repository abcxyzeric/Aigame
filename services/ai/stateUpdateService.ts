
import { generateJson, setDebugContext } from '../core/geminiClient';
import { GameState, DynamicStateUpdateResponse, EncyclopediaEntriesUpdateResponse, CharacterStateUpdateResponse } from '../../types';
import { 
    getDynamicStateUpdatePrompt, 
    getEncyclopediaUpdatePrompt, 
    getCharacterStateUpdatePrompt,
    getCategoryNormalizationPrompt,
    getEntityDeduplicationPrompt,
    analyticalCallConfig
} from '../../prompts/analysisPrompts';

export const updateDynamicStateFromNarration = async (gameState: GameState, lastNarration: string): Promise<DynamicStateUpdateResponse | null> => {
    setDebugContext('Phase 2 - Dynamic State Update');
    const { prompt, schema } = getDynamicStateUpdatePrompt(gameState, lastNarration);
    try {
        return await generateJson<DynamicStateUpdateResponse>(prompt, schema, undefined, 'gemini-2.5-flash', analyticalCallConfig);
    } catch (error) {
        console.error("Lỗi khi cập nhật Trạng thái động (Pha 2):", error);
        return null;
    }
};

export const updateEncyclopediaEntriesFromNarration = async (gameState: GameState, lastNarration: string): Promise<EncyclopediaEntriesUpdateResponse | null> => {
    setDebugContext('Phase 2 - Encyclopedia Update');
    const { prompt, schema } = getEncyclopediaUpdatePrompt(gameState, lastNarration);
    try {
        return await generateJson<EncyclopediaEntriesUpdateResponse>(prompt, schema, undefined, 'gemini-2.5-flash', analyticalCallConfig);
    } catch (error) {
        console.error("Lỗi khi cập nhật Bách khoa (Pha 2):", error);
        return null;
    }
};

export const updateCharacterStateFromNarration = async (gameState: GameState, lastNarration: string): Promise<CharacterStateUpdateResponse | null> => {
    setDebugContext('Phase 2 - Character State Update');
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

export const normalizeCategoriesWithAI = async (allEntities: { name: string, customCategory?: string }[]): Promise<{ oldCategory: string, newCategory: string }[]> => {
    const customCategories = [...new Set(allEntities.map(e => e.customCategory).filter(Boolean) as string[])];
    if (customCategories.length === 0) {
        return [];
    }

    setDebugContext('Encyclopedia - Category Normalization');
    const { prompt, schema } = getCategoryNormalizationPrompt(customCategories);
    try {
        const result = await generateJson<{ normalizationMappings: { oldCategory: string, newCategory: string }[] }>(prompt, schema, undefined, 'gemini-2.5-flash', analyticalCallConfig);
        return result.normalizationMappings || [];
    } catch (error) {
        console.error("Lỗi khi chuẩn hóa category bằng AI:", error);
        throw error; // Ném lỗi ra để component có thể xử lý
    }
};

export const deduplicateEntitiesInCategoryWithAI = async (entities: { name: string; id: string }[]): Promise<{ idToDelete: string, idToKeep: string }[]> => {
    if (entities.length < 2) {
        return [];
    }

    setDebugContext('Encyclopedia - Entity Deduplication');
    const { prompt, schema } = getEntityDeduplicationPrompt(entities);
    try {
        const result = await generateJson<{ deduplicationPairs: { idToDelete: string, idToKeep: string }[] }>(prompt, schema, undefined, 'gemini-2.5-flash', analyticalCallConfig);
        return result.deduplicationPairs || [];
    } catch (error) {
        console.error("Lỗi khi gộp trùng lặp thực thể bằng AI:", error);
        throw error; // Ném lỗi ra để component có thể xử lý
    }
};
