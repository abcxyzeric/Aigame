

export interface CharacterStat {
  name: string;
  value: number;
  maxValue: number;
  isPercentage: boolean;
  description?: string;
  hasLimit?: boolean;
}

// Thêm interface mới cho các chỉ số dạng chữ (Cột mốc)
export interface CharacterMilestone {
  name: string; // Tên của cột mốc. VD: "Cảnh giới", "Thân phận", "Công pháp chính"
  value: string; // Giá trị hiện tại của cột mốc. VD: "Trúc Cơ", "Nội môn Đệ tử", "Vạn Kiếm Quy Tông"
  description: string; // Giải thích cho AI biết ý nghĩa của cột mốc này.
  category: string; // Phân loại để dễ quản lý. VD: "Tu Luyện", "Thế Lực", "Thân Thể"
}

// Định nghĩa các loại thực thể cốt lõi mà hệ thống có thể xử lý.
export type CoreEntityType = 'NPC' | 'Vật phẩm' | 'Địa điểm' | 'Phe phái/Thế lực' | 'Hệ thống sức mạnh / Lore';

export interface InitialEntity {
  name: string;
  type: CoreEntityType; // BẮT BUỘC: Chỉ được thuộc nhóm cứng để code xử lý.
  personality?: string;
  description: string;
  tags?: string[];
  customCategory?: string; // TÙY CHỌN: Chứa chuỗi tự do (VD: 'Cảnh giới', 'Mạng xã hội').
  locationId?: string; // Vị trí của thực thể
  details?: {
    subType?: string;
    rarity?: string;
    stats?: string;
    effects?: string;
  };
}

export interface CharacterConfig {
  name: string;
  personality: string;
  customPersonality?: string;
  gender: string;
  bio: string;
  skills: {
    name:string;
    description: string;
  }[];
  stats: CharacterStat[];
  milestones: CharacterMilestone[]; // << THÊM TRƯỜNG MỚI NÀY
  motivation: string;
}

export interface TemporaryRule {
  text: string;
  enabled: boolean;
}

export interface WorldConfig {
  storyContext: {
    worldName: string;
    genre: string;
    setting: string;
  };
  character: CharacterConfig;
  difficulty: string;
  aiResponseLength?: string;
  backgroundKnowledge?: { name: string; content: string }[];
  allowAdultContent: boolean;
  sexualContentStyle?: string;
  violenceLevel?: string;
  storyTone?: string;
  enableStatsSystem: boolean;
  enableMilestoneSystem: boolean; // Thêm trường mới
  coreRules: string[];
  initialEntities: InitialEntity[];
  temporaryRules: TemporaryRule[];
}

export enum HarmCategory {
  HARM_CATEGORY_HARASSMENT = 'HARM_CATEGORY_HARASSMENT',
  HARM_CATEGORY_HATE_SPEECH = 'HARM_CATEGORY_HATE_SPEECH',
  HARM_CATEGORY_SEXUALLY_EXPLICIT = 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  HARM_CATEGORY_DANGEROUS_CONTENT = 'HARM_CATEGORY_DANGEROUS_CONTENT',
}

export enum HarmBlockThreshold {
  BLOCK_NONE = 'BLOCK_NONE',
  BLOCK_ONLY_HIGH = 'BLOCK_ONLY_HIGH',
  BLOCK_MEDIUM_AND_ABOVE = 'BLOCK_MEDIUM_AND_ABOVE',
  BLOCK_LOW_AND_ABOVE = 'BLOCK_LOW_AND_ABOVE',
}

export type SafetySetting = {
  category: HarmCategory;
  threshold: HarmBlockThreshold;
};

export interface SafetySettingsConfig {
    enabled: boolean;
    settings: SafetySetting[];
}

export interface ApiKeyStorage {
  keys: string[];
}

export interface RagSettings {
  summaryFrequency: number;
  topK: number;
  summarizeBeforeRag: boolean;
}

