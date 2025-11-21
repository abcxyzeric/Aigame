import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameTurn, GameState, TemporaryRule, ActionSuggestion, StatusEffect, InitialEntity, GameItem, Companion, Quest, EncounteredNPC, EncounteredFaction, WorldTime, Reputation, CharacterStat, TimePassed } from '../types';
import * as aiService from '../services/aiService';
import * as fileService from '../services/fileService';
import * as gameService from '../services/gameService';
import { parseAiResponse } from '../utils/aiResponseProcessor';
import { advanceTime, getTimeOfDay, extractTimePassedFromText } from '../utils/timeUtils';
import { updateInventory } from '../utils/inventoryUtils';
import Button from './common/Button';
import Icon from './common/Icon';
import TemporaryRulesModal from './TemporaryRulesModal';
import MemoryModal from './MemoryModal';
import StoryLogModal from './StoryLogModal';
import InformationModal from './CharacterInfoModal';
import EntityInfoModal from './common/EntityInfoModal';
import { EncyclopediaModal } from './EncyclopediaModal';
import StatusHubModal from './StatusHubModal';
import NotificationModal from './common/NotificationModal';

const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
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

const StatusTooltipWrapper: React.FC<{ statusName: string; statuses: StatusEffect[]; children: React.ReactNode; onClick: () => void }> = ({ statusName, statuses, children, onClick }) => {
    const status = statuses.find(s => s.name.toLowerCase().trim() === statusName.toLowerCase().trim());
    const specialStatuses = ['trúng độc', 'bị thương nặng', 'tẩu hỏa nhập ma', 'suy yếu']; // Keywords for special statuses

    const clickableElement = (
        <button 
            type="button" 
            onClick={onClick} 
            className="text-cyan-400 font-semibold cursor-pointer hover:underline focus:outline-none focus:ring-2 focus:ring-cyan-500 rounded-sm bg-transparent p-0 border-0 text-left"
        >
            {children}
        </button>
    );

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
    const cleanedContent = content.replace(/\s+<\/(entity|important)>/g, '</$1>');
    const parts = cleanedContent.split(/(<exp>.*?<\/exp>|<thought>.*?<\/thought>|<status>.*?<\/status>|<important>.*?<\/important>|<entity>.*?<\/entity>|".*?")/gs).filter(Boolean);

    return (
        <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">
            {parts.map((part, index) => {
                if (part.startsWith('"') && part.endsWith('"')) {
                    return <span key={index} className="text-purple-400 italic">{part}</span>;
                }
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
                            return part;
                    }
                }
                const cleanedPart = part.replace(/<\/\s*(exp|thought|status|important|entity)\s*>/g, '');
                return cleanedPart;
            })}
        </p>
    );
});

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

const mergeAndDeduplicateByName = <T extends { name: string }>(original: T[] = [], updates: T[] = []): T[] => {
    const itemMap = new Map<string, T>();
    [...original, ...updates].forEach(item => {
        if (item && item.name) {
            itemMap.set(item.name.toLowerCase(), { ...(itemMap.get(item.name.toLowerCase()) || {}), ...item });
        }
    });
    return Array.from(itemMap.values());
};

