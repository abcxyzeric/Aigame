import { generate, generateJson } from '../core/geminiClient';
import { GameState, GameTurn } from '../../types';
import { 
    getGenerateSummaryPrompt,
    getRetrieveRelevantSummariesPrompt,
    getRetrieveRelevantKnowledgePrompt,
    getRelevantContextEntitiesPrompt
} from '../../prompts/analysisPrompts';
import { buildBackgroundKnowledgePrompt } from '../../prompts/worldCreationPrompts';

export async function generateSummary(turns: GameTurn[]): Promise<string> {
    if (turns.length === 0) return "";
    const prompt = getGenerateSummaryPrompt(turns);
    const summary = await generate(prompt);
    return summary.replace(/<[^>]*>/g, '');
}

export async function retrieveRelevantSummaries(context: string, allSummaries: string[], topK: number): Promise<string> {
    if (allSummaries.length === 0) return "";
    
    const { prompt, schema } = getRetrieveRelevantSummariesPrompt(context, allSummaries, topK);
    const result = await generateJson<{ relevant_summaries: string[] }>(prompt, schema);
    return (result.relevant_summaries || []).join('\n\n');
}

export async function retrieveRelevantKnowledge(context: string, allKnowledge: {name: string, content: string}[], topK: number): Promise<string> {
    if (!allKnowledge || allKnowledge.length === 0) return "";

    const summaries = allKnowledge.filter(k => k.name.startsWith('tom_tat_'));
    const detailFiles = allKnowledge.filter(k => !k.name.startsWith('tom_tat_'));
    
    let selectedKnowledgeFiles = [...summaries];

    if (detailFiles.length > 0) {
        const { prompt, schema, smallAnalyticalConfig } = getRetrieveRelevantKnowledgePrompt(context, detailFiles, topK);
        try {
            const result = await generateJson<{ relevant_files: string[] }>(prompt, schema, undefined, 'gemini-2.5-flash', smallAnalyticalConfig);
            if (result && result.relevant_files) {
                const relevantFileNames = new Set(result.relevant_files);
                const relevantDetailFiles = detailFiles.filter(f => relevantFileNames.has(f.name));
                selectedKnowledgeFiles.push(...relevantDetailFiles);
            }
        } catch (error) {
            console.error("Error retrieving relevant knowledge, using summaries only:", error);
        }
    }
    
    if (selectedKnowledgeFiles.length === 0) return "";
    
    const hasDetailFiles = selectedKnowledgeFiles.some(f => !f.name.startsWith('tom_tat_'));
    return buildBackgroundKnowledgePrompt(selectedKnowledgeFiles, hasDetailFiles);
}

interface RelevantEntities {
    relevantNPCs: string[]; relevantItems: string[]; relevantQuests: string[];
    relevantFactions: string[]; relevantCompanions: string[]; relevantSkills: string[];
    relevantPlayerStatus: string[];
}

export async function getRelevantContextEntities(gameState: GameState, playerAction: string): Promise<RelevantEntities> {
    const promptData = getRelevantContextEntitiesPrompt(gameState, playerAction);

    if (!promptData) {
        return { relevantNPCs: [], relevantItems: [], relevantQuests: [], relevantFactions: [], relevantCompanions: [], relevantSkills: [], relevantPlayerStatus: [] };
    }
    
    const { prompt, schema, systemInstruction, smallAnalyticalConfig } = promptData;

    try {
        const result = await generateJson<Partial<RelevantEntities>>(prompt, schema, systemInstruction, 'gemini-2.5-flash', smallAnalyticalConfig);
        return {
            relevantNPCs: result.relevantNPCs || [], relevantItems: result.relevantItems || [],
            relevantQuests: result.relevantQuests || [], relevantFactions: result.relevantFactions || [],
            relevantCompanions: result.relevantCompanions || [], relevantSkills: result.relevantSkills || [],
            relevantPlayerStatus: result.relevantPlayerStatus || [],
        };
    } catch (error) {
        console.error("Error in getRelevantContextEntities (Phase 0). Returning empty context.", error);
        return { relevantNPCs: [], relevantItems: [], relevantQuests: [], relevantFactions: [], relevantCompanions: [], relevantSkills: [], relevantPlayerStatus: [] };
    }
}
