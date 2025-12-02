
// utils/tagProcessors/QuestProcessor.ts
import { GameState, Quest, VectorUpdate } from '../../types';
import { mergeAndDeduplicateByName } from '../arrayUtils';
import { sanitizeEntityName } from '../textProcessing';

/**
 * Xử lý logic thêm một nhiệm vụ mới hoặc cập nhật một nhiệm vụ đã có.
 * @param currentState - Trạng thái game hiện tại.
 * @param params - Các tham số từ thẻ [QUEST_NEW] hoặc [QUEST_UPDATE].
 * @returns Một đối tượng chứa trạng thái game mới và các yêu cầu cập nhật vector.
 */
export function processQuestUpdate(currentState: GameState, params: any): { newState: GameState, vectorUpdates: VectorUpdate[] } {
    if (!params.name) {
        console.warn('Bỏ qua thẻ [QUEST_NEW/QUEST_UPDATE] không hợp lệ:', params);
        return { newState: currentState, vectorUpdates: [] };
    }

    const sanitizedName = sanitizeEntityName(params.name);
    const status = params.status === 'hoàn thành' ? 'hoàn thành' : 'đang tiến hành';
    const existingQuest = (currentState.quests || []).find(q => q.name.toLowerCase() === sanitizedName.toLowerCase());

    const newQuestData: Quest = {
        name: sanitizedName,
        description: params.description || existingQuest?.description || '', // Giữ lại mô tả cũ nếu chỉ cập nhật trạng thái
        status: status,
        tags: params.tags ? (typeof params.tags === 'string' ? params.tags.split(',').map((t: string) => t.trim()) : params.tags) : [],
        customCategory: params.category, // Capture category
    };

    const updatedQuests = mergeAndDeduplicateByName(currentState.quests || [], [newQuestData]);

    const vectorContent = `Nhiệm vụ: ${newQuestData.name}\nMô tả: ${newQuestData.description}\nTrạng thái: ${newQuestData.status}\nPhân loại: ${newQuestData.customCategory || 'Chưa rõ'}`;
    const vectorUpdate: VectorUpdate = {
        id: newQuestData.name,
        type: 'Quest',
        content: vectorContent,
    };

    return {
        newState: {
            ...currentState,
            quests: updatedQuests,
        },
        vectorUpdates: [vectorUpdate],
    };
}
