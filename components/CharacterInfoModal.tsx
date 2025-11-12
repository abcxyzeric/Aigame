import React, { useState } from 'react';
import { GameState, InitialEntity } from '../types';
import Icon from './common/Icon';

interface InformationModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  onItemDelete: (itemName: string) => void;
}

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; iconName: any; }> = ({ active, onClick, children, iconName }) => (
    <button
        onClick={onClick}
        className={`flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-colors duration-200 focus:outline-none w-1/2 ${
            active
                ? 'text-pink-300 border-b-2 border-pink-400 bg-slate-900/30'
                : 'text-slate-400 hover:text-slate-200 border-b-2 border-transparent hover:bg-slate-700/50'
        }`}
    >
        <Icon name={iconName} className="w-5 h-5" />
        {children}
    </button>
);

const EntityList: React.FC<{ title: string; entities: InitialEntity[]; color: string; }> = ({ title, entities, color }) => {
    if (!entities || entities.length === 0) return null;

    const stripTags = (text: string | null): string => {
        if (!text) return "";
        return text.replace(/<\/?(entity|important|exp|thought|status)>/g, '');
    };

    return (
        <div className="mt-6">
            <h3 className={`text-lg font-semibold text-${color}-300 border-b border-${color}-500/30 pb-1 mb-2`}>{title}</h3>
            <ul className="space-y-3">
                {entities.map((entity, index) => (
                    <li key={index} className="bg-slate-900/50 p-3 rounded-md">
                        <p className={`font-bold text-${color}-400`}>{stripTags(entity.name)}</p>
                        {entity.personality && <p className="text-xs text-slate-400 mt-1"><strong className="text-slate-300">Tính cách:</strong> {stripTags(entity.personality)}</p>}
                        <p className="text-xs text-slate-400 mt-1">{stripTags(entity.description)}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
};


const InformationModal: React.FC<InformationModalProps> = ({ isOpen, onClose, gameState, onItemDelete }) => {
  const [activeTab, setActiveTab] = useState<'character' | 'world'>('character');
  
  if (!isOpen) return null;

  const { character, inventory, encounteredNPCs, encounteredFactions, worldConfig } = gameState;
  const characterPersonality = character.personality === 'Tuỳ chỉnh' ? character.customPersonality : character.personality;
  
  const initialNPCs = worldConfig.initialEntities.filter(e => e.type === 'NPC');
  const initialFactions = worldConfig.initialEntities.filter(e => e.type === 'Phe phái/Thế lực');
  const initialItems = worldConfig.initialEntities.filter(e => e.type === 'Vật phẩm');
  const initialLocations = worldConfig.initialEntities.filter(e => e.type === 'Địa điểm');

  const stripTags = (text: string | null): string => {
    if (!text) return "";
    return text.replace(/<\/?(entity|important|exp|thought|status)>/g, '');
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl w-full max-w-4xl relative animate-fade-in-up flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-pink-400 flex items-center">
            <Icon name="info" className="w-6 h-6 mr-3" />
            Thông Tin
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
             <Icon name="xCircle" className="w-7 h-7" />
          </button>
        </div>

        <div className="flex-shrink-0">
            <nav className="flex">
                <TabButton active={activeTab === 'character'} onClick={() => setActiveTab('character')} iconName="user">Nhân Vật</TabButton>
                <TabButton active={activeTab === 'world'} onClick={() => setActiveTab('world')} iconName="world">Thế Giới</TabButton>
            </nav>
        </div>

        <div className="flex-grow overflow-y-auto p-6">
          {activeTab === 'character' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-pink-300 border-b border-pink-500/30 pb-1 mb-2">Chi Tiết</h3>
                  <p><strong className="text-slate-400">Tên:</strong> {stripTags(character.name)}</p>
                  <p><strong className="text-slate-400">Giới tính:</strong> {character.gender}</p>
                  <p><strong className="text-slate-400">Tính cách:</strong> {stripTags(characterPersonality || '')}</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-pink-300 border-b border-pink-500/30 pb-1 mb-2">Tiểu Sử & Ngoại Hình</h3>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{stripTags(character.bio)}</p>
                </div>
                 <div>
                  <h3 className="text-lg font-semibold text-pink-300 border-b border-pink-500/30 pb-1 mb-2">Động Lực</h3>
                  <p className="text-sm text-slate-300 italic">{stripTags(character.motivation)}</p>
                </div>
                 <div>
                  <h3 className="text-lg font-semibold text-pink-300 border-b border-pink-500/30 pb-1 mb-2">Kỹ Năng</h3>
                  <p className="font-bold text-yellow-400">{stripTags(character.skills.name)}</p>
                  <p className="text-sm text-slate-300">{stripTags(character.skills.description)}</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-yellow-300 border-b border-yellow-500/30 pb-1 mb-2">Túi Đồ</h3>
                {inventory && inventory.length > 0 ? (
                  <ul className="space-y-3">
                    {inventory.map((item, index) => (
                      <li key={index} className="bg-slate-900/50 p-3 rounded-md group">
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-yellow-400 flex-1 min-w-0 break-words">{stripTags(item.name)}</p>
                          <div className="flex items-center gap-2 ml-2">
                              <span className="text-xs font-mono bg-slate-700 px-1.5 py-0.5 rounded">x{item.quantity}</span>
                               <button onClick={() => onItemDelete(item.name)} className="p-1 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Icon name="trash" className="w-4 h-4" />
                              </button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{stripTags(item.description)}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500 text-sm text-center py-4">Túi đồ trống.</p>
                )}
              </div>
            </div>
          )}
          {activeTab === 'world' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-lg font-semibold text-cyan-300 border-b border-cyan-500/30 pb-1 mb-2">Nhân Vật Đã Gặp</h3>
                    {encounteredNPCs && encounteredNPCs.length > 0 ? (
                        <ul className="space-y-3">
                            {encounteredNPCs.map((npc, index) => (
                                <li key={index} className="bg-slate-900/50 p-3 rounded-md">
                                    <p className="font-bold text-cyan-400">{stripTags(npc.name)}</p>
                                    <p className="text-xs text-slate-400 mt-1">{stripTags(npc.description)}</p>
                                    <p className="text-xs text-slate-400 mt-1"><strong className="text-slate-300">Tính cách:</strong> {stripTags(npc.personality)}</p>
                                    <p className="text-xs text-amber-300 mt-2 italic">"{stripTags(npc.thoughtsOnPlayer)}"</p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-slate-500 text-sm text-center py-4">Chưa gặp nhân vật nào.</p>
                    )}
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-lime-300 border-b border-lime-500/30 pb-1 mb-2">Thế Lực Đã Biết</h3>
                    {encounteredFactions && encounteredFactions.length > 0 ? (
                        <ul className="space-y-3">
                            {encounteredFactions.map((faction, index) => (
                                <li key={index} className="bg-slate-900/50 p-3 rounded-md">
                                    <p className="font-bold text-lime-400">{stripTags(faction.name)}</p>
                                    <p className="text-xs text-slate-400 mt-1">{stripTags(faction.description)}</p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-slate-500 text-sm text-center py-4">Chưa biết về thế lực nào.</p>
                    )}
                </div>
              </div>
              <div className="mt-6 border-t border-slate-700 pt-6">
                <h2 className="text-xl font-bold text-green-400 mb-4">Thế giới được kiến tạo ban đầu</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <EntityList title="NPC Ban Đầu" entities={initialNPCs} color="cyan"/>
                    </div>
                    <div>
                         <EntityList title="Phe Phái/Thế Lực Ban Đầu" entities={initialFactions} color="lime"/>
                    </div>
                    <div>
                        <EntityList title="Vật Phẩm Ban Đầu" entities={initialItems} color="yellow"/>
                    </div>
                     <div>
                        <EntityList title="Địa Điểm Ban Đầu" entities={initialLocations} color="sky"/>
                    </div>
                </div>
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
    </div>
  );
};

export default InformationModal;