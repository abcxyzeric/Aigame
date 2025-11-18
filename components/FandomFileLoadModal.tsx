

import React, { useState, useEffect, useMemo } from 'react';
import { FandomFile } from '../types';
import * as fandomFileService from '../services/fandomFileService';
import Button from './common/Button';
import Icon from './common/Icon';

interface FandomFileLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad?: (content: string, name: string) => void;
  onConfirm?: (files: FandomFile[]) => void;
  mode?: 'single' | 'multiple';
  title?: string;
  fileTypeFilter?: 'txt' | 'json';
}

const FandomFileLoadModal: React.FC<FandomFileLoadModalProps> = ({ 
  isOpen, 
  onClose, 
  onLoad,
  onConfirm,
  mode = 'single',
  title = "Chọn Nguyên Tác Từ Kho",
  fileTypeFilter,
}) => {
  const [files, setFiles] = useState<FandomFile[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isOpen) {
      const fetchFiles = async () => {
        setFiles(await fandomFileService.getAllFandomFiles());
      };
      fetchFiles();
      setSelectedFileIds(new Set()); // Reset selection on open
    }
  }, [isOpen]);
  
  const filteredFiles = useMemo(() => {
    if (!fileTypeFilter) {
      return files;
    }
    return files.filter(file => file.name.endsWith(`.${fileTypeFilter}`));
  }, [files, fileTypeFilter]);

  const handleLoad = (file: FandomFile) => {
    if (mode === 'single' && onConfirm) {
        onConfirm([file]);
    } else if (onLoad) {
        onLoad(file.content, file.name);
    }
  };

  const handleToggleSelection = (id: number) => {
    if (mode === 'single') {
        const newSelection = new Set<number>();
        newSelection.add(id);
        setSelectedFileIds(newSelection);
        return;
    }
    const newSelection = new Set(selectedFileIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedFileIds(newSelection);
  };

  const handleConfirm = () => {
    if (onConfirm) {
      const selectedFiles = files.filter(file => selectedFileIds.has(file.id));
      onConfirm(selectedFiles);
    }
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
          <h2 className="text-xl font-bold text-green-400">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
             <Icon name="xCircle" className="w-7 h-7" />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto pr-2">
          {filteredFiles.length > 0 ? (
            <div className="space-y-3">
              {filteredFiles.map((file) => (
                <div 
                    key={file.id} 
                    className={`bg-slate-900/50 p-3 rounded-lg flex items-center justify-between gap-4 border cursor-pointer ${selectedFileIds.has(file.id) ? 'border-purple-500' : 'border-transparent'}`}
                    onClick={() => handleToggleSelection(file.id)}
                >
                  <div className="flex items-center gap-4 flex-grow min-w-0">
                    <input
                      type={mode === 'single' ? 'radio' : 'checkbox'}
                      name={mode === 'single' ? 'fandom-file-selection' : undefined}
                      checked={selectedFileIds.has(file.id)}
                      onChange={() => handleToggleSelection(file.id)}
                      className="h-5 w-5 rounded-full border-gray-300 text-purple-600 focus:ring-purple-500 bg-slate-700"
                    />
                    <div className="flex-grow min-w-0">
                      <p className="font-bold text-slate-200 truncate">{file.name}</p>
                      <p className="text-xs text-slate-400 mt-1">Tạo lúc: {new Date(file.date).toLocaleString('vi-VN')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-slate-400">Không có tệp nguyên tác nào phù hợp được lưu.</p>
              <p className="text-sm text-slate-500 mt-2">Bạn có thể tạo tệp mới từ mục "Kiến tạo từ Nguyên tác" ở màn hình chính.</p>
            </div>
          )}
        </div>
        
        <div className="mt-6 flex-shrink-0 flex justify-end">
            <Button onClick={handleConfirm} disabled={selectedFileIds.size === 0} variant="primary" className="!w-auto !py-2 !px-5 !text-base">
              Xác Nhận Lựa Chọn ({selectedFileIds.size})
            </Button>
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

export default FandomFileLoadModal;