const GameplayScreen: React.FC<GameplayScreenProps> = ({ initialGameState, onBack }) => {
  const [gameState, setGameState] = useState<GameState>({ ...initialGameState, companions: initialGameState.companions || [], quests: initialGameState.quests || [] });
  const [playerInput, setPlayerInput] = useState('');
  const [isLoading, setIsLoading] = useState(initialGameState.history.length === 0);
  const [isSaving, setIsSaving] = useState(false);
  const [notificationModal, setNotificationModal] = useState({ isOpen: false, title: '', messages: [''] });
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [isTempRulesModalOpen, setIsTempRulesModalOpen] = useState(false);
  const [isStoryLogModalOpen, setIsStoryLogModalOpen] = useState(false);
  const [isInformationModalOpen, setIsInformationModalOpen] = useState(false);
  const [isEncyclopediaModalOpen, setIsEncyclopediaModalOpen] = useState(false);
  const [isStatusHubOpen, setIsStatusHubOpen] = useState(false);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [showScrollUp, setShowScrollUp] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [entityModalContent, setEntityModalContent] = useState<{ title: string; description: string; type: string; details?: InitialEntity['details']; } | null>(null);
  
  const turnsPerPage = 5;
  const [currentPage, setCurrentPage] = useState(() => {
    if (initialGameState.history.length === 0) return 0;
    const narrationTurns = initialGameState.history.filter(h => h.type === 'narration');
    const totalPages = Math.max(1, Math.ceil(narrationTurns.length / turnsPerPage));
    return totalPages > 0 ? totalPages - 1 : 0;
  });
  const [isPaginating, setIsPaginating] = useState(false);
  const [storyLogInitialScrollTop, setStoryLogInitialScrollTop] = useState<number | null>(null);

  const logContainerRef = useRef<HTMLDivElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<number | null>(null);
  
  const narrationTurns = gameState.history.filter(h => h.type === 'narration');
  const totalPages = Math.max(1, Math.ceil(narrationTurns.length / turnsPerPage));

  const getTurnsForCurrentPage = () => {
    if (narrationTurns.length === 0) return gameState.history;
    const narrationIndicesInHistory = gameState.history.map((turn, index) => (turn.type === 'narration' ? index : -1)).filter(index => index !== -1);
    const startNarrationIndex = currentPage * turnsPerPage;
    
    if (startNarrationIndex >= narrationIndicesInHistory.length) return [];

    const endNarrationIndex = Math.min(startNarrationIndex + turnsPerPage, narrationIndicesInHistory.length);
    const historyStartIndex = narrationIndicesInHistory[startNarrationIndex];
    const sliceStart = historyStartIndex > 0 ? historyStartIndex - 1 : 0;
    
    const historyEndIndex = narrationIndicesInHistory[endNarrationIndex - 1];
    let sliceEnd = historyEndIndex + 1;

    // Sửa lỗi Cập nhật Lạc quan: Nếu đang ở trang cuối và lượt cuối cùng là hành động,
    // đảm bảo hành động đó được hiển thị ngay lập tức bằng cách cắt đến cuối mảng lịch sử.
    const isLastPage = currentPage === totalPages - 1;
    const lastHistoryTurn = gameState.history[gameState.history.length - 1];

    if (isLastPage && lastHistoryTurn?.type === 'action') {
        sliceEnd = gameState.history.length;
    }
    
    return gameState.history.slice(sliceStart, sliceEnd);
  };
  const currentTurns = getTurnsForCurrentPage();

  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isInitialLoading = isLoading && gameState.history.length === 0;
  const isTurnLoading = isLoading && gameState.history.length > 0;

  const getReputationTier = useCallback((score: number, tiers: string[]): string => {
    if (!tiers || tiers.length !== 5) return "Vô Danh";
    if (score <= -75) return tiers[0];
    if (score <= -25) return tiers[1];
    if (score < 25) return tiers[2];
    if (score < 75) return tiers[3];
    return tiers[4];
  }, []);

  const handleOpenStoryLog = useCallback(() => {
    if (logContainerRef.current) setStoryLogInitialScrollTop(logContainerRef.current.scrollTop);
    else setStoryLogInitialScrollTop(0);
    setIsStoryLogModalOpen(true);
  }, []);

  const handleEntityClick = useCallback(async (name: string) => {
    const lowerCaseName = name.toLowerCase().trim();
    if (!lowerCaseName) return;
    if (lowerCaseName === gameState.character.name.toLowerCase().trim()) {
        setIsInformationModalOpen(true);
        return;
    }
    let found: { title: string; description: string; type: string; details?: InitialEntity['details']; } | null = null;
    const status = gameState.playerStatus.find(s => s.name.toLowerCase().trim() === lowerCaseName);
    if (status) found = { title: status.name, description: status.description, type: `Trạng thái (${status.type === 'buff' ? 'Tích cực' : 'Tiêu cực'})` };
    if (!found) { const skill = gameState.character.skills.find(s => s.name.toLowerCase().trim() === lowerCaseName); if (skill) found = { title: skill.name, description: skill.description, type: 'Kỹ năng' }; }
    if (!found) { const item = gameState.inventory.find(i => i.name.toLowerCase().trim() === lowerCaseName); if (item) found = { title: item.name, description: item.description, type: 'Vật phẩm', details: item.details }; }
    if (!found) { const companion = gameState.companions.find(c => c.name.toLowerCase().trim() === lowerCaseName); if(companion) found = { title: companion.name, description: `${companion.description}\n\nTính cách: ${companion.personality || 'Chưa rõ'}`, type: 'Đồng hành' }; }
    if (!found) { const quest = gameState.quests.find(q => q.name.toLowerCase().trim() === lowerCaseName); if(quest) found = { title: quest.name, description: quest.description, type: 'Nhiệm vụ' }; }
    if (!found) { const npc = gameState.encounteredNPCs.find(n => n.name.toLowerCase().trim() === lowerCaseName); if (npc) found = { title: npc.name, description: `${npc.description}\n\nTính cách: ${npc.personality}\n\nSuy nghĩ về người chơi: "${npc.thoughtsOnPlayer}"`, type: 'NPC' }; }
    if (!found) { const faction = gameState.encounteredFactions.find(f => f.name.toLowerCase().trim() === lowerCaseName); if (faction) found = { title: faction.name, description: faction.description, type: 'Phe phái/Thế lực' }; }
    if (!found) { const discovered = gameState.discoveredEntities?.find(e => e.name.toLowerCase().trim() === lowerCaseName); if (discovered) found = { title: discovered.name, description: discovered.description + (discovered.personality ? `\n\nTính cách: ${discovered.personality}`: ''), type: discovered.type, details: discovered.details }; }
    if (!found) { const entity = gameState.worldConfig.initialEntities.find(e => e.name.toLowerCase().trim() === lowerCaseName); if (entity) found = { title: entity.name, description: entity.description + (entity.personality ? `\n\nTính cách: ${entity.personality}`: ''), type: entity.type, details: entity.details }; }

    if (found) setEntityModalContent(found);
    else {
        setEntityModalContent({ title: name, description: "AI đang tìm kiếm thông tin...", type: "Đang tải" });
        try {
            const newEntity = await aiService.generateEntityInfoOnTheFly(gameState, name);
            setGameState(prev => ({ ...prev, discoveredEntities: [...(prev.discoveredEntities || []), newEntity] }));
            setEntityModalContent({ title: newEntity.name, description: newEntity.description + (newEntity.personality ? `\n\nTính cách: ${newEntity.personality}`: ''), type: newEntity.type, details: newEntity.details });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
            setEntityModalContent({ title: name, description: `Không thể tạo thông tin: ${errorMessage}`, type: "Lỗi" });
        }
    }
  }, [gameState]);
  
  const handleActionSubmit = useCallback(async (actionContent: string) => {
    if (!actionContent.trim() || isLoading) return;

    const newAction: GameTurn = { type: 'action', content: actionContent.trim().replace(/<[^>]*>/g, '') };
    
    // Optimistic UI Update: Add action to history immediately
    setGameState(prev => ({ ...prev, history: [...prev.history, newAction] }));

    // Now clear input and show loading state
    setPlayerInput('');
    setIsLoading(true);
    setNotificationModal(prev => ({ ...prev, isOpen: false }));

    try {
        // The `gameState` for the API call needs to include the new action.
        const tempGameState = { ...gameState, history: [...gameState.history, newAction] };
        const rawResponse = await aiService.getNextTurn(tempGameState);
        const parsedResponse = parseAiResponse(rawResponse);

        // Add narration turn to history
        const narrationTurn: GameTurn = { 
            type: 'narration', 
            content: parsedResponse.narration,
            metadata: {
                isSummaryTurn: !!parsedResponse.newSummary,
                addedMemoryCount: parsedResponse.newMemories.length,
            }
        };
        
        // Update state with AI response. `prev` already contains the optimistic action.
        setGameState(prev => {
            const newStateWithNarration = { ...prev, history: [...prev.history, narrationTurn] };
            const finalState = JSON.parse(JSON.stringify(newStateWithNarration)); // Deep copy for safety

            // Apply all other updates from the parsed response
            // Unconditionally update suggestions. If the AI provides none, the old ones should be cleared.
            finalState.suggestions = parsedResponse.suggestions;

            finalState.inventory = updateInventory(finalState.inventory, parsedResponse.updatedInventory);
            
            const currentStatusNames = new Set(finalState.playerStatus.map((s: StatusEffect) => s.name.toLowerCase()));
            parsedResponse.addedStatuses.forEach(newStatus => {
                if (!currentStatusNames.has(newStatus.name.toLowerCase())) {
                    finalState.playerStatus.push(newStatus);
                }
            });
            const removedStatusNames = new Set(parsedResponse.removedStatuses.map(s => s.name.toLowerCase()));
            finalState.playerStatus = finalState.playerStatus.filter((s: StatusEffect) => !removedStatusNames.has(s.name.toLowerCase()));

            if (parsedResponse.updatedStats.length > 0) {
                finalState.character.stats = mergeAndDeduplicateByName(finalState.character.stats, parsedResponse.updatedStats);
            }

            finalState.quests = mergeAndDeduplicateByName(finalState.quests, parsedResponse.updatedQuests);
            finalState.companions = mergeAndDeduplicateByName(finalState.companions, parsedResponse.addedCompanions);
            
            // Handle removed companions
            if (parsedResponse.removedCompanions && parsedResponse.removedCompanions.length > 0) {
                const removedCompanionNames = new Set(parsedResponse.removedCompanions.map(c => c.name.toLowerCase()));
                finalState.companions = finalState.companions.filter((c: Companion) => {
                    return !removedCompanionNames.has(c.name.toLowerCase());
                });
            }

            finalState.encounteredNPCs = mergeAndDeduplicateByName(finalState.encounteredNPCs, parsedResponse.updatedNPCs);
            finalState.encounteredFactions = mergeAndDeduplicateByName(finalState.encounteredFactions, parsedResponse.updatedFactions);
            finalState.discoveredEntities = mergeAndDeduplicateByName(finalState.discoveredEntities, parsedResponse.discoveredEntities);

            finalState.worldTime = advanceTime(finalState.worldTime, parsedResponse.timePassed || {});
            if (parsedResponse.reputationChange && finalState.reputationTiers.length === 5) {
                const newScore = Math.max(-100, Math.min(100, finalState.reputation.score + parsedResponse.reputationChange.score));
                finalState.reputation = { score: newScore, tier: getReputationTier(newScore, finalState.reputationTiers) };
            }

            if (parsedResponse.newMemories.length > 0) {
                finalState.memories.push(...parsedResponse.newMemories);
            }
            if (parsedResponse.newSummary) {
                finalState.summaries.push(parsedResponse.newSummary);
            }

            // Save the final state
            gameService.saveGame(finalState, 'auto');
            return finalState;
        });

        const newNarrationTurns = [...narrationTurns, narrationTurn];
        const newTotalPages = Math.max(1, Math.ceil(newNarrationTurns.length / turnsPerPage));
        const lastPage = newTotalPages > 0 ? newTotalPages - 1 : 0;

        setShowSuggestions(true);
        setCurrentPage(lastPage);

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'AI đã gặp lỗi khi xử lý. Vui lòng thử lại.';
       if (/bị chặn bởi bộ lọc an toàn|prohibited|safety/i.test(errorMessage)) {
          setNotificationModal({
              isOpen: true,
              title: 'Nội dung bị chặn',
              messages: [
                  'Phản hồi từ AI đã bị chặn vì có thể vi phạm chính sách nội dung.',
                  'Nếu bạn đã bật tùy chọn 18+ và tắt bộ lọc an toàn trong Cài Đặt, hãy thử diễn đạt lại hành động của bạn.',
                  'Chi tiết lỗi: ' + errorMessage
              ]
          });
      } else {
          setNotificationModal({
              isOpen: true,
              title: 'Lỗi AI',
              messages: [errorMessage]
          });
      }
    } finally {
      setIsLoading(false);
    }
  }, [gameState, isLoading, getReputationTier, narrationTurns]);
  
  const startGame = useCallback(async () => {
    if (gameState.history.length > 0) {
      setIsLoading(false);
      const narrationTurns = gameState.history.filter(h => h.type === 'narration');
      const totalPages = Math.max(1, Math.ceil(narrationTurns.length / turnsPerPage));
      const lastPage = totalPages > 0 ? totalPages - 1 : 0;
      setCurrentPage(lastPage);
      setShowSuggestions(gameState.suggestions ? gameState.suggestions.length > 0 : false);
      return;
    }
    
    setIsLoading(true);
    setNotificationModal(prev => ({ ...prev, isOpen: false }));
    try {
      const rawResponse = await aiService.startGame(gameState.worldConfig);
      const parsedResponse = parseAiResponse(rawResponse);

      const narrationTurn: GameTurn = { type: 'narration', content: parsedResponse.narration };
      
      const baseTime = parsedResponse.initialWorldTime ? parsedResponse.initialWorldTime : (gameState.worldTime || { year: 1, month: 1, day: 1, hour: 8 });
      
      // Combine time from tags and from narration context
      const timePassedFromNarration = extractTimePassedFromText(parsedResponse.narration);
      const combinedTimePassed: TimePassed = {
          years: (parsedResponse.timePassed?.years || 0) + (timePassedFromNarration.years || 0),
          months: (parsedResponse.timePassed?.months || 0) + (timePassedFromNarration.months || 0),
          days: (parsedResponse.timePassed?.days || 0) + (timePassedFromNarration.days || 0),
          hours: (parsedResponse.timePassed?.hours || 0) + (timePassedFromNarration.hours || 0),
          minutes: (parsedResponse.timePassed?.minutes || 0) + (timePassedFromNarration.minutes || 0),
      };

      const newWorldTime = advanceTime(baseTime, combinedTimePassed);
      
      let newReputation = gameState.reputation;
      const newTiers = parsedResponse.reputationTiers || [];
      if (newTiers.length === 5) {
          const newScore = parsedResponse.reputationChange?.score || 0;
          newReputation = { score: newScore, tier: getReputationTier(newScore, newTiers) };
      }

      const updatedGameState: GameState = { 
          ...gameState, 
          history: [narrationTurn], 
          playerStatus: parsedResponse.addedStatuses || [], 
          inventory: updateInventory(gameState.inventory, parsedResponse.updatedInventory),
          companions: parsedResponse.addedCompanions || [], 
          quests: parsedResponse.updatedQuests || [], 
          suggestions: parsedResponse.suggestions, 
          worldTime: newWorldTime, 
          reputation: newReputation, 
          reputationTiers: newTiers,
          discoveredEntities: [...(gameState.discoveredEntities || []), ...(parsedResponse.discoveredEntities || [])],
          encounteredNPCs: [...(gameState.encounteredNPCs || []), ...(parsedResponse.updatedNPCs || [])],
        };
        
      if (parsedResponse.initialStats && parsedResponse.initialStats.length > 0) {
          updatedGameState.character = {
              ...updatedGameState.character,
              stats: parsedResponse.initialStats,
          };
      }
        
      setGameState(updatedGameState);
      setShowSuggestions(true);
      await gameService.saveGame(updatedGameState, 'auto');

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Lỗi không xác định khi bắt đầu game.';
      setNotificationModal({isOpen: true, title: 'Lỗi Khởi Tạo', messages: [errorMessage]});
    } finally {
      setIsLoading(false);
    }
  }, [gameState, getReputationTier]);

  useEffect(() => { if (gameState.history.length === 0) startGame(); }, [gameState.history.length, startGame]);

  useEffect(() => {
    if (gameState.history.length > 0 && (!gameState.reputationTiers || gameState.reputationTiers.length !== 5)) {
        const fetchTiers = async () => {
            try {
                const tiers = await aiService.generateReputationTiers(gameState.worldConfig.storyContext.genre);
                const updatedTierName = getReputationTier(gameState.reputation.score, tiers);
                setGameState(prev => {
                    const newState = { ...prev, reputationTiers: tiers, reputation: { ...prev.reputation, tier: updatedTierName } };
                    gameService.saveGame(newState, 'auto');
                    return newState;
                });
            } catch (e) { 
                const errorMessage = e instanceof Error ? `Lỗi tạo cấp bậc danh vọng: ${e.message}` : 'Lỗi không xác định.';
                setNotificationModal({isOpen: true, title: 'Lỗi Phụ Trợ', messages: [errorMessage]});
            }
        };
        fetchTiers();
    }
  }, [gameState.history.length, gameState.reputation.score, gameState.reputationTiers, gameState.worldConfig.storyContext.genre, getReputationTier]);

  useEffect(() => {
    const lastTurn = gameState.history[gameState.history.length - 1];
    if (isPaginating) {
        logContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        setIsPaginating(false);
    } else if (!isInitialLoading) {
        if (lastTurn?.type === 'action' || gameState.history.length === 1) {
            logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }
  }, [currentPage, isPaginating, isInitialLoading, gameState.history.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsSidePanelOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => { document.removeEventListener("mousedown", handleClickOutside); };
  }, [menuRef]);
  
  const handleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current);
    if (logContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
      setShowScrollUp(scrollTop > 200);
      setShowScrollDown(scrollHeight - scrollTop - clientHeight > 200);
      scrollTimeoutRef.current = window.setTimeout(() => { setShowScrollUp(false); setShowScrollDown(false); }, 2000);
    }
  }, []);
  
  useEffect(() => {
    const container = logContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        container.removeEventListener('scroll', handleScroll);
        if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current);
      };
    }
  }, [handleScroll]);

  const handleScrollToTop = () => logContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  const handleScrollToBottom = () => { if (logContainerRef.current) logContainerRef.current.scrollTo({ top: logContainerRef.current.scrollHeight, behavior: 'smooth' }); };
  
  const performRestart = () => setGameState(prevState => ({ ...prevState, history: [], character: prevState.worldConfig.character, memories: [], summaries: [], playerStatus: [], inventory: [], encounteredNPCs: [], encounteredFactions: [], discoveredEntities: [], companions: [], quests: [], suggestions: [], worldTime: { year: 1, month: 1, day: 1, hour: 8 }, reputation: { score: 0, tier: 'Vô Danh' }, reputationTiers: [] }));
  const handleSaveAndRestart = async () => { setIsSaving(true); await gameService.saveGame(gameState, 'manual'); setIsSaving(false); setShowRestartConfirm(false); performRestart(); };
  const handleRestartWithoutSaving = () => { setShowRestartConfirm(false); performRestart(); };
  const handleRestart = () => { setIsSidePanelOpen(false); setShowRestartConfirm(true); };
  const handleUndoTurn = () => { setIsSidePanelOpen(false); setShowUndoConfirm(true); };
  const handleConfirmUndo = async () => {
      if (gameState.history.length < 2 || gameState.history[gameState.history.length - 1].type !== 'narration') {
          setShowUndoConfirm(false);
          return;
      }
      setShowUndoConfirm(false);
      setNotificationModal(prev => ({...prev, isOpen: false}));
  
      const lastNarrationTurn = gameState.history[gameState.history.length - 1];
      let newSummaries = gameState.summaries;
      let newMemories = gameState.memories;
  
      if (lastNarrationTurn.metadata) {
          if (lastNarrationTurn.metadata.isSummaryTurn) {
              newSummaries = gameState.summaries.slice(0, -1);
          }
          if (lastNarrationTurn.metadata.addedMemoryCount) {
              newMemories = gameState.memories.slice(0, -lastNarrationTurn.metadata.addedMemoryCount);
          }
      }
  
      // Hoàn tác cả hành động cuối cùng và tường thuật cuối cùng
      const newHistory = gameState.history.slice(0, -2);
      const newState = {
          ...gameState,
          history: newHistory,
          summaries: newSummaries,
          memories: newMemories,
          suggestions: [], // Xóa gợi ý từ lượt chơi đã hoàn tác
      };
      
      setGameState(newState);
      setPlayerInput('');
      setShowSuggestions(false); 
      await gameService.saveGame(newState, 'auto');
  };
  const handleManualSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await gameService.saveGame(gameState, 'manual');
      fileService.saveGameStateToFile(gameState);
      alert('Đã lưu game vào trình duyệt và tải tệp xuống thành công!');
    } catch (error) { alert(error instanceof Error ? error.message : "Lỗi khi lưu game."); console.error(error); } finally { setIsSaving(false); setIsSidePanelOpen(false); }
  }, [gameState]);
  const handleSendAction = () => handleActionSubmit(playerInput);
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleActionSubmit(playerInput); } };
  const handleSaveAndExit = async () => { setIsSaving(true); await gameService.saveGame(gameState, 'manual'); setIsSaving(false); onBack(); };
  const handleSaveTemporaryRules = async (newRules: TemporaryRule[]) => {
    const updatedGameState = { ...gameState, worldConfig: { ...gameState.worldConfig, temporaryRules: newRules } };
    setGameState(updatedGameState);
    await gameService.saveGame(updatedGameState, 'auto');
    setIsTempRulesModalOpen(false);
  };
  const handleNarrationContainerClick = (e: React.MouseEvent<HTMLDivElement>) => { if ((e.target as HTMLElement).tagName.toLowerCase() !== 'button') handleOpenStoryLog(); };
  const handleDeleteStatus = (statusName: string) => { if (confirm(`Bạn có chắc muốn xóa trạng thái "${statusName}" không?`)) setGameState(prev => { const newStatus = prev.playerStatus.filter(s => s.name.trim().toLowerCase() !== statusName.trim().toLowerCase()); const newState = { ...prev, playerStatus: newStatus }; gameService.saveGame(newState, 'auto'); return newState; }); };
  const handleDeleteEntity = useCallback((entityToDelete: { name: string }) => {
    if (!confirm(`Bạn có chắc muốn xóa "${entityToDelete.name}" không? Thao tác này sẽ xóa mục này khỏi mọi nơi trong game.`)) return;
    setGameState(prev => {
        const nameToDelete = entityToDelete.name.toLowerCase();
        const newState = JSON.parse(JSON.stringify(prev));
        newState.inventory = (newState.inventory || []).filter((item: GameItem) => item.name.toLowerCase() !== nameToDelete);
        newState.character.skills = (newState.character.skills || []).filter((skill: {name: string}) => skill.name.toLowerCase() !== nameToDelete);
        newState.encounteredNPCs = (newState.encounteredNPCs || []).filter((npc: EncounteredNPC) => npc.name.toLowerCase() !== nameToDelete);
        newState.companions = (newState.companions || []).filter((c: Companion) => c.name.toLowerCase() !== nameToDelete);
        newState.quests = (newState.quests || []).filter((q: Quest) => q.name.toLowerCase() !== nameToDelete);
        newState.encounteredFactions = (newState.encounteredFactions || []).filter((f: EncounteredFaction) => f.name.toLowerCase() !== nameToDelete);
        newState.discoveredEntities = (newState.discoveredEntities || []).filter((e: InitialEntity) => e.name.toLowerCase() !== nameToDelete);
        newState.worldConfig.initialEntities = (newState.worldConfig.initialEntities || []).filter((e: InitialEntity) => e.name.toLowerCase() !== nameToDelete);
        gameService.saveGame(newState, 'auto');
        return newState;
    });
  }, []);
  const handleCompanionClick = useCallback((companion: Companion) => setEntityModalContent({ title: companion.name, description: companion.description + (companion.personality ? `\n\nTính cách: ${companion.personality}` : ''), type: 'Đồng hành' }), []);
  const handleQuestClick = useCallback((quest: Quest) => setEntityModalContent({ title: quest.name, description: quest.description, type: 'Nhiệm Vụ' }), []);
  const handleDeleteQuest = useCallback((questName: string) => { if (confirm(`Bạn có chắc muốn từ bỏ nhiệm vụ "${questName}" không?`)) setGameState(prev => { const newQuests = prev.quests.filter(q => q.name !== questName); const newState = { ...prev, quests: newQuests }; gameService.saveGame(newState, 'auto'); return newState; }); }, []);
  const handlePageChange = (updater: (p: number) => number) => { setCurrentPage(prev => { const newPage = updater(prev); if (newPage !== prev) setIsPaginating(true); return newPage; }); };
  
  const characterPersonality = gameState.character.personality === 'Tuỳ chỉnh' ? gameState.character.customPersonality : gameState.character.personality;
  const timeOfDay = getTimeOfDay(gameState.worldTime.hour);
  const getReputationColor = (score: number) => { if (score < -25) return 'text-red-400'; if (score > 25) return 'text-green-400'; return 'text-slate-300'; };
  const reputationColor = getReputationColor(gameState.reputation.score);
  const activeQuests = (gameState.quests || []).filter(q => !q.status || q.status === 'đang tiến hành');

  const DashboardSidebar = () => (
      <div className="h-full bg-slate-800/80 backdrop-blur-md flex flex-col p-4 space-y-4 overflow-y-auto">
        <div className="flex-shrink-0 space-y-4">
          <div className="text-center border-b border-slate-700 pb-4">
            <h2 className="text-xl font-bold text-slate-100 truncate">{gameState.character.name}</h2>
            <p className="text-sm text-pink-400 truncate" title={characterPersonality || ''}>{characterPersonality}</p>
          </div>
          <div className="bg-slate-900/50 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-400 font-semibold text-sm mb-2"><Icon name="sun" className="w-5 h-5"/>Thời Gian</div>
            <div className="text-xs space-y-1 text-slate-300">
                <p><strong>Buổi:</strong> {timeOfDay}</p>
                <p><strong>Ngày:</strong> {gameState.worldTime.day}/{gameState.worldTime.month}/{gameState.worldTime.year}</p>
            </div>
          </div>
          <div className="bg-slate-900/50 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-orange-400 font-semibold text-sm mb-2"><Icon name="reputation" className="w-5 h-5"/>Danh Vọng</div>
            <div className="text-xs space-y-1">
                <p className={reputationColor}><strong>Cấp:</strong> <span className="font-bold">{gameState.reputation.tier}</span></p>
                <p className={reputationColor}><strong>Điểm:</strong> <span className="font-bold">{gameState.reputation.score}</span></p>
            </div>
          </div>
          <div className="bg-slate-900/50 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-teal-400 font-semibold text-sm mb-2"><Icon name="status" className="w-5 h-5"/>Chỉ Số</div>
            <div className="space-y-2 text-xs">
                {gameState.character.stats?.map((stat, index) => (
                    <div key={index}>
                        {stat.hasLimit !== false ? (
                            // --- Resource Stat (e.g., HP, MP) ---
                            <>
                                <div className="flex justify-between items-center mb-0.5">
                                    <span className="font-semibold text-slate-300" title={stat.description || stat.name}>{stat.name}</span>
                                    <span className="font-mono text-slate-400">{stat.value}/{stat.maxValue}{stat.isPercentage ? '%' : ''}</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                    <div 
                                        className={`h-1.5 rounded-full transition-all duration-500 ${
                                            (stat.value / stat.maxValue * 100) > 50 ? 'bg-green-500' : (stat.value / stat.maxValue * 100) > 20 ? 'bg-yellow-500' : 'bg-red-500'
                                        }`} 
                                        style={{ width: `${(stat.value / Math.max(1, stat.maxValue)) * 100}%` }}>
                                    </div>
                                </div>
                            </>
                        ) : (
                            // --- Attribute Stat (e.g., Strength, Int) ---
                            <div className="flex justify-between items-center py-1">
                                <span className="font-semibold text-slate-300" title={stat.description || stat.name}>{stat.name}</span>
                                <span className="font-mono text-slate-200 font-bold text-sm">{stat.value}</span>
                            </div>
                        )}
                    </div>
                ))}
                {(!gameState.character.stats || gameState.character.stats.length === 0) && (
                    <p className="text-slate-500 italic text-center text-xs">Hệ thống chỉ số đã tắt.</p>
                )}
            </div>
          </div>
        </div>

        <div className="flex-grow space-y-2">
            <button onClick={() => { setIsInformationModalOpen(true); setIsSidePanelOpen(false); }} className="w-full flex items-center justify-between px-3 py-3 text-sm text-left rounded-md hover:bg-slate-700 transition">
                <span className="flex items-center"><Icon name="info" className="w-5 h-5 mr-3 text-pink-400"/>Túi Đồ & Thông Tin</span>
                {gameState.inventory.length > 0 && <span className="text-xs bg-slate-600 text-white font-bold px-1.5 py-0.5 rounded-full">{gameState.inventory.length}</span>}
            </button>
            <button onClick={() => { setIsStatusHubOpen(true); setIsSidePanelOpen(false); }} className="w-full flex items-center justify-between px-3 py-3 text-sm text-left rounded-md hover:bg-slate-700 transition">
                <span className="flex items-center"><Icon name="hub" className="w-5 h-5 mr-3 text-cyan-400"/>Trạng Thái & Nhiệm Vụ</span>
                <div className="flex gap-2">
                    {gameState.playerStatus.length > 0 && <span className="text-xs bg-red-500/80 text-white font-bold px-1.5 py-0.5 rounded-full">{gameState.playerStatus.length}</span>}
                    {activeQuests.length > 0 && <span className="text-xs bg-blue-500/80 text-white font-bold px-1.5 py-0.5 rounded-full">{activeQuests.length}</span>}
                </div>
            </button>
            <button onClick={() => { setIsEncyclopediaModalOpen(true); setIsSidePanelOpen(false); }} className="w-full flex items-center justify-between px-3 py-3 text-sm text-left rounded-md hover:bg-slate-700 transition">
                <span className="flex items-center"><Icon name="encyclopedia" className="w-5 h-5 mr-3 text-orange-400"/>Bách Khoa Toàn Thư</span>
            </button>
            <button onClick={() => { setIsMemoryModalOpen(true); setIsSidePanelOpen(false); }} className="w-full flex items-center justify-between px-3 py-3 text-sm text-left rounded-md hover:bg-slate-700 transition">
                <span className="flex items-center"><Icon name="memory" className="w-5 h-5 mr-3 text-purple-400"/>Ký Ức</span>
                {(gameState.memories.length + gameState.summaries.length) > 0 && <span className="text-xs bg-slate-600 text-white font-bold px-1.5 py-0.5 rounded-full">{gameState.memories.length + gameState.summaries.length}</span>}
            </button>
             <button onClick={() => { setIsTempRulesModalOpen(true); setIsSidePanelOpen(false); }} className="w-full flex items-center justify-between px-3 py-3 text-sm text-left rounded-md hover:bg-slate-700 transition">
                <span className="flex items-center"><Icon name="rules" className="w-5 h-5 mr-3 text-blue-400"/>Luật Tạm Thời / Ghi Chú</span>
            </button>
        </div>

        <div className="flex-shrink-0 pt-4 border-t border-slate-700">
            <div className="grid grid-cols-2 gap-2">
                <button onClick={handleManualSave} disabled={isSaving} className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-green-300 bg-green-900/40 hover:bg-green-800/60 rounded-lg transition disabled:opacity-50">
                    <Icon name="save" className="w-4 h-4"/>{isSaving ? 'Đang lưu...' : 'Lưu Game'}
                 </button>
                <button onClick={handleUndoTurn} disabled={gameState.history.length < 2} className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-yellow-300 bg-yellow-900/40 hover:bg-yellow-800/60 rounded-lg transition disabled:opacity-50"><Icon name="undo" className="w-4 h-4"/>Lùi Lượt</button>
                <button onClick={handleRestart} className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-pink-300 bg-pink-900/40 hover:bg-pink-800/60 rounded-lg transition"><Icon name="restart" className="w-4 h-4"/>Bắt Đầu Lại</button>
                 <button onClick={() => setShowExitConfirm(true)} className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 bg-slate-700/80 hover:bg-slate-700 rounded-lg transition">
                    <Icon name="back" className="w-4 h-4"/>Thoát
                </button>
            </div>
        </div>
      </div>
    );

  return (
    <>
      <NotificationModal
        isOpen={notificationModal.isOpen}
        onClose={() => setNotificationModal(prev => ({ ...prev, isOpen: false }))}
        title={notificationModal.title}
        messages={notificationModal.messages}
      />
      <TemporaryRulesModal isOpen={isTempRulesModalOpen} onClose={() => setIsTempRulesModalOpen(false)} onSave={handleSaveTemporaryRules} initialRules={gameState.worldConfig.temporaryRules} />
      <MemoryModal isOpen={isMemoryModalOpen} onClose={() => setIsMemoryModalOpen(false)} memories={gameState.memories} summaries={gameState.summaries} />
      <StoryLogModal isOpen={isStoryLogModalOpen} onClose={() => setIsStoryLogModalOpen(false)} history={currentTurns} title={`Diễn Biến Trang ${currentPage + 1}/${totalPages}`} initialScrollTop={storyLogInitialScrollTop} />
      <InformationModal isOpen={isInformationModalOpen} onClose={() => setIsInformationModalOpen(false)} gameState={gameState} onDeleteEntity={handleDeleteEntity} />
      <EncyclopediaModal isOpen={isEncyclopediaModalOpen} onClose={() => setIsEncyclopediaModalOpen(false)} gameState={gameState} setGameState={setGameState} onDeleteEntity={handleDeleteEntity} />
      <EntityInfoModal isOpen={!!entityModalContent} onClose={() => setEntityModalContent(null)} title={entityModalContent?.title || null} description={entityModalContent?.description || null} type={entityModalContent?.type || null} details={entityModalContent?.details || undefined} />
      <StatusHubModal isOpen={isStatusHubOpen} onClose={() => setIsStatusHubOpen(false)} statuses={gameState.playerStatus} companions={gameState.companions} quests={gameState.quests} onSelectStatus={handleEntityClick} onDeleteStatus={handleDeleteStatus} onSelectCompanion={handleCompanionClick} onSelectQuest={handleQuestClick} onDeleteQuest={handleDeleteQuest} />

      {showExitConfirm && ( <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4"> <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-6 w-full max-w-md relative animate-fade-in-up"> <h2 className="text-xl font-bold mb-4 text-slate-100">Xác nhận thoát</h2> <p className="text-slate-300 mb-6">Bạn có muốn lưu tiến trình trước khi thoát không?</p> <div className="flex justify-end gap-4"> <Button onClick={handleSaveAndExit} variant="primary" className="!w-auto !py-2 !px-4" disabled={isSaving}>{isSaving ? 'Đang lưu...' : 'Lưu & Thoát'}</Button> <Button onClick={onBack} variant="warning" className="!w-auto !py-2 !px-4">Thoát không lưu</Button> <button onClick={() => setShowExitConfirm(false)} className="text-slate-400 hover:text-white transition px-4 py-2 rounded-md">Hủy</button> </div> </div> </div> )}
      {showRestartConfirm && ( <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4"> <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-6 w-full max-w-md relative animate-fade-in-up"> <h2 className="text-xl font-bold mb-4 text-slate-100">Bắt đầu lại cuộc phiêu lưu?</h2> <p className="text-slate-300 mb-6">Bạn có muốn lưu tiến trình hiện tại trước khi bắt đầu lại không?</p> <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3"> <button onClick={() => setShowRestartConfirm(false)} className="w-full sm:w-auto text-slate-300 hover:text-white transition px-4 py-2 rounded-md text-center bg-slate-700/50 hover:bg-slate-700">Hủy</button> <Button onClick={handleRestartWithoutSaving} variant="warning" className="!w-full sm:!w-auto !py-2 !px-4">Không Lưu & Bắt Đầu Lại</Button> <Button onClick={handleSaveAndRestart} variant="primary" className="!w-full sm:!w-auto !py-2 !px-4" disabled={isSaving}>{isSaving ? 'Đang lưu...' : 'Lưu & Bắt Đầu Lại'}</Button> </div> </div> </div> )}
      {showUndoConfirm && ( <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4"> <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-6 w-full max-w-md relative animate-fade-in-up"> <h2 className="text-xl font-bold mb-4 text-yellow-400">Lùi Lại Một Lượt?</h2> <p className="text-slate-300 mb-2">Hành động này sẽ xóa lượt đi cuối cùng của bạn và AI, đồng thời hoàn tác các Ký Ức hoặc Tóm tắt được tạo ra trong lượt đó.</p> <p className="text-amber-400 text-sm mb-6"><strong className="font-bold">Lưu ý:</strong> Các thay đổi về trạng thái, vật phẩm... sẽ KHÔNG được hoàn tác.</p> <div className="flex justify-end gap-4"> <Button onClick={handleConfirmUndo} variant="warning" className="!w-auto !py-2 !px-4">Tiếp tục</Button> <button onClick={() => setShowUndoConfirm(false)} className="text-slate-400 hover:text-white transition px-4 py-2 rounded-md">Hủy</button> </div> </div> </div> )}
      
      <div className="lg:flex h-screen bg-slate-900 text-slate-200 font-sans lg:gap-4">
        {/* Main Content (Left Column on Desktop) */}
        <div className="flex-1 flex flex-col h-full p-2 sm:p-4 gap-2 sm:gap-4 lg:p-4 lg:pr-0">
            <header className="flex-shrink-0 bg-slate-800/50 p-2 rounded-lg">
              <div className="flex justify-between items-center">
                 <button onClick={() => setShowExitConfirm(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-200 bg-slate-700/80 hover:bg-slate-700 rounded-lg transition">
                    <Icon name="back" className="w-4 h-4"/>
                    <span className="hidden sm:inline">Về Trang Chủ</span>
                </button>
                <div className="text-center">
                  <h1 className="text-base sm:text-lg font-bold text-slate-100 truncate max-w-[150px] sm:max-w-[350px]">{gameState.worldConfig.storyContext.worldName || gameState.worldConfig.storyContext.genre}</h1>
                  <p className="text-xs text-slate-400">Lượt: {narrationTurns.length}</p>
                </div>
                 <div className="lg:hidden z-[60]">
                    <button onClick={() => setIsSidePanelOpen(true)} className="p-2 text-slate-300 hover:bg-slate-700 rounded-full transition">
                        <Icon name="ellipsisVertical" className="w-5 h-5" />
                    </button>
                </div>
                <div className="hidden lg:block w-[100px]"></div>
              </div>
            </header>

            <main className="flex-1 flex flex-col bg-slate-800/50 rounded-lg p-2 sm:p-4 overflow-hidden relative">
              {isInitialLoading && ( <div className="absolute inset-0 bg-slate-800/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 animate-fade-in"> <div className="w-12 h-12 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin"></div> <p className="mt-4 text-slate-300 font-semibold text-lg">AI đang kiến tạo thế giới...</p> </div> )}
              <div ref={logContainerRef} onClick={handleNarrationContainerClick} className={`flex-1 overflow-y-auto mb-4 pr-2 space-y-6 cursor-pointer`}>
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-green-400">Diễn biến câu chuyện:</h2>
                        <button onClick={(e) => { e.stopPropagation(); handleOpenStoryLog(); }} className="text-slate-400 hover:text-white transition" title="Mở trong cửa sổ mới"><Icon name="expand" className="w-5 h-5" /></button>
                    </div>
                </div>
                {currentTurns.map((turn, index) => (
                  <div key={index}>
                    {turn.type === 'narration' ? <FormattedNarration content={turn.content} statuses={gameState.playerStatus} onEntityClick={handleEntityClick} /> : <div className="bg-blue-900/20 border-l-4 border-blue-500 rounded-r-lg p-4"> <p className="text-blue-300 font-semibold mb-1">Hành động của bạn:</p> <p className="text-slate-200 italic whitespace-pre-wrap leading-relaxed">{turn.content}</p> </div>}
                  </div>
                ))}
                {isTurnLoading && ( <div className="mt-6 flex flex-col items-center p-4"> <div className="w-8 h-8 border-4 border-fuchsia-400 border-t-transparent rounded-full animate-spin"></div> <p className="mt-3 text-slate-300 font-semibold">AI đang suy nghĩ...</p> <p className="mt-1 text-slate-400 text-sm">Đang tạo ra diễn biến tiếp theo cho câu chuyện của bạn.</p> </div> )}
                <div ref={logEndRef} />
              </div>
              <div className="absolute bottom-24 right-4 z-20 flex flex-col gap-2">
                {showScrollUp && <button onClick={handleScrollToTop} className="bg-slate-700/80 hover:bg-slate-600/90 backdrop-blur-sm text-white p-2 rounded-full transition-opacity duration-300 animate-fade-in" aria-label="Cuộn lên trên"><Icon name="arrowUp" className="w-6 h-6" /></button>}
                {showScrollDown && <button onClick={handleScrollToBottom} className="bg-slate-700/80 hover:bg-slate-600/90 backdrop-blur-sm text-white p-2 rounded-full transition-opacity duration-300 animate-fade-in" aria-label="Cuộn xuống dưới"><Icon name="arrowDown" className="w-6 h-6" /></button>}
              </div>
              <div className="flex-shrink-0 mt-auto bg-slate-900/50 rounded-lg p-3 sm:p-4">
                {gameState.suggestions && gameState.suggestions.length > 0 && (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2"> <h3 className="text-lg font-bold text-green-400">Lựa chọn của ngươi:</h3> <button onClick={() => setShowSuggestions(!showSuggestions)} className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-purple-300 bg-purple-900/40 hover:bg-purple-800/60 rounded-lg transition" title={showSuggestions ? "Ẩn gợi ý" : "Hiện gợi ý"}> <span>{showSuggestions ? 'Ẩn' : 'Hiện'} Gợi Ý</span> <Icon name={showSuggestions ? 'arrowUp' : 'arrowDown'} className={`w-3 h-3 transition-transform duration-300 ${showSuggestions ? 'rotate-180' : ''}`} /> </button> </div>
                    <div className={`grid transition-all duration-500 ease-in-out ${showSuggestions ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                      <div className="overflow-hidden"> <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 max-h-[18rem] overflow-y-auto pr-2 pb-2">{gameState.suggestions.map((s, i) => <SuggestionCard key={i} index={i} suggestion={s} onSelect={handleActionSubmit}/>)}</div> </div>
                    </div>
                  </div>
                )}
                
                <div> <label className="text-slate-300 font-semibold mb-2 block text-sm">Hoặc nhập hành động tùy ý:</label> <div className="flex items-stretch gap-2 sm:gap-3"> <textarea value={playerInput} onChange={(e) => setPlayerInput(e.target.value)} onKeyPress={handleKeyPress} placeholder="Ví dụ: Nhìn xung quanh, Hỏi về chiếc chìa khóa..." disabled={isLoading} className="flex-1 bg-slate-900/70 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition resize-none" rows={1} /> <Button onClick={handleSendAction} disabled={isLoading} variant="primary" className="!w-auto !py-3 !px-4 sm:!px-6 self-stretch !text-base">{isTurnLoading ? <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : 'Gửi'}</Button> </div> </div>
                <div className="flex items-center justify-center gap-2 mt-2 flex-shrink-0"> <button onClick={() => handlePageChange(p => Math.max(0, p - 1))} disabled={currentPage === 0} className="px-2 py-1 rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition"><Icon name="arrowUp" className="w-4 h-4 rotate-[-90deg]" /></button> <span className="text-xs text-slate-500 font-mono px-2">Trang {currentPage + 1}/{totalPages}</span> <button onClick={() => handlePageChange(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage === totalPages - 1} className="px-2 py-1 rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition"><Icon name="arrowDown" className="w-4 h-4 rotate-[-90deg]" /></button> </div>
              </div>
            </main>
        </div>

        {/* Desktop Sidebar (Right Column) */}
        <aside className="w-[320px] xl:w-[350px] flex-shrink-0 h-full hidden lg:flex flex-col p-4 pl-0">
            <DashboardSidebar />
        </aside>
      </div>
      
       {/* Mobile Side Panel */}
      <div className={`fixed inset-0 z-40 transition-opacity duration-300 lg:hidden ${isSidePanelOpen ? 'bg-black/60 backdrop-blur-sm' : 'pointer-events-none bg-transparent'}`} onClick={() => setIsSidePanelOpen(false)}></div>
      <div ref={menuRef} className={`fixed top-0 right-0 h-full w-4/5 max-w-xs bg-slate-800/95 backdrop-blur-lg border-l border-slate-700 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out lg:hidden flex flex-col ${isSidePanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-4 border-b border-slate-700 flex-shrink-0">
                <h3 className="font-bold text-lg text-slate-100">Bảng Điều Khiển</h3>
          </div>
          <div className="flex-grow overflow-y-auto">
            <DashboardSidebar />
          </div>
      </div>
      
      <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          .animate-fade-in { animation: fadeIn 0.5s ease-in-out; }
          @keyframes fade-in-up { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fade-in-up { animation: fade-in-up 0.2s ease-out forwards; }
        `}</style>
    </>
  );
};

export default GameplayScreen;