// utils/tagProcessors/ReputationProcessor.ts
import { GameState, VectorUpdate } from '../../types';
import { getReputationTier } from '../reputationUtils';

/**
 * Xử lý logic thay đổi điểm danh vọng của người chơi.
 * @param currentState - Trạng thái game hiện tại.
 * @param params - Các tham số từ thẻ [REPUTATION_CHANGED].
 * @returns Một đối tượng chứa trạng thái game mới và mảng vectorUpdates rỗng.
 */
export function processReputationChange(currentState: GameState, params: any): { newState: GameState, vectorUpdates: VectorUpdate[] } {
    const scoreChange = Number(params.score);

    if (isNaN(scoreChange)) {
        console.warn('Bỏ qua thẻ [REPUTATION_CHANGED] với giá trị score không hợp lệ:', params);
        return { newState: currentState, vectorUpdates: [] };
    }

    // Đảm bảo có 5 cấp bậc danh vọng trước khi tính toán
    if (!currentState.reputationTiers || currentState.reputationTiers.length !== 5) {
        console.warn('Không thể cập nhật danh vọng vì reputationTiers chưa được thiết lập hoặc không hợp lệ.');
        return { newState: currentState, vectorUpdates: [] };
    }

    const currentScore = currentState.reputation.score;
    // Tính điểm mới và giới hạn trong khoảng [-100, 100]
    const newScore = Math.max(-100, Math.min(100, currentScore + scoreChange));
    // Lấy cấp bậc mới dựa trên điểm số mới
    const newTier = getReputationTier(newScore, currentState.reputationTiers);
    
    const newState = {
        ...currentState,
        reputation: {
            score: newScore,
            tier: newTier,
        },
    };
    return { newState, vectorUpdates: [] };
}
