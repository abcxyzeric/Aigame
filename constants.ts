import { WorldConfig, HarmCategory, HarmBlockThreshold, SafetySettingsConfig, SafetySetting, RagSettings, AiPerformanceSettings, CharacterStat } from './types';

export const GENDER_OPTIONS = ['Không xác định (Để AI quyết định)', 'Nam', 'Nữ', 'Khác'];
export const PERSONALITY_OPTIONS = [
    'Tuỳ chỉnh',
    'Dũng Cảm, Bộc Trực',
    'Thận Trọng, Đa Nghi',
    'Lạnh Lùng, Ít Nói',
    'Hài Hước, Thích Trêu Chọc',
    'Nhân Hậu, Vị Tha',
    'Trầm Tĩnh, Thích Quan Sát',
    'Nhút Nhát, Hay Lo Sợ',
    'Tò Mò, Thích Khám Phá',
    'Trung Thành, Đáng Tin Cậy',
    'Lãng Mạn, Mơ Mộng',
    'Thực Dụng, Coi Trọng Lợi Ích',
    'Chính Trực, Ghét Sự Giả Dối',
    'Hoài Nghi, Luôn Đặt Câu Hỏi',
    'Lạc Quan, Luôn Nhìn Về Phía Trước',
    'Lý Trí, Giỏi Phân Tích',
    'Nghệ Sĩ, Tâm Hồn Bay Bổng',
];

export const DIFFICULTY_OPTIONS = [
    'Dễ - Dành cho người mới',
    'Thường - Cân bằng, phù hợp đa số',
    'Khó - Thử thách cao, cần tính toán',
    'Ác Mộng - Cực kỳ khó',
    'Tuỳ Chỉnh AI - Để AI mô tả'
];

export const SEXUAL_CONTENT_STYLE_OPTIONS = ['Hoa mỹ', 'Trần tục', 'Gợi cảm'];
export const VIOLENCE_LEVEL_OPTIONS = ['Nhẹ nhàng', 'Thực tế', 'Cực đoan'];
export const STORY_TONE_OPTIONS = ['Tích cực', 'Trung tính', 'Đen tối', 'Dâm dục'];
export const AI_RESPONSE_LENGTH_OPTIONS = ['Mặc định', 'Ngắn', 'Trung bình', 'Chi tiết, dài'];

export const ENTITY_TYPE_OPTIONS = [
    'NPC', 
    'Địa điểm', 
    'Vật phẩm', 
    'Phe phái/Thế lực', 
    'Cảnh giới', 
    'Công pháp / Kỹ năng',
    'Hệ thống sức mạnh / Lore'
];

export const DEFAULT_STATS: CharacterStat[] = [
  { name: 'Sinh Lực', value: 100, maxValue: 100, isPercentage: true, description: 'Đại diện cho sức sống. Bị trừ khi bị thương. Về 0 sẽ chết/gục.', hasLimit: true },
  { name: 'Thể Lực', value: 100, maxValue: 100, isPercentage: true, description: 'Đại diện cho sức bền. Bị trừ khi vận động mạnh. Hồi phục khi nghỉ.', hasLimit: true },
];

export const DEFAULT_WORLD_CONFIG: WorldConfig = {
  storyContext: {
    worldName: '',
    genre: '',
    setting: '',
  },
  character: {
    name: '',
    personality: PERSONALITY_OPTIONS[0],
    customPersonality: '',
    gender: GENDER_OPTIONS[0],
    bio: '',
    skills: [],
    stats: DEFAULT_STATS,
    motivation: '',
  },
  difficulty: DIFFICULTY_OPTIONS[1],
  aiResponseLength: AI_RESPONSE_LENGTH_OPTIONS[0],
  backgroundKnowledge: [],
  allowAdultContent: false,
  sexualContentStyle: SEXUAL_CONTENT_STYLE_OPTIONS[0],
  violenceLevel: VIOLENCE_LEVEL_OPTIONS[0],
  storyTone: STORY_TONE_OPTIONS[1],
  enableStatsSystem: true,
  coreRules: [],
  initialEntities: [],
  temporaryRules: [],
};


// Safety Settings Constants
export const HARM_CATEGORIES: { [key in HarmCategory]: string } = {
  [HarmCategory.HARM_CATEGORY_HARASSMENT]: 'Quấy rối',
  [HarmCategory.HARM_CATEGORY_HATE_SPEECH]: 'Lời nói hận thù',
  [HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT]: 'Nội dung khiêu dâm',
  [HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT]: 'Nội dung nguy hiểm',
};

export const HARM_BLOCK_THRESHOLDS: { [key in HarmBlockThreshold]: string } = {
  [HarmBlockThreshold.BLOCK_NONE]: 'Tắt bộ lọc (Không chặn)',
  // FIX: Corrected typo from HarmBlockBlockThreshold to HarmBlockThreshold.
  [HarmBlockThreshold.BLOCK_ONLY_HIGH]: 'Chỉ chặn mức cao',
  [HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE]: 'Chặn từ mức trung bình',
  [HarmBlockThreshold.BLOCK_LOW_AND_ABOVE]: 'Chặn cả mức thấp (nghiêm ngặt nhất)',
};

export const DEFAULT_SAFETY_SETTINGS: SafetySettingsConfig = {
    enabled: false,
    settings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ]
};

export const DEFAULT_RAG_SETTINGS: RagSettings = {
  summaryFrequency: 10,
  topK: 5,
  summarizeBeforeRag: true,
};

export const DEFAULT_AI_PERFORMANCE_SETTINGS: AiPerformanceSettings = {
  maxOutputTokens: 8000,
  thinkingBudget: 1200,
  jsonBuffer: 1024,
};