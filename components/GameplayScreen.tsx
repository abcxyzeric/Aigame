
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameTurn, GameState, TemporaryRule, ActionSuggestion, StatusEffect, InitialEntity, GameItem, Companion, Quest } from '../types';
import * as aiService from '../services/aiService';
import * as fileService from '../services/fileService';
import * as gameService from '../services/gameService';
import Button from './common/Button';
import Icon from './common/Icon';
import TemporaryRulesModal from './TemporaryRulesModal';
import MemoryModal from './MemoryModal';
import StoryLogModal from './StoryLogModal';
import InformationModal from './CharacterInfoModal';
import EntityInfoModal from './common/EntityInfoModal';
import EncyclopediaModal from './EncyclopediaModal';

const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Set initial value
    if (typeof window !== 'undefined') {
      const media = window.matchMedia(query);
      if (media.matches !== matches) {
        setMatches(media.matches);
      }
      const listener = () => setMatches(media.matches);
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, [matches, query]);

  return matches;
};

const InfoPanel: React.FC<{
  title: string;
  iconName: any;
  children: React.ReactNode;
  borderColorClass?: string;
  textColorClass?: string;
  isInitiallyOpen?: boolean;
}> = ({ title, iconName, children, borderColorClass = 'border-yellow-500', textColorClass = 'text-yellow-400', isInitiallyOpen = true }) => {
  const [isOpen, setIsOpen] = useState(isInitiallyOpen);

  return (
    <div className={`bg-slate-800/60 border-l-4 ${borderColorClass} rounded-r-lg overflow-hidden flex flex-col`}>
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex-shrink-0">
        <div className="flex items-center justify-between w-full p-3 group">
          <div className="flex items-center min-w-0">
            <Icon name={iconName} className="w-5 h-5 mr-2 flex-shrink-0" />
            <h3 className={`text-sm font-bold ${textColorClass} text-left truncate`}>
              {title}
            </h3>
          </div>
          <Icon name={isOpen ? 'arrowUp' : 'arrowDown'} className="w-4 h-4 text-slate-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
        </div>
      </button>
      
      <div 
        className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="px-3 pb-3 overflow-y-auto max-h-36">
          {children}
        </div>
      </div>
    </div>
  );
};

const StatusList: React.FC<{ statuses: StatusEffect[], onDelete: (statusName: string) => void }> = ({ statuses, onDelete }) => {
    if (!statuses || statuses.length === 0) {
        return <p className="text-xs text-slate-400">Không có trạng thái nào.</p>;
    }

    return (
        <ul className="space-y-2 text-xs">
            {statuses.map((status, index) => (
                <li key={index} className="group relative flex items-center justify-between">
                    <div className="truncate">
                        <p className="truncate">
                            <strong className={status.type === 'buff' ? 'text-green-400' : 'text-red-400'}>
                                {status.name}
                            </strong>
                        </p>
                    </div>
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-0 mb-2 w-64 hidden group-hover:block bg-slate-900 text-white text-xs rounded py-2 px-3 z-10 border border-slate-700 shadow-lg">
                        <p className="font-bold mb-1">{status.name} ({status.type === 'buff' ? 'Tích cực' : 'Tiêu cực'})</p>
                        {status.description}
                    </div>
                     <button onClick={() => onDelete(status.name)} className="p-1 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Icon name="trash" className="w-3 h-3"/>
                    </button>
                </li>
            ))}
        </ul>
    );
};

const CompanionList: React.FC<{ companions: Companion[], onSelect: (c: Companion) => void }> = ({ companions, onSelect }) => {
    if (!companions || companions.length === 0) {
        return <p className="text-xs text-slate-400">Chưa có đồng hành nào.</p>;
    }
    return (
        <ul className="space-y-2 text-xs">
            {companions.map((companion, index) => (
                <li key={index}>
                    <button onClick={() => onSelect(companion)} className="text-left w-full hover:bg-slate-700/50 p-1 rounded transition">
                        <strong className="text-green-300">{companion.name}</strong>
                    </button>
                </li>
            ))}
        </ul>
    );
};

const QuestList: React.FC<{ quests: Quest[], onSelect: (q: Quest) => void, onDelete: (name: string) => void }> = ({ quests, onSelect, onDelete }) => {
    if (!quests || quests.length === 0) {
        return <p className="text-xs text-slate-400">Không có nhiệm vụ nào đang hoạt động.</p>;
    }
    return (
        <ul className="space-y-2 text-xs">
            {quests.map((quest, index) => (
                <li key={index} className="group flex items-center justify-between gap-2 p-1 rounded hover:bg-slate-700/50">
                    <button onClick={() => onSelect(quest)} className="text-left flex-grow min-w-0">
                        <strong className="text-cyan-300 truncate block">{quest.name}</strong>
                    </button>
                    <button onClick={() => onDelete(quest.name)} className="p-1 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <Icon name="trash" className="w-3 h-3"/>
                    </button>
                </li>
            ))}
        </ul>
    );
};


