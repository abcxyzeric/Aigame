import { GameState, SaveSlot, TurnVector, SummaryVector } from '../types';
import * as dbService from './dbService';
import * as embeddingService from './ai/embeddingService';
import * as ragService from './ai/ragService';
import { getSettings } from './settingsService';

const LEGACY_SAVES_STORAGE_KEY = 'ai_rpg_all_saves';
const MAX_MANUAL_SAVES = 5;
const MAX_AUTO_SAVES = 10;

// --- Legacy localStorage functions for migration ---
const loadAllSavesFromLocalStorage = (): SaveSlot[] => {
    try {
        const storedSaves = localStorage.getItem(LEGACY_SAVES_STORAGE_KEY);
        if (storedSaves) {
            const parsed = JSON.parse(storedSaves) as SaveSlot[];
            if (Array.isArray(parsed)) {
                return parsed;
            }
        }
        return [];
    } catch (error) {
        console.error('Error loading legacy saves from localStorage:', error);
        return [];
    }
};

const clearLocalStorageSaves = (): void => {
    try {
        localStorage.removeItem(LEGACY_SAVES_STORAGE_KEY);
    } catch (error) {
        console.error('Error clearing legacy saves:', error);
    }
};

let migrationPromise: Promise<void> | null = null;
export const migrateSaves = (): Promise<void> => {
    if (migrationPromise) {
        return migrationPromise;
    }
    migrationPromise = (async () => {
        const legacySaves = loadAllSavesFromLocalStorage();
        if (legacySaves.length > 0) {
            console.log(`Migrating ${legacySaves.length} saves from localStorage to IndexedDB...`);
            try {
                // Save saves from oldest to newest to maintain order if trimming is needed
                for (const save of legacySaves.reverse()) {
                    await dbService.addSave(save);
                }
                clearLocalStorageSaves();
                console.log('Migration successful.');
            } catch (error) {
                console.error('Migration failed:', error);
                // Don't clear old saves if migration fails
            }
        }
    })();
    return migrationPromise;
};


// --- New IndexedDB-based functions ---

const trimSaves = async (): Promise<void> => {
    const allSaves = await dbService.getAllSaves(); // Assumes saves are sorted newest to oldest
    const manualSaves = allSaves.filter(s => s.saveType === 'manual');
    const autoSaves = allSaves.filter(s => s.saveType === 'auto');

    const savesToDelete: number[] = [];

    if (manualSaves.length > MAX_MANUAL_SAVES) {
        const oldestManualSaves = manualSaves.slice(MAX_MANUAL_SAVES);
        savesToDelete.push(...oldestManualSaves.map(s => s.saveId));
    }

    if (autoSaves.length > MAX_AUTO_SAVES) {
        const oldestAutoSaves = autoSaves.slice(MAX_AUTO_SAVES);
        savesToDelete.push(...oldestAutoSaves.map(s => s.saveId));
    }

    if (savesToDelete.length > 0) {
        await Promise.all(savesToDelete.map(id => dbService.deleteSave(id)));
    }
};

export const loadAllSaves = async (): Promise<SaveSlot[]> => {
    return dbService.getAllSaves();
};

