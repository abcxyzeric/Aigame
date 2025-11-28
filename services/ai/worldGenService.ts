
import { generate, generateJson } from '../core/geminiClient';
import { WorldConfig, InitialEntity, GameState, CoreEntityType } from '../../types';
import { 
    getGenerateGenrePrompt, 
    getGenerateSettingPrompt, 
    getGenerateWorldFromIdeaPrompt,
    getGenerateFanfictionWorldPrompt,
    getGenerateEntityInfoOnTheFlyPrompt
} from '../../prompts/worldCreationPrompts';
import {
    getGenerateEntityNamePrompt,
    getGenerateEntityPersonalityPrompt,
    getGenerateEntityDescriptionPrompt
} from '../../prompts/entityPrompts';
import { 
    getGenerateFandomSummaryPrompt,
    getExtractArcListFromSummaryPrompt,
    getGenerateFandomGenesisPrompt
} from '../../prompts/fandomPrompts';
import { retrieveRelevantKnowledgeChunks } from './ragService';
// FIX: Import embedding service to generate embeddings for RAG queries.
import * as embeddingService from './embeddingService';
import { detectEntityTypeAndCategory } from '../../utils/textProcessing';

// --- World Creation Screen AI Helpers ---

export const generateGenre = (config: WorldConfig): Promise<string> => {
    const prompt = getGenerateGenrePrompt(config);
    return generate(prompt, undefined, 0);
};

export const generateSetting = (config: WorldConfig): Promise<string> => {
    const prompt = getGenerateSettingPrompt(config);
    return generate(prompt, undefined, 0);
};

export async function generateWorldFromIdea(idea: string, enableMilestoneSystem: boolean, backgroundKnowledge?: {name: string, content: string}[]): Promise<WorldConfig> {
    let knowledgeForGeneration = backgroundKnowledge;
    const KNOWLEDGE_SIZE_THRESHOLD = 50000; // 50KB threshold

    if (backgroundKnowledge && backgroundKnowledge.length > 0) {
        const totalKnowledgeSize = backgroundKnowledge.reduce((acc, file) => acc + (file.content?.length || 0), 0);
        const hasDataset = backgroundKnowledge.some(f => f.name.startsWith('[DATASET]'));

        if (hasDataset && totalKnowledgeSize > KNOWLEDGE_SIZE_THRESHOLD) {
            const [queryEmbedding] = await embeddingService.embedContents([idea]);
            knowledgeForGeneration = await retrieveRelevantKnowledgeChunks(idea, backgroundKnowledge, 7, queryEmbedding);
        }
    }
    
    const { prompt, schema, creativeCallConfig } = getGenerateWorldFromIdeaPrompt(idea, enableMilestoneSystem, knowledgeForGeneration);
    // Tắt retry (0) cho kiến tạo thế giới
    return generateJson<WorldConfig>(prompt, schema, undefined, 'gemini-2.5-pro', creativeCallConfig, 0);
}

export async function generateFanfictionWorld(idea: string, enableMilestoneSystem: boolean, backgroundKnowledge?: {name: string, content: string}[]): Promise<WorldConfig> {
    let knowledgeForGeneration = backgroundKnowledge;
    const KNOWLEDGE_SIZE_THRESHOLD = 50000;

    if (backgroundKnowledge && backgroundKnowledge.length > 0) {
        const totalKnowledgeSize = backgroundKnowledge.reduce((acc, file) => acc + (file.content?.length || 0), 0);
        const hasDataset = backgroundKnowledge.some(f => f.name.startsWith('[DATASET]'));
        
        if (hasDataset && totalKnowledgeSize > KNOWLEDGE_SIZE_THRESHOLD) {
            const [queryEmbedding] = await embeddingService.embedContents([idea]);
            knowledgeForGeneration = await retrieveRelevantKnowledgeChunks(idea, backgroundKnowledge, 7, queryEmbedding);
        }
    }

    const { prompt, schema, creativeCallConfig } = getGenerateFanfictionWorldPrompt(idea, enableMilestoneSystem, knowledgeForGeneration);
    // Tắt retry (0) cho kiến tạo thế giới
    return generateJson<WorldConfig>(prompt, schema, undefined, 'gemini-2.5-pro', creativeCallConfig, 0);
}

// --- Entity Creation AI Helpers ---

export const generateEntityName = (config: WorldConfig, entity: InitialEntity): Promise<string> => {
    const prompt = getGenerateEntityNamePrompt(config, entity);
    return generate(prompt, undefined, 0);
};

export const generateEntityPersonality = (config: WorldConfig, entity: InitialEntity): Promise<string> => {
    const prompt = getGenerateEntityPersonalityPrompt(config, entity);
    return generate(prompt, undefined, 0);
};

export const generateEntityDescription = (config: WorldConfig, entity: InitialEntity): Promise<string> => {
    const prompt = getGenerateEntityDescriptionPrompt(config, entity);
    return generate(prompt, undefined, 0);
};

// --- Fandom Genesis AI ---

export async function generateFandomSummary(workName: string, authorName?: string): Promise<string> {
    const { prompt, systemInstruction } = getGenerateFandomSummaryPrompt(workName, authorName);
    const result = await generate(prompt, systemInstruction, 0);
    if (result.includes('WORK_NOT_FOUND')) {
        throw new Error(`Không tìm thấy thông tin chi tiết về tác phẩm "${workName}"${authorName ? ` (tác giả: ${authorName})` : ''}. Vui lòng kiểm tra lại tên.`);
    }
    return result;
}

export async function extractArcListFromSummary(summaryContent: string): Promise<string[]> {
    const { prompt, schema } = getExtractArcListFromSummaryPrompt(summaryContent);
    const result = await generateJson<{ arcs: string[] }>(prompt, schema, undefined, 'gemini-2.5-flash', undefined, 0);
    return result.arcs || [];
}

export async function generateFandomGenesis(summaryContent: string, arcName: string, workName: string, authorName?: string): Promise<string> {
    const { prompt, systemInstruction, creativeCallConfig } = getGenerateFandomGenesisPrompt(summaryContent, arcName, workName, authorName);
    const result = await generate(prompt, systemInstruction, 0);
    if (result.trim() === 'ARC_NOT_FOUND') {
        throw new Error(`Không tìm thấy thông tin về Arc "${arcName}" trong bản tóm tắt được cung cấp.`);
    }
    return result;
}

// --- On-the-fly Entity Generation during Gameplay ---

export const generateEntityInfoOnTheFly = (
    gameState: GameState, 
    entityName: string,
    preDetectedType?: CoreEntityType | null,
    preDetectedCategory?: string | null
): Promise<InitialEntity> => {
    const { worldConfig, history } = gameState;
    
    // Nếu chưa được phát hiện, thử phát hiện bằng code regex trước khi gọi AI
    let finalType = preDetectedType;
    let finalCategory = preDetectedCategory;
    
    if (!finalType) {
        const detection = detectEntityTypeAndCategory(entityName);
        finalType = detection.type;
        finalCategory = detection.category;
    }

    const { prompt, schema, creativeCallConfig } = getGenerateEntityInfoOnTheFlyPrompt(
        worldConfig, 
        history, 
        entityName, 
        finalType, 
        finalCategory
    );
    // Vẫn nên retry cho cái này vì nó thuộc Gameplay loop
    return generateJson<InitialEntity>(prompt, schema, undefined, 'gemini-2.5-flash', creativeCallConfig, 2);
};
