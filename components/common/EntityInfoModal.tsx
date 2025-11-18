

import React from 'react';
import Icon from './Icon';
import { InitialEntity } from '../../types';

interface EntityInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string | null;
  description: string | null;
  type: string | null;
  details?: InitialEntity['details'];
}

const EntityInfoModal: React.FC<EntityInfoModalProps> = ({ isOpen, onClose, title, description, type, details }) => {
  if (!isOpen || !title) return null;

  const stripTags = (text: string | null): string => {
    if (!text) return "Không có mô tả chi tiết.";
    // Specifically remove game-related tags, leaving other potential HTML untouched.
    return text.replace(/<\/?(entity|important|exp|thought|status)>/g, '');
  };

  const RarityColor: { [key: string]: string } = {
      'Phổ thông': 'text-slate-300',
      'Không phổ biến': 'text-green-400',
      'Hiếm': 'text-blue-400',
      'Sử thi': 'text-purple-400',
      'Huyền thoại': 'text-orange-400',
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div 
        className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-6 w-full max-w-lg relative animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold text-yellow-400">{stripTags(title)}</h2>
            {type && <p className="text-sm text-slate-400">{type}{details?.subType && ` - ${details.subType}`}</p>}
             {details?.rarity && <p className={`text-sm font-semibold ${RarityColor[details.rarity] || 'text-slate-300'}`}>{details.rarity}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
             <Icon name="xCircle" className="w-7 h-7" />
          </button>
        </div>
        
        <div className="max-h-[60vh] overflow-y-auto pr-2">
            <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                {stripTags(description) || "Không có mô tả chi tiết."}
            </p>

            {details && (
                <div className="mt-4 border-t border-slate-700 pt-4 text-sm space-y-2">
                    {details.stats && (
                        <div>
                            <strong className="text-slate-400 block mb-1">Chỉ số:</strong>
                            <div className="bg-slate-900/50 p-2 rounded-md">
                                <p className="text-slate-300 whitespace-pre-wrap font-mono text-xs">{details.stats}</p>
                            </div>
                        </div>
                    )}
                    {details.effects && (
                         <div>
                            <strong className="text-slate-400 block mb-1">Hiệu ứng đặc biệt:</strong>
                             <div className="bg-slate-900/50 p-2 rounded-md">
                                <p className="text-slate-300 whitespace-pre-wrap text-xs">{details.effects}</p>
                            </div>
                        </div>
                    )}
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

export default EntityInfoModal;