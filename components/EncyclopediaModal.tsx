import React, { useState, useMemo, useEffect } from 'react';
import { GameState, InitialEntity, EncounteredNPC, Companion, GameItem, Quest, EncounteredFaction } from '../types';
import Icon from './common/Icon';
import Button from './common/Button';
import * as aiService from '../services/aiService';

interface EncyclopediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}

type KnowledgeFile = { name: string, content: string };
type Tab = 'characters' | 'items' | 'skills' | 'factions' | 'locations' | 'quests' | 'concepts' | 'knowledge';
type AllEntities = (EncounteredNPC | Companion | GameItem | {name: string, description: string, tags?: string[]} | EncounteredFaction | InitialEntity | Quest | KnowledgeFile);

const isKnowledgeItem = (item: AllEntities): item is KnowledgeFile => 'content' in item && !('description' in item);

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; iconName: any; }> = ({ active, onClick, children, iconName }) => (
    <button
        onClick={onClick}
        className={`flex items-center justify-start gap-2 px-3 py-3 text-xs sm:text-sm font-semibold transition-colors duration-200 focus:outline-none w-full text-left rounded-md ${
            active
                ? 'text-purple-300 bg-slate-900/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
        }`}
    >
        <Icon name={iconName} className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
        <span className="truncate">{children}</span>
    </button>
);


