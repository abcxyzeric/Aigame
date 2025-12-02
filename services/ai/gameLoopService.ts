


import { generate, generateJson } from '../core/geminiClient';
import { GameState, WorldConfig, TimePassed, PendingVectorItem, GameTurn } from '../../types';
import { ParsedTag } from '../../utils/tagProcessors';
import { getStartGamePrompt, getNextTurnPrompt, getGenerateReputationTiersPrompt } from '../../prompts/gameplayPrompts';
import * as ragService from './ragService';
import { getSettings } from '../settingsService';
import * as dbService from '../dbService';
import * as embeddingService from './embeddingService';
import * as backgroundService from './backgroundService'; // Import background service
import { cosineSimilarity } from '../../utils/vectorUtils';
import { calculateKeywordScore, reciprocalRankFusion } from '../../utils/searchUtils';
import { parseResponse } from '../../utils/tagProcessors';
import { selectRelevantContext } from '../../utils/ContextManager';
import { resetRequestStats, printRequestStats, setDebugContext } from '../core/geminiClient';


const DEBUG_MODE = true; // Bật/tắt chế độ debug chi tiết trong Console (F12)

export const startGame = async (config: WorldConfig): Promise<{ narration: string; tags: ParsedTag[]; worldSim?: string; thinking?: string }> => {
    resetRequestStats(); // Reset cho lượt mới
    setDebugContext('World Init (Start Game)');
    
    const { prompt, systemInstruction } = getStartGamePrompt(config);
    // Bật thử lại 2 lần cho giai đoạn Gameplay quan trọng
    const rawResponse = await generate(prompt, systemInstruction, 2);
    
    printRequestStats('Khởi tạo Thế giới'); // In báo cáo
    
    const parsed = parseResponse(rawResponse);
    
    // --- MERGING & CLEANUP LOGIC ---
    let finalNarration = parsed.narration;

    // 1. Vệ sinh đặc biệt (Sanitization): Loại bỏ tàn dư thẻ XML và Suy nghĩ
    // Xóa tàn dư thẻ XML đóng/mở (đôi khi regex extraction vẫn để lọt thẻ đóng)
    finalNarration = finalNarration.replace(/<\/?thinking>/gi, '');
    finalNarration = finalNarration.replace(/<\/?world_sim>/gi, '');
    
    // Xóa các dòng giải thích của AI (Bullet points đậm - thường thấy ở model Pro)
    finalNarration = finalNarration.replace(/^\s*\*\s*\*\*.*?:.*/gm, ''); // Matches "* **Dieu kien...: ..."
    finalNarration = finalNarration.replace(/^\s*\*\s*Điều kiện kích hoạt.*/gmi, '');
    finalNarration = finalNarration.replace(/^\s*\*\s*Sự kiện.*/gmi, '');

    // 2. Loại bỏ các header/footer thừa bên trong narration
    finalNarration = finalNarration.replace(/\[TIN TỨC THẾ GIỚI\]/gi, '');
    
    // 3. Xóa các dòng kẻ ngang thừa thãi ở đầu/cuối của narration
    finalNarration = finalNarration.replace(/^(\s*[-=_]{3,}\s*)+/g, ''); // Đầu
    finalNarration = finalNarration.replace(/(\s*[-=_]{3,}\s*)+$/g, ''); // Cuối
    
    finalNarration = finalNarration.trim();

    // 4. Hợp nhất World Sim (Merging Strategy)
    // Nếu có worldSim (đã được vệ sinh ở TagParser), gộp vào cuối narration
    if (parsed.worldSim) {
        finalNarration = `${finalNarration}\n\n----------------\n\n${parsed.worldSim}`;
    }

    // Return undefined for worldSim so the UI modal doesn't pop up separately
    return { ...parsed, narration: finalNarration, worldSim: undefined };
};

export const generateReputationTiers = async (genre: string): Promise<string[]> => {
    setDebugContext('Auxiliary - Reputation Tiers');
    const { prompt, schema } = getGenerateReputationTiersPrompt(genre);
    const result = await generateJson<{ tiers: string[] }>(prompt, schema, undefined, 'gemini-2.5-flash', undefined, 2);
    return result.tiers || ["Tai Tiếng", "Bị Ghét", "Vô Danh", "Được Mến", "Nổi Vọng"];
};

