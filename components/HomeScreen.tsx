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

  useEffect(() => {
    setHasSaveFile(gameService.hasSavedGames());
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
  
  const handleCloseLoadModal = () => {
    setIsLoadModalOpen(false);
    setHasSaveFile(gameService.hasSavedGames()); // Re-check state on close
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
            disabled={!hasSaveFile}
            className={!hasSaveFile ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''}
          >
            Tải Game Đã Lưu
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

        <div className="mt-10 text-center text-slate-500 text-sm">
          <p>Đang dùng Gemini AI Mặc Định. Không cần API Key.</p>
          <p className="text-xs mt-1">UserID: 1016331345484971486</p>
        </div>
      </div>
    </>
  );
};

export default HomeScreen;