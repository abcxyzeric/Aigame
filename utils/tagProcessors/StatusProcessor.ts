// utils/tagProcessors/StatusProcessor.ts
import { GameState, StatusEffect, VectorUpdate } from '../../types';
import { mergeAndDeduplicateByName } from '../arrayUtils';

/**
 * Xử lý logic thêm một trạng thái mới (buff/debuff) cho người chơi.
 * @param currentState - Trạng thái game hiện tại.
 * @param params - Các tham số từ thẻ [STATUS_ACQUIRED].
 * @returns Một đối tượng chứa trạng thái game mới và mảng vectorUpdates rỗng.
 */
export function processStatusAcquired(currentState: GameState, params: any): { newState: GameState, vectorUpdates: VectorUpdate[] } {
    if (!params.name || !params.type) {
        console.warn('Bỏ qua thẻ [STATUS_ACQUIRED] không hợp lệ:', params);
        return { newState: currentState, vectorUpdates: [] };
    }

    const newStatus: StatusEffect = {
        name: params.name,
        description: params.description || '',
        type: (params.type === 'buff' || params.type === 'debuff') ? params.type : 'debuff',
    };

    const updatedStatus = mergeAndDeduplicateByName(currentState.playerStatus || [], [newStatus]);

    const newState = {
        ...currentState,
        playerStatus: updatedStatus,
    };
    return { newState, vectorUpdates: [] };
}

/**
 * Xử lý logic xóa một trạng thái khỏi người chơi.
 * @param currentState - Trạng thái game hiện tại.
 * @param params - Các tham số từ thẻ [STATUS_REMOVED].
 * @returns Một đối tượng chứa trạng thái game mới và mảng vectorUpdates rỗng.
 */
export function processStatusRemoved(currentState: GameState, params: any): { newState: GameState, vectorUpdates: VectorUpdate[] } {
    if (!params.name) {
        console.warn('Bỏ qua thẻ [STATUS_REMOVED] không hợp lệ:', params);
        return { newState: currentState, vectorUpdates: [] };
    }

    const nameToRemove = params.name.toLowerCase();
    const updatedStatus = (currentState.playerStatus || []).filter(
        status => status.name.toLowerCase() !== nameToRemove
    );

    const newState = {
        ...currentState,
        playerStatus: updatedStatus,
    };
    return { newState, vectorUpdates: [] };
}
