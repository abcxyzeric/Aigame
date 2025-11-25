// utils/tagProcessors/MemoryProcessor.ts
import { GameState, VectorUpdate } from '../../types';

/**
 * Xử lý logic thêm một ký ức cốt lõi mới vào trạng thái game.
 * @param currentState - Trạng thái game hiện tại.
 * @param params - Các tham số từ thẻ [MEMORY_ADD].
 * @returns Một đối tượng chứa trạng thái game mới và mảng vectorUpdates rỗng.
 */
export function processMemoryAdd(currentState: GameState, params: any): { newState: GameState, vectorUpdates: VectorUpdate[] } {
    if (!params.content) {
        console.warn('Bỏ qua thẻ [MEMORY_ADD] không hợp lệ:', params);
        return { newState: currentState, vectorUpdates: [] };
    }
    
    // Tạo một bản sao mới của mảng memories và thêm ký ức mới vào
    const newMemories = [...(currentState.memories || []), params.content];

    const newState = {
        ...currentState,
        memories: newMemories,
    };
    return { newState, vectorUpdates: [] };
}
