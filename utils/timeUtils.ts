import { WorldTime, TimePassed } from '../types';

export const advanceTime = (currentTime: WorldTime, timePassed: TimePassed | {}): WorldTime => {
    if (!timePassed || Object.keys(timePassed).length === 0) return currentTime;

    const { years = 0, months = 0, days = 0, hours = 0, minutes = 0 } = timePassed as TimePassed;

    // Sử dụng đối tượng Date của JS để xử lý các trường hợp vượt ngưỡng (vd: 25 giờ -> +1 ngày, 1 giờ)
    // Tháng trong JS Date là 0-indexed, nên trừ 1 khi thiết lập và cộng 1 khi lấy ra.
    const newDate = new Date(Date.UTC(
        currentTime.year, 
        currentTime.month - 1, 
        currentTime.day, 
        currentTime.hour,
        currentTime.minute // Thêm phút
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
        minute: newDate.getUTCMinutes(), // Lấy phút
        // Giữ lại mùa và thời tiết từ thời gian cũ, chúng sẽ được tính toán lại sau
        season: currentTime.season,
        weather: currentTime.weather,
    };
};

export const getTimeOfDay = (hour: number): string => {
    if (hour >= 6 && hour < 12) return 'Sáng';
    if (hour >= 12 && hour < 14) return 'Trưa';
    if (hour >= 14 && hour < 18) return 'Chiều';
    if (hour >= 18 && hour < 22) return 'Tối';
    return 'Đêm';
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

export const shouldWeatherUpdate = (oldTime: WorldTime, newTime: WorldTime): boolean => {
    // Nếu là ngày, tháng, hoặc năm mới, cập nhật thời tiết
    if (newTime.day !== oldTime.day || newTime.month !== oldTime.month || newTime.year !== oldTime.year) {
        return true;
    }
    // Nếu hơn một giờ đã trôi qua trong cùng một ngày, cập nhật thời tiết
    const oldTimeInMinutes = oldTime.hour * 60 + oldTime.minute;
    const newTimeInMinutes = newTime.hour * 60 + newTime.minute;
    if (newTimeInMinutes - oldTimeInMinutes >= 60) {
        return true;
    }
    return false;
};
