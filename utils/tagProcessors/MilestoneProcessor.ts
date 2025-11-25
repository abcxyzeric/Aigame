// utils/tagProcessors/MilestoneProcessor.ts
import { GameState, CharacterMilestone, VectorUpdate } from '../../types';

/**
 * Xử lý logic cập nhật giá trị của một cột mốc (chỉ số dạng chữ).
 * @param currentState - Trạng thái game hiện tại.
 * @param params - Các tham số từ thẻ [MILESTONE_UPDATE].
 * @returns Một đối tượng chứa trạng thái game mới và mảng vectorUpdates rỗng.
 */
export function processMilestoneUpdate(currentState: GameState, params: any): { newState: GameState, vectorUpdates: VectorUpdate[] } {
    if (!params.name || typeof params.value === 'undefined') {
        console.warn('Bỏ qua thẻ [MILESTONE_UPDATE] không hợp lệ:', params);
        return { newState: currentState, vectorUpdates: [] };
    }

    const milestoneNameLower = params.name.toLowerCase();
    let milestoneUpdated = false;

    const newMilestones = (currentState.character.milestones || []).map((milestone: CharacterMilestone) => {
        if (milestone.name.toLowerCase() === milestoneNameLower) {
            milestoneUpdated = true;
            // Trả về một đối tượng milestone mới với giá trị đã được cập nhật
            return { ...milestone, value: String(params.value) };
        }
        return milestone;
    });

    if (!milestoneUpdated) {
        console.warn(`Cố gắng cập nhật cột mốc không tồn tại: "${params.name}"`);
    }

    const newState = {
        ...currentState,
        character: {
            ...currentState.character,
            milestones: newMilestones,
        },
    };
    return { newState, vectorUpdates: [] };
}