const StatusTooltipWrapper: React.FC<{ statusName: string; statuses: StatusEffect[]; children: React.ReactNode; onClick: () => void }> = ({ statusName, statuses, children, onClick }) => {
    const status = statuses.find(s => s.name.toLowerCase().trim() === statusName.toLowerCase().trim());
    const specialStatuses = ['trúng độc', 'bị thương nặng', 'tẩu hỏa nhập ma', 'suy yếu']; // Keywords for special statuses

    // Always render a clickable button
    const clickableElement = (
        <button 
            type="button" 
            onClick={onClick} 
            className="text-cyan-400 font-semibold cursor-pointer hover:underline focus:outline-none focus:ring-2 focus:ring-cyan-500 rounded-sm bg-transparent p-0 border-0 text-left"
        >
            {children}
        </button>
    );

    // Only show tooltip for special statuses
    if (!status || !specialStatuses.some(special => status.name.toLowerCase().includes(special))) {
        return clickableElement;
    }

    return (
        <span className="relative group">
            {clickableElement}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 hidden group-hover:block bg-slate-900 text-white text-xs rounded py-2 px-3 z-10 border border-slate-700 shadow-lg pointer-events-none">
                <p className="font-bold mb-1">{status.name} ({status.type === 'buff' ? 'Tích cực' : 'Tiêu cực'})</p>
                {status.description}
            </div>
        </span>
    );
};


const FormattedNarration: React.FC<{ content: string; statuses: StatusEffect[]; onEntityClick: (name: string) => void; }> = React.memo(({ content, statuses, onEntityClick }) => {
    // This regex splits the text by the tags, keeping the tags in the result array.
    const cleanedContent = content.replace(/\s+<\/(entity|important)>/g, '</$1>');
    const parts = cleanedContent.split(/(<exp>.*?<\/exp>|<thought>.*?<\/thought>|<status>.*?<\/status>|<important>.*?<\/important>|<entity>.*?<\/entity>)/gs).filter(Boolean);

    return (
        <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">
            {parts.map((part, index) => {
                // More robust regex to handle potential whitespace issues from AI generation
                const tagMatch = part.match(/^<(\w+)\s*?>(.*?)<\/\s*\1\s*>$/s);
                if (tagMatch) {
                    const tagName = tagMatch[1];
                    const innerText = tagMatch[2];

                    switch (tagName) {
                        case 'exp':
                            return <span key={index} className="text-purple-400 italic">"{innerText}"</span>;
                        case 'thought':
                            return <span key={index} className="text-cyan-300 italic">"{innerText}"</span>;
                        case 'status':
                             return (
                                <StatusTooltipWrapper key={index} statusName={innerText} statuses={statuses} onClick={() => onEntityClick(innerText)}>
                                    {innerText}
                                </StatusTooltipWrapper>
                            );
                        case 'important':
                            return <button key={index} type="button" onClick={() => onEntityClick(innerText)} className="text-yellow-400 font-semibold cursor-pointer hover:underline focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded-sm bg-transparent p-0 border-0 text-left">{innerText}</button>;
                        case 'entity':
                             return <button key={index} type="button" onClick={() => onEntityClick(innerText)} className="text-cyan-400 font-semibold cursor-pointer hover:underline focus:outline-none focus:ring-2 focus:ring-cyan-500 rounded-sm bg-transparent p-0 border-0 text-left">{innerText}</button>;
                        default:
                            return part; // Fallback for unmatched tags
                    }
                }
                // This is plain text, clean up any stray closing tags
                const cleanedPart = part.replace(/<\/\s*(exp|thought|status|important|entity)\s*>/g, '');
                return cleanedPart;
            })}
        </p>
    );
});

// Fix: Defined GameplayScreenProps interface to resolve 'Cannot find name' error.
interface GameplayScreenProps {
  initialGameState: GameState;
  onBack: () => void;
}

const SuggestionCard: React.FC<{ suggestion: ActionSuggestion; onSelect: (description: string) => void; index: number; }> = ({ suggestion, onSelect, index }) => {
    const stripTags = (text: string) => text ? text.replace(/<\/?(entity|important|exp|thought|status)>/g, '') : '';

    return (
        <button
            onClick={() => onSelect(suggestion.description)}
            className="bg-blue-800/50 border border-blue-700/60 rounded-lg p-3 text-left w-full h-full hover:bg-blue-700/60 transition-colors duration-200"
        >
            <p className="text-sm text-slate-100">
                <span className="font-bold mr-1.5">{index + 1}.</span>
                {stripTags(suggestion.description)}
            </p>
             <p className="text-blue-200/80 text-xs mt-1">
                (Tỷ lệ thành công: {suggestion.successRate}%, Rủi ro: {stripTags(suggestion.risk)}, Phần thưởng: {stripTags(suggestion.reward)})
            </p>
        </button>
    );
};


