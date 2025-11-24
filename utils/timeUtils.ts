import { WorldTime, TimePassed } from '../types';
import { ATMOSPHERE_CONFIG } from '../constants/atmosphere';
import { NARRATIVE_ARCHETYPES } from '../constants/narrative_styles';

export const advanceTime = (currentTime: WorldTime, timePassed: TimePassed | {}): WorldTime => {
    if (!timePassed || Object.keys(timePassed).length === 0) return currentTime;

    const { years = 0, months = 0, days = 0, hours = 0, minutes = 0 } = timePassed as TimePassed;

    // Sử dụng JS Date để xử lý rollover một cách mạnh mẽ (ví dụ: 25 giờ -> +1 ngày, 1 giờ)
    // Tháng trong JS Date là 0-indexed, vì vậy trừ 1 khi đặt và cộng 1 khi lấy.
    const newDate = new Date(Date.UTC(
        currentTime.year, 
        currentTime.month - 1, 
        currentTime.day, 
        currentTime.hour,
        currentTime.minute
    ));

    if (years) newDate.setUTCFullYear(newDate.getUTCFullYear() + years);
    if (months) newDate.setUTCMonth(newDate.getUTCMonth() + months);
    if (days) newDate.setUTCDate(newDate.getUTCDate() + days);
    if (hours) newDate.setUTCHours(newDate.getUTCHours() + hours);
    if (minutes) newDate.setUTCMinutes(newDate.getUTCMinutes() + minutes);

    return { 
        year: newDate.getUTCFullYear(), 
        month: newDate.getUTCMonth() + 1, 
        day: newDate.getUTCDate(), 
        hour: newDate.getUTCHours(),
        minute: newDate.getUTCMinutes(),
    };
};

export const getTimeOfDay = (hour: number): string => {
    if (hour >= 5 && hour < 11) return 'Buổi Sáng';
    if (hour >= 11 && hour < 14) return 'Buổi Trưa';
    if (hour >= 14 && hour < 18) return 'Buổi Chiều';
    if (hour >= 18 && hour < 22) return 'Buổi Tối';
    return 'Ban Đêm';
};


export const extractTimePassedFromText = (text: string): TimePassed => {
    const timePassed: TimePassed = {};
    const patterns = [
        { regex: /(\d+)\s+nghìn\s+năm/i, unit: 'years', multiplier: 1000 },
        { regex: /(\d+)\s+năm/i, unit: 'years', multiplier: 1 },
        { regex: /(\d+)\s+tháng/i, unit: 'months', multiplier: 1 },
        { regex: /(\d+)\s+ngày/i, unit: 'days', multiplier: 1 },
        { regex: /(\d+)\s+giờ/i, unit: 'hours', multiplier: 1 },
        { regex: /(\d+)\s+phút/i, unit: 'minutes', multiplier: 1 },
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern.regex);
        if (match) {
            const value = parseInt(match[1], 10) * pattern.multiplier;
            const unitKey = pattern.unit as keyof TimePassed;
            (timePassed[unitKey] as number) = ((timePassed[unitKey] as number) || 0) + value;
        }
    }

    return timePassed;
};

export const getSeason = (month: number, archetype: string): string => {
    const config = ATMOSPHERE_CONFIG[archetype] || ATMOSPHERE_CONFIG[NARRATIVE_ARCHETYPES.DEFAULT];
    return config.seasons[month] || 'Không xác định';
};

export const generateWeather = (season: string, archetype: string): string => {
    const config = ATMOSPHERE_CONFIG[archetype] || ATMOSPHERE_CONFIG[NARRATIVE_ARCHETYPES.DEFAULT];
    const weatherOptions = config.weather[season];

    if (!weatherOptions || weatherOptions.length === 0) {
        return 'Bình thường';
    }

    const totalWeight = weatherOptions.reduce((sum, weather) => sum + weather.weight, 0);
    let random = Math.random() * totalWeight;

    for (const weather of weatherOptions) {
        if (random < weather.weight) {
            return weather.type;
        }
        random -= weather.weight;
    }

    return weatherOptions[0].type; // Fallback
};

export const shouldWeatherUpdate = (timePassed: TimePassed, oldTime: WorldTime, newTime: WorldTime): boolean => {
    if (!timePassed || Object.keys(timePassed).length === 0) {
        return false;
    }
    const totalMinutesPassed = (timePassed.days || 0) * 24 * 60 + (timePassed.hours || 0) * 60 + (timePassed.minutes || 0);

    // Cập nhật nếu trôi qua hơn một giờ hoặc nếu ngày thay đổi
    return totalMinutesPassed >= 60 || oldTime.day !== newTime.day || oldTime.month !== newTime.month || oldTime.year !== newTime.year;
};
