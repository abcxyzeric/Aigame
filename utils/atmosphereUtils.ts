import { resolveGenreArchetype } from './genreUtils';
import { NARRATIVE_ARCHETYPES } from '../constants/narrative_styles';

// Cấu hình mùa cho một năm 4 mùa tiêu chuẩn
const MODERN_SEASONS = [
    { name: 'Mùa Đông', months: [12, 1, 2] },
    { name: 'Mùa Xuân', months: [3, 4, 5] },
    { name: 'Mùa Hạ', months: [6, 7, 8] },
    { name: 'Mùa Thu', months: [9, 10, 11] },
];

// Tỷ lệ xác suất thời tiết theo mùa
const MODERN_WEATHER: Record<string, { weather: string, weight: number }[]> = {
    'Mùa Đông': [
        { weather: 'Tuyết rơi nhẹ', weight: 20 },
        { weather: 'Trời nhiều mây, u ám', weight: 30 },
        { weather: 'Lạnh giá, trời quang đãng', weight: 40 },
        { weather: 'Bão tuyết', weight: 5 },
        { weather: 'Mưa phùn lạnh', weight: 5 },
    ],
    'Mùa Xuân': [
        { weather: 'Trời quang đãng, gió nhẹ', weight: 40 },
        { weather: 'Mưa rào bất chợt', weight: 25 },
        { weather: 'Ấm áp, trời trong', weight: 25 },
        { weather: 'Nhiều mây', weight: 10 },
    ],
    'Mùa Hạ': [
        { weather: 'Nắng gắt, oi bức', weight: 40 },
        { weather: 'Nóng ẩm, nhiều mây', weight: 20 },
        { weather: 'Giông bão buổi chiều', weight: 25 },
        { weather: 'Trời quang, gió nam mát mẻ', weight: 15 },
    ],
    'Mùa Thu': [
        { weather: 'Mát mẻ, trời trong xanh', weight: 50 },
        { weather: 'Gió heo may se lạnh', weight: 20 },
        { weather: 'Mưa lất phất', weight: 20 },
        { weather: 'Sương mù buổi sáng', weight: 10 },
    ],
};

const EASTERN_WEATHER: Record<string, { weather: string, weight: number }[]> = {
    'Mùa Đông': [
        { weather: 'Tuyết trắng bao phủ, hàn khí thấu xương', weight: 30 },
        { weather: 'Âm u, tử khí nồng đậm', weight: 20 },
        { weather: 'Trời quang, nhưng hàn khí vẫn bức người', weight: 40 },
        { weather: 'Bão tuyết, linh khí hỗn loạn', weight: 10 },
    ],
    'Mùa Xuân': [
        { weather: 'Linh khí dồi dào, vạn vật sinh sôi', weight: 50 },
        { weather: 'Mưa bụi lất phất, thấm đượm linh khí', weight: 30 },
        { weather: 'Gió nhẹ thổi, hoa đào khoe sắc', weight: 20 },
    ],
    'Mùa Hạ': [
        { weather: 'Dương khí cực thịnh, nóng như thiêu đốt', weight: 40 },
        { weather: 'Linh khí bão táp, sấm sét vang trời', weight: 30 },
        { weather: 'Oi bức, không một gợn gió', weight: 30 },
    ],
    'Mùa Thu': [
        { weather: 'Trời cao xanh ngắt, khí trời mát mẻ', weight: 60 },
        { weather: 'Gió thu hiu hắt, lá vàng rơi rụng', weight: 30 },
        { weather: 'Sương giăng mờ ảo, thích hợp ẩn tu', weight: 10 },
    ],
};

// Hiện tại, các thể loại Western và Default có thể tái sử dụng cài đặt của Modern.
const GENRE_SETTINGS_MAP = {
    [NARRATIVE_ARCHETYPES.MODERN]: { seasons: MODERN_SEASONS, weather: MODERN_WEATHER },
    [NARRATIVE_ARCHETYPES.EASTERN]: { seasons: MODERN_SEASONS, weather: EASTERN_WEATHER },
    [NARRATIVE_ARCHETYPES.WESTERN]: { seasons: MODERN_SEASONS, weather: MODERN_WEATHER },
    [NARRATIVE_ARCHETYPES.DEFAULT]: { seasons: MODERN_SEASONS, weather: MODERN_WEATHER },
};

export function getSeason(month: number, genre: string): string {
    const archetype = resolveGenreArchetype(genre);
    const settings = GENRE_SETTINGS_MAP[archetype] || GENRE_SETTINGS_MAP[NARRATIVE_ARCHETYPES.DEFAULT];
    const season = settings.seasons.find(s => s.months.includes(month));
    return season ? season.name : settings.seasons[1].name; // Mặc định là Mùa Xuân
}

function selectWeightedRandom(options: { weather: string, weight: number }[]): string {
    const totalWeight = options.reduce((sum, option) => sum + option.weight, 0);
    let random = Math.random() * totalWeight;

    for (const option of options) {
        if (random < option.weight) {
            return option.weather;
        }
        random -= option.weight;
    }
    return options[0]?.weather || 'Trời quang đãng'; // Fallback
}


export function generateWeather(season: string, genre: string): string {
    const archetype = resolveGenreArchetype(genre);
    const settings = GENRE_SETTINGS_MAP[archetype] || GENRE_SETTINGS_MAP[NARRATIVE_ARCHETYPES.DEFAULT];
    const weatherOptions = settings.weather[season];

    if (!weatherOptions) {
        // Fallback về thời tiết chung nếu không tìm thấy mùa
        return 'Thời tiết ổn định';
    }

    return selectWeightedRandom(weatherOptions);
}
