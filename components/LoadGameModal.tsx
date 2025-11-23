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

const SaveItem: React.FC<{ save: SaveSlot; onLoad: (save: SaveSlot) => void; onDownload: (save: SaveSlot) => void; onDelete: (id: number) => void; }> = ({ save, onLoad, onDownload, onDelete }) => (
    <div key={save.saveId} className="bg-slate-900/50 p-3 rounded-lg flex items-center justify-between gap-4">
        <div className="flex-grow min-w-0">
            <p className="font-bold text-slate-200 truncate">
            {save.worldName || 'Cuộc phiêu lưu không tên'}
            </p>
            <p className="text-xs text-slate-400 mt-1">Lưu lúc: {new Date(save.saveDate).toLocaleString('vi-VN')}</p>
            <p className="text-sm text-slate-400 italic mt-1 truncate">{save.previewText}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
            <Button onClick={() => onLoad(save)} variant="success" className="!w-auto !py-2 !px-4 !text-sm">Tải</Button>
            <button onClick={() => onDownload(save)} className="p-2 text-sky-400 hover:bg-sky-500/20 rounded-full transition" title="Tải xuống tệp lưu">
                <Icon name="download" className="w-5 h-5"/>
            </button>
            <button onClick={() => onDelete(save.saveId)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-full transition" title="Xóa bản lưu">
            <Icon name="trash" className="w-5 h-5"/>
            </button>
        </div>
    </div>
);

const LoadGameModal: React.FC<LoadGameModalProps> = ({ isOpen, onClose, onLoad }) => {
  const [manualSaves, setManualSaves] = useState<SaveSlot[]>([]);
  const [autoSaves, setAutoSaves] = useState<SaveSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSaves = async () => {
    setIsLoading(true);
    try {
      const allSaves = await gameService.loadAllSaves();
      setManualSaves(allSaves.filter(s => s.saveType === 'manual'));
      setAutoSaves(allSaves.filter(s => s.saveType === 'auto'));
    } catch (error) {
      console.error('Failed to load saves:', error);
      alert('Không thể tải danh sách game đã lưu.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSaves();
    }
  }, [isOpen]);

  const handleDelete = async (saveId: number) => {
    if (confirm('Bạn có chắc muốn xóa bản lưu này không?')) {
      await gameService.deleteSave(saveId);
      await fetchSaves(); // Refresh list
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
          ) : (manualSaves.length > 0 || autoSaves.length > 0) ? (
            <div className="space-y-6">
                {manualSaves.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold text-blue-300 mb-2 border-b-2 border-blue-500/50 pb-1">Lưu Thủ Công</h3>
                        <div className="space-y-3">
                            {manualSaves.map(save => (
                                <SaveItem key={save.saveId} save={save} onLoad={handleLoad} onDownload={fileService.saveGameStateToFile} onDelete={handleDelete} />
                            ))}
                        </div>
                    </div>
                )}
                 {autoSaves.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold text-slate-300 mb-2 border-b-2 border-slate-600/50 pb-1">Lưu Tự Động</h3>
                        <div className="space-y-3">
                            {autoSaves.map(save => (
                                <SaveItem key={save.saveId} save={save} onLoad={handleLoad} onDownload={fileService.saveGameStateToFile} onDelete={handleDelete} />
                            ))}
                        </div>
                    </div>
                )}
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