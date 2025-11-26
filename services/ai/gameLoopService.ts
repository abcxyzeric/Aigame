import { generate, generateJson } from '../core/geminiClient';
import { GameState, WorldConfig, TimePassed } from '../../types';
import { ParsedTag } from '../../utils/tagProcessors';
import { getStartGamePrompt, getNextTurnPrompt, getGenerateReputationTiersPrompt } from '../../prompts/gameplayPrompts';
import * as ragService from './ragService';
import { getSettings } from '../settingsService';
import * as dbService from '../dbService';
import * as embeddingService from './embeddingService';
import { cosineSimilarity } from '../../utils/vectorUtils';
import { calculateKeywordScore, reciprocalRankFusion } from '../../utils/searchUtils';
import { parseResponse } from '../../utils/tagProcessors';
import { selectRelevantContext } from '../../utils/ContextManager';


const DEBUG_MODE = true; // Bật/tắt chế độ debug chi tiết trong Console (F12)

export const startGame = async (config: WorldConfig): Promise<{ narration: string; tags: ParsedTag[] }> => {
    const { prompt, systemInstruction } = getStartGamePrompt(config);
    const rawResponse = await generate(prompt, systemInstruction);
    return parseResponse(rawResponse);
};

export const generateReputationTiers = async (genre: string): Promise<string[]> => {
    const { prompt, schema } = getGenerateReputationTiersPrompt(genre);
    const result = await generateJson<{ tiers: string[] }>(prompt, schema);
    return result.tiers || ["Tai Tiếng", "Bị Ghét", "Vô Danh", "Được Mến", "Nổi Vọng"];
};

