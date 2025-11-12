import { AppSettings, ApiKeyStorage, SafetySettingsConfig } from '../types';
import { DEFAULT_SAFETY_SETTINGS } from '../constants';

const SETTINGS_STORAGE_KEY = 'ai_rpg_settings';

// Default structure for a new user
const DEFAULT_SETTINGS: AppSettings = {
  apiKeyConfig: { keys: [] },
  safetySettings: DEFAULT_SAFETY_SETTINGS,
};

export const getSettings = (): AppSettings => {
  try {
    const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (storedSettings) {
      const parsed = JSON.parse(storedSettings) as AppSettings;
      // Basic validation to ensure the structure is not completely broken from an old version
      if (parsed.apiKeyConfig && parsed.safetySettings) {
        return {
            ...DEFAULT_SETTINGS, // Ensures new default fields are added
            ...parsed,
        };
      }
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error getting settings from localStorage:', error);
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (settings: AppSettings): void => {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings to localStorage:', error);
  }
};
