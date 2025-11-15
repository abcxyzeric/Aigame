

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

export interface AppSettings {
  apiKeyConfig: ApiKeyStorage;
  safetySettings: SafetySettingsConfig;
}

export interface GameTurn {
  type: 'narration' | 'action';
  content: string;
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
}

export interface SaveSlot extends GameState {
  saveId: number; // Using Date.now()
  saveDate: string; // ISO String for display
  previewText: string;
  worldName: string;
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
  updatedMemories?: string[];
  newSummary?: string;
  updatedPlayerStatus?: StatusEffect[];
  updatedInventory?: GameItem[];
  updatedCharacter?: CharacterConfig;
  updatedEncounteredNPCs?: EncounteredNPC[];
  updatedEncounteredFactions?: EncounteredFaction[];
  updatedCompanions?: Companion[];
  updatedQuests?: Quest[];
}

export interface StartGameResponse {
  narration: string;
  suggestions: ActionSuggestion[];
  initialPlayerStatus?: StatusEffect[];
  initialInventory?: GameItem[];
}

export interface EncyclopediaUpdateResponse {
    updatedCharacter?: Partial<Pick<CharacterConfig, 'bio' | 'motivation'>>;
    updatedEncounteredNPCs?: EncounteredNPC[];
    updatedEncounteredFactions?: EncounteredFaction[];
    updatedDiscoveredEntities?: InitialEntity[];
}