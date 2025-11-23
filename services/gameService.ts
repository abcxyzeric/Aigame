import { GameState, SaveSlot, TurnVector, SummaryVector } from '../types';
import * as dbService from './dbService';
import * as embeddingService from './ai/embeddingService';

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
    try {
        // Update Turn Vectors
        const allTurnVectors = await dbService.getAllTurnVectors();
        const vectorizedTurnIndices = new Set(allTurnVectors.map(v => v.turnIndex));
        const turnsToVectorize = gameState.history.map((turn, index) => ({ turn, index }))
            .filter(item => !vectorizedTurnIndices.has(item.index));

        if (turnsToVectorize.length > 0) {
            const turnContents = turnsToVectorize.map(item => item.turn.content.replace(/<[^>]*>/g, ''));
            const embeddings = await embeddingService.embedChunks(turnContents, () => {}); // No progress needed for background task

            if (embeddings.length === turnsToVectorize.length) {
                const newTurnVectors: TurnVector[] = turnsToVectorize.map((item, i) => ({
                    turnId: Date.now() + i, // Simple unique ID
                    turnIndex: item.index,
                    content: item.turn.content,
                    embedding: embeddings[i],
                }));

                for (const vector of newTurnVectors) {
                    await dbService.addTurnVector(vector);
                }
            }
        }

        // Update Summary Vectors
        const allSummaryVectors = await dbService.getAllSummaryVectors();
        const vectorizedSummaryIndices = new Set(allSummaryVectors.map(v => v.summaryIndex));
        const summariesToVectorize = gameState.summaries.map((summary, index) => ({ summary, index }))
            .filter(item => !vectorizedSummaryIndices.has(item.index));

        if (summariesToVectorize.length > 0) {
            const summaryContents = summariesToVectorize.map(item => item.summary);
            const embeddings = await embeddingService.embedChunks(summaryContents, () => {});

            if (embeddings.length === summariesToVectorize.length) {
                const newSummaryVectors: SummaryVector[] = summariesToVectorize.map((item, i) => ({
                    summaryId: Date.now() + (turnsToVectorize?.length || 0) + i,
                    summaryIndex: item.index,
                    content: item.summary,
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
      worldName: gameState.worldConfig.storyContext.worldName || 'Cuộc phiêu lưu không tên',
      saveId: Date.now(),
      saveDate: new Date().toISOString(),
      previewText: previewText,
      saveType: saveType,
    };

    await dbService.addSave(newSave);
    await trimSaves();

    // Run vector updates in the background without waiting for it to complete.
    updateVectorsInBackground(gameState);

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
