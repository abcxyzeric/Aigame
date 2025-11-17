import React, { useState, useMemo, useEffect, useRef } from 'react';
import { GameState, InitialEntity, EncounteredNPC, Companion, GameItem, Quest, EncounteredFaction, EncyclopediaData } from '../types';
import Icon from './common/Icon';
import Button from './common/Button';
import * as aiService from '../services/aiService';
import * as fileService from '../services/fileService';
import NotificationModal from './common/NotificationModal';


interface EncyclopediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  onDeleteEntity: (entity: { name: string }) => void;
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


// FIX: Changed to a named export to resolve module resolution issues.
export const EncyclopediaModal: React.FC<EncyclopediaModalProps> = ({ isOpen, onClose, gameState, setGameState, onDeleteEntity }) => {
    const [mainView, setMainView] = useState<'browse' | 'analyze' | 'manage'>('browse');
    const [activeTab, setActiveTab] = useState<Tab>('characters');
    const [searchTerm, setSearchTerm] = useState('');
    const [activeItem, setActiveItem] = useState<AllEntities | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editFormData, setEditFormData] = useState<any>(null);
    const [isAiOptimizing, setIsAiOptimizing] = useState(false);
    const [notification, setNotification] = useState({ isOpen: false, title: '', messages: [''] });
    const importFileRef = useRef<HTMLInputElement>(null);


    const encyclopediaData = useMemo(() => {
        if (!isOpen) return {
            characters: [], items: [], skills: [], factions: [], locations: [], quests: [], concepts: [], knowledge: [],
        };

        const allInitialAndDiscovered = [...(gameState.worldConfig.initialEntities || []), ...(gameState.discoveredEntities || [])];
        
        const uniqueByName = <T extends { name: string }>(arr: T[]): T[] => {
            const seen = new Set<string>();
            return arr.filter(item => {
                if (!item || !item.name) return false;
                const lowerName = item.name.toLowerCase();
                return seen.has(lowerName) ? false : seen.add(lowerName);
            });
        };

        const data = {
            characters: uniqueByName([...gameState.encounteredNPCs, ...gameState.companions, ...allInitialAndDiscovered.filter(e => e.type === 'NPC')]),
            items: uniqueByName([...gameState.inventory, ...allInitialAndDiscovered.filter(e => e.type === 'Vật phẩm')]),
            skills: uniqueByName([...gameState.character.skills, ...allInitialAndDiscovered.filter(e => e.type === 'Công pháp / Kỹ năng')]),
            factions: uniqueByName([...gameState.encounteredFactions, ...allInitialAndDiscovered.filter(e => e.type === 'Phe phái/Thế lực')]),
            locations: uniqueByName(allInitialAndDiscovered.filter(e => e.type === 'Địa điểm')),
            quests: uniqueByName(gameState.quests),
            concepts: uniqueByName(allInitialAndDiscovered.filter(e => !['NPC', 'Vật phẩm', 'Phe phái/Thế lực', 'Địa điểm', 'Công pháp / Kỹ năng'].includes(e.type))),
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
            if (mainView !== 'browse') setMainView('browse');
        }
    }, [isOpen]);

    useEffect(() => {
         setActiveItem(null);
         setIsEditing(false);
         setSearchTerm('');
    }, [activeTab, mainView]);

    const filteredList = useMemo(() => {
        let list: AllEntities[] = encyclopediaData[activeTab] || [];
        
        if (activeTab === 'quests') {
            list = [...list].sort((a, b) => {
                const statusA = (a as Quest).status === 'hoàn thành' ? 1 : 0;
                const statusB = (b as Quest).status === 'hoàn thành' ? 1 : 0;
                return statusA - statusB;
            });
        }

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
            status: (activeItem as Quest).status || 'đang tiến hành',
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

    const handleDelete = () => {
        if (!activeItem) return;
        onDeleteEntity({ name: activeItem.name });
        setActiveItem(null);
        setIsEditing(false);
    };
    
    const handleExport = () => {
        const encyclopediaExportData: EncyclopediaData = {
            encounteredNPCs: gameState.encounteredNPCs,
            encounteredFactions: gameState.encounteredFactions,
            discoveredEntities: gameState.discoveredEntities,
            inventory: gameState.inventory,
            companions: gameState.companions,
            quests: gameState.quests,
            skills: gameState.character.skills,
        };
        fileService.saveJsonToFile(encyclopediaExportData, 'bach_khoa_toan_thu.json');
    };

    const handleImportClick = () => {
        importFileRef.current?.click();
    };

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const importedData = await fileService.loadJsonFromFile<Partial<EncyclopediaData>>(file);
            
            setGameState(prev => {
                const mergeAndDeduplicate = <T extends { name: string }>(original: T[] = [], imported: T[] = []): T[] => {
                    const combined = [...imported, ...original];
                    const seen = new Set<string>();
                    return combined.filter(item => {
                        if (!item.name) return false;
                        const lowerName = item.name.toLowerCase();
                        return seen.has(lowerName) ? false : seen.add(lowerName);
                    });
                };

                return {
                    ...prev,
                    encounteredNPCs: mergeAndDeduplicate(prev.encounteredNPCs, importedData.encounteredNPCs),
                    encounteredFactions: mergeAndDeduplicate(prev.encounteredFactions, importedData.encounteredFactions),
                    discoveredEntities: mergeAndDeduplicate(prev.discoveredEntities, importedData.discoveredEntities),
                    inventory: mergeAndDeduplicate(prev.inventory, importedData.inventory),
                    companions: mergeAndDeduplicate(prev.companions, importedData.companions),
                    quests: mergeAndDeduplicate(prev.quests, importedData.quests),
                    character: {
                        ...prev.character,
                        skills: mergeAndDeduplicate(prev.character.skills, importedData.skills)
                    }
                };
            });
            setNotification({ isOpen: true, title: 'Thành công', messages: ['Đã nhập và hợp nhất dữ liệu Bách khoa thành công.'] });

        } catch (e) {
            const error = e instanceof Error ? e.message : "Lỗi không xác định";
            setNotification({ isOpen: true, title: 'Lỗi Nhập Dữ Liệu', messages: [error] });
        }
        
        if (event.target) {
            event.target.value = '';
        }
    };


    const handleAiOptimize = async () => {
        if (!confirm("Hành động này sẽ yêu cầu AI đọc lại toàn bộ bách khoa, hợp nhất các mục trùng lặp, tóm tắt thông tin và chuẩn hóa dữ liệu để tối ưu hóa. Quá trình này có thể thay đổi dữ liệu hiện có và sử dụng API. Bạn có muốn tiếp tục?")) {
            return;
        }
        setIsAiOptimizing(true);
        try {
            const response = await aiService.optimizeEncyclopediaWithAI(gameState);
            
            setGameState(prev => ({
                ...prev,
                encounteredNPCs: response.optimizedNPCs || prev.encounteredNPCs,
                encounteredFactions: response.optimizedFactions || prev.encounteredFactions,
                discoveredEntities: response.optimizedDiscoveredEntities || prev.discoveredEntities,
                inventory: response.optimizedInventory || prev.inventory,
                companions: response.optimizedCompanions || prev.companions,
                quests: response.optimizedQuests || prev.quests,
                character: {
                    ...prev.character,
                    skills: response.optimizedSkills || prev.character.skills,
                }
            }));
            
            setNotification({ isOpen: true, title: 'Thành Công', messages: ['Bách Khoa Toàn Thư đã được AI tối ưu hóa thành công!'] });

        } catch (e) {
            const error = e instanceof Error ? e.message : "Lỗi không xác định";
            setNotification({ isOpen: true, title: 'Lỗi Tối Ưu Hóa', messages: [`Lỗi khi tối ưu hóa bằng AI: ${error}`] });
        } finally {
            setIsAiOptimizing(false);
        }
    };

    const MainViewTab: React.FC<{ view: 'browse' | 'analyze' | 'manage', label: string, icon: any }> = ({ view, label, icon }) => {
        const isActive = mainView === view;
        return (
            <button
                onClick={() => setMainView(view)}
                className={`px-4 py-2 flex items-center gap-2 rounded-t-md border-b-2 font-semibold transition-all ${
                    isActive
                        ? 'bg-slate-800 border-pink-500 text-pink-400'
                        : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                }`}
            >
                <Icon name={icon} className="w-5 h-5" />
                {label}
            </button>
        );
    };

    const analysisStats = useMemo(() => {
        if (mainView !== 'analyze') return null;

        // FIX: Explicitly type allItems to resolve type inference issues.
        // FIX: Replaced Object.values().flat() with a more explicit array spread to avoid type inference issues that can result in `unknown[]`.
        const allItems: AllEntities[] = [
            ...encyclopediaData.characters,
            ...encyclopediaData.items,
            ...encyclopediaData.skills,
            ...encyclopediaData.factions,
            ...encyclopediaData.locations,
            ...encyclopediaData.quests,
            ...encyclopediaData.concepts,
            ...encyclopediaData.knowledge,
        ];
        const totalItems = allItems.length;

        const totalDescLength = allItems.reduce((acc, item) => {
            // FIX: Use type-safe access to description/content properties.
            const desc = isKnowledgeItem(item) ? item.content : item.description;
            return acc + (desc ? desc.length : 0);
        }, 0);
        const avgDescLength = totalItems > 0 ? Math.round(totalDescLength / totalItems) : 0;
        
        const allTags = allItems.flatMap(item => (item as any).tags || []);
        const tagCounts: Record<string, number> = allTags.reduce((acc: Record<string, number>, tag) => {
            acc[tag] = (acc[tag] || 0) + 1;
            return acc;
        }, {});
        
        const popularTags = Object.entries(tagCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([tag, count]) => `${tag} (${count})`)
            .join(', ');

        return { totalItems, avgDescLength, popularTags };
    }, [mainView, encyclopediaData]);


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <NotificationModal
                isOpen={notification.isOpen}
                onClose={() => setNotification(prev => ({ ...prev, isOpen: false }))}
                title={notification.title}
                messages={notification.messages}
            />
            <input type="file" ref={importFileRef} onChange={handleImport} className="hidden" accept=".json" />

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
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition">
                            <Icon name="xCircle" className="w-7 h-7" />
                        </button>
                    </div>
                </div>

                <div className="flex px-4 pt-2 border-b border-slate-700 flex-shrink-0">
                    <MainViewTab view="browse" label="Duyệt" icon="news" />
                    <MainViewTab view="analyze" label="Phân Tích" icon="magic" />
                    <MainViewTab view="manage" label="Quản Lý" icon="settings" />
                </div>
                
                {mainView === 'browse' && (
                    <div className="flex-grow flex overflow-hidden">
                        {/* Left Pane: Navigation */}
                        <div className="w-1/4 xl:w-1/5 bg-slate-800/50 p-3 flex-shrink-0 flex flex-col">
                            <h3 className="text-lg font-semibold text-slate-300 mb-3 px-1">Mục lục</h3>
                            <div className="flex-grow overflow-y-auto pr-2">
                                <div className="space-y-2">
                                    <TabButton active={activeTab === 'characters'} onClick={() => setActiveTab('characters')} iconName="user">Nhân Vật & Đồng hành</TabButton>
                                    <TabButton active={activeTab === 'items'} onClick={() => setActiveTab('items')} iconName="magic">Vật phẩm</TabButton>
                                    <TabButton active={activeTab === 'skills'} onClick={() => setActiveTab('skills')} iconName="magic">Kỹ năng</TabButton>
                                    <TabButton active={activeTab === 'factions'} onClick={() => setActiveTab('factions')} iconName="world">Thế Lực</TabButton>
                                    <TabButton active={activeTab === 'locations'} onClick={() => setActiveTab('locations')} iconName="world">Địa Điểm</TabButton>
                                    <TabButton active={activeTab === 'quests'} onClick={() => setActiveTab('quests')} iconName="quest">Nhiệm Vụ</TabButton>
                                    <TabButton active={activeTab === 'concepts'} onClick={() => setActiveTab('concepts')} iconName="news">Hệ thống sức mạnh / Lore</TabButton>
                                </div>
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
                                                    <div className="flex justify-between items-center">
                                                        <p className={`font-semibold truncate ${(item as Quest)?.status === 'hoàn thành' ? 'text-slate-500 line-through' : 'text-slate-100'}`}>
                                                            {item.name}
                                                        </p>
                                                        {activeTab === 'quests' && (item as Quest).status && (
                                                            <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                                                                (item as Quest).status === 'hoàn thành' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                                                            }`}>
                                                                {(item as Quest).status === 'hoàn thành' ? 'Hoàn thành' : 'Đang làm'}
                                                            </span>
                                                        )}
                                                    </div>
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
                                                <Button onClick={handleDelete} variant="warning" className="!w-auto !py-1 !px-3 !text-sm"><Icon name="trash" className="w-4 h-4 mr-1"/>Xóa</Button>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {('type' in activeItem && activeItem.type) && <p className="text-sm text-slate-400 mb-2">Loại: {activeItem.type}</p>}
                                    
                                    {activeTab === 'quests' && (activeItem as Quest).status && (
                                        <span className={`text-sm font-semibold px-3 py-1 rounded-full mb-4 inline-block ${
                                            (activeItem as Quest).status === 'hoàn thành' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                                        }`}>
                                            {(activeItem as Quest).status === 'hoàn thành' ? 'Đã Hoàn Thành' : 'Đang Tiến Hành'}
                                        </span>
                                    )}

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
                                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
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
                                        {activeTab === 'quests' && 'status' in editFormData && (
                                            <div>
                                                <label className="block text-sm font-medium text-slate-300 mb-1">Trạng thái</label>
                                                <select value={editFormData.status} onChange={e => handleFormChange('status', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-md p-2">
                                                    <option value="đang tiến hành">Đang tiến hành</option>
                                                    <option value="hoàn thành">Hoàn thành</option>
                                                </select>
                                            </div>
                                        )}
                                        {'tags' in editFormData && <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1">Tags (phân cách bởi dấu phẩy)</label>
                                            <input type="text" value={editFormData.tags} onChange={e => handleFormChange('tags', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-md p-2" />
                                        </div>}
                                    </div>
                                    <div className="flex gap-4 mt-6">
                                        <Button onClick={handleSaveEdit} variant="primary" className="!w-auto !py-2 !px-4 !text-sm">Lưu Thay Đổi</Button>
                                        <Button onClick={() => setIsEditing(false)} variant="secondary" className="!w-auto !py-2 !px-4 !text-sm">Hủy</Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                    <Icon name="encyclopedia" className="w-16 h-16 mb-4" />
                                    <p className="text-lg">Chọn một mục để xem chi tiết</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                 {mainView === 'analyze' && analysisStats && (
                    <div className="flex-grow p-6 overflow-y-auto">
                        <h2 className="text-xl font-bold text-pink-400 mb-6 flex items-center gap-2"><Icon name="magic" className="w-6 h-6"/>Phân Tích Bách Khoa</h2>
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-slate-900/50 p-4 rounded-lg text-center">
                                    <p className="text-sm text-slate-400 mb-1">Tổng mục</p>
                                    <p className="text-3xl font-bold text-blue-400">{analysisStats.totalItems}</p>
                                </div>
                                <div className="bg-slate-900/50 p-4 rounded-lg text-center">
                                    <p className="text-sm text-slate-400 mb-1">Mục mới</p>
                                    <p className="text-3xl font-bold text-green-400">0</p>
                                </div>
                                <div className="bg-slate-900/50 p-4 rounded-lg text-center">
                                    <p className="text-sm text-slate-400 mb-1">Độ dài TB</p>
                                    <p className="text-3xl font-bold text-purple-400">{analysisStats.avgDescLength}</p>
                                </div>
                                <div className="bg-slate-900/50 p-4 rounded-lg text-center">
                                    <p className="text-sm text-slate-400 mb-1">Tag phổ biến</p>
                                    <p className="text-xs font-semibold text-orange-400 truncate pt-2">{analysisStats.popularTags || 'Không có'}</p>
                                </div>
                            </div>

                            <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700">
                                <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                                    <Icon name="info" className="w-5 h-5"/>
                                    Thống Kê Chi Tiết
                                </h3>
                                <ul className="space-y-3 text-slate-300 text-sm">
                                    <li className="flex justify-between"><span>Tổng số mục Bách Khoa:</span> <span className="font-semibold">{analysisStats.totalItems}</span></li>
                                    <li className="flex justify-between"><span>Mục mới (chưa xem):</span> <span className="font-semibold">0</span></li>
                                    <li className="flex justify-between"><span>Độ dài mô tả trung bình:</span> <span className="font-semibold">{analysisStats.avgDescLength} ký tự</span></li>
                                    <li><span>Tag hàng đầu:</span> <span className="font-semibold text-orange-300">{analysisStats.popularTags || 'Không có'}</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
                {mainView === 'manage' && (
                     <div className="flex-grow p-6 overflow-y-auto">
                        <h2 className="text-xl font-bold text-orange-400 mb-4 flex items-center gap-2"><Icon name="settings" className="w-6 h-6"/>Quản Lý Bách Khoa</h2>
                        
                        <div className="bg-slate-900/50 p-4 rounded-lg mb-6 border border-slate-700">
                            <h3 className="text-lg font-semibold text-slate-300 mb-3 flex items-center gap-2"><Icon name="download" className="w-5 h-5"/>Nhập / Xuất</h3>
                            <p className="text-sm text-slate-400 mb-4">Lưu trữ toàn bộ dữ liệu Bách khoa hiện tại ra tệp .json hoặc nhập dữ liệu từ một tệp đã có.</p>
                            <div className="flex gap-4">
                                <Button onClick={handleExport} variant="secondary" className="!w-auto !py-2 !px-4 !text-sm"><Icon name="download" className="w-4 h-4 mr-2"/>Xuất</Button>
                                <Button onClick={handleImportClick} variant="secondary" className="!w-auto !py-2 !px-4 !text-sm"><Icon name="upload" className="w-4 h-4 mr-2"/>Nhập</Button>
                            </div>
                        </div>
                        
                        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                            <h3 className="text-lg font-semibold text-slate-300 mb-3 flex items-center gap-2"><Icon name="magic" className="w-5 h-5"/>Tối Ưu Hóa Dữ Liệu</h3>
                             <p className="text-sm text-slate-400 mb-4">Yêu cầu AI đọc, hợp nhất các mục trùng lặp, tóm tắt và chuẩn hóa dữ liệu để tối ưu hóa và giảm token.</p>
                            <Button onClick={handleAiOptimize} disabled={isAiOptimizing} variant="special" className="!w-auto !py-2 !px-4 !text-sm">
                                {isAiOptimizing ? 'Đang Chuẩn Hóa...' : <><Icon name="magic" className="w-4 h-4 mr-2"/>Chuẩn Hóa</>}
                            </Button>
                             {isAiOptimizing && <p className="text-sm text-slate-400 mt-2 animate-pulse">AI đang xử lý, quá trình này có thể mất một lúc...</p>}
                        </div>
                    </div>
                )}
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
    );
};

// This is the correct way to export a named component in TSX.
// export default EncyclopediaModal;