// Hàm trợ giúp mới để triển khai logic trí nhớ kết hợp
async function getInjectedMemories(gameState: GameState): Promise<string> {
    const { history, npcDossiers, worldId } = gameState;
    const { ragSettings } = getSettings();
    const NUM_RECENT_TURNS = 5;
    const lastPlayerAction = history[history.length - 1];

    if (!worldId) {
        console.warn("getInjectedMemories được gọi mà không có worldId. Bỏ qua truy xuất ký ức.");
        return '';
    }

    // 1. Xác định các NPC trong hành động
    const allKnownNpcNames = [
        ...gameState.encounteredNPCs.map(n => n.name),
        ...gameState.companions.map(c => c.name),
        ...gameState.worldConfig.initialEntities.filter(e => e.type === 'NPC').map(e => e.name)
    ];
    const uniqueNpcNames = [...new Set(allKnownNpcNames)];
    const involvedNpcsInAction = uniqueNpcNames.filter(name =>
        lastPlayerAction.content.toLowerCase().includes(name.toLowerCase())
    );

    // 2. Sử dụng Phương pháp 1 nếu phát hiện NPC
    if (involvedNpcsInAction.length > 0 && npcDossiers) {
        if (DEBUG_MODE) {
            console.log(`%c[METHOD 1: NPC DOSSIER]`, 'color: yellow; font-weight: bold;', `NPCs detected: ${involvedNpcsInAction.join(', ')}`);
        }
        let dossierContent = '';
        for (const npcName of involvedNpcsInAction) {
            const dossier = npcDossiers[npcName.toLowerCase()];
            if (dossier) {
                let npcDossierString = `--- HỒ SƠ TƯƠNG TÁC VỚI ${npcName} ---\n`;
                if (dossier.archived && dossier.archived.length > 0) {
                    npcDossierString += "Ký ức đã lưu trữ (sự kiện cũ):\n- " + dossier.archived.join('\n- ') + "\n\n";
                }
                if (dossier.fresh && dossier.fresh.length > 0) {
                    const freshHistory = dossier.fresh
                        .map(index => history[index])
                        .filter(Boolean)
                        .map(turn => `${turn.type === 'action' ? 'Người chơi' : 'AI'}: ${turn.content.replace(/<[^>]*>/g, '')}`)
                        .join('\n\n');
                    npcDossierString += `Diễn biến gần đây nhất (nguyên văn):\n${freshHistory}\n`;
                }
                npcDossierString += `--- KẾT THÚC HỒ SƠ ---\n\n`;
                dossierContent += npcDossierString;
            }
        }
        if (DEBUG_MODE) {
            console.log(`%c[INJECTED DOSSIER]`, 'color: lightblue;', dossierContent || "Không có hồ sơ.");
        }
        return dossierContent;
    }

    // 3. Sử dụng Phương pháp 3 (Hybrid Search) nếu không có NPC cụ thể nào
    const previousTurn = history.length > 1 ? history[history.length - 2] : null;
    const previousContent = previousTurn ? `${previousTurn.type === 'action' ? 'Người chơi' : 'AI'}: ${previousTurn.content.replace(/<[^>]*>/g, '').substring(0, 200)}...` : '';
    const ragQueryText = `${previousContent}\n\nHành động hiện tại: ${lastPlayerAction.content}`;

    if (DEBUG_MODE) {
        console.log(`%c[METHOD 3: CONTEXTUAL INJECTION]`, 'color: yellow; font-weight: bold;', `No specific NPC detected in action.`);
        console.log('%c[QUERY]', 'color: cyan; font-weight: bold;', ragQueryText);
    }
    
    const globalQueryEmbedding = await embeddingService.embedContent(ragQueryText);

    // Hybrid Search cho các lượt chơi
    let relevantPastTurns = '';
    let foundTurnsCount = 0;
    try {
        const allTurnVectors = await dbService.getAllTurnVectors(worldId);
        const searchableTurnVectors = allTurnVectors.filter(v => v.turnIndex < history.length - NUM_RECENT_TURNS);

        if (searchableTurnVectors.length > 0) {
            const vectorRankedTurns = searchableTurnVectors.map(vector => ({ id: vector.turnIndex, score: cosineSimilarity(globalQueryEmbedding, vector.embedding), data: vector })).sort((a, b) => b.score - a.score);
            const keywordRankedTurns = searchableTurnVectors.map(vector => ({ id: vector.turnIndex, score: calculateKeywordScore(ragQueryText, vector.content), data: vector })).sort((a, b) => b.score - a.score);
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

    // Hybrid Search cho các tóm tắt
    let relevantMemories = '';
    let foundSummariesCount = 0;
    try {
        const allSummaryVectors = await dbService.getAllSummaryVectors(worldId);
        if (allSummaryVectors.length > 0) {
            const vectorRankedSummaries = allSummaryVectors.map(vector => ({ id: vector.summaryIndex, score: cosineSimilarity(globalQueryEmbedding, vector.embedding), data: vector })).sort((a, b) => b.score - a.score);
            const keywordRankedSummaries = allSummaryVectors.map(vector => ({ id: vector.summaryIndex, score: calculateKeywordScore(ragQueryText, vector.content), data: vector })).sort((a, b) => b.score - a.score);
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
    
    const injectedString = `--- KÝ ỨC DÀI HẠN LIÊN QUAN (TỪ TÓM TẮT) ---\n${relevantMemories || "Không có."}\n\n--- DIỄN BIẾN CŨ LIÊN QUAN (TỪ LỊCH SỬ) ---\n${relevantPastTurns || "Không có."}`;

    if (DEBUG_MODE) {
        console.log(`%c[FOUND TURNS: ${foundTurnsCount}]`, 'color: lightblue;', relevantPastTurns || "Không có.");
        console.log(`%c[FOUND MEMORIES: ${foundSummariesCount}]`, 'color: lightblue;', relevantMemories || "Không có.");
    }
    return injectedString;
}


export const getNextTurn = async (gameState: GameState, codeExtractedTime?: TimePassed): Promise<{ narration: string; tags: ParsedTag[] }> => {
    const { history, worldConfig } = gameState;
    
    const lastPlayerAction = history[history.length - 1];
    if (!lastPlayerAction || lastPlayerAction.type !== 'action') {
        throw new Error("Lỗi logic: Lượt đi cuối cùng phải là hành động của người chơi.");
    }
    
    if (DEBUG_MODE) {
        console.groupCollapsed('🧠 [DEBUG] Smart Context & RAG');
    }

    // Bước 1: Quản lý Ngữ cảnh Thông minh (Smart Context Manager)
    const relevantContext = selectRelevantContext(gameState, lastPlayerAction.content);
    if (DEBUG_MODE) {
        console.log(`%c[SMART CONTEXT]`, 'color: #FFD700; font-weight: bold;', relevantContext);
    }

    // Bước 2: Lấy bối cảnh trí nhớ được tiêm vào (Dossier hoặc RAG cho Lịch sử/Tóm tắt)
    const injectedMemories = await getInjectedMemories(gameState);

    // Bước 3: RAG - Truy xuất lore/kiến thức liên quan từ các tệp kiến thức nền (luôn chạy)
    let relevantKnowledge = '';
    const ragQueryTextForKnowledge = `${history.slice(-2).map(t => t.content).join(' ')}`;
    const queryEmbeddingForKnowledge = await embeddingService.embedContent(ragQueryTextForKnowledge);
    if (worldConfig.backgroundKnowledge && worldConfig.backgroundKnowledge.length > 0) {
        relevantKnowledge = await ragService.retrieveRelevantKnowledge(ragQueryTextForKnowledge, worldConfig.backgroundKnowledge, 3, queryEmbeddingForKnowledge);
    }
    
    // Bước 4: Lắp ráp prompt cuối cùng với dữ liệu đã được lọc
    const { prompt, systemInstruction } = getNextTurnPrompt(
        gameState,
        relevantContext, // <- SỬ DỤNG NGỮ CẢNH ĐÃ LỌC
        relevantKnowledge,
        injectedMemories,
        codeExtractedTime
    );
    
    if (DEBUG_MODE) {
        console.log('%c[FOUND KNOWLEDGE]', 'color: lightblue;', relevantKnowledge || "Không có.");
        console.groupEnd();
    }

    const rawResponse = await generate(prompt, systemInstruction);
    return parseResponse(rawResponse);
};
