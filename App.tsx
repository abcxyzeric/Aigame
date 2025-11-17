
import React, { useState, useCallback } from 'react';
import HomeScreen from './components/HomeScreen';
import WorldCreationScreen from './components/WorldCreationScreen';
import SettingsScreen from './components/SettingsScreen';
import GameplayScreen from './components/GameplayScreen';
import FandomGenesisScreen from './components/FandomGenesisScreen';
import { WorldConfig, GameState, InitialEntity } from './types';
import { DEFAULT_STATS } from './constants';

type Screen = 'home' | 'create' | 'settings' | 'gameplay' | 'fandomGenesis';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [editingConfig, setEditingConfig] = useState<WorldConfig | null>(null);

  const handleStartNew = useCallback(() => {
    setEditingConfig(null);
    setCurrentScreen('create');
  }, []);

  const handleLoadGame = useCallback((config: WorldConfig) => {
    setEditingConfig(config);
    setCurrentScreen('create');
  }, []);
  
  const handleStartGame = useCallback((config: WorldConfig) => {
    const worldConfigWithLore = { ...config };
    if (worldConfigWithLore.storyContext.setting) {
        const powerSystemEntity: InitialEntity = {
            name: 'Tổng quan Hệ thống Sức mạnh',
            type: 'Hệ thống sức mạnh / Lore',
            description: worldConfigWithLore.storyContext.setting,
            personality: ''
        };
        const existing = (worldConfigWithLore.initialEntities || []).find(e => e.name === powerSystemEntity.name && e.type === powerSystemEntity.type);
        if (!existing) {
            worldConfigWithLore.initialEntities = [...(worldConfigWithLore.initialEntities || []), powerSystemEntity];
        }
    }
    
    setGameState({ 
      worldConfig: worldConfigWithLore, 
      character: {
        ...config.character,
        stats: config.enableStatsSystem ? (config.character.stats && config.character.stats.length > 0 ? config.character.stats : DEFAULT_STATS) : [],
      }, 
      history: [], 
      memories: [], 
      summaries: [], 
      playerStatus: [], 
      inventory: [],
      encounteredNPCs: [],
      encounteredFactions: [],
      discoveredEntities: [],
      companions: [],
      quests: [],
      suggestions: [],
      worldTime: { year: 1, month: 1, day: 1, hour: 8 },
      reputation: { score: 0, tier: 'Vô Danh' },
      reputationTiers: [],
    });
    setCurrentScreen('gameplay');
  }, []);

  const handleLoadSavedGame = useCallback((state: GameState) => {
    const statsEnabled = state.worldConfig.enableStatsSystem === true;
    
    const worldConfigWithLore = { ...state.worldConfig };
    if (worldConfigWithLore.storyContext.setting) {
        const powerSystemEntity: InitialEntity = {
            name: 'Tổng quan Hệ thống Sức mạnh',
            type: 'Hệ thống sức mạnh / Lore',
            description: worldConfigWithLore.storyContext.setting,
            personality: ''
        };
        const allEntities = [...(worldConfigWithLore.initialEntities || []), ...(state.discoveredEntities || [])];
        const existing = allEntities.find(e => e.name === powerSystemEntity.name && e.type === powerSystemEntity.type);
        if (!existing) {
            worldConfigWithLore.initialEntities = [...(worldConfigWithLore.initialEntities || []), powerSystemEntity];
        }
    }

    const completeState: GameState = {
      memories: [],
      summaries: [],
      playerStatus: [],
      inventory: [],
      encounteredNPCs: [], // For old saves
      encounteredFactions: [], // For old saves
      discoveredEntities: [], // For old saves
      companions: [], // For old saves
      quests: [], // For old saves
      suggestions: [], // Fallback for old saves
      worldTime: { year: 1, month: 1, day: 1, hour: 8 }, // Fallback cho file lưu cũ
      reputation: { score: 0, tier: 'Vô Danh' }, // Fallback cho file lưu cũ
      reputationTiers: [], // Fallback cho file lưu cũ
      ...state,
      worldConfig: worldConfigWithLore,
      character: {
        ...(state.character || state.worldConfig.character), // Handle very old saves
        stats: statsEnabled ? (state.character.stats && state.character.stats.length > 0 ? state.character.stats : DEFAULT_STATS) : [],
      },
    };
    setGameState(completeState);
    setCurrentScreen('gameplay');
  }, []);

  const handleNavigateToSettings = useCallback(() => {
    setCurrentScreen('settings');
  }, []);
  
  const handleNavigateToFandomGenesis = useCallback(() => {
    setCurrentScreen('fandomGenesis');
  }, []);

  const handleBackToHome = useCallback(() => {
    setGameState(null);
    setEditingConfig(null);
    setCurrentScreen('home');
  }, []);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'create':
        return <WorldCreationScreen onBack={handleBackToHome} initialConfig={editingConfig} onStartGame={handleStartGame} />;
      case 'settings':
        return <SettingsScreen onBack={handleBackToHome} />;
      case 'fandomGenesis':
        return <FandomGenesisScreen onBack={handleBackToHome} />;
      case 'gameplay':
        if (gameState) {
          return <GameplayScreen initialGameState={gameState} onBack={handleBackToHome} />;
        }
        // Fallback if no config
        setCurrentScreen('home');
        return null;
      case 'home':
      default:
        return (
          <HomeScreen
            onStartNew={handleStartNew}
            onLoadGame={handleLoadGame}
            onLoadSavedGame={handleLoadSavedGame}
            onNavigateToSettings={handleNavigateToSettings}
            onNavigateToFandomGenesis={handleNavigateToFandomGenesis}
          />
        );
    }
  };

  return (
    <main className="bg-gradient-to-br from-slate-900 to-slate-800 min-h-screen text-slate-100 font-sans">
      {renderScreen()}
    </main>
  );
};

export default App;