
import React, { useState, useCallback } from 'react';
import HomeScreen from './components/HomeScreen';
import WorldCreationScreen from './components/WorldCreationScreen';
import SettingsScreen from './components/SettingsScreen';
import GameplayScreen from './components/GameplayScreen';
import { WorldConfig, GameState } from './types';

type Screen = 'home' | 'create' | 'settings' | 'gameplay';

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
    setGameState({ 
      worldConfig: config, 
      character: config.character, 
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
    });
    setCurrentScreen('gameplay');
  }, []);

  const handleLoadSavedGame = useCallback((state: GameState) => {
    const completeState: GameState = {
      memories: [],
      summaries: [],
      playerStatus: [],
      inventory: [],
      character: state.worldConfig.character, // Fallback for old saves
      encounteredNPCs: [], // For old saves
      encounteredFactions: [], // For old saves
      discoveredEntities: [], // For old saves
      companions: [], // For old saves
      quests: [], // For old saves
      ...state
    };
    setGameState(completeState);
    setCurrentScreen('gameplay');
  }, []);

  const handleNavigateToSettings = useCallback(() => {
    setCurrentScreen('settings');
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