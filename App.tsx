
import React, { useState, useCallback } from 'react';
import HomeScreen from './components/HomeScreen';
import WorldCreationScreen from './components/WorldCreationScreen';
import SettingsScreen from './components/SettingsScreen';
import GameplayScreen from './components/GameplayScreen';
import FandomGenesisScreen from './components/FandomGenesisScreen';
import { WorldConfig, GameState, InitialEntity } from './types';
import { DEFAULT_STATS } from './constants';
import { getSeason, generateWeather } from './utils/timeUtils';
import { resolveGenreArchetype } from './utils/genreUtils';

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
    
    const archetype = resolveGenreArchetype(config.storyContext.genre);
    const initialTime = { year: 1, month: 1, day: 1, hour: 8, minute: 0 };
    const initialSeason = getSeason(initialTime.month, archetype);
    const initialWeather = generateWeather(initialSeason, archetype);

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
      worldTime: initialTime,
      reputation: { score: 0, tier: 'Vô Danh' },
      reputationTiers: [],
      season: initialSeason,
      weather: initialWeather,
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
      worldTime: { year: 1, month: 1, day: 1, hour: 8, minute: 0 }, // Fallback cho file lưu cũ
      reputation: { score: 0, tier: 'Vô Danh' }, // Fallback cho file lưu cũ
      reputationTiers: [], // Fallback cho file lưu cũ
      season: '', // Sẽ được tính toán bên dưới
      weather: '', // Sẽ được tính toán bên dưới
      ...state,
      worldConfig: worldConfigWithLore,
      character: {
        ...(state.character || state.worldConfig.character), // Handle very old saves
        stats: statsEnabled ? (state.character.stats && state.character.stats.length > 0 ? state.character.stats : DEFAULT_STATS) : [],
      },
    };

    // Đảm bảo worldTime có minute
    completeState.worldTime = { minute: 0, ...completeState.worldTime };

    // Tính toán mùa/thời tiết nếu thiếu
    if (!completeState.season || !completeState.weather) {
        const archetype = resolveGenreArchetype(completeState.worldConfig.storyContext.genre);
        completeState.season = getSeason(completeState.worldTime.month, archetype);
        completeState.weather = generateWeather(completeState.season, archetype);
    }

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