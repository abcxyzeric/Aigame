import React, { useState } from 'react';
import Icon from './common/Icon';

interface MemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  memories: string[];
  summaries: string[];
}

const MemoryModal: React.FC<MemoryModalProps> = ({ isOpen, onClose, memories, summaries }) => {
  const [activeTab, setActiveTab] = useState<'memories' | 'summaries'>('memories');

  if (!isOpen) return null;

  const tabButtonClasses = (isActive: boolean) => 
    `w-1/2 py-2 text-sm font-semibold transition-colors duration-200 focus:outline-none ${
      isActive
        ? 'text-purple-300 border-b-2 border-purple-400'
        : 'text-slate-400 hover:text-slate-200'
    }`;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-6 w-full max-w-2xl relative animate-fade-in-up flex flex-col"
        style={{ maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-xl font-bold text-purple-400 flex items-center">
            <Icon name="memory" className="w-6 h-6 mr-3" />
            Bộ Nhớ Của AI
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
             <Icon name="xCircle" className="w-7 h-7" />
          </button>
        </div>

        <div className="border-b border-slate-700 mb-4 flex-shrink-0">
          <nav className="flex">
            <button className={tabButtonClasses(activeTab === 'memories')} onClick={() => setActiveTab('memories')}>
              Ký Ức Cốt Lõi ({memories.length})
            </button>
            <button className={tabButtonClasses(activeTab === 'summaries')} onClick={() => setActiveTab('summaries')}>
              Tóm Tắt Diễn Biến ({summaries.length})
            </button>
          </nav>
        </div>

        <div className="flex-grow overflow-y-auto pr-2 space-y-3">
          {activeTab === 'memories' && (
            memories.length > 0 ? (
              <ul className="list-disc list-inside space-y-2 text-slate-300 text-sm">
                {memories.map((memory, index) => (
                  <li key={index}>{memory}</li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 text-center py-4">Chưa có ký ức nào được ghi lại.</p>
            )
          )}
          {activeTab === 'summaries' && (
             summaries.length > 0 ? (
              <div className="space-y-4">
                {summaries.map((summary, index) => (
                  <div key={index} className="bg-slate-900/50 p-3 rounded-lg">
                    <p className="font-semibold text-purple-300 text-sm mb-1">Tóm tắt giai đoạn {index * 5 + 1} - {(index + 1) * 5}:</p>
                    <p className="text-slate-300 text-sm">{summary}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-4">Chưa có tóm tắt nào.</p>
            )
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

export default MemoryModal;