export interface AiPerformanceSettings {
  maxOutputTokens: number;
  thinkingBudget: number;
  jsonBuffer: number;
  selectedModel?: string;
}

export interface AppSettings {
  apiKeyConfig: ApiKeyStorage;
  safetySettings: SafetySettingsConfig;
  ragSettings: RagSettings;
  aiPerformanceSettings: AiPerformanceSettings;
}

export interface GameTurn {
  type: 'narration' | 'action';
  content: string;
  metadata?: {
    isSummaryTurn?: boolean;
    addedMemoryCount?: number;
  }
}

export interface StatusEffect {
  name: string;
  description: string;
  type: 'buff' | 'debuff';
}

export interface GameItem {
  name: string;
  description: string;
  quantity: number;
  tags?: string[];
  customCategory?: string; // Phân loại động từ AI
  details?: {
    subType?: string;
    rarity?: string;
    stats?: string;
    effects?: string;
  };
}

export interface Companion {
    name: string;
    description: string;
    personality?: string;
    tags?: string[];
    customCategory?: string; // Phân loại động từ AI
}

export interface Quest {
    name: string;
    description: string;
    status: 'đang tiến hành' | 'hoàn thành';
    tags?: string[];
    customCategory?: string; // Phân loại động từ AI
}

export interface EncounteredNPC {
    name: string;
    description: string;
    personality: string;
    thoughtsOnPlayer: string;
    tags?: string[];
    memoryFlags?: Record<string, boolean | string | number>;
    customCategory?: string; // Phân loại động từ AI
    locationId?: string; // Vị trí của NPC
    physicalState?: string; // Trạng thái vật lý/ngoại hình hiện tại
}

export interface EncounteredFaction {
    name: string;
    description: string;
    tags?: string[];
    customCategory?: string; // Phân loại động từ AI
}

export interface WorldTime {
  year: number;
  month: number;
  day: number;
  hour: number; // 0-23
  minute: number; // 0-59
}

export interface Reputation {
  score: number; // -100 to 100
  tier: string;
}

export interface NpcDossier {
  fresh: number[]; // Mảng các index trong history
  archived: string[]; // Mảng các tóm tắt sự kiện cũ
}

// --- PIGGYBACK VECTORIZATION TYPES ---
export interface PendingVectorItem {
  id: string | number; // turnIndex cho Turn, name cho Entity
  type: string; // 'Turn' | 'Entity' | 'NPC' | 'Item' ...
  content: string; // Nội dung văn bản cần vector hóa
}

export interface GameState {
  worldId?: number; // Dấu vân tay định danh cho phiên chơi
  worldConfig: WorldConfig;
  character: CharacterConfig;
  history: GameTurn[];
  memories: string[];
  summaries: string[];
  playerStatus: StatusEffect[];
  inventory: GameItem[];
  encounteredNPCs: EncounteredNPC[];
  encounteredFactions: EncounteredFaction[];
  discoveredEntities: InitialEntity[];
  companions: Companion[];
  quests: Quest[];
  suggestions?: ActionSuggestion[];
  worldTime: WorldTime;
  reputation: Reputation;
  reputationTiers: string[]; // 5 tiers from most infamous to most famous
  season: string;
  weather: string;
  npcDossiers?: Record<string, NpcDossier>; // Hồ sơ tương tác với NPC, key là tên NPC (lowercase)
  currentLocationId?: string; // Vị trí hiện tại của người chơi
  
  // Hàng đợi các mục cần vector hóa (Ký gửi cho lượt sau)
  pendingVectorBuffer?: PendingVectorItem[];
}

export interface SaveSlot extends GameState {
  saveId: number; // Using Date.now()
  saveDate: string; // ISO String for display
  previewText: string;
  worldName: string;
  saveType: 'manual' | 'auto';
}

export interface FandomFile {
  id: number; // Date.now()
  name: string;
  content: string;
  date: string; // ISO String
}

