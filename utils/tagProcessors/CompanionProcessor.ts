
// utils/tagProcessors/CompanionProcessor.ts
import { GameState, Companion, VectorUpdate } from '../../types';
import { mergeAndDeduplicateByName } from '../arrayUtils';
import { sanitizeEntityName } from '../textProcessing';

/**
 * Xử lý logic thêm hoặc cập nhật một đồng hành.
 * @param currentState - Trạng thái game hiện tại.
 * @param params - Các tham số từ thẻ [COMPANION_NEW].
 * @returns Một đối tượng chứa trạng thái game mới và các yêu cầu cập nhật vector.
 */
export function processCompanionNew(currentState: GameState, params: any): { newState: GameState, vectorUpdates: VectorUpdate[] } {
    if (!params.name) {
        console.warn('Bỏ qua thẻ [COMPANION_NEW] không hợp lệ:', params);
        return { newState: currentState, vectorUpdates: [] };
    }

    const sanitizedName = sanitizeEntityName(params.name);

    const newCompanion: Companion = {
        name: sanitizedName,
        description: params.description || '',
        personality: params.personality || '',
        tags: params.tags ? (typeof params.tags === 'string' ? params.tags.split(',').map((t: string) => t.trim()) : params.tags) : [],
        customCategory: params.category, // Capture custom category
    };
    
    const updatedCompanions = mergeAndDeduplicateByName(currentState.companions || [], [newCompanion]);

    const vectorContent = `Đồng hành: ${newCompanion.name}\nMô tả: ${newCompanion.description}\nPhân loại: ${newCompanion.customCategory || 'Chưa rõ'}\nTính cách: ${newCompanion.personality}`;
    const vectorUpdate: VectorUpdate = {
        id: newCompanion.name,
        type: 'Companion',
        content: vectorContent,
    };

    return {
        newState: {
            ...currentState,
            companions: updatedCompanions,
        },
        vectorUpdates: [vectorUpdate],
    };
}

/**
 * Xử lý logic xóa một đồng hành khỏi nhóm.
 * @param currentState - Trạng thái game hiện tại.
 * @param params - Các tham số từ thẻ [COMPANION_REMOVE].
 * @returns Một đối tượng chứa trạng thái game mới và mảng vectorUpdates rỗng.
 */
export function processCompanionRemove(currentState: GameState, params: any): { newState: GameState, vectorUpdates: VectorUpdate[] } {
    if (!params.name) {
        console.warn('Bỏ qua thẻ [COMPANION_REMOVE] không hợp lệ:', params);
        return { newState: currentState, vectorUpdates: [] };
    }

    const nameToRemove = sanitizeEntityName(params.name).toLowerCase();
    const updatedCompanions = (currentState.companions || []).filter(c => c.name.toLowerCase() !== nameToRemove);

    // TODO: Consider adding logic to remove vector from DB in the future
    return {
        newState: {
            ...currentState,
            companions: updatedCompanions,
        },
        vectorUpdates: [],
    };
}
