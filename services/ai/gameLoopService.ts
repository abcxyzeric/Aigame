import { generate, generateJson } from '../core/geminiClient';
import { GameState, WorldConfig, TurnVector, SummaryVector } from '../../types';
import { getStartGamePrompt, getNextTurnPrompt, getGenerateReputationTiersPrompt } from '../../prompts/gameplayPrompts';
import * as ragService from './ragService';
import { getSettings } from '../settingsService';
import * as dbService from '../dbService';
import * as embeddingService from './embeddingService';
import { cosineSimilarity } from '../../utils/vectorUtils';
import { calculateKeywordScore, reciprocalRankFusion } from '../../utils/searchUtils';

const DEBUG_MODE = true; // Bật/tắt chế độ debug chi tiết trong Console (F12)

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
    const NUM_RECENT_TURNS = 5;
    
    const lastPlayerAction = history[history.length - 1];
    if (!lastPlayerAction || lastPlayerAction.type !== 'action') {
        throw new Error("Lỗi logic: Lượt đi cuối cùng phải là hành động của người chơi.");
    }
    
    // Step 1: Generate Query Text
    let ragQueryText = lastPlayerAction.content;
    if (ragSettings.summarizeBeforeRag && history.length > 1) {
        ragQueryText = await ragService.generateRagQueryFromTurns(history.slice(-NUM_RECENT_TURNS));
    }

    if (DEBUG_MODE) {
        console.groupCollapsed('🧠 [DEBUG] RAG Context');
        console.log('%c[QUERY]', 'color: cyan; font-weight: bold;', ragQueryText);
    }
    
    // --- HYBRID SEARCH IMPLEMENTATION ---

    // Step 2: Hybrid Search for relevant past turns
    let relevantPastTurns = '';
    let foundTurnsCount = 0;
    try {
        const allTurnVectors = await dbService.getAllTurnVectors();
        const searchableTurnVectors = allTurnVectors.filter(v => v.turnIndex < history.length - NUM_RECENT_TURNS);

        if (searchableTurnVectors.length > 0) {
            // A. Vector Search
            const queryEmbedding = await embeddingService.embedContent(ragQueryText);
            const vectorRankedTurns = searchableTurnVectors.map(vector => ({
                id: vector.turnIndex,
                score: cosineSimilarity(queryEmbedding, vector.embedding),
                data: vector,
            })).sort((a, b) => b.score - a.score);

            // B. Keyword Search
            const keywordRankedTurns = searchableTurnVectors.map(vector => ({
                id: vector.turnIndex,
                score: calculateKeywordScore(ragQueryText, vector.content),
                data: vector,
            })).sort((a, b) => b.score - a.score);

            // C. Fuse Results
            const fusedTurnResults = reciprocalRankFusion([vectorRankedTurns, keywordRankedTurns]);
            
            const topTurns = fusedTurnResults.slice(0, ragSettings.topK);
            foundTurnsCount = topTurns.length;
            
            if (topTurns.length > 0) {
                relevantPastTurns = topTurns.map(t => `[Lượt ${t.data.turnIndex}]: ${t.data.content.replace(/<[^>]*>/g, '')}`).join('\n\n');
            }
        }
    } catch (e) {
        console.error("Lỗi khi thực hiện Hybrid Search cho lượt chơi:", e);
    }

    if (DEBUG_MODE) {
        console.log(`%c[FOUND TURNS: ${foundTurnsCount}]`, 'color: lightblue;', relevantPastTurns || "Không có.");
    }

    // Step 3: Hybrid Search for relevant summaries
    let relevantMemories = '';
    let foundSummariesCount = 0;
     try {
        const allSummaryVectors = await dbService.getAllSummaryVectors();
        if (allSummaryVectors.length > 0) {
            // A. Vector Search
            const queryEmbedding = await embeddingService.embedContent(ragQueryText); // Re-embedding for simplicity, could be optimized
            const vectorRankedSummaries = allSummaryVectors.map(vector => ({
                id: vector.summaryIndex,
                score: cosineSimilarity(queryEmbedding, vector.embedding),
                data: vector,
            })).sort((a, b) => b.score - a.score);
            
            // B. Keyword Search
            const keywordRankedSummaries = allSummaryVectors.map(vector => ({
                id: vector.summaryIndex,
                score: calculateKeywordScore(ragQueryText, vector.content),
                data: vector,
            })).sort((a, b) => b.score - a.score);

            // C. Fuse Results
            const fusedSummaryResults = reciprocalRankFusion([vectorRankedSummaries, keywordRankedSummaries]);
            const topSummaries = fusedSummaryResults.slice(0, ragSettings.topK);
            foundSummariesCount = topSummaries.length;

            if (topSummaries.length > 0) {
                 relevantMemories = topSummaries.map(s => `[Tóm tắt giai đoạn ${s.data.summaryIndex + 1}]: ${s.data.content}`).join('\n\n');
            }
        }
    } catch (e) {
        console.error("Lỗi khi thực hiện Hybrid Search cho tóm tắt:", e);
    }
    
    if (DEBUG_MODE) {
        console.log(`%c[FOUND MEMORIES: ${foundSummariesCount}]`, 'color: lightblue;', relevantMemories || "Không có.");
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
        `--- KÝ ỨC DÀI HẠN LIÊN QUAN (TỪ TÓM TẮT) ---\n${relevantMemories || "Không có."}\n\n--- DIỄN BIẾN CŨ LIÊN QUAN (TỪ LỊCH SỬ) ---\n${relevantPastTurns || "Không có."}`
    );
    
    if (DEBUG_MODE) {
        console.log('%c[FOUND KNOWLEDGE]', 'color: lightblue;', relevantKnowledge || "Không có.");
        console.groupEnd();
    }

    return generate(prompt, systemInstruction);
};