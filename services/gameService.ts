import { GameState, SaveSlot } from '../types';

const ALL_SAVES_STORAGE_KEY = 'ai_rpg_all_saves';
const MAX_SAVES = 20;

export const loadAllSaves = (): SaveSlot[] => {
    try {
        const storedSaves = localStorage.getItem(ALL_SAVES_STORAGE_KEY);
        if (storedSaves) {
            const parsed = JSON.parse(storedSaves) as SaveSlot[];
            if (Array.isArray(parsed)) {
                return parsed;
            }
        }
        return [];
    } catch (error) {
        console.error('Error loading all saves from localStorage:', error);
        return [];
    }
};

export const saveGame = (gameState: GameState): void => {
  try {
    const allSaves = loadAllSaves();
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
    };

    // Add new save and cap the list size
    const updatedSaves = [newSave, ...allSaves].slice(0, MAX_SAVES);
    localStorage.setItem(ALL_SAVES_STORAGE_KEY, JSON.stringify(updatedSaves));

  } catch (error) {
    console.error('Error saving game state to localStorage:', error);
    alert('Không thể lưu game vào bộ nhớ trình duyệt.');
  }
};


export const deleteSave = (saveId: number): void => {
    try {
        let allSaves = loadAllSaves();
        const updatedSaves = allSaves.filter(save => save.saveId !== saveId);
        localStorage.setItem(ALL_SAVES_STORAGE_KEY, JSON.stringify(updatedSaves));
    } catch (error) {
        console.error('Error deleting save from localStorage:', error);
    }
};


export const hasSavedGames = (): boolean => {
  const saves = loadAllSaves();
  return saves.length > 0;
};