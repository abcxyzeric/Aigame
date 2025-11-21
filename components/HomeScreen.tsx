import React, { useRef, useState, useEffect } from 'react';
import Button from './common/Button';
import Icon from './common/Icon';
import { WorldConfig, GameState } from '../types';
import { loadWorldConfigFromFile } from '../services/fileService';
import * as gameService from '../services/gameService';
import LoadGameModal from './LoadGameModal';
import NotificationModal from './common/NotificationModal';
import UpdateLogModal from './UpdateLogModal';


interface HomeScreenProps {
  onStartNew: () => void;
  onLoadGame: (config: WorldConfig) => void;
  onNavigateToSettings: () => void;
  onLoadSavedGame: (state: GameState) => void;
  onNavigateToFandomGenesis: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onStartNew, onLoadGame, onNavigateToSettings, onLoadSavedGame, onNavigateToFandomGenesis }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasSaveFile, setHasSaveFile] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isUpdateLogOpen, setIsUpdateLogOpen] = useState(false);
  const [isCheckingSaves, setIsCheckingSaves] = useState(true);
  const [storageUsage, setStorageUsage] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      setIsCheckingSaves(true);
      try {
        await gameService.migrateSaves();
        const hasSaves = await gameService.hasSavedGames();
        setHasSaveFile(hasSaves);
      } catch (error) {
        console.error("Error initializing saves:", error);
        alert("Đã xảy ra lỗi khi cố gắng di chuyển các file lưu cũ. Dữ liệu của bạn vẫn an toàn trong bộ nhớ cũ.");
      } finally {
        setIsCheckingSaves(false);
      }

      // Get storage info
      if (navigator.storage && navigator.storage.estimate) {
          try {
              const estimation = await navigator.storage.estimate();
              if (estimation.usage !== undefined && estimation.quota !== undefined) {
                  const usageMB = (estimation.usage / 1024 / 1024).toFixed(2);
                  const quotaGB = (estimation.quota / 1024 / 1024 / 1024).toFixed(2);
                  setStorageUsage(`${usageMB} MB / ${quotaGB} GB`);
              }
          } catch (error) {
              console.error("Could not estimate storage:", error);
              setStorageUsage("Không thể ước tính dung lượng.");
          }
      }
    };
    initializeApp();
  }, []);

  const handleLoadFromJson = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const text = await file.text();
        const parsedJson = JSON.parse(text);

        // Differentiate between WorldConfig and GameState by checking for unique properties
        if (parsedJson.worldConfig && Array.isArray(parsedJson.history)) {
            // This is a GameState (save file)
            onLoadSavedGame(parsedJson as GameState);
        } else if (parsedJson.storyContext && parsedJson.character) {
            // This is a WorldConfig
            onLoadGame(parsedJson as WorldConfig);
        } else {
            throw new Error('Tệp JSON không có cấu trúc hợp lệ cho thiết lập thế giới hoặc file game đã lưu.');
        }
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Lỗi không xác định khi xử lý tệp.');
      }
    }
    if(event.target) {
      event.target.value = '';
    }
  };
  
  const handleCloseLoadModal = async () => {
    setIsLoadModalOpen(false);
    setHasSaveFile(await gameService.hasSavedGames()); // Re-check state on close
  };

  const openLoadGameModal = () => {
     if (hasSaveFile) {
        setIsLoadModalOpen(true);
     }
  };

  return (
    <>
      <LoadGameModal 
        isOpen={isLoadModalOpen}
        onClose={handleCloseLoadModal}
        onLoad={onLoadSavedGame}
      />
      <UpdateLogModal 
        isOpen={isUpdateLogOpen}
        onClose={() => setIsUpdateLogOpen(false)}
      />
      <NotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        title="Tính năng đang phát triển"
        messages={['Chức năng này hiện chưa hoàn thiện và sẽ sớm được cập nhật trong các phiên bản sau. Cảm ơn bạn đã thông cảm!']}
      />
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-purple-600 py-2">
            Nhập Vai A.I Simulator
          </h1>
          <p className="text-slate-400 mt-2 text-lg">Kiến tạo thế giới của riêng bạn</p>
        </div>

        <div className="w-full max-w-sm space-y-4">
          <Button onClick={onStartNew} icon={<Icon name="play" />} variant="primary">
            Bắt Đầu Cuộc Phiêu Lưu Mới
          </Button>
          <Button 
            onClick={openLoadGameModal} 
            icon={<Icon name="save" />} 
            variant={hasSaveFile ? 'success' : 'secondary'}
            disabled={!hasSaveFile || isCheckingSaves}
            className={(!hasSaveFile || isCheckingSaves) ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''}
          >
            {isCheckingSaves ? 'Đang kiểm tra...' : 'Tải Game Đã Lưu'}
          </Button>
          <Button onClick={handleLoadFromJson} icon={<Icon name="upload" />} variant="secondary">
            Tải Thiết Lập/Game Từ Tệp (.json)
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".json"
          />
          <Button onClick={onNavigateToFandomGenesis} icon={<Icon name="magic" />} variant="special">
            Kiến tạo từ Nguyên tác
          </Button>
          <Button onClick={() => setIsUpdateLogOpen(true)} icon={<Icon name="news" />} variant="warning">
            Xem Cập Nhật Game
          </Button>
          <Button onClick={onNavigateToSettings} icon={<Icon name="settings" />} variant="info">
            Cài Đặt
          </Button>
        </div>

        <div className="mt-4 text-center text-slate-500 text-sm">
          {storageUsage && (
            <div className="flex items-center justify-center gap-2 mt-2 text-slate-400">
                <Icon name="save" className="w-4 h-4" />
                <span>Dung lượng lưu trữ: {storageUsage}</span>
            </div>
          )}
          <div className="flex items-center justify-center gap-2 mt-2 text-slate-400">
            <Icon name="hub" className="w-4 h-4" />
            <span>Cơ sở dữ liệu: IndexedDB</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default HomeScreen;