// Hàm trợ giúp mới để triển khai logic trí nhớ kết hợp
async function getInjectedMemories(gameState: GameState, queryEmbedding: number[] | null, ragQueryText: string): Promise<{ memories: string }> {
    const { history, npcDossiers, worldId } = gameState;
    const { ragSettings } = getSettings();
    const NUM_RECENT_TURNS = 5;
    const lastPlayerAction = history[history.length - 1];

    if (!worldId) {
        console.warn("getInjectedMemories được gọi mà không có worldId. Bỏ qua truy xuất ký ức.");
        return { memories: '' };
    }

    // --- CONDITIONAL EMBEDDING ---
    // Chỉ kích hoạt RAG khi lịch sử đủ dài (trên 10 lượt). 
    // Trước đó, bộ nhớ ngữ cảnh 5 lượt gần nhất của AI là đủ.
    if (history.length <= 10) {
        if (DEBUG_MODE) {
            console.log(`%c[CONDITIONAL RAG]`, 'color: orange;', `History too short (${history.length} <= 10). Skipping Embedding & RAG.`);
        }
        return { memories: '' };
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
        return { memories: dossierContent };
    }

    // 3. Sử dụng Phương pháp 3 (Hybrid Search) nếu không có NPC cụ thể nào
    // LƯU Ý: queryEmbedding ĐƯỢC TRUYỀN VÀO TỪ BÊN NGOÀI, KHÔNG GỌI API Ở ĐÂY.
    if (!queryEmbedding) {
        console.warn("getInjectedMemories cần RAG nhưng không có embedding được truyền vào.");
        return { memories: '' };
    }

    // Hybrid Search cho các lượt chơi
    let relevantPastTurns = '';
    let foundTurnsCount = 0;
    try {
        const allTurnVectors = await dbService.getAllTurnVectors(worldId);
        const searchableTurnVectors = allTurnVectors.filter(v => v.turnIndex < history.length - NUM_RECENT_TURNS);

        if (searchableTurnVectors.length > 0) {
            const vectorRankedTurns = searchableTurnVectors.map(vector => ({ id: vector.turnIndex, score: cosineSimilarity(queryEmbedding, vector.embedding), data: vector })).sort((a, b) => b.score - a.score);
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
            const vectorRankedSummaries = allSummaryVectors.map(vector => ({ id: vector.summaryIndex, score: cosineSimilarity(queryEmbedding, vector.embedding), data: vector })).sort((a, b) => b.score - a.score);
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
    return { memories: injectedString };
}


export const getNextTurn = async (gameState: GameState, codeExtractedTime?: TimePassed): Promise<{ narration: string; tags: ParsedTag[]; worldSim?: string; thinking?: string; newSummary?: string }> => {
    resetRequestStats(); // Reset số liệu thống kê request cho lượt mới
    const { history, worldConfig } = gameState;
    const { ragSettings } = getSettings();
    
    const lastPlayerAction = history[history.length - 1];
    if (!lastPlayerAction || lastPlayerAction.type !== 'action') {
        throw new Error("Lỗi logic: Lượt đi cuối cùng phải là hành động của người chơi.");
    }
    
    // --- PIGGYBACK VECTORIZATION STRATEGY ---
    // 1. Chuẩn bị Text truy vấn cho RAG (Query Lượt N+1)
    const previousTurn = history.length > 1 ? history[history.length - 2] : null;
    const previousContent = previousTurn ? `${previousTurn.type === 'action' ? 'Người chơi' : 'AI'}: ${previousTurn.content.replace(/<[^>]*>/g, '').substring(0, 200)}...` : '';
    const ragQueryText = `${previousContent}\n\nHành động hiện tại: ${lastPlayerAction.content}`;

    // 2. Lấy danh sách hàng đợi (Pending Buffer) từ Lượt N
    const pendingItems: PendingVectorItem[] = gameState.pendingVectorBuffer || [];
    
    // 3. Gom tất cả vào 1 mảng để gọi API Embed duy nhất (Batching)
    // Item đầu tiên luôn là Query cho lượt này. Các item sau là dữ liệu cần lưu của lượt trước.
    const textsToEmbed = [ragQueryText, ...pendingItems.map(item => item.content)];
    
    let queryEmbedding: number[] | null = null;
    let bufferEmbeddings: number[][] = [];

    // Chỉ gọi API Embedding khi cần thiết (Có hàng đợi HOẶC Cần RAG)
    // Nếu history <= 10 (Conditional RAG), ta vẫn có thể gọi nếu có pending items cần lưu.
    const shouldEmbed = textsToEmbed.length > 1 || (history.length > 10) || (worldConfig.backgroundKnowledge && worldConfig.backgroundKnowledge.length > 0);

    if (shouldEmbed) {
        setDebugContext('Piggyback Vectorization (Query + Buffer)');
        try {
            const allEmbeddings = await embeddingService.embedContents(textsToEmbed);
            if (allEmbeddings.length > 0) {
                queryEmbedding = allEmbeddings[0]; // Embedding cho Query hiện tại
                bufferEmbeddings = allEmbeddings.slice(1); // Embeddings cho Hàng đợi
            }
        } catch (e) {
            console.error("Lỗi khi tạo embedding batch:", e);
        }
    }

    // 4. Xử lý lưu trữ Hàng đợi vào IndexedDB (Side Effect)
    if (pendingItems.length > 0 && bufferEmbeddings.length === pendingItems.length && gameState.worldId) {
        const savePromises = pendingItems.map((item, index) => {
            const embedding = bufferEmbeddings[index];
            if (!embedding) return Promise.resolve();

            if (item.type === 'Turn') {
                return dbService.addTurnVector({
                    turnId: Date.now() + index, // Unique ID gen
                    worldId: gameState.worldId!,
                    turnIndex: Number(item.id),
                    content: item.content,
                    embedding: embedding
                });
            } else if (item.type === 'Summary') {
                 return dbService.addSummaryVector({
                    summaryId: Date.now() + index,
                    worldId: gameState.worldId!,
                    summaryIndex: Number(item.id),
                    content: item.content,
                    embedding: embedding
                });
            } else {
                // Các loại thực thể khác (Entity, NPC, Quest...)
                return dbService.addEntityVector({
                    id: String(item.id),
                    worldId: gameState.worldId!,
                    embedding: embedding
                });
            }
        });
        
        // Chạy ngầm việc lưu vào DB, không cần await để chặn luồng UI, nhưng ở đây await để đảm bảo logic tuần tự
        await Promise.all(savePromises);
        if (DEBUG_MODE) {
            console.log(`%c[PIGGYBACK SAVED]`, 'color: #34d399;', `Saved ${pendingItems.length} items from buffer to DB.`);
        }
    }

    
    if (DEBUG_MODE) {
        console.groupCollapsed('🧠 [DEBUG] Smart Context & RAG');
    }

    // Bước 1: Quản lý Ngữ cảnh Thông minh (Smart Context Manager)
    const relevantContext = selectRelevantContext(gameState, lastPlayerAction.content);
    if (DEBUG_MODE) {
        console.log(`%c[SMART CONTEXT]`, 'color: #FFD700; font-weight: bold;', relevantContext);
    }

    // Bước 2: Lấy bối cảnh trí nhớ được tiêm vào (Dossier hoặc RAG)
    // Truyền queryEmbedding đã tạo ở trên vào để tái sử dụng
    const { memories: injectedMemories } = await getInjectedMemories(gameState, queryEmbedding, ragQueryText);

    // Bước 3: RAG - Truy xuất lore/kiến thức liên quan từ các tệp kiến thức nền
    let relevantKnowledge = '';
    
    // queryEmbeddingForKnowledge chính là queryEmbedding ta đã tạo (nếu có)
    if (worldConfig.backgroundKnowledge && worldConfig.backgroundKnowledge.length > 0 && queryEmbedding) {
        setDebugContext('RAG - Knowledge Retrieval');
        relevantKnowledge = await ragService.retrieveRelevantKnowledge(ragQueryText, worldConfig.backgroundKnowledge, 3, queryEmbedding);
    }
    
    // Bước 3.5: Lấy Graph Context (StoryGraph)
    // Tìm kiếm các quan hệ xung quanh các NPC/Thực thể có trong hành động
    let graphContext = "";
    if (gameState.worldId) {
        const entitiesInAction = [
            ...(relevantContext.encounteredNPCs || []),
            ...(relevantContext.companions || []),
            ...(relevantContext.inventory || [])
        ].map(e => e.name);
        
        if (entitiesInAction.length > 0) {
            graphContext = await backgroundService.fetchGraphContext(gameState.worldId, entitiesInAction);
            if (DEBUG_MODE && graphContext) {
                console.log(`%c[GRAPH RAG]`, 'color: #d8b4fe;', graphContext);
            }
        }
    }

    // Bước 4: Lắp ráp prompt cuối cùng với dữ liệu đã được lọc
    setDebugContext('Gameplay - Main Turn Generation'); // Đặt ngữ cảnh cho Main LLM
    const { prompt, systemInstruction } = await getNextTurnPrompt(
        gameState,
        relevantContext, // <- SỬ DỤNG NGỮ CẢNH ĐÃ LỌC
        relevantKnowledge,
        injectedMemories,
        graphContext, // <- Tiêm Graph Context
        codeExtractedTime
    );
    
    if (DEBUG_MODE) {
        console.log('%c[FOUND KNOWLEDGE]', 'color: lightblue;', relevantKnowledge || "Không có.");
        console.groupEnd();
    }

    // Bật thử lại 2 lần cho giai đoạn Gameplay quan trọng
    const rawResponse = await generate(prompt, systemInstruction, 2);
    
    printRequestStats('Xử Lý Lượt Chơi (Bao gồm Piggyback)'); // In báo cáo thống kê request
    
    const parsed = parseResponse(rawResponse);

    // --- MERGING & CLEANUP LOGIC ---
    let finalNarration = parsed.narration;

    // 1. Vệ sinh đặc biệt (Sanitization): Loại bỏ tàn dư thẻ XML và Suy nghĩ
    // Xóa tàn dư thẻ XML đóng/mở (đôi khi regex extraction vẫn để lọt thẻ đóng)
    finalNarration = finalNarration.replace(/<\/?thinking>/gi, '');
    finalNarration = finalNarration.replace(/<\/?world_sim>/gi, '');
    
    // Xóa các dòng giải thích của AI (Bullet points đậm - thường thấy ở model Pro)
    finalNarration = finalNarration.replace(/^\s*\*\s*\*\*.*?:.*/gm, ''); // Matches "* **Dieu kien...: ..."
    finalNarration = finalNarration.replace(/^\s*\*\s*Điều kiện kích hoạt.*/gmi, '');
    finalNarration = finalNarration.replace(/^\s*\*\s*Sự kiện.*/gmi, '');

    // 2. Loại bỏ các header/footer thừa
    finalNarration = finalNarration.replace(/\[TIN TỨC THẾ GIỚI\]/gi, '');
    
    // 3. Xóa các dòng kẻ ngang thừa thãi
    finalNarration = finalNarration.replace(/^(\s*[-=_]{3,}\s*)+/g, ''); // Đầu
    finalNarration = finalNarration.replace(/(\s*[-=_]{3,}\s*)+$/g, ''); // Cuối
    
    finalNarration = finalNarration.trim();

    // 4. Append World Sim if valid (MERGE STRATEGY)
    if (parsed.worldSim) {
        finalNarration = `${finalNarration}\n\n----------------\n\n${parsed.worldSim}`;
    }

    // 5. Automatic Summarization Logic
    let newSummary: string | undefined;
    const totalTurns = history.length + 2; // history (old) + user action (1) + ai response (1)
    
    if (ragSettings.summaryFrequency > 0 && totalTurns % ragSettings.summaryFrequency === 0) {
        setDebugContext('Auto Summary (Flash)');
        // Create a temporary history array including the just-generated narration
        const currentTurnObj: GameTurn = { type: 'narration', content: finalNarration };
        const tempHistory = [...history, lastPlayerAction, currentTurnObj];
        
        // Use only the recent turns for the summary
        const recentTurns = tempHistory.slice(-ragSettings.summaryFrequency);
        
        try {
            newSummary = await ragService.generateSummary(recentTurns, worldConfig);
            if (DEBUG_MODE) {
                console.log(`%c[AUTO SUMMARY]`, 'color: #a855f7;', `Generated summary for last ${ragSettings.summaryFrequency} turns.`);
            }
        } catch (e) {
            console.error("Failed to generate auto summary:", e);
        }
    }

    // --- TRIGGER BACKGROUND WORKER (ASYNC PIGGYBACK) ---
    // Gọi Background Service để phân tích Graph và EQ sau khi đã render xong Narration
    // Sử dụng context cũ để AI so sánh sự thay đổi
    const previousContextSummary = `Hành động: ${lastPlayerAction.content}`; 
    backgroundService.runPiggybackAnalysis(gameState, finalNarration, previousContextSummary);

    // Return undefined for worldSim to ensure component doesn't show separate modal
    return { ...parsed, narration: finalNarration, worldSim: undefined, newSummary };
};