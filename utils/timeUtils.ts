import { WorldTime, TimePassed } from '../types';

export const advanceTime = (currentTime: WorldTime, timePassed: TimePassed | {}): WorldTime => {
    if (!timePassed || Object.keys(timePassed).length === 0) return currentTime;

    const { years = 0, months = 0, days = 0, hours = 0, minutes = 0 } = timePassed as TimePassed;

    // Use JS Date for robust handling of rollovers (e.g., 25 hours -> +1 day, 1 hour)
    // Month is 0-indexed in JS Date, so subtract 1 when setting and add 1 when getting.
    const newDate = new Date(Date.UTC(
        currentTime.year, 
        currentTime.month - 1, 
        currentTime.day, 
        currentTime.hour
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
        hour: newDate.getUTCHours() 
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