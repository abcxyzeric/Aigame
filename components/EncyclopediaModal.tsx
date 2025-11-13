import React, { useState, useMemo, useEffect } from 'react';
import { GameState, InitialEntity, EncounteredNPC, Companion, GameItem, Quest, EncounteredFaction, CharacterConfig } from '../types';
import Icon from './common/Icon';
import Button from './common/Button';

interface EncyclopediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}

type Tab = 'characters' | 'items' | 'skills' | 'factions' | 'locations' | 'quests' | 'concepts';
type AllEntities = (EncounteredNPC | Companion | GameItem | {name: string, description: string, tags?: string[]} | EncounteredFaction | InitialEntity | Quest);

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

    const encyclopediaData = useMemo(() => {
        if (!isOpen) return {};

        const allDiscovered = [...(gameState.worldConfig.initialEntities || []), ...(gameState.discoveredEntities || [])];
        
        const data: {[key in Tab]?: any[]} = {
            characters: [...gameState.encounteredNPCs, ...gameState.companions],
            items: gameState.inventory,
            skills: gameState.character.skills,
            factions: gameState.encounteredFactions,
            locations: allDiscovered.filter(e => e.type === 'Địa điểm'),
            quests: gameState.quests,
            concepts: allDiscovered.filter(e => !['NPC', 'Vật phẩm', 'Phe phái/Thế lực', 'Địa điểm'].includes(e.type)),
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
        if (!activeItem) return;
        setEditFormData({
            ...activeItem,
            tags: (activeItem.tags || []).join(', '),
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
                if(updated) return list;
                const itemIndex = list.findIndex(item => item.name === updatedItem.name);
                if (itemIndex > -1) {
                    list[itemIndex] = updatedItem;
                    updated = true;
                }
                return list;
            };

            switch(activeTab) {
                case 'characters':
                    newState.encounteredNPCs = updateList([...newState.encounteredNPCs]);
                    newState.companions = updateList([...newState.companions]);
                    break;
                case 'items':
                    newState.inventory = updateList([...newState.inventory]);
                    break;
                case 'skills':
                    newState.character = {...newState.character, skills: updateList([...newState.character.skills])};
                    break;
                case 'factions':
                     newState.encounteredFactions = updateList([...newState.encounteredFactions]);
                    break;
                case 'quests':
                    newState.quests = updateList([...newState.quests]);
                    break;
                case 'locations':
                case 'concepts':
                    newState.discoveredEntities = updateList([...newState.discoveredEntities]);
                     // Also check initial entities as a fallback
                    if (!updated) {
                       newState.worldConfig = {...newState.worldConfig, initialEntities: updateList([...newState.worldConfig.initialEntities])};
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

            const filterList = (list: any[]) => list.filter(item => item.name !== nameToDelete);

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
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition">
                        <Icon name="xCircle" className="w-7 h-7" />
                    </button>
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
                                                {'quantity' in item && <p className="text-xs text-slate-400">Số lượng: {item.quantity}</p>}
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
                                    <div className="flex gap-2">
                                        <Button onClick={handleStartEdit} variant="secondary" className="!w-auto !py-1 !px-3 !text-sm"><Icon name="magic" className="w-4 h-4 mr-1"/>Chỉnh sửa</Button>
                                        <Button onClick={handleDeleteItem} variant="warning" className="!w-auto !py-1 !px-3 !text-sm"><Icon name="trash" className="w-4 h-4 mr-1"/>Xóa</Button>
                                    </div>
                                </div>
                                
                                {'type' in activeItem && <p className="text-sm text-slate-400 mb-4">Loại: {activeItem.type}</p>}

                                <div className="mb-4">
                                    <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{activeItem.description || 'Chưa có mô tả.'}</p>
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

                                {activeItem.tags && activeItem.tags.length > 0 && (
                                    <div className="mt-4">
                                        <strong className="text-slate-400 block mb-2">Tags:</strong>
                                        <div className="flex flex-wrap gap-2">
                                            {activeItem.tags.map((tag, i) => (
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