import React, { useState } from 'react';
import Button from './Button';
import * as aiService from '../../services/aiService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onSave: (key: string) => void;
  onCancel: () => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onSave, onCancel }) => {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveAndTest = async () => {
    if (!apiKey.trim()) {
      setError('Vui lòng nhập một API Key.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const isValid = await aiService.testSingleKey(apiKey);
      if (isValid) {
        onSave(apiKey);
      } else {
        setError('API Key không hợp lệ. Vui lòng kiểm tra lại.');
      }
    } catch (e) {
      setError('Đã xảy ra lỗi khi kiểm tra API Key.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setApiKey('');
    setError(null);
    setIsLoading(false);
    onCancel();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-6 w-full max-w-lg relative animate-fade-in-up">
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-white transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl font-bold mb-2 text-cyan-400">Yêu Cầu API Key</h2>
        <p className="text-sm text-slate-400 mb-4">
          Để sử dụng tính năng AI, bạn cần cung cấp một Gemini API Key. Key của bạn sẽ được lưu an toàn trong trình duyệt.
        </p>

        <div className="space-y-2">
          <label htmlFor="api-key-input" className="block text-sm font-medium text-slate-300">
            Gemini API Key
          </label>
          <input
            id="api-key-input"
            type="password"
            placeholder="Dán API key của bạn ở đây"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full bg-slate-900/70 border border-slate-700 rounded-md px-3 py-2 text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
          />
        </div>

        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

        <div className="flex items-center justify-end gap-4 mt-6">
          <button onClick={handleClose} className="text-slate-400 hover:text-white transition text-sm font-medium px-4 py-2">
            Hủy Bỏ
          </button>
          <Button
            onClick={handleSaveAndTest}
            disabled={isLoading}
            variant="primary"
            className="!w-auto !py-2 !px-5 !text-base"
          >
            {isLoading ? 'Đang kiểm tra...' : 'Lưu & Kiểm Tra'}
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

export default ApiKeyModal;