export interface ActionSuggestion {
  description: string;
  successRate: number;
  risk: string;
  reward: string;
}

export interface AiTurnResponse {
  narration: string;
  suggestions: ActionSuggestion[];
  newSummary?: string;
}

export interface TimePassed {
  years?: number;
  months?: number;
  days?: number;
  hours?: number;
  minutes?: number;
}

export interface StartGameResponse {
  narration: string;
  suggestions: ActionSuggestion[];
  initialPlayerStatus?: StatusEffect[];
  initialInventory?: GameItem[];
  initialWorldTime?: WorldTime;
  timePassed?: TimePassed;
  reputationChange?: {
    score: number;
    reason: string;
  };
  reputationTiers?: string[];
}

// For dynamic, turn-by-turn state changes
export interface DynamicStateUpdateResponse {
    updatedInventory?: GameItem[];
    updatedPlayerStatus?: StatusEffect[];
    updatedCompanions?: Companion[];
    updatedQuests?: Quest[];
    updatedStats?: CharacterStat[];
}

// For static/encyclopedic knowledge
export interface EncyclopediaEntriesUpdateResponse {
    updatedEncounteredNPCs?: EncounteredNPC[];
    updatedEncounteredFactions?: EncounteredFaction[];
    updatedDiscoveredEntities?: InitialEntity[];
}

// For player character's long-term state
export interface CharacterStateUpdateResponse {
    updatedCharacter?: Partial<Pick<CharacterConfig, 'bio' | 'motivation'>>;
    updatedSkills?: { name: string; description: string; }[];
    newMemories?: string[];
    timePassed?: TimePassed;
    reputationChange?: {
        score: number;
        reason: string;
    };
}

export interface EncyclopediaData {
  encounteredNPCs: EncounteredNPC[];
  encounteredFactions: EncounteredFaction[];
  discoveredEntities: InitialEntity[];
  inventory: GameItem[];
  companions: Companion[];
  quests: Quest[];
  skills: { name: string; description: string; }[];
}

export interface EncyclopediaOptimizationResponse {
    optimizedNPCs: EncounteredNPC[];
    optimizedFactions: EncounteredFaction[];
    optimizedDiscoveredEntities: InitialEntity[];
    optimizedInventory: GameItem[];
    optimizedCompanions: Companion[];
    optimizedQuests: Quest[];
    optimizedSkills: { name: string; description: string; }[];
}


export interface StyleGuideVector {
    pronoun_rules: string;
    exclusion_list: string[];
}

export interface FandomDatasetChunk {
  id: string;
  text: string;
  embedding?: number[];
}

export interface FandomDataset {
  metadata: {
    sourceName: string;
    createdAt: string;
    totalChunks: number;
    chunkSize: number;
    overlap: number;
    embeddingModel?: string;
  };
  chunks: FandomDatasetChunk[];
}

// For storing vectors of individual game turns
export interface TurnVector {
  turnId: number; // Could be Date.now() or an incrementing number
  worldId: number; // Dấu vân tay của phiên chơi
  turnIndex: number; // The index of the turn in the history array
  content: string; // The text content of the turn
  embedding: number[];
}

// For storing vectors of summaries
export interface SummaryVector {
  summaryId: number; // Could be Date.now()
  worldId: number; // Dấu vân tay của phiên chơi
  summaryIndex: number; // The index of the summary in the summaries array
  content: string; // The text content of the summary
  embedding: number[];
}

// For RAG updates triggered by TagProcessors
export interface VectorUpdate {
    id: string; // Unique identifier (e.g., entity name)
    type: string; // Entity type (e.g., 'NPC', 'Quest', 'Item')
    content: string; // The text content to be embedded
}

// For storing entity vectors in the database
export interface EntityVector {
    id: string; // Unique identifier (e.g., entity name), should match VectorUpdate id
    worldId: number; // Dấu vân tay của phiên chơi
    embedding: number[];
}