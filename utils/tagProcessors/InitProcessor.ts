// utils/tagProcessors/InitProcessor.ts
import { GameState, CharacterStat, WorldTime, VectorUpdate } from '../../types';
import { mergeAndDeduplicateByName } from '../arrayUtils';
import { getReputationTier } from '../reputationUtils';

/**
 * Xử lý logic khởi tạo một chỉ số cho nhân vật ở đầu game.
 * @param currentState - Trạng thái game hiện tại.
 * @param params - Các tham số từ thẻ [PLAYER_STATS_INIT].
 * @returns Một đối tượng chứa trạng thái game mới và mảng vectorUpdates rỗng.
 */
export function processPlayerStatsInit(currentState: GameState, params: any): { newState: GameState, vectorUpdates: VectorUpdate[] } {
    if (!params.name) {
        console.warn('Bỏ qua thẻ [PLAYER_STATS_INIT] không hợp lệ:', params);
        return { newState: currentState, vectorUpdates: [] };
    }
    
    const newStat: CharacterStat = {
        name: params.name,
        value: Number(params.value) || 0,
        maxValue: Number(params.maxValue) || 100,
        isPercentage: params.isPercentage === true,
        description: params.description || '',
        hasLimit: params.hasLimit !== false, // Mặc định là true
    };
    
    const updatedStats = mergeAndDeduplicateByName(currentState.character.stats || [], [newStat]);

    const newState = {
        ...currentState,
        character: {
            ...currentState.character,
            stats: updatedStats,
        },
    };
    return { newState, vectorUpdates: [] };
}

/**
 * Xử lý logic thiết lập thời gian bắt đầu của thế giới.
 * @param currentState - Trạng thái game hiện tại.
 * @param params - Các tham số từ thẻ [WORLD_TIME_SET].
 * @returns Một đối tượng chứa trạng thái game mới và mảng vectorUpdates rỗng.
 */
export function processWorldTimeSet(currentState: GameState, params: any): { newState: GameState, vectorUpdates: VectorUpdate[] } {
    const newTime: WorldTime = {
        year: Number(params.year) || currentState.worldTime.year,
        month: Number(params.month) || currentState.worldTime.month,
        day: Number(params.day) || currentState.worldTime.day,
        hour: Number(params.hour) || currentState.worldTime.hour,
        minute: Number(params.minute) || 0,
    };

    const newState = {
        ...currentState,
        worldTime: newTime,
    };
    return { newState, vectorUpdates: [] };
}

/**
 * Xử lý logic thiết lập 5 cấp bậc danh vọng cho thế giới.
 * @param currentState - Trạng thái game hiện tại.
 * @param params - Các tham số từ thẻ [REPUTATION_TIERS_SET].
 * @returns Một đối tượng chứa trạng thái game mới và mảng vectorUpdates rỗng.
 */
export function processReputationTiersSet(currentState: GameState, params: any): { newState: GameState, vectorUpdates: VectorUpdate[] } {
    let tiers: string[] = [];
    if (typeof params.tiers === 'string') {
        tiers = params.tiers.split(',').map((t:string) => t.trim()).filter(Boolean);
    }

    if (tiers.length !== 5) {
        console.warn('Thẻ [REPUTATION_TIERS_SET] phải chứa đúng 5 cấp bậc. Sử dụng giá trị mặc định.', params);
        return { newState: currentState, vectorUpdates: [] };
    }

    // Cập nhật lại tier hiện tại dựa trên score và các tier mới
    const newTierName = getReputationTier(currentState.reputation.score, tiers);

    const newState = {
        ...currentState,
        reputationTiers: tiers,
        reputation: {
            ...currentState.reputation,
            tier: newTierName,
        }
    };
    return { newState, vectorUpdates: [] };
}