async function updateVectorsInBackground(gameState: GameState): Promise<void> {
    const { ragSettings } = getSettings();
    const worldId = gameState.worldId;

    if (!worldId) {
        console.error("Không thể cập nhật vector: worldId không tồn tại trong gameState.");
        return;
    }

    try {
        // --- Contextualize and Update Turn Vectors ---
        const allTurnVectors = await dbService.getAllTurnVectors(worldId);
        const vectorizedTurnIndices = new Set(allTurnVectors.map(v => v.turnIndex));
        const turnsToVectorize = gameState.history.map((turn, index) => ({ turn, index }))
            .filter(item => !vectorizedTurnIndices.has(item.index));

        if (turnsToVectorize.length > 0) {
            const contextualizedTurnContents: string[] = [];
            for (const item of turnsToVectorize) {
                // Create context from the previous turn, if it exists.
                const contextTurn = item.index > 0 ? gameState.history[item.index - 1] : null;
                const contextString = contextTurn
                    ? `Bối cảnh diễn ra ngay sau: "${contextTurn.type === 'action' ? 'Người chơi' : 'AI'}: ${contextTurn.content.substring(0, 200)}..."`
                    : `Bối cảnh: Lượt chơi đầu tiên.`;
                const contextualized = await ragService.contextualizeText(item.turn.content, contextString);
                contextualizedTurnContents.push(contextualized);
            }

            const embeddings = await embeddingService.embedChunks(contextualizedTurnContents, () => {});

            if (embeddings.length === turnsToVectorize.length) {
                const newTurnVectors: TurnVector[] = turnsToVectorize.map((item, i) => ({
                    turnId: Date.now() + i,
                    worldId: worldId, // Đóng dấu worldId
                    turnIndex: item.index,
                    content: contextualizedTurnContents[i], // Store the contextualized content
                    embedding: embeddings[i],
                }));

                for (const vector of newTurnVectors) {
                    await dbService.addTurnVector(vector);
                }
            }
        }

        // --- Contextualize and Update Summary Vectors ---
        const allSummaryVectors = await dbService.getAllSummaryVectors(worldId);
        const vectorizedSummaryIndices = new Set(allSummaryVectors.map(v => v.summaryIndex));
        const summariesToVectorize = gameState.summaries.map((summary, index) => ({ summary, index }))
            .filter(item => !vectorizedSummaryIndices.has(item.index));

        if (summariesToVectorize.length > 0) {
            const contextualizedSummaryContents: string[] = [];
            for (const item of summariesToVectorize) {
                 // Create context from the turns that were used to generate this summary.
                const historyIndexForSummary = (item.index + 1) * (ragSettings.summaryFrequency * 2);
                const startIndex = Math.max(0, historyIndexForSummary - (ragSettings.summaryFrequency * 2));
                const relevantTurns = gameState.history.slice(startIndex, historyIndexForSummary);
                const contextString = relevantTurns.map(t => t.content.substring(0, 150)).join(' ... ');
                const contextualized = await ragService.contextualizeText(item.summary, `Bối cảnh được tóm tắt từ: "${contextString}..."`);
                contextualizedSummaryContents.push(contextualized);
            }
            
            const embeddings = await embeddingService.embedChunks(contextualizedSummaryContents, () => {});

            if (embeddings.length === summariesToVectorize.length) {
                const newSummaryVectors: SummaryVector[] = summariesToVectorize.map((item, i) => ({
                    summaryId: Date.now() + (turnsToVectorize?.length || 0) + i,
                    worldId: worldId, // Đóng dấu worldId
                    summaryIndex: item.index,
                    content: contextualizedSummaryContents[i], // Store the contextualized content
                    embedding: embeddings[i],
                }));
                
                for (const vector of newSummaryVectors) {
                    await dbService.addSummaryVector(vector);
                }
            }
        }

    } catch (error) {
        console.error("Lỗi khi cập nhật vectors trong nền:", error);
    }
}

export const saveGame = async (gameState: GameState, saveType: 'manual' | 'auto' = 'auto'): Promise<void> => {
  try {
    const lastTurn = gameState.history.length > 0 ? gameState.history[gameState.history.length - 1] : null;
    
    let previewText = "Bắt đầu cuộc phiêu lưu...";
    if (lastTurn) {
        const contentSnippet = lastTurn.content.replace(/<[^>]*>/g, '').substring(0, 80);
        previewText = `${lastTurn.type === 'action' ? 'Bạn' : 'AI'}: ${contentSnippet}...`;
    }

    const newSave: SaveSlot = {
      ...gameState,
      worldId: gameState.worldId || Date.now(), // Đảm bảo worldId luôn tồn tại khi lưu
      worldName: gameState.worldConfig.storyContext.worldName || 'Cuộc phiêu lưu không tên',
      saveId: Date.now(),
      saveDate: new Date().toISOString(),
      previewText: previewText,
      saveType: saveType,
    };
    
    // Gán worldId = saveId cho các save cũ chưa có
    if (!newSave.worldId) {
        newSave.worldId = newSave.saveId;
    }

    await dbService.addSave(newSave);
    await trimSaves();

    // Run vector updates in the background without waiting for it to complete.
    updateVectorsInBackground(newSave); // Truyền newSave để đảm bảo có worldId

  } catch (error) {
    console.error('Error saving game state:', error);
    throw new Error('Không thể lưu game vào bộ nhớ trình duyệt.');
  }
};


export const deleteSave = async (saveId: number): Promise<void> => {
    return dbService.deleteSave(saveId);
};


export const hasSavedGames = async (): Promise<boolean> => {
  // Check legacy storage first in case migration hasn't run
    if (loadAllSavesFromLocalStorage().length > 0) {
        return true;
    }
    const saves = await loadAllSaves();
    return saves.length > 0;
};