const EncyclopediaModal: React.FC<EncyclopediaModalProps> = ({ isOpen, onClose, gameState, setGameState }) => {
    const [activeTab, setActiveTab] = useState<Tab>('characters');
    const [searchTerm, setSearchTerm] = useState('');
    const [activeItem, setActiveItem] = useState<AllEntities | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editFormData, setEditFormData] = useState<any>(null);
    const [isAiUpdating, setIsAiUpdating] = useState(false);

    const encyclopediaData = useMemo(() => {
        if (!isOpen) return {
            characters: [], items: [], skills: [], factions: [], locations: [], quests: [], concepts: [], knowledge: [],
        };

        const allDiscovered = [...(gameState.worldConfig.initialEntities || []), ...(gameState.discoveredEntities || [])];
        
        const uniqueByName = <T extends { name: string }>(arr: T[]): T[] => {
            const seen = new Set<string>();
            return arr.filter(item => {
                if (!item || !item.name) return false;
                const lowerName = item.name.toLowerCase();
                return seen.has(lowerName) ? false : seen.add(lowerName);
            });
        };

        const allKnownItems: (GameItem | InitialEntity)[] = uniqueByName([
            ...gameState.inventory, 
            ...allDiscovered.filter(e => e.type === 'Vật phẩm')
        ]);
        const allKnownSkills: ({name: string, description: string} | InitialEntity)[] = uniqueByName([
            ...gameState.character.skills, 
            ...allDiscovered.filter(e => e.type === 'Công pháp / Kỹ năng')
        ]);

        const data = {
            characters: uniqueByName([...gameState.encounteredNPCs, ...gameState.companions]),
            items: allKnownItems,
            skills: allKnownSkills,
            factions: uniqueByName(gameState.encounteredFactions),
            locations: uniqueByName(allDiscovered.filter(e => e.type === 'Địa điểm')),
            quests: uniqueByName(gameState.quests),
            concepts: uniqueByName(allDiscovered.filter(e => !['NPC', 'Vật phẩm', 'Phe phái/Thế lực', 'Địa điểm', 'Công pháp / Kỹ năng'].includes(e.type))),
            knowledge: gameState.worldConfig.backgroundKnowledge || [],
        };
        
        return data;
    }, [isOpen, gameState]);
    
    // Reset state on open/close or tab change
    useEffect(() => {
        if (isOpen) {
            setActiveItem(null);
            setIsEditing(false);
            setSearchTerm('');
        }
    }, [isOpen, activeTab]);

    const filteredList = useMemo(() => {
        const list = encyclopediaData[activeTab] || [];
        if (!searchTerm) return list;
        return list.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [encyclopediaData, activeTab, searchTerm]);
    
    const handleSelectItem = (item: AllEntities) => {
        setActiveItem(item);
        setIsEditing(false);
    };

    const handleStartEdit = () => {
        if (!activeItem || isKnowledgeItem(activeItem)) return;
        setEditFormData({
            ...activeItem,
            tags: ((activeItem as any).tags || []).join(', '),
        });
        setIsEditing(true);
    };

    const handleFormChange = (field: string, value: string) => {
        setEditFormData((prev: any) => ({ ...prev, [field]: value }));
    };

    const handleSaveEdit = () => {
        if (!editFormData) return;
        const updatedItem = {
            ...editFormData,
            tags: editFormData.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
        };
        
        setGameState(prev => {
            const newState = { ...prev };
            let updated = false;

            const updateList = (list: any[]) => {
                if(updated || !list) return list;
                const itemIndex = list.findIndex(item => item.name === updatedItem.name);
                if (itemIndex > -1) {
                    list[itemIndex] = updatedItem;
                    updated = true;
                }
                return list;
            };

            switch(activeTab) {
                case 'characters':
                    newState.encounteredNPCs = updateList([...(newState.encounteredNPCs || [])]);
                    if (!updated) newState.companions = updateList([...(newState.companions || [])]);
                    break;
                case 'items':
                    newState.inventory = updateList([...(newState.inventory || [])]);
                    break;
                case 'skills':
                    newState.character = {...newState.character, skills: updateList([...(newState.character.skills || [])])};
                    break;
                case 'factions':
                     newState.encounteredFactions = updateList([...(newState.encounteredFactions || [])]);
                    break;
                case 'quests':
                    newState.quests = updateList([...(newState.quests || [])]);
                    break;
                case 'locations':
                case 'concepts':
                    newState.discoveredEntities = updateList([...(newState.discoveredEntities || [])]);
                    if (!updated) {
                       newState.worldConfig = {...newState.worldConfig, initialEntities: updateList([...(newState.worldConfig.initialEntities || [])])};
                    }
                    break;
            }
            return newState;
        });
        
        setActiveItem(updatedItem);
        setIsEditing(false);
    };

    const handleDeleteItem = () => {
         if (!activeItem) return;
         if (!confirm(`Bạn có chắc muốn xóa "${activeItem.name}" không? Thao tác này không thể hoàn tác.`)) return;

         setGameState(prev => {
            const newState = { ...prev };
            const nameToDelete = activeItem.name;

            const filterList = (list: any[]) => list ? list.filter(item => item.name !== nameToDelete) : [];

             switch(activeTab) {
                case 'characters':
                    newState.encounteredNPCs = filterList(newState.encounteredNPCs);
                    newState.companions = filterList(newState.companions);
                    break;
                case 'items':
                    newState.inventory = filterList(newState.inventory);
                    break;
                case 'skills':
                     newState.character = {...newState.character, skills: filterList(newState.character.skills)};
                    break;
                case 'factions':
                     newState.encounteredFactions = filterList(newState.encounteredFactions);
                    break;
                case 'quests':
                    newState.quests = filterList(newState.quests);
                    break;
                case 'locations':
                case 'concepts':
                    newState.discoveredEntities = filterList(newState.discoveredEntities);
                    newState.worldConfig = {...newState.worldConfig, initialEntities: filterList(newState.worldConfig.initialEntities)};
                    break;
            }
             return newState;
         });

         setActiveItem(null);
         setIsEditing(false);
    };

    const handleAiUpdate = async () => {
        if (!confirm("Hành động này sẽ yêu cầu AI đọc lại toàn bộ câu chuyện để cập nhật và làm giàu Bách Khoa Toàn Thư. Quá trình này có thể mất một chút thời gian và sử dụng API. Bạn có muốn tiếp tục?")) {
            return;
        }
        setIsAiUpdating(true);
        try {
            const updates = await aiService.updateEncyclopediaWithAI(gameState);
            
            setGameState(prev => {
                const newState = { ...prev };
                
                const mergeAndUpdate = (originalList: any[], updateList: any[] | undefined, keyField = 'name') => {
                    if (!updateList || updateList.length === 0) return originalList;
                    
                    const updateMap = new Map(updateList.map(item => [item[keyField].toLowerCase(), item]));
                    const existingNames = new Set(originalList.map(item => item[keyField].toLowerCase()));

                    const mergedList = originalList.map(item => updateMap.get(item[keyField].toLowerCase()) || item);
                    
                    updateList.forEach(item => {
                        if (!existingNames.has(item[keyField].toLowerCase())) {
                            mergedList.push(item);
                        }
                    });
                    return mergedList;
                };

                newState.encounteredNPCs = mergeAndUpdate(newState.encounteredNPCs || [], updates.updatedEncounteredNPCs);
                newState.encounteredFactions = mergeAndUpdate(newState.encounteredFactions || [], updates.updatedEncounteredFactions);
                newState.discoveredEntities = mergeAndUpdate(newState.discoveredEntities || [], updates.updatedDiscoveredEntities);
                
                if (updates.updatedCharacter) {
                    newState.character = { 
                        ...newState.character, 
                        bio: updates.updatedCharacter.bio || newState.character.bio,
                        motivation: updates.updatedCharacter.motivation || newState.character.motivation,
                    };
                }
                
                return newState;
            });
            
            alert("Bách Khoa Toàn Thư đã được AI cập nhật!");

        } catch (e) {
            const error = e instanceof Error ? e.message : "Lỗi không xác định";
            alert(`Lỗi khi cập nhật bằng AI: ${error}`);
        } finally {
            setIsAiUpdating(false);
        }
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div 
                className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl w-full max-w-6xl relative animate-fade-in-up flex flex-col"
                style={{ height: '90vh' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-slate-700 flex-shrink-0">
                    <h2 className="text-xl font-bold text-purple-400 flex items-center">
                        <Icon name="encyclopedia" className="w-6 h-6 mr-3" />
                        Bách Khoa Toàn Thư
                    </h2>
                     <div className="flex items-center gap-4">
                        <Button onClick={handleAiUpdate} disabled={isAiUpdating} variant="special" className="!w-auto !py-1 !px-3 !text-sm">
                            {isAiUpdating ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Đang cập nhật...
                                </span>
                            ) : (
                                <span className="flex items-center">
                                    <Icon name="magic" className="w-4 h-4 mr-2"/> Cập nhật bằng AI
                                </span>
                            )}
                        </Button>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition">
                            <Icon name="xCircle" className="w-7 h-7" />
                        </button>
                    </div>
                </div>

                <div className="flex-grow flex overflow-hidden">
                    {/* Left Pane: Navigation */}
                    <div className="w-1/4 xl:w-1/5 bg-slate-800/50 p-3 flex-shrink-0 flex flex-col">
                         <h3 className="text-lg font-semibold text-slate-300 mb-3 px-1">Mục lục</h3>
                         <div className="space-y-2">
                            <TabButton active={activeTab === 'characters'} onClick={() => setActiveTab('characters')} iconName="user">Nhân Vật & Đồng hành</TabButton>
                            <TabButton active={activeTab === 'items'} onClick={() => setActiveTab('items')} iconName="magic">Vật phẩm</TabButton>
                            <TabButton active={activeTab === 'skills'} onClick={() => setActiveTab('skills')} iconName="magic">Kỹ năng</TabButton>
                            <TabButton active={activeTab === 'factions'} onClick={() => setActiveTab('factions')} iconName="world">Thế Lực</TabButton>
                            <TabButton active={activeTab === 'locations'} onClick={() => setActiveTab('locations')} iconName="world">Địa Điểm</TabButton>
                            <TabButton active={activeTab === 'quests'} onClick={() => setActiveTab('quests')} iconName="quest">Nhiệm Vụ</TabButton>
                            <TabButton active={activeTab === 'concepts'} onClick={() => setActiveTab('concepts')} iconName="news">Khái niệm khác</TabButton>
                            {encyclopediaData.knowledge.length > 0 && (
                                <TabButton active={activeTab === 'knowledge'} onClick={() => setActiveTab('knowledge')} iconName="rules">Kiến Thức Nền</TabButton>
                            )}
                         </div>
                    </div>
                    {/* Middle Pane: List */}
                    <div className="w-1/3 xl:w-1/4 border-l border-r border-slate-700 flex flex-col">
                        <div className="p-3 border-b border-slate-700 flex-shrink-0">
                            <input 
                                type="text"
                                placeholder="Tìm kiếm trong mục..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-900/70 border border-slate-600 rounded-md px-3 py-2 text-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition placeholder:text-slate-500"
                            />
                        </div>
                        <div className="flex-grow overflow-y-auto">
                            {filteredList.length > 0 ? (
                                <ul className="p-2">
                                    {filteredList.map((item, index) => (
                                        <li key={index}>
                                            <button onClick={() => handleSelectItem(item)} className={`w-full text-left p-2 rounded-md transition-colors ${activeItem?.name === item.name ? 'bg-purple-600/30' : 'hover:bg-slate-700/50'}`}>
                                                <p className="font-semibold text-slate-100 truncate">{item.name}</p>
                                                {'quantity' in item && typeof item.quantity === 'number' && <p className="text-xs text-slate-400">Số lượng: {item.quantity}</p>}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-slate-500 text-center p-4">Không có mục nào.</p>
                            )}
                        </div>
                    </div>
                    {/* Right Pane: Details */}
                    <div className="flex-grow p-6 overflow-y-auto">
                        {activeItem && !isEditing ? (
                             <div>
                                <div className="flex justify-between items-start">
                                    <h3 className="text-2xl font-bold text-purple-300 mb-2">{activeItem.name}</h3>
                                    {activeTab !== 'knowledge' && (
                                        <div className="flex gap-2">
                                            <Button onClick={handleStartEdit} variant="secondary" className="!w-auto !py-1 !px-3 !text-sm"><Icon name="pencil" className="w-4 h-4 mr-1"/>Chỉnh sửa</Button>
                                            <Button onClick={handleDeleteItem} variant="warning" className="!w-auto !py-1 !px-3 !text-sm"><Icon name="trash" className="w-4 h-4 mr-1"/>Xóa</Button>
                                        </div>
                                    )}
                                </div>
                                
                                {('type' in activeItem && activeItem.type) && <p className="text-sm text-slate-400 mb-4">Loại: {activeItem.type}</p>}

                                <div className="mb-4">
                                    <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                                        {isKnowledgeItem(activeItem) ? activeItem.content : (activeItem as any).description || 'Chưa có mô tả.'}
                                    </p>
                                </div>
                                 {'personality' in activeItem && activeItem.personality && (
                                     <div className="mb-4">
                                        <strong className="text-slate-400 block mb-1">Tính cách:</strong>
                                        <p className="text-slate-300 italic">"{activeItem.personality}"</p>
                                    </div>
                                 )}
                                 {'thoughtsOnPlayer' in activeItem && activeItem.thoughtsOnPlayer && (
                                     <div className="mb-4">
                                        <strong className="text-slate-400 block mb-1">Suy nghĩ về người chơi:</strong>
                                        <p className="text-amber-300 italic">"{activeItem.thoughtsOnPlayer}"</p>
                                    </div>
                                 )}

                                {'tags' in activeItem && activeItem.tags && activeItem.tags.length > 0 && (
                                    <div className="mt-4">
                                        <strong className="text-slate-400 block mb-2">Tags:</strong>
                                        <div className="flex flex-wrap gap-2">
                                            {(activeItem.tags as string[]).map((tag, i) => (
                                                <span key={i} className="bg-slate-700 text-slate-300 text-xs font-medium px-2.5 py-1 rounded-full">{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : activeItem && isEditing ? (
                            <div>
                                <h3 className="text-2xl font-bold text-purple-300 mb-4">Chỉnh sửa: {activeItem.name}</h3>
                                <div className="space-y-4">
                                     <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Tên</label>
                                        <input type="text" value={editFormData.name} onChange={e => handleFormChange('name', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-md p-2" />
                                     </div>
                                      <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Mô tả</label>
                                        <textarea value={editFormData.description} onChange={e => handleFormChange('description', e.target.value)} rows={5} className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 resize-y" />
                                     </div>
                                     {'personality' in editFormData && <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Tính cách</label>
                                        <input type="text" value={editFormData.personality} onChange={e => handleFormChange('personality', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-md p-2" />
                                     </div>}
                                     <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Tags (phân cách bằng dấu phẩy)</label>
                                        <input type="text" value={editFormData.tags} onChange={e => handleFormChange('tags', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-md p-2" />
                                     </div>
                                </div>
                                <div className="flex gap-4 mt-6">
                                    <Button onClick={handleSaveEdit} variant="success" className="!w-auto !py-2 !px-4">Lưu thay đổi</Button>
                                    <Button onClick={() => setIsEditing(false)} variant="secondary" className="!w-auto !py-2 !px-4">Hủy</Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
                                <Icon name="encyclopedia" className="w-16 h-16 mb-4" />
                                <h3 className="text-xl font-semibold">Bách Khoa Toàn Thư</h3>
                                <p>Chọn một mục từ danh sách bên trái để xem chi tiết.</p>
                            </div>
                        )}
                    </div>
                </div>
                
                <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.3s ease-out forwards;
                }
                `}</style>
            </div>
        </div>
    );
};

export default EncyclopediaModal;