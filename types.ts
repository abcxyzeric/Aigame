

export interface CharacterStat {
  name: string;
  value: number;
  maxValue: number;
  isPercentage: boolean;
  description?: string;
  hasLimit?: boolean;
}

export interface InitialEntity {
  name: string;
  type: string;
  personality: string;
  description: string;
  tags?: string[];
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
}

export interface Quest {
    name: string;
    description: string;
    status: 'đang tiến hành' | 'hoàn thành';
    tags?: string[];
}

export interface EncounteredNPC {
    name: string;
    description: string;
    personality: string;
    thoughtsOnPlayer: string;
    tags?: string[];
}

export interface EncounteredFaction {
    name: string;
    description: string;
    tags?: string[];
}

export interface WorldTime {
  year: number;
  month: number;
  day: number;
  hour: number; // 0-23
}

export interface Reputation {
  score: number; // -100 to 100
  tier: string;
}

export interface GameState {
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
