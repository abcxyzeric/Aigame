import { generate, generateJson } from '../core/geminiClient';
import { WorldConfig, InitialEntity, GameState } from '../../types';
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
import { distillKnowledgeForWorldCreation } from './ragService';

// --- World Creation Screen AI Helpers ---

export const generateGenre = (config: WorldConfig): Promise<string> => {
    const prompt = getGenerateGenrePrompt(config);
    return generate(prompt);
};

export const generateSetting = (config: WorldConfig): Promise<string> => {
    const prompt = getGenerateSettingPrompt(config);
    return generate(prompt);
};

export async function generateWorldFromIdea(idea: string, backgroundKnowledge?: {name: string, content: string}[]): Promise<WorldConfig> {
    // Bỏ qua bước chắt lọc. Sử dụng trực tiếp kiến thức nền được cung cấp.
    const knowledgeForGeneration = backgroundKnowledge;
    
    const { prompt, schema, creativeCallConfig } = getGenerateWorldFromIdeaPrompt(idea, knowledgeForGeneration);
    return generateJson<WorldConfig>(prompt, schema, undefined, 'gemini-2.5-pro', creativeCallConfig);
}

export async function generateFanfictionWorld(idea: string, backgroundKnowledge?: {name: string, content: string}[]): Promise<WorldConfig> {
    // Bỏ qua bước chắt lọc. Sử dụng trực tiếp kiến thức nền được cung cấp.
    const knowledgeForGeneration = backgroundKnowledge;

    const { prompt, schema, creativeCallConfig } = getGenerateFanfictionWorldPrompt(idea, knowledgeForGeneration);
    return generateJson<WorldConfig>(prompt, schema, undefined, 'gemini-2.5-pro', creativeCallConfig);
}

// --- Entity Creation AI Helpers ---

export const generateEntityName = (config: WorldConfig, entity: InitialEntity): Promise<string> => {
    const prompt = getGenerateEntityNamePrompt(config, entity);
    return generate(prompt);
};

export const generateEntityPersonality = (config: WorldConfig, entity: InitialEntity): Promise<string> => {
    const prompt = getGenerateEntityPersonalityPrompt(config, entity);
    return generate(prompt);
};

export const generateEntityDescription = (config: WorldConfig, entity: InitialEntity): Promise<string> => {
    const prompt = getGenerateEntityDescriptionPrompt(config, entity);
    return generate(prompt);
};

// --- Fandom Genesis AI ---

export async function generateFandomSummary(workName: string, authorName?: string): Promise<string> {
    const { prompt, systemInstruction } = getGenerateFandomSummaryPrompt(workName, authorName);
    const result = await generate(prompt, systemInstruction);
    if (result.includes('WORK_NOT_FOUND')) {
        throw new Error(`Không tìm thấy thông tin chi tiết về tác phẩm "${workName}"${authorName ? ` (tác giả: ${authorName})` : ''}. Vui lòng kiểm tra lại tên.`);
    }
    return result;
}

export async function extractArcListFromSummary(summaryContent: string): Promise<string[]> {
    const { prompt, schema } = getExtractArcListFromSummaryPrompt(summaryContent);
    const result = await generateJson<{ arcs: string[] }>(prompt, schema);
    return result.arcs || [];
}

export async function generateFandomGenesis(summaryContent: string, arcName: string, workName: string, authorName?: string): Promise<string> {
    const { prompt, systemInstruction, creativeCallConfig } = getGenerateFandomGenesisPrompt(summaryContent, arcName, workName, authorName);
    const result = await generate(prompt, systemInstruction);
    if (result.trim() === 'ARC_NOT_FOUND') {
        throw new Error(`Không tìm thấy thông tin về Arc "${arcName}" trong bản tóm tắt được cung cấp.`);
    }
    return result;
}

// --- On-the-fly Entity Generation during Gameplay ---

export const generateEntityInfoOnTheFly = (gameState: GameState, entityName: string): Promise<InitialEntity> => {
    const { worldConfig, history } = gameState;
    const { prompt, schema, creativeCallConfig } = getGenerateEntityInfoOnTheFlyPrompt(worldConfig, history, entityName);
    return generateJson<InitialEntity>(prompt, schema, undefined, 'gemini-2.5-flash', creativeCallConfig);
};