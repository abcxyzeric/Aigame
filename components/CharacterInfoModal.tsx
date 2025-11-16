import React, { useState } from 'react';
import { GameState, InitialEntity } from '../types';
import Icon from './common/Icon';

interface InformationModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  onDeleteEntity: (entity: { name: string }) => void;
}

const InformationModal: React.FC<InformationModalProps> = ({ isOpen, onClose, gameState, onDeleteEntity }) => {
  const [expandedSkills, setExpandedSkills] = useState<Set<number>>(new Set());

  if (!isOpen) return null;

  const { character, inventory } = gameState;
  const characterPersonality = character.personality === 'Tuỳ chỉnh' ? character.customPersonality : character.personality;

  const stripTags = (text: string | null): string => {
    if (!text) return "";
    return text.replace(/<\/?(entity|important|exp|thought|status)>/g, '');
  };

  const toggleSkill = (index: number) => {
    setExpandedSkills(prev => {
        const newSet = new Set(prev);
        if (newSet.has(index)) {
            newSet.delete(index);
        } else {
            newSet.add(index);
        }
        return newSet;
    });
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
            <Icon name="user" className="w-6 h-6 mr-3" />
            Thông Tin Nhân Vật
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
             <Icon name="xCircle" className="w-7 h-7" />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-6">
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
                  {character.skills && character.skills.length > 0 ? (
                    <ul className="space-y-3">
                        {character.skills.map((skill, index) => {
                            const isExpanded = expandedSkills.has(index);
                            return (
                                <li key={index} className="bg-slate-900/30 p-2 rounded-md">
                                    <div className="flex justify-between items-center">
                                        <p className="font-bold text-yellow-400 flex-1 min-w-0">{stripTags(skill.name)}</p>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => toggleSkill(index)} className="p-1 text-slate-400 hover:text-white transition" title={isExpanded ? "Thu gọn" : "Mở rộng"}>
                                                <Icon name={isExpanded ? 'arrowUp' : 'arrowDown'} className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => onDeleteEntity({ name: skill.name })} className="p-1 text-slate-400 hover:text-red-400 transition" title="Xóa kỹ năng">
                                                <Icon name="trash" className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    {isExpanded && (
                                        <div className="mt-2 pt-2 border-t border-slate-700/50">
                                            <p className="text-sm text-slate-300">{stripTags(skill.description)}</p>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                  ) : (
                    <p className="text-slate-500 text-sm italic">Chưa học được kỹ năng nào.</p>
                  )}
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
                               <button onClick={() => onDeleteEntity({ name: item.name })} className="p-1 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
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