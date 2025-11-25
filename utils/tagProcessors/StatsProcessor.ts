// utils/tagProcessors/StatsProcessor.ts
import { GameState, CharacterStat, VectorUpdate } from '../../types';

/**
 * Tính toán một giá trị thay đổi ngẫu nhiên dựa trên mức độ và giá trị tối đa của chỉ số.
 * @param level - Mức độ thay đổi ('low', 'medium', 'high').
 * @param maxValue - Giá trị tối đa của chỉ số để tính toán %.
 * @returns Một số nguyên là giá trị thay đổi.
 */
function calculateFuzzyChange(level: 'low' | 'medium' | 'high', maxValue: number): number {
    let percentageMin = 0;
    let percentageMax = 0;

    switch (level) {
        case 'low':
            percentageMin = 0.05; // 5%
            percentageMax = 0.10; // 10%
            break;
        case 'medium':
            percentageMin = 0.15; // 15%
            percentageMax = 0.25; // 25%
            break;
        case 'high':
            percentageMin = 0.30; // 30%
            percentageMax = 0.50; // 50%
            break;
        default:
            return 0;
    }

    // Tạo một số ngẫu nhiên trong khoảng phần trăm đã định
    const randomPercentage = Math.random() * (percentageMax - percentageMin) + percentageMin;
    const change = Math.round(maxValue * randomPercentage);
    return Math.max(1, change); // Đảm bảo thay đổi ít nhất là 1
}

/**
 * Xử lý logic thay đổi chỉ số của nhân vật, bao gồm cả thay đổi chính xác và thay đổi "mờ".
 * @param currentState - Trạng thái game hiện tại.
 * @param params - Các tham số từ thẻ [STAT_CHANGE].
 * @returns Một đối tượng chứa trạng thái game mới và mảng vectorUpdates rỗng.
 */
export function processStatChange(currentState: GameState, params: any): { newState: GameState, vectorUpdates: VectorUpdate[] } {
    if (!params.name || (!params.amount && !params.level)) {
        console.warn('Bỏ qua thẻ [STAT_CHANGE] không hợp lệ:', params);
        return { newState: currentState, vectorUpdates: [] };
    }

    const newStats = [...(currentState.character.stats || [])];
    const statIndex = newStats.findIndex(stat => stat.name.toLowerCase() === params.name.toLowerCase());

    if (statIndex === -1) {
        console.warn(`Cố gắng thay đổi chỉ số không tồn tại: "${params.name}"`);
        return { newState: currentState, vectorUpdates: [] };
    }

    const statToUpdate = { ...newStats[statIndex] };
    let changeAmount = 0;

    if (params.level) {
        // Xử lý logic mờ
        const change = calculateFuzzyChange(params.level, statToUpdate.maxValue);
        changeAmount = (params.operation === 'add') ? change : -change;
    } else if (typeof params.amount !== 'undefined') {
        // Xử lý logic thay đổi chính xác
        let amount = Number(params.amount);
        if (isNaN(amount)) {
            console.warn(`Giá trị 'amount' không hợp lệ trong thẻ [STAT_CHANGE] cho chỉ số "${params.name}"`);
            return { newState: currentState, vectorUpdates: [] };
        }
        changeAmount = (params.operation === 'add') ? amount : -amount;
    } else {
         console.warn('Bỏ qua thẻ [STAT_CHANGE] không có amount hoặc level:', params);
         return { newState: currentState, vectorUpdates: [] };
    }


    // Cập nhật giá trị mới
    let newValue = statToUpdate.value + changeAmount;
    
    // Giới hạn giá trị trong khoảng [0, maxValue] nếu chỉ số có giới hạn
    if (statToUpdate.hasLimit !== false) {
        newValue = Math.max(0, Math.min(newValue, statToUpdate.maxValue));
    } else {
        // Đảm bảo chỉ số không giới hạn không bị âm
        newValue = Math.max(0, newValue);
    }

    statToUpdate.value = newValue;
    newStats[statIndex] = statToUpdate;

    const newState = {
        ...currentState,
        character: {
            ...currentState.character,
            stats: newStats,
        },
    };
    return { newState, vectorUpdates: [] };
}
