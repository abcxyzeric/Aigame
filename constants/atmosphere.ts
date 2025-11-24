import { NARRATIVE_ARCHETYPES } from './narrative_styles';

// Định nghĩa các kiểu dữ liệu
type Season = string;
type Weather = { type: string; weight: number };
type SeasonMap = { [month: number]: Season };
type WeatherMap = { [season: string]: Weather[] };
type ArchetypeConfig = { seasons: SeasonMap; weather: WeatherMap };

// Cấu hình cho từng archetype
const MODERN_CONFIG: ArchetypeConfig = {
  seasons: {
    1: 'Mùa Đông', 2: 'Mùa Đông', 3: 'Mùa Xuân', 4: 'Mùa Xuân', 5: 'Mùa Xuân',
    6: 'Mùa Hè', 7: 'Mùa Hè', 8: 'Mùa Hè', 9: 'Mùa Thu', 10: 'Mùa Thu',
    11: 'Mùa Thu', 12: 'Mùa Đông',
  },
  weather: {
    'Mùa Xuân': [
      { type: 'Nắng ấm', weight: 5 }, { type: 'Mưa phùn', weight: 3 },
      { type: 'Nhiều mây', weight: 2 }, { type: 'Gió nhẹ', weight: 2 },
    ],
    'Mùa Hè': [
      { type: 'Nắng gắt', weight: 6 }, { type: 'Mưa rào', weight: 3 },
      { type: 'Oi bức', weight: 2 }, { type: 'Giông bão', weight: 1 },
    ],
    'Mùa Thu': [
      { type: 'Trời trong xanh', weight: 5 }, { type: 'Se lạnh', weight: 3 },
      { type: 'Gió heo may', weight: 2 }, { type: 'Mưa ngâu', weight: 1 },
    ],
    'Mùa Đông': [
      { type: 'Lạnh giá', weight: 5 }, { type: 'Mưa rét', weight: 3 },
      { type: 'U ám', weight: 2 }, { type: 'Tuyết rơi', weight: 1 },
    ],
  },
};

const EASTERN_CONFIG: ArchetypeConfig = {
  seasons: {
    1: 'Tiết Hàn Phong', 2: 'Tiết Hàn Phong', 3: 'Mùa Xuân Sinh', 4: 'Mùa Xuân Sinh', 5: 'Mùa Xuân Sinh',
    6: 'Mùa Hạ Viêm', 7: 'Mùa Hạ Viêm', 8: 'Mùa Hạ Viêm', 9: 'Mùa Thu Sát', 10: 'Mùa Thu Sát',
    11: 'Mùa Thu Sát', 12: 'Tiết Hàn Phong',
  },
  weather: {
    'Mùa Xuân Sinh': [
      { type: 'Linh khí dồi dào', weight: 5 }, { type: 'Mưa bụi', weight: 3 },
      { type: 'Trời quang mây tạnh', weight: 2 }, { type: 'Gió nhẹ', weight: 2 },
    ],
    'Mùa Hạ Viêm': [
      { type: 'Nắng như thiêu đốt', weight: 4 }, { type: 'Linh khí bão táp', weight: 1 },
      { type: 'Mưa xối xả', weight: 2 }, { type: 'Oi bức, ngột ngạt', weight: 2 },
    ],
    'Mùa Thu Sát': [
      { type: 'Khí trời khô ráo', weight: 4 }, { type: 'Sát khí nồng đậm', weight: 1 },
      { type: 'Gió thu hiu hắt', weight: 3 }, { type: 'Âm u', weight: 2 },
    ],
    'Tiết Hàn Phong': [
      { type: 'Băng hàn thấu xương', weight: 4 }, { type: 'Tuyết rơi như lông ngỗng', weight: 3 },
      { type: 'Gió lạnh cắt da', weight: 2 }, { type: 'Trời đất u ám', weight: 1 },
    ],
  },
};

// Cấu hình mặc định
const DEFAULT_CONFIG = MODERN_CONFIG;

// Map các archetype với cấu hình tương ứng
export const ATMOSPHERE_CONFIG: Record<string, ArchetypeConfig> = {
  [NARRATIVE_ARCHETYPES.MODERN]: MODERN_CONFIG,
  [NARRATIVE_ARCHETYPES.EASTERN]: EASTERN_CONFIG,
  [NARRATIVE_ARCHETYPES.WESTERN]: { // Tương tự Modern nhưng có thể thêm các thời tiết fantasy
    ...MODERN_CONFIG,
    weather: {
      ...MODERN_CONFIG.weather,
      'Mùa Đông': [
        ...MODERN_CONFIG.weather['Mùa Đông'],
        { type: 'Bão tuyết ma thuật', weight: 1 },
      ],
      'Mùa Hè': [
        ...MODERN_CONFIG.weather['Mùa Hè'],
        { type: 'Mưa axit nhẹ', weight: 1 },
      ]
    }
  },
  [NARRATIVE_ARCHETYPES.DEFAULT]: DEFAULT_CONFIG,
};
