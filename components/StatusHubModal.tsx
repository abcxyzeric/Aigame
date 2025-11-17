import React, { useState } from 'react';
import { StatusEffect, Companion, Quest } from '../types';
import Icon from './common/Icon';

const StatusList: React.FC<{ statuses: StatusEffect[], onDelete: (statusName: string) => void, onSelect: (statusName: string) => void }> = ({ statuses, onDelete, onSelect }) => {
    if (!statuses || statuses.length === 0) {
        return <p className="text-sm text-slate-400 text-center py-4">Không có trạng thái nào.</p>;
    }

    return (
        <ul className="space-y-2 text-sm">
            {statuses.map((status, index) => (
                <li key={index} className="flex items-center justify-between gap-2 p-2 rounded hover:bg-slate-700/50 bg-slate-900/50">
                    <button onClick={() => onSelect(status.name)} className="text-left flex-grow min-w-0">
                        <p className="truncate">
                            <strong className={status.type === 'buff' ? 'text-green-400' : 'text-red-400'}>
                                {status.name}
                            </strong>
                        </p>
                    </button>
                    <button onClick={() => onDelete(status.name)} className="p-1 text-slate-400 hover:text-red-400 transition-opacity flex-shrink-0" title={`Xóa trạng thái ${status.name}`}>
                        <Icon name="trash" className="w-4 h-4"/>
                    </button>
                </li>
            ))}
        </ul>
    );
};

const CompanionList: React.FC<{ companions: Companion[], onSelect: (c: Companion) => void }> = ({ companions, onSelect }) => {
    if (!companions || companions.length === 0) {
        return <p className="text-sm text-slate-400 text-center py-4">Chưa có đồng hành nào.</p>;
    }
    return (
        <ul className="space-y-2 text-sm">
            {companions.map((companion, index) => (
                <li key={index} className="bg-slate-900/50 p-2 rounded">
                    <button onClick={() => onSelect(companion)} className="text-left w-full transition">
                        <strong className="text-green-300">{companion.name}</strong>
                    </button>
                </li>
            ))}
        </ul>
    );
};

const QuestList: React.FC<{ quests: Quest[], onSelect: (q: Quest) => void, onDelete: (name: string) => void }> = ({ quests, onSelect, onDelete }) => {
    const activeQuests = (quests || []).filter(q => !q.status || q.status === 'đang tiến hành');
    
    if (activeQuests.length === 0) {
        return <p className="text-sm text-slate-400 text-center py-4">Không có nhiệm vụ nào đang hoạt động.</p>;
    }

    return (
        <ul className="space-y-2 text-sm">
            {activeQuests.map((quest, index) => (
                <li key={index} className="group flex items-center justify-between gap-2 p-2 rounded hover:bg-slate-700/50 bg-slate-900/50">
                    <button onClick={() => onSelect(quest)} className="text-left flex-grow min-w-0">
                        <strong className="text-cyan-300 truncate block">{quest.name}</strong>
                    </button>
                    <button onClick={() => onDelete(quest.name)} className="p-1 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <Icon name="trash" className="w-4 h-4"/>
                    </button>
                </li>
            ))}
        </ul>
    );
};


interface StatusHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  statuses: StatusEffect[];
  companions: Companion[];
  quests: Quest[];
  onSelectStatus: (statusName: string) => void;
  onDeleteStatus: (statusName: string) => void;
  onSelectCompanion: (c: Companion) => void;
  onSelectQuest: (q: Quest) => void;
  onDeleteQuest: (name: string) => void;
}

type Tab = 'status' | 'companions' | 'quests';

const StatusHubModal: React.FC<StatusHubModalProps> = ({ 
    isOpen, onClose, statuses, companions, quests, 
    onSelectStatus, onDeleteStatus, onSelectCompanion, onSelectQuest, onDeleteQuest 
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('status');

  if (!isOpen) return null;

  const tabButtonClasses = (isActive: boolean, color: string) => 
    `w-1/3 py-2 text-sm font-semibold transition-colors duration-200 focus:outline-none border-b-2 ${
      isActive
        ? `text-${color}-300 border-${color}-400`
        : 'text-slate-400 hover:text-slate-200 border-transparent'
    }`;
    
  const activeQuestsCount = (quests || []).filter(q => !q.status || q.status === 'đang tiến hành').length;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-6 w-full max-w-2xl relative animate-fade-in-up flex flex-col"
        style={{ maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-100 flex items-center">
            <Icon name="hub" className="w-6 h-6 mr-3 text-cyan-400" />
            Thông Tin Tổng Hợp
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
             <Icon name="xCircle" className="w-7 h-7" />
          </button>
        </div>

        <div className="border-b border-slate-700 mb-4 flex-shrink-0">
          <nav className="flex">
            <button className={tabButtonClasses(activeTab === 'status', 'cyan')} onClick={() => setActiveTab('status')}>
              Trạng Thái ({statuses.length})
            </button>
            <button className={tabButtonClasses(activeTab === 'companions', 'green')} onClick={() => setActiveTab('companions')}>
              Đồng Hành ({companions.length})
            </button>
            <button className={tabButtonClasses(activeTab === 'quests', 'blue')} onClick={() => setActiveTab('quests')}>
              Nhiệm Vụ ({activeQuestsCount})
            </button>
          </nav>
        </div>

        <div className="flex-grow overflow-y-auto pr-2 space-y-3">
          {activeTab === 'status' && <StatusList statuses={statuses} onSelect={onSelectStatus} onDelete={onDeleteStatus} />}
          {activeTab === 'companions' && <CompanionList companions={companions} onSelect={onSelectCompanion} />}
          {activeTab === 'quests' && <QuestList quests={quests} onSelect={onSelectQuest} onDelete={onDeleteQuest} />}
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

export default StatusHubModal;