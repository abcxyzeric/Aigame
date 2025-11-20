import { GameState, SaveSlot } from '../types';
import * as dbService from './dbService';

const LEGACY_SAVES_STORAGE_KEY = 'ai_rpg_all_saves';
const MAX_SAVES = 15;

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

export const loadAllSaves = async (): Promise<SaveSlot[]> => {
    return dbService.getAllSaves();
};

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
    await dbService.trimSaves(MAX_SAVES);

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