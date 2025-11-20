import React, { useState, useEffect } from 'react';
import { SaveSlot, GameState } from '../types';
import * as gameService from '../services/gameService';
import * as fileService from '../services/fileService';
import Button from './common/Button';
import Icon from './common/Icon';

interface LoadGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (gameState: GameState) => void;
}

const LoadGameModal: React.FC<LoadGameModalProps> = ({ isOpen, onClose, onLoad }) => {
  const [saves, setSaves] = useState<SaveSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const fetchSaves = async () => {
        setIsLoading(true);
        try {
          setSaves(await gameService.loadAllSaves());
        } catch (error) {
          console.error('Failed to load saves:', error);
          alert('Không thể tải danh sách game đã lưu.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchSaves();
    }
  }, [isOpen]);

  const handleDelete = async (saveId: number) => {
    if (confirm('Bạn có chắc muốn xóa bản lưu này không?')) {
      await gameService.deleteSave(saveId);
      setSaves(await gameService.loadAllSaves()); // Refresh list
    }
  };
  
  const handleLoad = (save: SaveSlot) => {
    onLoad(save);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-6 w-full max-w-2xl relative animate-fade-in-up flex flex-col"
        style={{ maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-xl font-bold text-green-400">Tải Game Đã Lưu</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
             <Icon name="xCircle" className="w-7 h-7" />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto pr-2">
          {isLoading ? (
             <div className="text-center py-10">
              <p className="text-slate-400">Đang tải danh sách...</p>
            </div>
          ) : saves.length > 0 ? (
            <div className="space-y-3">
              {saves.map((save) => (
                <div key={save.saveId} className="bg-slate-900/50 p-3 rounded-lg flex items-center justify-between gap-4">
                  <div className="flex-grow min-w-0">
                     <div className="flex items-center justify-between">
                       <p className="font-bold text-slate-200 truncate">
                        {save.worldName || 'Cuộc phiêu lưu không tên'}
                       </p>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${save.saveType === 'manual' ? 'bg-blue-600/70 text-blue-100' : 'bg-slate-600 text-slate-200'}`}>
                         {save.saveType === 'manual' ? 'Thủ công' : 'Tự động'}
                        </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Lưu lúc: {new Date(save.saveDate).toLocaleString('vi-VN')}</p>
                    <p className="text-sm text-slate-400 italic mt-1 truncate">{save.previewText}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button onClick={() => handleLoad(save)} variant="success" className="!w-auto !py-2 !px-4 !text-sm">Tải</Button>
                    <button onClick={() => fileService.saveGameStateToFile(save)} className="p-2 text-sky-400 hover:bg-sky-500/20 rounded-full transition" title="Tải xuống tệp lưu">
                        <Icon name="download" className="w-5 h-5"/>
                    </button>
                    <button onClick={() => handleDelete(save.saveId)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-full transition" title="Xóa bản lưu">
                      <Icon name="trash" className="w-5 h-5"/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-slate-400">Không tìm thấy bản lưu nào.</p>
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

export default LoadGameModal;