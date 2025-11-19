import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, HarmCategory, HarmBlockThreshold, RagSettings, AiPerformanceSettings } from '../types';
import { getSettings, saveSettings } from '../services/settingsService';
import { testApiKeys, testSingleKey } from '../services/aiService';
import { loadKeysFromTxtFile } from '../services/fileService';
import { HARM_CATEGORIES, HARM_BLOCK_THRESHOLDS, DEFAULT_SAFETY_SETTINGS, DEFAULT_AI_PERFORMANCE_SETTINGS } from '../constants';
import Icon from './common/Icon';
import Button from './common/Button';
import ToggleSwitch from './common/ToggleSwitch';
import Accordion from './common/Accordion';

interface SettingsScreenProps {
  onBack: () => void;
}

type ValidationStatus = 'idle' | 'loading' | 'valid' | 'invalid' | 'rate_limited';

const StatusIcon: React.FC<{ status: ValidationStatus }> = ({ status }) => {
    switch (status) {
        case 'loading':
            return <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" title="Đang kiểm tra..."></div>;
        case 'valid':
            return <Icon name="checkCircle" className="w-6 h-6 text-green-400" title="Key hợp lệ"/>;
        case 'invalid':
            return <Icon name="xCircle" className="w-6 h-6 text-red-400" title="Key không hợp lệ."/>;
        case 'rate_limited':
            return <Icon name="warning" className="w-6 h-6 text-amber-400" title="Key đã đạt giới hạn yêu cầu, HOẶC key không hợp lệ/chưa kích hoạt thanh toán. Vui lòng kiểm tra lại key của bạn." />;
        default:
            return <div className="w-6 h-6"></div>; // Placeholder for alignment
    }
};

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());
  const [isTestingKeys, setIsTestingKeys] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceTimers = useRef<{ [index: number]: number }>({});
  const [validationStatus, setValidationStatus] = useState<{ [index: number]: ValidationStatus }>({});

  useEffect(() => {
    const loadedSettings = getSettings();
    if (loadedSettings.apiKeyConfig.keys.length === 0) {
      // Ensure there's always one empty input field to start with
      loadedSettings.apiKeyConfig.keys.push('');
    }
    setSettings(loadedSettings);
  }, []);

  useEffect(() => {
    // Cleanup timers on unmount
    return () => {
        Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, []);


  const handleSave = () => {
    const settingsToSave = {
      ...settings,
      apiKeyConfig: {
        keys: settings.apiKeyConfig.keys.filter(Boolean),
      }
    };
    saveSettings(settingsToSave);
    alert('Cài đặt đã được lưu!');
    onBack();
  };
  
  const handleTestAllKeys = async () => {
    setIsTestingKeys(true);
    try {
        const result = await testApiKeys();
        alert(result);
    } catch (e) {
        alert(e instanceof Error ? e.message : 'Lỗi không xác định khi kiểm tra key.');
    } finally {
        setIsTestingKeys(false);
    }
  };

  const validateAndSaveKey = async (key: string, index: number) => {
    if (!key.trim()) {
        setValidationStatus(prev => ({ ...prev, [index]: 'idle' }));
        return;
    }
    
    setValidationStatus(prev => ({ ...prev, [index]: 'loading' }));
    const result = await testSingleKey(key);
    
    // Use a function for state update to get the latest settings
    setSettings(currentSettings => {
        // Re-check the key from state to prevent race conditions if user types fast
        if (currentSettings.apiKeyConfig.keys[index] === key) {
            if (result === 'valid') {
                setValidationStatus(prev => ({ ...prev, [index]: 'valid' }));
                saveSettings(currentSettings); 
            } else if (result === 'rate_limited') {
                setValidationStatus(prev => ({ ...prev, [index]: 'rate_limited' }));
                saveSettings(currentSettings); // Also save on rate_limited
            } else { // 'invalid'
                setValidationStatus(prev => ({ ...prev, [index]: 'invalid' }));
            }
        }
        return currentSettings;
    });

  };


  const handleKeyChange = (index: number, value: string) => {
    const newKeys = [...settings.apiKeyConfig.keys];
    newKeys[index] = value;
    setSettings(prev => ({ ...prev, apiKeyConfig: { keys: newKeys } }));

    if (debounceTimers.current[index]) {
        clearTimeout(debounceTimers.current[index]);
    }

    setValidationStatus(prev => ({ ...prev, [index]: value.trim() ? 'loading' : 'idle' }));

    if (value.trim()) {
        debounceTimers.current[index] = window.setTimeout(() => {
            validateAndSaveKey(value, index);
        }, 800); // 800ms debounce delay
    }
  };

  const addKeyInput = () => {
    setSettings(prev => ({
      ...prev,
      apiKeyConfig: { keys: [...prev.apiKeyConfig.keys, ''] }
    }));
  };

  const removeKeyInput = (index: number) => {
    const newKeys = settings.apiKeyConfig.keys.filter((_, i) => i !== index);
    setSettings(prev => ({ ...prev, apiKeyConfig: { keys: newKeys } }));
    setValidationStatus(prev => {
        const newStatus = {...prev};
        delete newStatus[index];
        return newStatus;
    });
    // Save settings after removal
    saveSettings({ ...settings, apiKeyConfig: { keys: newKeys } });
  };

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const loadedKeys = await loadKeysFromTxtFile(file);
        const currentKeys = settings.apiKeyConfig.keys.filter(Boolean);
        const newKeys = [...currentKeys, ...loadedKeys];
        const newSettings = { ...settings, apiKeyConfig: { keys: newKeys }};
        setSettings(newSettings);
        saveSettings(newSettings); // Save immediately after loading from file
        // Optionally, trigger validation for new keys
        loadedKeys.forEach((key, i) => validateAndSaveKey(key, currentKeys.length + i));

      } catch (error) {
        alert(error instanceof Error ? error.message : 'Lỗi không xác định khi đọc tệp');
      }
    }
    if (event.target) {
      event.target.value = '';
    }
  };
  
  const handleSafetyToggle = (enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      safetySettings: { ...prev.safetySettings, enabled }
    }));
  };

  const handleThresholdChange = (category: HarmCategory, threshold: HarmBlockThreshold) => {
    const newSafetySettings = settings.safetySettings.settings.map(s =>
      s.category === category ? { ...s, threshold } : s
    );
    setSettings(prev => ({
      ...prev,
      safetySettings: { ...prev.safetySettings, settings: newSafetySettings }
    }));
  };

  const handleRagSettingChange = (field: keyof RagSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      ragSettings: {
        ...prev.ragSettings,
        [field]: value,
      }
    }));
  };
  
  const handleAiPerformanceSettingChange = (field: keyof AiPerformanceSettings, value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) return;

    setSettings(prev => ({
      ...prev,
      aiPerformanceSettings: {
        ...prev.aiPerformanceSettings,
        [field]: numValue,
      }
    }));
  };

  const getInputClass = (status: ValidationStatus = 'idle') => {
    const base = "flex-grow bg-slate-900/70 border border-slate-700 rounded-md px-3 py-2 text-slate-200 transition";
    switch(status) {
        case 'valid': return `${base} focus:ring-2 focus:ring-green-500 focus:border-green-500 border-green-500/50`;
        case 'invalid': return `${base} focus:ring-2 focus:ring-red-500 focus:border-red-500 border-red-500/50`;
        case 'rate_limited': return `${base} focus:ring-2 focus:ring-amber-500 focus:border-amber-500 border-amber-500/50`;
        case 'loading': return `${base} focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500`;
        default: return `${base} focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500`;
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-100">
          Cài Đặt
        </h1>
        <Button onClick={onBack} variant="secondary" className="!w-auto !py-2 !px-4 !text-base">
          <Icon name="back" className="w-5 h-5 mr-2"/>
          Quay lại
        </Button>
      </div>
      
      <Accordion title="Thiết lập API Key (Tự động lưu)" icon={<Icon name="key"/>} borderColorClass='border-cyan-500' titleClassName='text-cyan-400'>
          <div className="text-sm text-slate-400 mb-4 space-y-1">
              <p>Dán API key vào ô bên dưới. Key sẽ được tự động kiểm tra và lưu lại nếu hợp lệ.</p>
          </div>
          <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-2">
              {settings.apiKeyConfig.keys.map((key, index) => (
                  <div key={index} className="flex items-center space-x-2">
                      <input 
                          type="text"
                          placeholder={`Dán API key ${index + 1} của bạn ở đây`}
                          value={key}
                          onChange={(e) => handleKeyChange(index, e.target.value)}
                          className={getInputClass(validationStatus[index])}
                      />
                      <StatusIcon status={validationStatus[index] || 'idle'} />
                      <button onClick={() => removeKeyInput(index)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-full transition disabled:opacity-50" disabled={settings.apiKeyConfig.keys.length <= 1 && settings.apiKeyConfig.keys[0] === ''}>
                          <Icon name="trash" className="w-5 h-5"/>
                      </button>
                  </div>
              ))}
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-4">
            <Button onClick={addKeyInput} variant="secondary" className="!text-sm !py-2 !w-auto"><Icon name="plus" className="w-5 h-5 mr-2"/> Thêm API</Button>
            <Button onClick={handleFileUploadClick} variant="secondary" className="!text-sm !py-2 !w-auto"><Icon name="upload" className="w-5 h-5 mr-2"/> Tải lên từ tệp (.txt)</Button>
            <Button onClick={handleTestAllKeys} variant="special" className="!text-sm !py-2 !w-auto" disabled={isTestingKeys}>
                {isTestingKeys ? 'Đang kiểm tra...' : 'Kiểm tra tất cả Keys'}
            </Button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".txt" />
          </div>
      </Accordion>

      <Accordion title="Cài đặt an toàn Gemini API" icon={<Icon name="warning"/>} borderColorClass='border-blue-500' titleClassName='text-blue-400'>
          <p className="text-sm text-slate-400 mb-4">Cấu hình mức độ chặn nội dung không an toàn. Ảnh hưởng đến tất cả phản hồi AI.</p>
          <div className="bg-slate-900/70 border border-blue-900/50 rounded-md p-4 mb-6">
            <h3 className="font-semibold text-slate-200">Chế độ hoạt động kép</h3>
            <div className="text-xs text-slate-400 mt-2 space-y-2">
              <p><strong className="text-slate-300">Bật lọc an toàn (Chế độ Tiêu chuẩn):</strong> Văn bản của bạn được gửi trực tiếp đến Gemini API và bộ lọc an toàn sẽ hoạt động theo các mức chặn bạn đã định cấu hình bên dưới. Sử dụng chế độ này cho nội dung thông thường.</p>
              <p><strong className="text-slate-300">Tắt lọc an toàn (Chế độ Vượt qua An toàn):</strong> Để xử lý nội dung nhạy cảm (khi tùy chọn 18+ được bật) và tránh lỗi "prohibited", công cụ sẽ kích hoạt một giao thức đặc biệt. Văn bản đầu vào của bạn sẽ được làm mờ (obfuscated) và AI sẽ được hướng dẫn theo một "Giao thức Nghiên cứu Học thuật" để giải mã và xử lý nội dung gốc một cách trung thực và không bị kiểm duyệt.</p>
            </div>
          </div>
          <div className="flex items-center justify-between bg-slate-900/70 p-3 rounded-md mb-6">
            <h3 className="font-semibold text-slate-200">Bật lọc an toàn Gemini API</h3>
            <ToggleSwitch enabled={settings.safetySettings.enabled} setEnabled={handleSafetyToggle} />
          </div>
          <div className={`transition-opacity duration-300 ${settings.safetySettings.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {settings.safetySettings.settings.map(({ category, threshold }) => (
                  <div key={category}>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      {HARM_CATEGORIES[category]}
                    </label>
                    <select
                      value={threshold}
                      onChange={(e) => handleThresholdChange(category, e.target.value as HarmBlockThreshold)}
                      className="w-full bg-slate-900/70 border border-slate-700 rounded-md px-3 py-2 text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                    >
                      {Object.entries(HARM_BLOCK_THRESHOLDS).map(([key, value]) => (
                        <option key={key} value={key}>{value}</option>
                      ))}
                    </select>
                  </div>
                ))}
            </div>
          </div>
      </Accordion>

      <Accordion title="Hệ Thống Trí Nhớ Nâng Cao (RAG & Tóm Tắt)" icon={<Icon name="memory"/>} borderColorClass='border-purple-500' titleClassName='text-purple-400'>
        <p className="text-sm text-slate-400 mb-4">Cấu hình cách AI ghi nhớ và truy xuất thông tin dài hạn để chống quá tải token và giúp game chạy được hàng ngàn lượt.</p>
        <div className="space-y-4">
          <div>
            <label htmlFor="summary-frequency" className="block text-sm font-medium text-slate-300 mb-1">Tần suất Tóm tắt Tự động (số lượt)</label>
            <input
              type="number"
              id="summary-frequency"
              value={settings.ragSettings.summaryFrequency}
              onChange={(e) => handleRagSettingChange('summaryFrequency', parseInt(e.target.value, 10))}
              className="w-full bg-slate-900/70 border border-slate-700 rounded-md px-3 py-2"
              min="5"
            />
            <p className="text-xs text-slate-500 mt-1">Cứ sau mỗi X lượt, AI sẽ tự động tóm tắt các diễn biến vừa qua.</p>
          </div>
          <div>
            <label htmlFor="top-k" className="block text-sm font-medium text-slate-300 mb-1">Số kết quả RAG (Top K)</label>
            <input
              type="number"
              id="top-k"
              value={settings.ragSettings.topK}
              onChange={(e) => handleRagSettingChange('topK', parseInt(e.target.value, 10))}
              className="w-full bg-slate-900/70 border border-slate-700 rounded-md px-3 py-2"
              min="1"
              max="10"
            />
            <p className="text-xs text-slate-500 mt-1">Số lượng ký ức liên quan nhất AI sẽ truy xuất trong mỗi lượt chơi.</p>
          </div>
          <div className="flex items-center justify-between bg-slate-900/70 p-3 rounded-md">
            <h3 className="font-semibold text-slate-200">Tóm tắt Lịch sử Truyện trước khi lia RAG</h3>
            <ToggleSwitch enabled={settings.ragSettings.summarizeBeforeRag} setEnabled={(val) => handleRagSettingChange('summarizeBeforeRag', val)} />
          </div>
        </div>
      </Accordion>
      
      <Accordion title="Cài đặt Hiệu suất AI" icon={<Icon name="difficulty"/>} borderColorClass='border-yellow-500' titleClassName='text-yellow-400'>
        <p className="text-sm text-slate-400 mb-4">Điều chỉnh các thông số kỹ thuật của AI để cân bằng giữa chất lượng, tốc độ và chi phí. Chỉ dành cho người dùng nâng cao.</p>
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="max-tokens-input" className="block text-sm font-medium text-slate-300">Độ dài Phản hồi Tối đa (Max Output Tokens)</label>
              <input
                type="number"
                id="max-tokens-input"
                value={settings.aiPerformanceSettings.maxOutputTokens}
                onChange={(e) => handleAiPerformanceSettingChange('maxOutputTokens', e.target.value)}
                className="w-24 bg-slate-900 border border-slate-600 rounded-md px-2 py-1 text-sm text-center"
                min="1024"
                max="8192"
                step="256"
              />
            </div>
            <input
              type="range"
              id="max-tokens-slider"
              value={settings.aiPerformanceSettings.maxOutputTokens}
              onChange={(e) => handleAiPerformanceSettingChange('maxOutputTokens', e.target.value)}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
              min="1024"
              max="8192"
              step="256"
            />
            <p className="text-xs text-slate-500 mt-1">Giới hạn số token tối đa AI có thể tạo ra. Hữu ích cho cả việc tạo JSON và tường thuật. Mặc định: 8000.</p>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
                <label htmlFor="thinking-budget" className="block text-sm font-medium text-slate-300">Thinking Budget</label>
                 <input
                  type="number"
                  id="thinking-budget-input"
                  value={settings.aiPerformanceSettings.thinkingBudget}
                  onChange={(e) => handleAiPerformanceSettingChange('thinkingBudget', e.target.value)}
                  className="w-24 bg-slate-900 border border-slate-600 rounded-md px-2 py-1 text-sm text-center"
                  min="0"
                  max="10000"
                  step="100"
                />
            </div>
            <input
              type="range"
              id="thinking-budget-slider"
              value={settings.aiPerformanceSettings.thinkingBudget}
              onChange={(e) => handleAiPerformanceSettingChange('thinkingBudget', e.target.value)}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
              min="0"
              max="10000"
              step="100"
            />
            <p className="text-xs text-slate-500 mt-1">Cung cấp cho AI "ngân sách suy nghĩ" lớn hơn để xử lý các yêu-cầu-phức-tạp, giúp diễn biến linh-hoạt hơn. Mặc định: 1200.</p>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
                <label htmlFor="json-buffer-input" className="block text-sm font-medium text-slate-300">Độ dài Bổ sung cho JSON (jsonBuffer)</label>
                 <input
                  type="number"
                  id="json-buffer-input"
                  value={settings.aiPerformanceSettings.jsonBuffer}
                  onChange={(e) => handleAiPerformanceSettingChange('jsonBuffer', e.target.value)}
                  className="w-24 bg-slate-900 border border-slate-600 rounded-md px-2 py-1 text-sm text-center"
                  min="0"
                  max="8192"
                  step="128"
                />
            </div>
            <input
              type="range"
              id="json-buffer-slider"
              value={settings.aiPerformanceSettings.jsonBuffer}
              onChange={(e) => handleAiPerformanceSettingChange('jsonBuffer', e.target.value)}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
              min="0"
              max="8192"
              step="128"
            />
            <p className="text-xs text-slate-500 mt-1">Thêm token dự phòng để đảm bảo AI có đủ không gian cho cấu trúc dữ liệu game (JSON), tránh lỗi. Giá trị này sẽ được cộng thêm vào giới hạn token cuối cùng khi gọi AI. Mặc định: 1024.</p>
          </div>
        </div>
      </Accordion>

      <div className="mt-8 flex justify-end">
        <Button onClick={handleSave} variant="primary" className="!w-auto !text-lg !px-8">
          Lưu Cài Đặt & Quay Lại
        </Button>
      </div>
    </div>
  );
};

export default SettingsScreen;