const GameplayScreen: React.FC<GameplayScreenProps> = ({ initialGameState, onBack }) => {
  const [gameState, setGameState] = useState<GameState>({ ...initialGameState, companions: initialGameState.companions || [], quests: initialGameState.quests || [] });
  const [playerInput, setPlayerInput] = useState('');
  const [isLoading, setIsLoading] = useState(initialGameState.history.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [isTempRulesModalOpen, setIsTempRulesModalOpen] = useState(false);
  const [isStoryLogModalOpen, setIsStoryLogModalOpen] = useState(false);
  const [isInformationModalOpen, setIsInformationModalOpen] = useState(false);
  const [isEncyclopediaModalOpen, setIsEncyclopediaModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showScrollUp, setShowScrollUp] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [suggestions, setSuggestions] = useState<ActionSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [entityModalContent, setEntityModalContent] = useState<{ title: string; description: string; type: string; details?: InitialEntity['details']; } | null>(null);
  
  const [currentPage, setCurrentPage] = useState(0);

  const logContainerRef = useRef<HTMLDivElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<number | null>(null);
  
  const turnsPerPage = 10;
  const narrationTurns = gameState.history.filter(h => h.type === 'narration');
  const totalPages = Math.max(1, Math.ceil(narrationTurns.length / turnsPerPage));

  const getTurnsForCurrentPage = () => {
    if (narrationTurns.length === 0) return gameState.history;

    const narrationIndicesInHistory = gameState.history
        .map((turn, index) => (turn.type === 'narration' ? index : -1))
        .filter(index => index !== -1);
    
    const startNarrationIndex = currentPage * turnsPerPage;
    if (startNarrationIndex >= narrationIndicesInHistory.length) return [];
    
    const endNarrationIndex = Math.min(startNarrationIndex + turnsPerPage, narrationIndicesInHistory.length);

    const historyStartIndex = narrationIndicesInHistory[startNarrationIndex];
    // The slice should start from the action before the first narration of the page, unless it's the very first turn.
    const sliceStart = historyStartIndex > 0 ? historyStartIndex -1 : 0;
    
    const historyEndIndex = narrationIndicesInHistory[endNarrationIndex - 1];
    const sliceEnd = historyEndIndex + 1;

    return gameState.history.slice(sliceStart, sliceEnd);
  };
  const currentTurns = getTurnsForCurrentPage();


  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isInitialLoading = isLoading && gameState.history.length === 0;
  const isTurnLoading = isLoading && gameState.history.length > 0;

  const handleEntityClick = useCallback(async (name: string) => {
    const lowerCaseName = name.toLowerCase().trim();
    if (!lowerCaseName) return;
    if (lowerCaseName === gameState.character.name.toLowerCase().trim()) {
        setIsInformationModalOpen(true);
        return;
    }

    let found: { title: string; description: string; type: string; details?: InitialEntity['details']; } | null = null;
    
    // Search order: Statuses, Skills, Inventory, Companions, Quests, Encountered (gameplay), Discovered (runtime), Initial (config)
    const status = gameState.playerStatus.find(s => s.name.toLowerCase().trim() === lowerCaseName);
    if (status) {
        found = { 
            title: status.name, 
            description: status.description, 
            type: `Trạng thái (${status.type === 'buff' ? 'Tích cực' : 'Tiêu cực'})`,
        };
    }
    if (!found) {
        const skill = gameState.character.skills.find(s => s.name.toLowerCase().trim() === lowerCaseName);
        if (skill) found = { title: skill.name, description: skill.description, type: 'Kỹ năng' };
    }
    if (!found) {
        const item = gameState.inventory.find(i => i.name.toLowerCase().trim() === lowerCaseName);
        if (item) found = { title: item.name, description: item.description, type: 'Vật phẩm', details: item.details };
    }
    if (!found) {
        const companion = gameState.companions.find(c => c.name.toLowerCase().trim() === lowerCaseName);
        if(companion) found = { title: companion.name, description: `${companion.description}\n\nTính cách: ${companion.personality || 'Chưa rõ'}`, type: 'Đồng hành' };
    }
     if (!found) {
        const quest = gameState.quests.find(q => q.name.toLowerCase().trim() === lowerCaseName);
        if(quest) found = { title: quest.name, description: quest.description, type: 'Nhiệm vụ' };
    }
    if (!found) {
        const npc = gameState.encounteredNPCs.find(n => n.name.toLowerCase().trim() === lowerCaseName);
        if (npc) found = { title: npc.name, description: `${npc.description}\n\nTính cách: ${npc.personality}\n\nSuy nghĩ về người chơi: "${npc.thoughtsOnPlayer}"`, type: 'NPC' };
    }
    if (!found) {
        const faction = gameState.encounteredFactions.find(f => f.name.toLowerCase().trim() === lowerCaseName);
        if (faction) found = { title: faction.name, description: faction.description, type: 'Phe phái/Thế lực' };
    }
    if (!found) {
        const discovered = gameState.discoveredEntities?.find(e => e.name.toLowerCase().trim() === lowerCaseName);
        if (discovered) found = { title: discovered.name, description: discovered.description + (discovered.personality ? `\n\nTính cách: ${discovered.personality}`: ''), type: discovered.type, details: discovered.details };
    }
    if (!found) {
        const entity = gameState.worldConfig.initialEntities.find(e => e.name.toLowerCase().trim() === lowerCaseName);
        if (entity) found = { title: entity.name, description: entity.description + (entity.personality ? `\n\nTính cách: ${entity.personality}`: ''), type: entity.type, details: entity.details };
    }

    if (found) {
        setEntityModalContent(found);
    } else {
        // Not found, generate on the fly
        setEntityModalContent({ title: name, description: "AI đang tìm kiếm thông tin...", type: "Đang tải" });
        try {
            const newEntity = await aiService.generateEntityInfoOnTheFly(gameState, name);
            
            setGameState(prev => ({
                ...prev,
                discoveredEntities: [...(prev.discoveredEntities || []), newEntity]
            }));

            setEntityModalContent({ 
                title: newEntity.name, 
                description: newEntity.description + (newEntity.personality ? `\n\nTính cách: ${newEntity.personality}`: ''), 
                type: newEntity.type,
                details: newEntity.details
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
            setEntityModalContent({ title: name, description: `Không thể tạo thông tin: ${errorMessage}`, type: "Lỗi" });
        }
    }
  }, [gameState]);
  
  const handleActionSubmit = useCallback(async (actionContent: string) => {
    if (!actionContent.trim() || isLoading) return;

    const newAction: GameTurn = { type: 'action', content: actionContent.trim() };
    const newHistory = [...gameState.history, newAction];
    setSuggestions([]);
    setGameState(prev => ({ ...prev, history: newHistory }));
    setPlayerInput('');
    setIsLoading(true);
    setError(null);

    try {
      const tempGameState = { ...gameState, history: newHistory };
      const { narration, suggestions, updatedMemories, newSummary, updatedPlayerStatus, updatedInventory, updatedCharacter, updatedEncounteredNPCs, updatedEncounteredFactions, updatedCompanions, updatedQuests } = await aiService.getNextTurn(tempGameState);
      const finalHistory: GameTurn[] = [...newHistory, { type: 'narration', content: narration }];
      
      const updatedGameState = { 
        ...gameState, 
        history: finalHistory,
        character: updatedCharacter || gameState.character,
        memories: updatedMemories || gameState.memories,
        summaries: newSummary ? [...gameState.summaries, newSummary] : gameState.summaries,
        playerStatus: updatedPlayerStatus || gameState.playerStatus,
        inventory: updatedInventory || gameState.inventory,
        encounteredNPCs: updatedEncounteredNPCs || gameState.encounteredNPCs,
        encounteredFactions: updatedEncounteredFactions || gameState.encounteredFactions,
        companions: updatedCompanions || gameState.companions,
        quests: updatedQuests || gameState.quests,
      };
      setGameState(updatedGameState);
      setSuggestions(suggestions);
      setShowSuggestions(true);
      gameService.saveGame(updatedGameState);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'AI đã gặp lỗi khi xử lý. Vui lòng thử lại.';
      setError(errorMessage);
      setGameState(prev => ({ ...prev, history: gameState.history }));
    } finally {
      setIsLoading(false);
    }
  }, [gameState, isLoading]);
  
  const startGame = useCallback(async () => {
    // If history has content, it's a loaded game.
    if (gameState.history.length > 0) {
      setIsLoading(true); // Show a loading state while fetching suggestions.
      setError(null);
      
      const narrationTurns = gameState.history.filter(h => h.type === 'narration');
      const totalPages = Math.max(1, Math.ceil(narrationTurns.length / turnsPerPage));
      const lastPage = totalPages > 0 ? totalPages - 1 : 0;
      setCurrentPage(lastPage);
      
      // Ensure default values for new fields in old saves.
      setGameState(prev => ({
          ...prev,
          companions: prev.companions || [],
          quests: prev.quests || [],
      }));

      try {
        // Generate new suggestions based on the loaded state.
        const newSuggestions = await aiService.generateSuggestionsForCurrentState(gameState);
        setSuggestions(newSuggestions);
        setShowSuggestions(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Lỗi không thể tạo gợi ý khi tải game.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // This part is for starting a brand new game.
    setSuggestions([]);
    setIsLoading(true);
    setError(null);
    try {
      const { narration, suggestions, initialPlayerStatus, initialInventory } = await aiService.startGame(gameState.worldConfig);
      const updatedGameState: GameState = {
        ...gameState,
        history: [{ type: 'narration', content: narration }],
        playerStatus: initialPlayerStatus || [],
        inventory: initialInventory || [],
        companions: [],
        quests: [],
      };
      setGameState(updatedGameState);
      setSuggestions(suggestions);
      setShowSuggestions(true);
      gameService.saveGame(updatedGameState);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi không xác định khi bắt đầu game.');
    } finally {
      setIsLoading(false);
    }
  }, [gameState]);

  useEffect(() => {
    startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isInitialLoading) {
      const newTotalPages = Math.max(1, Math.ceil(narrationTurns.length / turnsPerPage));
      const lastPage = newTotalPages > 0 ? newTotalPages - 1 : 0;
      if (currentPage !== lastPage) {
          setCurrentPage(lastPage);
      }
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [gameState.history, isInitialLoading, isTurnLoading, narrationTurns.length, currentPage]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);
  
  const handleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) {
      window.clearTimeout(scrollTimeoutRef.current);
    }

    if (logContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
      
      setShowScrollUp(scrollTop > 200);
      setShowScrollDown(scrollHeight - scrollTop - clientHeight > 200);

      scrollTimeoutRef.current = window.setTimeout(() => {
        setShowScrollUp(false);
        setShowScrollDown(false);
      }, 2000);
    }
  }, []);
  
  useEffect(() => {
    const container = logContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        container.removeEventListener('scroll', handleScroll);
        if (scrollTimeoutRef.current) {
          window.clearTimeout(scrollTimeoutRef.current);
        }
      };
    }
  }, [handleScroll]);

  const handleScrollToTop = () => {
    logContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleScrollToBottom = () => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTo({ top: logContainerRef.current.scrollHeight, behavior: 'smooth' });
    }
  };
  
  const performRestart = () => {
    // Reset the history, which will trigger the startGame useEffect
    setGameState(prevState => ({
        ...prevState,
        history: [],
        character: prevState.worldConfig.character,
        memories: [],
        summaries: [],
        playerStatus: [],
        inventory: [],
        encounteredNPCs: [],
        encounteredFactions: [],
        discoveredEntities: [],
        companions: [],
        quests: [],
    }));
    // The loading state will be handled by startGame itself.
  };

  const handleSaveAndRestart = () => {
    gameService.saveGame(gameState); // Save current progress
    setShowRestartConfirm(false); // Close modal
    performRestart(); // Perform the restart action
  };

  const handleRestartWithoutSaving = () => {
    setShowRestartConfirm(false); // Close modal
    performRestart(); // Perform the restart action
  };

  const handleRestart = () => {
    setIsMenuOpen(false); // Close menu if open
    setShowRestartConfirm(true);
  };
  
  const handleUndoTurn = () => {
    setIsMenuOpen(false);
    setShowUndoConfirm(true);
  };

  const handleConfirmUndo = async () => {
    if (gameState.history.length < 2) return;
    
    setShowUndoConfirm(false);
    setIsLoading(true);
    setError(null);
    
    const newHistory = gameState.history.slice(0, -2);
    // Create a temporary state for generating suggestions,
    // but only update the main state if suggestions are successful.
    const tempGameState = { ...gameState, history: newHistory };
    
    try {
        const newSuggestions = await aiService.generateSuggestionsForCurrentState(tempGameState);
        
        // Success, now update the real state
        setGameState(tempGameState);
        setSuggestions(newSuggestions);
        setShowSuggestions(true);
        gameService.saveGame(tempGameState);

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'AI đã gặp lỗi khi xử lý.';
        setError(`Không thể lùi lại một lượt: ${errorMessage}`);
    } finally {
        setIsLoading(false);
    }
  };

  const handleManualSave = useCallback(() => {
    fileService.saveGameStateToFile(gameState);
    gameService.saveGame(gameState);
    alert('Đã lưu game vào trình duyệt và tải tệp xuống thành công!');
    setIsMenuOpen(false);
  }, [gameState]);

  const handleSendAction = () => {
    handleActionSubmit(playerInput);
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleActionSubmit(playerInput);
    }
  };

  const handleSaveAndExit = () => {
    gameService.saveGame(gameState);
    onBack();
  };
  
  const handleSaveTemporaryRules = (newRules: TemporaryRule[]) => {
    const updatedGameState = {
        ...gameState,
        worldConfig: {
            ...gameState.worldConfig,
            temporaryRules: newRules
        }
    };
    setGameState(updatedGameState);
    gameService.saveGame(updatedGameState);
    setIsTempRulesModalOpen(false);
  };

  const handleNarrationContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName.toLowerCase() !== 'button') {
        setIsStoryLogModalOpen(true);
    }
  };

  const handleDeleteStatus = useCallback((statusName: string) => {
    if (confirm(`Bạn có chắc muốn xóa trạng thái "${statusName}" không?`)) {
        setGameState(prev => {
            const newStatus = prev.playerStatus.filter(s => s.name !== statusName);
            const newState = { ...prev, playerStatus: newStatus };
            gameService.saveGame(newState); // Save after modification
            return newState;
        });
    }
  }, []);

  const handleDeleteItem = useCallback((itemName: string) => {
    if (confirm(`Bạn có chắc muốn xóa vật phẩm "${itemName}" không?`)) {
        setGameState(prev => {
            const newInventory = prev.inventory.filter(i => i.name !== itemName);
            const newState = { ...prev, inventory: newInventory };
            gameService.saveGame(newState);
            return newState;
        });
    }
  }, []);

  const handleCompanionClick = useCallback((companion: Companion) => {
    setEntityModalContent({
        title: companion.name,
        description: companion.description + (companion.personality ? `\n\nTính cách: ${companion.personality}` : ''),
        type: 'Đồng hành',
    });
  }, []);

  const handleQuestClick = useCallback((quest: Quest) => {
    setEntityModalContent({
        title: quest.name,
        description: quest.description,
        type: 'Nhiệm vụ',
    });
  }, []);

  const handleDeleteQuest = useCallback((questName: string) => {
    if (confirm(`Bạn có chắc muốn từ bỏ nhiệm vụ "${questName}" không?`)) {
        setGameState(prev => {
            const newQuests = prev.quests.filter(q => q.name !== questName);
            const newState = { ...prev, quests: newQuests };
            gameService.saveGame(newState); // Save after modification
            return newState;
        });
    }
  }, []);

  const characterPersonality = gameState.character.personality === 'Tuỳ chỉnh' 
    ? gameState.character.customPersonality 
    : gameState.character.personality;
  
  const MenuButton: React.FC<{onClick: () => void, icon: any, label: string, variant: string, disabled?: boolean}> = ({onClick, icon, label, variant, disabled = false}) => (
      <button onClick={onClick} disabled={disabled} className={`w-full flex items-center px-4 py-2 text-sm text-left rounded-md hover:bg-slate-700 transition ${disabled ? 'opacity-50 cursor-not-allowed hover:bg-slate-800' : ''}`}>
          <Icon name={icon} className={`w-5 h-5 mr-3 text-${variant}-400`}/>
          {label}
      </button>
  );

  return (
    <>
      <TemporaryRulesModal
        isOpen={isTempRulesModalOpen}
        onClose={() => setIsTempRulesModalOpen(false)}
        onSave={handleSaveTemporaryRules}
        initialRules={gameState.worldConfig.temporaryRules}
      />
      <MemoryModal
        isOpen={isMemoryModalOpen}
        onClose={() => setIsMemoryModalOpen(false)}
        memories={gameState.memories}
        summaries={gameState.summaries}
      />
      <StoryLogModal
        isOpen={isStoryLogModalOpen}
        onClose={() => setIsStoryLogModalOpen(false)}
        history={gameState.history}
        title="Toàn Bộ Diễn Biến"
      />
      <InformationModal
        isOpen={isInformationModalOpen}
        onClose={() => setIsInformationModalOpen(false)}
        gameState={gameState}
        onItemDelete={handleDeleteItem}
      />
       <EncyclopediaModal 
        isOpen={isEncyclopediaModalOpen}
        onClose={() => setIsEncyclopediaModalOpen(false)}
        gameState={gameState}
        setGameState={setGameState}
      />
      <EntityInfoModal
        isOpen={!!entityModalContent}
        onClose={() => setEntityModalContent(null)}
        title={entityModalContent?.title || null}
        description={entityModalContent?.description || null}
        type={entityModalContent?.type || null}
        details={entityModalContent?.details || undefined}
      />
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-6 w-full max-w-md relative animate-fade-in-up">
                <h2 className="text-xl font-bold mb-4 text-slate-100">Xác nhận thoát</h2>
                <p className="text-slate-300 mb-6">Bạn có muốn lưu tiến trình trước khi thoát không?</p>
                <div className="flex justify-end gap-4">
                    <Button onClick={handleSaveAndExit} variant="primary" className="!w-auto !py-2 !px-4">Lưu & Thoát</Button>
                    <Button onClick={onBack} variant="warning" className="!w-auto !py-2 !px-4">Thoát không lưu</Button>
                    <button onClick={() => setShowExitConfirm(false)} className="text-slate-400 hover:text-white transition px-4 py-2 rounded-md">Hủy</button>
                </div>
            </div>
        </div>
      )}
       {showRestartConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-6 w-full max-w-md relative animate-fade-in-up">
                <h2 className="text-xl font-bold mb-4 text-slate-100">Bắt đầu lại cuộc phiêu lưu?</h2>
                <p className="text-slate-300 mb-6">Bạn có muốn lưu tiến trình hiện tại trước khi bắt đầu lại không?</p>
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                    <button onClick={() => setShowRestartConfirm(false)} className="w-full sm:w-auto text-slate-300 hover:text-white transition px-4 py-2 rounded-md text-center bg-slate-700/50 hover:bg-slate-700">Hủy</button>
                    <Button onClick={handleRestartWithoutSaving} variant="warning" className="!w-full sm:!w-auto !py-2 !px-4">Không Lưu & Bắt Đầu Lại</Button>
                    <Button onClick={handleSaveAndRestart} variant="primary" className="!w-full sm:!w-auto !py-2 !px-4">Lưu & Bắt Đầu Lại</Button>
                </div>
            </div>
        </div>
      )}
      {showUndoConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-6 w-full max-w-md relative animate-fade-in-up">
                <h2 className="text-xl font-bold mb-4 text-yellow-400">Lùi Lại Một Lượt?</h2>
                <p className="text-slate-300 mb-2">Hành động này sẽ chỉ xóa lượt đi cuối cùng của bạn và AI khỏi nhật ký.</p>
                <p className="text-amber-400 text-sm mb-6">Lưu ý: Các thay đổi về trạng thái, vật phẩm, ký ức... sẽ <strong className="font-bold">KHÔNG</strong> được hoàn tác.</p>
                <div className="flex justify-end gap-4">
                    <Button onClick={handleConfirmUndo} variant="warning" className="!w-auto !py-2 !px-4">Tiếp tục</Button>
                    <button onClick={() => setShowUndoConfirm(false)} className="text-slate-400 hover:text-white transition px-4 py-2 rounded-md">Hủy</button>
                </div>
            </div>
        </div>
      )}
      <div className="flex flex-col h-screen bg-slate-900 text-slate-200 font-sans p-2 sm:p-4 gap-2 sm:gap-4">
        {/* Header */}
        <header className="flex-shrink-0 bg-slate-800/50 p-2 rounded-lg">
          <div className="flex justify-between items-center">
             <button onClick={() => setShowExitConfirm(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-200 bg-slate-700/80 hover:bg-slate-700 rounded-lg transition">
                <Icon name="back" className="w-4 h-4"/>
                <span className="hidden sm:inline">Về Trang Chủ</span>
            </button>
            
            <div className="text-center">
              <h1 className="text-base sm:text-lg font-bold text-slate-100 truncate max-w-[150px] sm:max-w-[250px]">{gameState.worldConfig.storyContext.worldName || gameState.worldConfig.storyContext.genre}</h1>
              <div className="text-xs text-slate-400 flex items-center justify-center gap-x-3">
                  <span className="text-fuchsia-400 hidden sm:inline">Tính cách: {characterPersonality}</span>
                  <span>Lượt: {narrationTurns.length}</span>
              </div>
            </div>
             
             {/* Desktop Buttons */}
             <div className="hidden lg:flex items-center gap-2">
                 <button onClick={() => setIsInformationModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-pink-300 bg-pink-900/40 hover:bg-pink-800/60 rounded-lg transition"><Icon name="info" className="w-4 h-4"/>Thông Tin</button>
                 <button onClick={handleManualSave} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-green-300 bg-green-900/40 hover:bg-green-800/60 rounded-lg transition"><Icon name="save" className="w-4 h-4"/>Lưu Vào Tệp</button>
                 <button onClick={() => setIsTempRulesModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-blue-300 bg-blue-900/40 hover:bg-blue-800/60 rounded-lg transition"><Icon name="rules" className="w-4 h-4"/>Luật Tạm Thời</button>
                 <button onClick={() => setIsMemoryModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-purple-300 bg-purple-900/40 hover:bg-purple-800/60 rounded-lg transition"><Icon name="memory" className="w-4 h-4"/>Ký Ức</button>
                 <button onClick={() => setIsEncyclopediaModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-orange-300 bg-orange-900/40 hover:bg-orange-800/60 rounded-lg transition"><Icon name="encyclopedia" className="w-4 h-4"/>Bách Khoa</button>
                 <button onClick={handleUndoTurn} disabled={gameState.history.length < 2} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-yellow-300 bg-yellow-900/40 hover:bg-yellow-800/60 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"><Icon name="undo" className="w-4 h-4"/>Lùi 1 Lượt</button>
                 <button onClick={handleRestart} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-pink-300 bg-pink-900/40 hover:bg-pink-800/60 rounded-lg transition"><Icon name="restart" className="w-4 h-4"/>Bắt Đầu Lại</button>
             </div>

             {/* Mobile Menu */}
             <div className="relative lg:hidden z-[60]" ref={menuRef}>
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-slate-300 hover:bg-slate-700 rounded-full transition">
                    <Icon name="ellipsisVertical" className="w-5 h-5" />
                </button>
                {isMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-lg p-2 animate-fade-in-up">
                        <MenuButton onClick={() => setIsInformationModalOpen(true)} icon="info" label="Thông Tin" variant="pink" />
                        <MenuButton onClick={handleManualSave} icon="save" label="Lưu Game" variant="green" />
                        <MenuButton onClick={() => setIsTempRulesModalOpen(true)} icon="rules" label="Luật Tạm Thời" variant="blue" />
                        <MenuButton onClick={() => setIsMemoryModalOpen(true)} icon="memory" label="Ký Ức" variant="purple" />
                        <MenuButton onClick={() => setIsEncyclopediaModalOpen(true)} icon="encyclopedia" label="Bách Khoa" variant="orange" />
                        <div className="my-1 border-t border-slate-700"></div>
                        <MenuButton onClick={handleUndoTurn} icon="undo" label="Lùi 1 Lượt" variant="yellow" disabled={gameState.history.length < 2} />
                        <MenuButton onClick={handleRestart} icon="restart" label="Bắt Đầu Lại" variant="pink" />
                    </div>
                )}
            </div>
          </div>
        </header>

        {/* Info Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-4 flex-shrink-0">
            <InfoPanel 
                iconName="status" 
                title="Trạng Thái Hiện Tại"
                borderColorClass="border-cyan-500" 
                textColorClass="text-cyan-400"
                isInitiallyOpen={isDesktop}
            >
                <StatusList statuses={gameState.playerStatus} onDelete={handleDeleteStatus} />
            </InfoPanel>
             <InfoPanel 
                iconName="companions" 
                title="Đồng Hành" 
                borderColorClass="border-green-500" 
                textColorClass="text-green-400"
                isInitiallyOpen={isDesktop}
            >
                <CompanionList companions={gameState.companions} onSelect={handleCompanionClick} />
            </InfoPanel>
             <InfoPanel 
                iconName="quest" 
                title="Nhiệm Vụ Đang Làm" 
                borderColorClass="border-cyan-500" 
                textColorClass="text-cyan-400"
                isInitiallyOpen={isDesktop}
            >
                <QuestList quests={gameState.quests} onSelect={handleQuestClick} onDelete={handleDeleteQuest} />
            </InfoPanel>
        </div>

        {/* Main Content: Log and Input */}
        <main className="flex-1 flex flex-col bg-slate-800/50 rounded-lg p-2 sm:p-4 overflow-hidden relative">
          {isInitialLoading && (
            <div className="absolute inset-0 bg-slate-800/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 animate-fade-in">
              <div className="w-12 h-12 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-slate-300 font-semibold text-lg">
                AI đang kiến tạo thế giới...
              </p>
            </div>
          )}

          <div ref={logContainerRef} onClick={handleNarrationContainerClick} className={`flex-1 overflow-y-auto mb-4 pr-2 space-y-6 cursor-pointer`}>
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-green-400">Diễn biến câu chuyện:</h2>
                    <button onClick={(e) => { e.stopPropagation(); setIsStoryLogModalOpen(true); }} className="text-slate-400 hover:text-white transition" title="Mở trong cửa sổ mới">
                        <Icon name="expand" className="w-5 h-5" />
                    </button>
                </div>
            </div>
            {currentTurns.map((turn, index) => (
              <div key={index}>
                {turn.type === 'narration' ? (
                  <FormattedNarration content={turn.content} statuses={gameState.playerStatus} onEntityClick={handleEntityClick} />
                ) : (
                  <div className="bg-blue-900/20 border-l-4 border-blue-500 rounded-r-lg p-4">
                    <p className="text-blue-300 font-semibold mb-1">Hành động của bạn:</p>
                    <p className="text-slate-200 italic whitespace-pre-wrap leading-relaxed">
                      {turn.content}
                    </p>
                  </div>
                )}
              </div>
            ))}
            {isTurnLoading && (
              <div className="mt-6 flex flex-col items-center p-4">
                  <div className="w-8 h-8 border-4 border-fuchsia-400 border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-3 text-slate-300 font-semibold">AI đang suy nghĩ...</p>
                  <p className="mt-1 text-slate-400 text-sm">Đang tạo ra diễn biến tiếp theo cho câu chuyện của bạn.</p>
              </div>
            )}
            <div ref={logEndRef} />
          </div>

          <div className="absolute bottom-24 right-4 z-20 flex flex-col gap-2">
            {showScrollUp && (
              <button onClick={handleScrollToTop} className="bg-slate-700/80 hover:bg-slate-600/90 backdrop-blur-sm text-white p-2 rounded-full transition-opacity duration-300 animate-fade-in" aria-label="Cuộn lên trên">
                <Icon name="arrowUp" className="w-6 h-6" />
              </button>
            )}
            {showScrollDown && (
              <button onClick={handleScrollToBottom} className="bg-slate-700/80 hover:bg-slate-600/90 backdrop-blur-sm text-white p-2 rounded-full transition-opacity duration-300 animate-fade-in" aria-label="Cuộn xuống dưới">
                <Icon name="arrowDown" className="w-6 h-6" />
              </button>
            )}
          </div>
          
          {/* --- ACTION AREA --- */}
          <div className="flex-shrink-0 mt-auto bg-slate-900/50 rounded-lg p-3 sm:p-4">
            {suggestions.length > 0 && !isTurnLoading && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-bold text-green-400">Lựa chọn của người:</h3>
                  <button
                    onClick={() => setShowSuggestions(!showSuggestions)}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-purple-300 bg-purple-900/40 hover:bg-purple-800/60 rounded-lg transition"
                    title={showSuggestions ? "Ẩn gợi ý" : "Hiện gợi ý"}
                  >
                    <span>{showSuggestions ? 'Ẩn' : 'Hiện'} Gợi Ý</span>
                    <Icon name={showSuggestions ? 'arrowUp' : 'arrowDown'} className={`w-3 h-3 transition-transform duration-300 ${showSuggestions ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                <div
                  className={`grid transition-all duration-500 ease-in-out ${
                    showSuggestions ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 max-h-[18rem] overflow-y-auto pr-2 pb-2">
                      {suggestions.map((s, i) => (
                        <SuggestionCard key={i} index={i} suggestion={s} onSelect={handleActionSubmit}/>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {error && <p className="text-red-400 mb-2">{error}</p>}

            <div>
              <label className="text-slate-300 font-semibold mb-2 block text-sm">Hoặc nhập hành động tùy ý:</label>
              <div className="flex items-stretch gap-2 sm:gap-3">
                <textarea
                  value={playerInput}
                  onChange={(e) => setPlayerInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ví dụ: Nhìn xung quanh, Hỏi về chiếc chìa khóa..."
                  disabled={isLoading}
                  className="flex-1 bg-slate-900/70 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition resize-none"
                  rows={1}
                />
                <Button onClick={handleSendAction} disabled={isLoading} variant="primary" className="!w-auto !py-3 !px-4 sm:!px-6 self-stretch !text-base">
                  {isTurnLoading ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : 'Gửi'}
                </Button>
              </div>
            </div>
            
            {/* Pagination Controls */}
            <div className="flex items-center justify-center gap-4 mt-3 flex-shrink-0">
                <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} className="p-2 rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition">
                    <Icon name="arrowUp" className="w-5 h-5 rotate-[-90deg]" />
                </button>
                <span className="text-sm text-slate-400 font-mono">Trang {currentPage + 1}/{totalPages}</span>
                 <button onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage === totalPages - 1} className="p-2 rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition">
                    <Icon name="arrowDown" className="w-5 h-5 rotate-[-90deg]" />
                </button>
            </div>
          </div>
        </main>
      </div>
      <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          .animate-fade-in { animation: fadeIn 0.5s ease-in-out; }
          @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in-up {
            animation: fade-in-up 0.2s ease-out forwards;
          }
        `}</style>
    </>
  );
};

export default GameplayScreen;