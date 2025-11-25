// utils/tagProcessors/TimeProcessor.ts
import { GameState, TimePassed, VectorUpdate } from '../../types';
import { advanceTime, getSeason, generateWeather, shouldWeatherUpdate } from '../timeUtils';
import { resolveGenreArchetype } from '../genreUtils';

/**
 * Chuyển đổi khoảng thời gian "mờ" ('short', 'medium', 'long') thành một số phút ngẫu nhiên trong một khoảng xác định.
 * @param duration - Khoảng thời gian mờ.
 * @returns Số phút ngẫu nhiên.
 */
function fuzzyDurationToMinutes(duration: 'short' | 'medium' | 'long'): number {
    switch (duration) {
        case 'short':
            return Math.floor(Math.random() * (15 - 5 + 1)) + 5; // 5-15 phút
        case 'medium':
            return Math.floor(Math.random() * (60 - 30 + 1)) + 30; // 30-60 phút
        case 'long':
            return Math.floor(Math.random() * (240 - 120 + 1)) + 120; // 2-4 giờ
        default:
            return 0;
    }
}

/**
 * Xử lý logic thời gian trôi qua trong game.
 * @param currentState - Trạng thái game hiện tại.
 * @param params - Các tham số từ thẻ [TIME_PASS].
 * @returns Một đối tượng chứa trạng thái game mới và mảng vectorUpdates rỗng.
 */
export function processTimePass(currentState: GameState, params: any): { newState: GameState, vectorUpdates: VectorUpdate[] } {
    let timePassed: TimePassed = {};

    // Xác định thời gian trôi qua từ tham số 'duration' hoặc các tham số cụ thể
    if (params.duration) {
        const minutes = fuzzyDurationToMinutes(params.duration);
        timePassed = { minutes };
    } else if (params.minutes || params.hours || params.days) {
        timePassed = {
            minutes: Number(params.minutes) || 0,
            hours: Number(params.hours) || 0,
            days: Number(params.days) || 0,
        };
    } else {
        console.warn('Bỏ qua thẻ [TIME_PASS] không hợp lệ:', params);
        return { newState: currentState, vectorUpdates: [] };
    }

    const oldTime = currentState.worldTime;
    // Sử dụng hàm tiện ích để tính toán thời gian mới
    const newWorldTime = advanceTime(oldTime, timePassed);

    let newSeason = currentState.season;
    let newWeather = currentState.weather;

    // Tự động cập nhật mùa và thời tiết nếu cần thiết (ví dụ: qua ngày mới, qua giờ)
    if (shouldWeatherUpdate(timePassed, oldTime, newWorldTime)) {
        const archetype = resolveGenreArchetype(currentState.worldConfig.storyContext.genre);
        newSeason = getSeason(newWorldTime.month, archetype);
        newWeather = generateWeather(newSeason, archetype);
    }
    
    const newState = {
        ...currentState,
        worldTime: newWorldTime,
        season: newSeason,
        weather: newWeather,
    };
    return { newState, vectorUpdates: [] };
}
