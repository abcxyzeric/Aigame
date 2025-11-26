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


// Hàm trợ giúp để phân tích giờ 12h/24h với các từ khóa sáng/chiều/tối
const parseHour = (hourStr: string, modifier?: string): number | null => {
    const hour = parseInt(hourStr, 10);
    if (isNaN(hour)) return null;

    const lowerModifier = modifier?.toLowerCase() || '';

    if (lowerModifier.includes('chiều') || lowerModifier.includes('tối')) {
        // Ví dụ: 1h chiều -> 13, 6h tối -> 18. 12h trưa/chiều vẫn là 12.
        if (hour < 12) return hour + 12;
    }
    // "sáng" hoặc định dạng 24h không cần thay đổi (12h đêm là 0)
    if (hour === 12 && (lowerModifier.includes('trưa') || lowerModifier.includes('sáng'))) return 12;
    if (hour === 12 && lowerModifier.includes('đêm')) return 0;
    
    return hour;
};

export const extractTimePassedFromText = (text: string, currentWorldTime: WorldTime): TimePassed => {
    const timePassed: TimePassed = {};
    const lowerText = text.toLowerCase();

    // --- 1. Dạng Định Lượng ---
    // Xử lý nhiều lần đề cập và cộng dồn chúng.
    // Hỗ trợ số nguyên và số thập phân (ví dụ: 2.5, 0.5)
    const durationPatterns: { regex: RegExp, unit: keyof TimePassed, multiplier: number }[] = [
        { regex: /(\d*\.?\d+)\s+năm/gi, unit: 'years', multiplier: 1 },
        { regex: /(\d*\.?\d+)\s+tháng/gi, unit: 'months', multiplier: 1 },
        { regex: /(\d*\.?\d+)\s+tuần/gi, unit: 'days', multiplier: 7 },
        { regex: /một\s+tuần/gi, unit: 'days', multiplier: 7 }, // Xử lý "một tuần"
        { regex: /(\d*\.?\d+)\s+ngày/gi, unit: 'days', multiplier: 1 },
        { regex: /(\d*\.?\d+)\s+giờ/gi, unit: 'hours', multiplier: 1 },
        { regex: /(\d*\.?\d+)\s+phút/gi, unit: 'minutes', multiplier: 1 },
        { regex: /nửa\s+ngày/gi, unit: 'hours', multiplier: 12 },
        { regex: /nửa\s+giờ/gi, unit: 'minutes', multiplier: 30 },
        { regex: /nửa\s+năm/gi, unit: 'months', multiplier: 6 },
    ];

    let foundDuration = false;
    for (const pattern of durationPatterns) {
        const matches = lowerText.matchAll(pattern.regex);
        for (const match of matches) {
            foundDuration = true;
            const valueStr = match[1] ?? '1'; // Mặc định là 1 cho các trường hợp như "một tuần"
            const value = parseFloat(valueStr);
            if (!isNaN(value)) {
                const totalValue = value * pattern.multiplier;
                const unitKey = pattern.unit;

                // Xử lý phần thập phân bằng cách chuyển đổi sang đơn vị nhỏ hơn
                const integerPart = Math.floor(totalValue);
                const decimalPart = totalValue - integerPart;

                (timePassed[unitKey] as number) = ((timePassed[unitKey] as number) || 0) + integerPart;

                if (decimalPart > 0) {
                    if (unitKey === 'days') {
                        timePassed.hours = (timePassed.hours || 0) + decimalPart * 24;
                    } else if (unitKey === 'hours') {
                        timePassed.minutes = (timePassed.minutes || 0) + decimalPart * 60;
                    }
                }
            }
        }
    }

    // Nếu tìm thấy một khoảng thời gian cụ thể, ưu tiên nó và dừng lại
    if(foundDuration) {
        if (timePassed.hours) {
            const hoursInt = Math.floor(timePassed.hours);
            const minutesFromHours = (timePassed.hours - hoursInt) * 60;
            timePassed.hours = hoursInt;
            timePassed.minutes = (timePassed.minutes || 0) + minutesFromHours;
        }
        if (timePassed.minutes) {
            timePassed.minutes = Math.round(timePassed.minutes);
        }
        return timePassed;
    }

    // --- 2. Dạng Khoảng (Range: "từ X đến Y") ---
    const rangeMatch = lowerText.match(/từ\s*(\d+)\s*(giờ|h)?\s*(sáng|chiều|tối|đêm)?\s*đến\s*(\d+)\s*(giờ|h)?\s*(sáng|chiều|tối|đêm)?/i);
    if (rangeMatch) {
        const startHourRaw = parseHour(rangeMatch[1], rangeMatch[3]);
        const endHourRaw = parseHour(rangeMatch[4], rangeMatch[6]);
        
        if (startHourRaw !== null && endHourRaw !== null) {
            let duration = endHourRaw - startHourRaw;
            if (duration <= 0) { // Xử lý qua đêm
                duration += 24;
            }
            if (duration > 0) {
                 timePassed.hours = (timePassed.hours || 0) + duration;
                 return timePassed; // Ưu tiên dạng khoảng
            }
        }
    }
    
    // --- 3. Dạng Mốc (Until) ---
    const milestoneHours: { [key: string]: number } = { 'sáng': 6, 'trưa': 12, 'chiều': 14, 'tối': 18, };
    const untilKeywordMatch = lowerText.match(/(?:đến|tới)\s+(sáng|trưa|chiều|tối)(?:\s+(mai))?/i);
    const untilTimeMatch = lowerText.match(/(?:đến|tới)\s*(\d+)\s*(giờ|h)?\s*(sáng|chiều|tối|đêm)?(?:\s+(mai))?/i);

    let targetHour: number | null = null;
    let isNextDay = false;

    if (untilKeywordMatch) {
        const keyword = untilKeywordMatch[1];
        targetHour = milestoneHours[keyword];
        if (untilKeywordMatch[2]) isNextDay = true; // "mai"
    } else if (untilTimeMatch) {
        targetHour = parseHour(untilTimeMatch[1], untilTimeMatch[3]);
        if (untilTimeMatch[4]) isNextDay = true; // "mai"
    }
    
    if (targetHour !== null) {
        const { year, month, day, hour, minute } = currentWorldTime;
        const currentDate = new Date(year, month - 1, day, hour, minute);
        let targetDate = new Date(year, month - 1, day, targetHour, 0);

        // Nếu giờ đích trong quá khứ so với hôm nay, hoặc có chữ "mai", chuyển sang ngày hôm sau
        if (isNextDay || targetDate <= currentDate) {
            targetDate.setDate(targetDate.getDate() + 1);
        }

        const diffMs = targetDate.getTime() - currentDate.getTime();
        if (diffMs > 0) {
            const totalMinutes = Math.round(diffMs / (1000 * 60));
            const days = Math.floor(totalMinutes / (60 * 24));
            const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
            const minutes = totalMinutes % 60;

            if (days > 0) timePassed.days = days;
            if (hours > 0) timePassed.hours = hours;
            if (minutes > 0) timePassed.minutes = minutes;
            return timePassed; // Ưu tiên dạng mốc
        }
    }

    return {}; // Trả về rỗng nếu không có gì khớp
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
