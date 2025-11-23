import { generate, generateJson } from '../core/geminiClient';
import { GameState, WorldConfig } from '../../types';
import { getStartGamePrompt, getNextTurnPrompt, getGenerateReputationTiersPrompt } from '../../prompts/gameplayPrompts';
import * as ragService from './ragService';
import { getSettings } from '../settingsService';
import * as dbService from '../dbService';
import * as embeddingService from './embeddingService';
import { cosineSimilarity } from '../../utils/vectorUtils';

export const startGame = (config: WorldConfig): Promise<string> => {
    const { prompt, systemInstruction } = getStartGamePrompt(config);
    return generate(prompt, systemInstruction);
};

export const generateReputationTiers = async (genre: string): Promise<string[]> => {
    const { prompt, schema } = getGenerateReputationTiersPrompt(genre);
    const result = await generateJson<{ tiers: string[] }>(prompt, schema);
    return result.tiers || ["Tai Tiếng", "Bị Ghét", "Vô Danh", "Được Mến", "Nổi Vọng"];
};

export const getNextTurn = async (gameState: GameState): Promise<string> => {
    const { history, worldConfig, encounteredNPCs, encounteredFactions, discoveredEntities, companions, quests, character, inventory, playerStatus } = gameState;
    const { ragSettings } = getSettings();
    const NUM_RECENT_TURNS = 5; // How many recent turns to include directly
    
    const lastPlayerAction = history[history.length - 1];
    if (!lastPlayerAction || lastPlayerAction.type !== 'action') {
        throw new Error("Lỗi logic: Lượt đi cuối cùng phải là hành động của người chơi.");
    }
    
    // Step 1: Generate Query Vector based on settings
    let ragQueryText = lastPlayerAction.content;
    if (ragSettings.summarizeBeforeRag && history.length > 1) {
        // Use more context for the query summary
        ragQueryText = await ragService.generateRagQueryFromTurns(history.slice(-NUM_RECENT_TURNS));
    }
    const queryEmbedding = await embeddingService.embedContent(ragQueryText);

    // Step 2: RAG - Retrieve relevant past turns via Vector Search
    let relevantPastTurns = '';
    try {
        const allTurnVectors = await dbService.getAllTurnVectors();
        // Exclude recent turns that will be included raw
        const searchableTurnVectors = allTurnVectors.filter(v => v.turnIndex < history.length - NUM_RECENT_TURNS);

        if (searchableTurnVectors.length > 0) {
            const scoredTurns = searchableTurnVectors.map(vector => ({
                ...vector,
                score: cosineSimilarity(queryEmbedding, vector.embedding)
            }));
            
            scoredTurns.sort((a, b) => b.score - a.score);
            
            // Get top K, ensure they meet a minimum similarity threshold
            const topTurns = scoredTurns.slice(0, ragSettings.topK).filter(t => t.score > 0.75);
            
            if (topTurns.length > 0) {
                relevantPastTurns = topTurns.map(t => `[Lượt ${t.turnIndex}]: ${t.content.replace(/<[^>]*>/g, '')}`).join('\n\n');
            }
        }
    } catch (e) {
        console.error("Lỗi khi truy xuất vector lượt chơi:", e);
    }

    // Step 3: RAG - Retrieve relevant summaries via Vector Search
    let relevantMemories = '';
     try {
        const allSummaryVectors = await dbService.getAllSummaryVectors();
        if (allSummaryVectors.length > 0) {
            const scoredSummaries = allSummaryVectors.map(vector => ({
                ...vector,
                score: cosineSimilarity(queryEmbedding, vector.embedding)
            }));

            scoredSummaries.sort((a, b) => b.score - a.score);

            const topSummaries = scoredSummaries.slice(0, ragSettings.topK).filter(s => s.score > 0.75);

            if (topSummaries.length > 0) {
                 relevantMemories = topSummaries.map(s => `[Tóm tắt giai đoạn ${s.summaryIndex + 1}]: ${s.content}`).join('\n\n');
            }
        }
    } catch (e) {
        console.error("Lỗi khi truy xuất vector tóm tắt:", e);
    }
    
    // Step 4: RAG - Retrieve relevant lore/knowledge (existing logic)
    let relevantKnowledge = '';
    if (worldConfig.backgroundKnowledge && worldConfig.backgroundKnowledge.length > 0) {
        relevantKnowledge = await ragService.retrieveRelevantKnowledge(ragQueryText, worldConfig.backgroundKnowledge, 3);
    }
    
    // Step 5: Assemble the final prompt
    const fullContext = {
        inventory, playerStatus, companions,
        activeQuests: quests.filter(q => q.status !== 'hoàn thành'),
        encounteredNPCs, encounteredFactions, discoveredEntities,
        characterSkills: character.skills,
    };
    Object.keys(fullContext).forEach(key => {
        const typedKey = key as keyof typeof fullContext;
        if (Array.isArray(fullContext[typedKey]) && fullContext[typedKey].length === 0) {
            delete fullContext[typedKey];
        }
    });

    const { prompt, systemInstruction } = getNextTurnPrompt(
        gameState,
        fullContext,
        relevantKnowledge,
        // The prompt builder expects a single string for memories.
        // We'll combine our two RAG results here.
        `--- KÝ ỨC DÀI HẠN LIÊN QUAN (TỪ TÓM TẮT) ---\n${relevantMemories || "Không có."}\n\n--- DIỄN BIẾN CŨ LIÊN QUAN (TỪ LỊCH SỬ) ---\n${relevantPastTurns || "Không có."}`
    );
    
    return generate(prompt, systemInstruction);
};
