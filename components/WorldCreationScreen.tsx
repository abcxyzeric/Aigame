import React, { useState, useCallback, useEffect, useRef } from 'react';
// FIX: The FandomFile type should be imported from the central types definition file, not from a service file.
import { WorldConfig, InitialEntity, CharacterConfig, CharacterStat, FandomFile } from '../types';
import { 
    DEFAULT_WORLD_CONFIG, 
    GENDER_OPTIONS, 
    PERSONALITY_OPTIONS, 
    DIFFICULTY_OPTIONS,
    SEXUAL_CONTENT_STYLE_OPTIONS,
    VIOLENCE_LEVEL_OPTIONS,
    STORY_TONE_OPTIONS,
    ENTITY_TYPE_OPTIONS,
    AI_RESPONSE_LENGTH_OPTIONS,
    DEFAULT_STATS
} from '../constants';
import * as aiService from '../services/aiService';
import { getSettings, saveSettings } from '../services/settingsService';
import Accordion from './common/Accordion';
import Icon from './common/Icon';
import Button from './common/Button';
import { saveWorldConfigToFile, loadWorldConfigFromFile, loadTextFromFile } from '../services/fileService';
import AiAssistButton from './common/AiAssistButton';
import ApiKeyModal from './common/ApiKeyModal';
import NotificationModal from './common/NotificationModal';
import FandomFileLoadModal from './FandomFileLoadModal';

interface WorldCreationScreenProps {
  onBack: () => void;
  onStartGame: (config: WorldConfig) => void;
  initialConfig?: WorldConfig | null;
}

type LoadingStates = {
  [key: string]: boolean;
};

const StyledInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className="w-full bg-slate-900/70 border border-slate-700 rounded-md px-3 py-2 text-slate-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition placeholder:text-slate-500"
  />
);

const StyledTextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea
    {...props}
    className="w-full bg-slate-900/70 border border-slate-700 rounded-md px-3 py-2 text-slate-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition resize-y placeholder:text-slate-500"
  />
);

const StyledSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select
    {...props}
    className="w-full bg-slate-900/70 border border-slate-700 rounded-md px-3 py-2 text-slate-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition"
  />
);

const FormRow: React.FC<{ label: string; children: React.ReactNode; tooltip?: string; labelClassName?: string }> = ({ label, children, tooltip, labelClassName = 'text-slate-300' }) => (
  <div className="mb-4">
    <label className={`block text-sm font-medium ${labelClassName} mb-1`} title={tooltip}>
      {label}
    </label>
    {children}
  </div>
);

const WorldCreationScreen: React.FC<WorldCreationScreenProps> = ({ onBack, onStartGame, initialConfig }) => {
  const [config, setConfig] = useState<WorldConfig>(DEFAULT_WORLD_CONFIG);
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({});
  const [storyIdea, setStoryIdea] = useState('');
  const [fanfictionIdea, setFanfictionIdea] = useState('');
  
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [retryAiTask, setRetryAiTask] = useState<(() => void) | null>(null);
  
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationContent, setNotificationContent] = useState({ title: '', messages: [''] });
  const [isFanficSelectModalOpen, setIsFanficSelectModalOpen] = useState(false);
  const [isKnowledgeSelectModalOpen, setIsKnowledgeSelectModalOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fanficFileInputRef = useRef<HTMLInputElement>(null);
  const knowledgeFileInputRef = useRef<HTMLInputElement>(null);

  const isSafetyFilterEnabled = getSettings().safetySettings.enabled;

  useEffect(() => {
    if (initialConfig) {
      const sanitizedConfig = {
        ...DEFAULT_WORLD_CONFIG,
        ...initialConfig,
        character: {
            ...DEFAULT_WORLD_CONFIG.character,
            ...initialConfig.character,
            skills: Array.isArray(initialConfig.character.skills) ? initialConfig.character.skills : [],
            stats: (initialConfig.character.stats && initialConfig.character.stats.length > 0) ? initialConfig.character.stats : DEFAULT_STATS,
        },
        backgroundKnowledge: initialConfig.backgroundKnowledge || [],
      };
      sanitizedConfig.backgroundKnowledge.sort((a, b) => {
            const aIsSummary = a.name.startsWith('tom_tat_');
            const bIsSummary = b.name.startsWith('tom_tat_');
            if (aIsSummary && !bIsSummary) return -1;
            if (!aIsSummary && bIsSummary) return 1;
            return a.name.localeCompare(b.name);
      });
      setConfig(sanitizedConfig);
    } else {
      setConfig(DEFAULT_WORLD_CONFIG);
    }
  }, [initialConfig]);
  
  const handleSimpleChange = useCallback(<T extends keyof WorldConfig>(key: T, value: WorldConfig[T]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleNestedChange = useCallback(<T extends keyof WorldConfig, U extends keyof WorldConfig[T]>(
    parentKey: T,
    childKey: U,
    value: WorldConfig[T][U]
  ) => {
    setConfig(prev => ({
      ...prev,
      [parentKey]: {
        ...(prev[parentKey] as object),
        [childKey]: value,
      },
    }));
  }, []);

  const handleSkillChange = useCallback((index: number, key: 'name' | 'description', value: string) => {
    const newSkills = [...config.character.skills];
    newSkills[index] = { ...newSkills[index], [key]: value };
    handleNestedChange('character', 'skills', newSkills);
  }, [config.character.skills, handleNestedChange]);

  const addSkill = useCallback(() => {
    const newSkills = [...config.character.skills, { name: '', description: '' }];
    handleNestedChange('character', 'skills', newSkills);
  }, [config.character.skills, handleNestedChange]);

  const removeSkill = useCallback((index: number) => {
    const newSkills = config.character.skills.filter((_, i) => i !== index);
    handleNestedChange('character', 'skills', newSkills);
  }, [config.character.skills, handleNestedChange]);

  const handleStatChange = useCallback((index: number, field: keyof CharacterStat, value: string | number | boolean) => {
      const newStats = [...config.character.stats];
      const statToUpdate = { ...newStats[index] };
  
      if (field === 'value' || field === 'maxValue') {
          let numValue = Number(value);
          if (!isNaN(numValue)) {
              // Ensure values are non-negative
              if (numValue < 0) numValue = 0;
              
              if (field === 'value') {
                  // If it's a limited stat, cap the value at maxValue.
                  if (statToUpdate.hasLimit !== false && numValue > statToUpdate.maxValue) {
                      statToUpdate.value = statToUpdate.maxValue;
                  } else {
                      statToUpdate.value = numValue;
                  }
              } else { // field === 'maxValue'
                  statToUpdate.maxValue = numValue;
                  // If the new max value is less than the current value, adjust the current value.
                  if (statToUpdate.value > numValue) {
                      statToUpdate.value = numValue;
                  }
              }
          }
      } else if (field === 'isPercentage' || field === 'hasLimit') {
          statToUpdate[field] = value as boolean;
          if (field === 'hasLimit' && value === false) {
              statToUpdate.isPercentage = false;
          }
      } else { // name, description
          statToUpdate[field] = value as string;
      }

      newStats[index] = statToUpdate;
      handleNestedChange('character', 'stats', newStats);
  }, [config.character.stats, handleNestedChange]);

  const addStat = useCallback(() => {
      const newStats = [...config.character.stats, { name: '', value: 10, maxValue: 10, isPercentage: false, description: '', hasLimit: true }];
      handleNestedChange('character', 'stats', newStats);
  }, [config.character.stats, handleNestedChange]);

  const removeStat = useCallback((index: number) => {
      if (index < 2) return; // Prevent deleting default stats
      const newStats = config.character.stats.filter((_, i) => i !== index);
      handleNestedChange('character', 'stats', newStats);
  }, [config.character.stats, handleNestedChange]);

  const handleCoreRuleChange = useCallback((index: number, value: string) => {
    const newList = [...config.coreRules];
    newList[index] = value;
    handleSimpleChange('coreRules', newList);
  }, [config.coreRules, handleSimpleChange]);

  const addCoreRule = useCallback(() => {
    handleSimpleChange('coreRules', [...config.coreRules, '']);
  }, [config.coreRules, handleSimpleChange]);

  const removeCoreRule = useCallback((index: number) => {
    const newList = config.coreRules.filter((_, i) => i !== index);
    handleSimpleChange('coreRules', newList);
  }, [config.coreRules, handleSimpleChange]);

  const handleEntityChange = useCallback((index: number, field: keyof InitialEntity, value: string) => {
    const newEntities = [...config.initialEntities];
    const updatedEntity = { ...newEntities[index], [field]: value };
    newEntities[index] = updatedEntity;
    handleSimpleChange('initialEntities', newEntities);
  }, [config.initialEntities, handleSimpleChange]);

  const addEntity = useCallback(() => {
    const newEntity: InitialEntity = {
      name: '',
      type: ENTITY_TYPE_OPTIONS[0],
      personality: '',
      description: '',
    };
    handleSimpleChange('initialEntities', [...config.initialEntities, newEntity]);
  }, [config.initialEntities, handleSimpleChange]);

  const removeEntity = useCallback((index: number) => {
    const newList = config.initialEntities.filter((_, i) => i !== index);
    handleSimpleChange('initialEntities', newList);
  }, [config.initialEntities, handleSimpleChange]);


  const handleCreateWorld = () => {
    const missingFields: string[] = [];
    if (!config.storyContext.worldName.trim()) missingFields.push('Tên Thế Giới');
    if (!config.storyContext.genre.trim()) missingFields.push('Thế loại');
    if (!config.storyContext.setting.trim()) missingFields.push('Thế Giới/Bối Cảnh Cụ Thể');
    if (!config.character.name.trim()) missingFields.push('Danh xưng (Tên nhân vật)');
    if (config.character.personality === 'Tuỳ chỉnh' && !config.character.customPersonality?.trim()) {
        missingFields.push('Mô tả tính cách tùy chỉnh');
    }
    if (!config.character.bio.trim()) missingFields.push('Sơ Lược Tiểu Sử');
    if (!config.character.motivation.trim()) missingFields.push('Mục Tiêu/Động Lực');

    if (missingFields.length > 0) {
        setNotificationContent({
            title: 'Thông tin chưa đầy đủ',
            messages: ['Vui lòng điền đầy đủ các thông tin sau trước khi bắt đầu:', ...missingFields.map(f => `- ${f}`)]
        });
        setIsNotificationOpen(true);
        return;
    }

    try {
      onStartGame(config);
    } catch (error) {
      console.error("Lỗi khi tạo thế giới:", error);
      const errorMessage = error instanceof Error ? error.message : 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.';
       setNotificationContent({ title: 'Lỗi Không Mong Muốn', messages: [errorMessage] });
       setIsNotificationOpen(true);
    }
  };
  
  const handleAdultContentClick = () => {
    if (isSafetyFilterEnabled) {
        setNotificationContent({ title: 'Yêu cầu Cài đặt', messages: ['Để cho phép nội dung 18+, bạn cần tắt "Bật lọc an toàn Gemini API" trong mục Cài Đặt trước.'] });
        setIsNotificationOpen(true);
    }
  };

  const executeAiTask = async (task: () => Promise<void>) => {
    try {
      await task();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
      if (errorMessage.includes('Không tìm thấy API Key nào')) {
        setRetryAiTask(() => task);
        setIsApiKeyModalOpen(true);
      } else {
        setNotificationContent({ title: 'Lỗi AI', messages: [errorMessage] });
        setIsNotificationOpen(true);
      }
    }
  };

  const runAiAssist = (
    field: string, 
    action: () => Promise<any>,
    setter: (result: any) => void
  ) => {
    const task = async () => {
      setLoadingStates(prev => ({ ...prev, [field]: true }));
      try {
        const result = await action();
        setter(result);
      } finally {
        setLoadingStates(prev => ({ ...prev, [field]: false }));
      }
    };
    executeAiTask(task);
  };
  
  const handleGenerateBio = () => {
    if (!config.storyContext.genre.trim() || !config.storyContext.setting.trim() || !config.character.name.trim()) {
        setNotificationContent({ title: 'Thiếu thông tin', messages: ['Vui lòng điền "Thế loại", "Bối Cảnh" và "Tên nhân vật" trước khi AI có thể hỗ trợ tạo tiểu sử.'] });
        setIsNotificationOpen(true);
        return;
    }
    runAiAssist('bio', () => aiService.generateCharacterBio(config), res => handleNestedChange('character', 'bio', res));
  };

  const handleGenerateSkills = () => {
     if (!config.storyContext.genre.trim() || !config.storyContext.setting.trim() || !config.character.name.trim() || !config.character.bio.trim()) {
        setNotificationContent({ title: 'Thiếu thông tin', messages: ['AI cần biết "Thế loại", "Bối Cảnh", "Tên nhân vật" và "Tiểu sử" để tạo ra kỹ năng phù hợp.'] });
        setIsNotificationOpen(true);
        return;
    }
    runAiAssist('skills', () => aiService.generateCharacterSkills(config), res => {
      handleNestedChange('character', 'skills', res);
    });
  };

  const handleGenerateSingleSkill = (index: number) => {
    const currentSkill = config.character.skills[index];
    runAiAssist(`skill_${index}`, () => aiService.generateSingleSkill(config, currentSkill.name), res => {
        const newSkills = [...config.character.skills];
        newSkills[index] = { 
            name: res.name || currentSkill.name, // Keep old name if AI only generated description
            description: res.description 
        };
        handleNestedChange('character', 'skills', newSkills);
    });
  };

  const handleGenerateStats = () => {
      if (!config.storyContext.genre.trim() || !config.character.bio.trim()) {
          setNotificationContent({ title: 'Thiếu thông tin', messages: ['AI cần biết "Thể loại" và "Tiểu sử" để tạo ra bộ chỉ số phù hợp.'] });
          setIsNotificationOpen(true);
          return;
      }
      runAiAssist('stats', () => aiService.generateCharacterStats(config), (res: CharacterStat[]) => {
          const newStats = [...DEFAULT_STATS];
          const existingNames = new Set(newStats.map(s => s.name.toLowerCase()));
          for (const stat of res) {
              if (!existingNames.has(stat.name.toLowerCase())) {
                  newStats.push(stat);
                  existingNames.add(stat.name.toLowerCase());
              }
          }
          handleNestedChange('character', 'stats', newStats);
      });
  };

  const handleGenerateSingleStat = (index: number) => {
    const currentStat = config.character.stats[index];
    if (!currentStat.name.trim()) {
        setNotificationContent({ title: 'Thiếu thông tin', messages: ['Vui lòng nhập "Tên Chỉ Số" trước khi AI có thể hỗ trợ.'] });
        setIsNotificationOpen(true);
        return;
    }
    runAiAssist(`stat_${index}`, () => aiService.generateSingleStat(config, currentStat.name), (res: CharacterStat) => {
        const newStats = [...config.character.stats];
        // Merge result with existing stat, but don't overwrite the name
        newStats[index] = { 
            ...newStats[index],
            ...res,
            name: currentStat.name,
        };
        handleNestedChange('character', 'stats', newStats);
    });
  };

  const handleGenerateMotivation = () => {
     if (!config.storyContext.genre.trim() || !config.storyContext.setting.trim() || !config.character.name.trim() || !config.character.bio.trim()) {
        setNotificationContent({ title: 'Thiếu thông tin', messages: ['AI cần biết "Thế loại", "Bối Cảnh", "Tên nhân vật" và "Tiểu sử" để tạo ra động lực phù hợp.'] });
        setIsNotificationOpen(true);
        return;
    }
    runAiAssist('motivation', () => aiService.generateCharacterMotivation(config), res => handleNestedChange('character', 'motivation', res));
  };

  const processAndSetConfig = (newConfig: WorldConfig) => {
      const mergedConfig: WorldConfig = {
          ...config,
          storyContext: newConfig.storyContext,
          character: {
            ...newConfig.character,
            stats: newConfig.enableStatsSystem ? (newConfig.character.stats || DEFAULT_STATS) : [],
          },
          difficulty: newConfig.difficulty,
          initialEntities: newConfig.initialEntities || [],
          enableStatsSystem: typeof newConfig.enableStatsSystem === 'boolean' ? newConfig.enableStatsSystem : config.enableStatsSystem,
      };

      if (typeof newConfig.allowAdultContent === 'boolean') {
        mergedConfig.allowAdultContent = newConfig.allowAdultContent;
      }

      setConfig(mergedConfig);
      setNotificationContent({ title: 'Hoàn thành!', messages: ["AI đã kiến tạo xong thế giới của bạn! Hãy kiểm tra và tinh chỉnh các chi tiết bên dưới."] });
      setIsNotificationOpen(true);
  }

  const handleGenerateWorldFromIdea = useCallback(async () => {
    if (!storyIdea.trim()) {
      setNotificationContent({ title: 'Thiếu thông tin', messages: ['Vui lòng nhập một ý tưởng để AI có thể bắt đầu kiến tạo.'] });
      setIsNotificationOpen(true);
      return;
    }
    const task = async () => {
      setLoadingStates(prev => ({...prev, worldIdea: true, distilling: false}));
      try {
        const totalKnowledgeSize = (config.backgroundKnowledge || []).reduce((acc, file) => acc + (file.content?.length || 0), 0);
        const KNOWLEDGE_SIZE_THRESHOLD = 50000;

        if (totalKnowledgeSize > KNOWLEDGE_SIZE_THRESHOLD) {
            setLoadingStates(prev => ({...prev, worldIdea: true, distilling: true}));
        }

        const newConfig = await aiService.generateWorldFromIdea(storyIdea, config.backgroundKnowledge);
        processAndSetConfig(newConfig);
      } finally {
        setLoadingStates(prev => ({...prev, worldIdea: false, distilling: false}));
      }
    };
    executeAiTask(task);
  }, [storyIdea, config]);

  const handleGenerateFanfictionFromIdea = useCallback(() => {
    if (!fanfictionIdea.trim()) {
      setNotificationContent({ title: 'Thiếu thông tin', messages: ['Vui lòng nhập ý tưởng đồng nhân, ví dụ: "đồng nhân Harry Potter, nếu Snape không chết...".'] });
      setIsNotificationOpen(true);
      return;
    }
    const task = async () => {
      setLoadingStates(prev => ({...prev, worldFanfictionIdea: true, distilling: false}));
      try {
        const totalKnowledgeSize = (config.backgroundKnowledge || []).reduce((acc, file) => acc + (file.content?.length || 0), 0);
        const KNOWLEDGE_SIZE_THRESHOLD = 50000;

        if (totalKnowledgeSize > KNOWLEDGE_SIZE_THRESHOLD) {
            setLoadingStates(prev => ({...prev, worldFanfictionIdea: true, distilling: true}));
        }
        
        const newConfig = await aiService.generateFanfictionWorld(fanfictionIdea, config.backgroundKnowledge);
        processAndSetConfig(newConfig);
      } finally {
        setLoadingStates(prev => ({...prev, worldFanfictionIdea: false, distilling: false}));
      }
    };
    executeAiTask(task);
  }, [fanfictionIdea, config]);
  
   const handleApiKeySave = (key: string) => {
    const settings = getSettings();
    const newKeys = [...settings.apiKeyConfig.keys.filter(Boolean), key];
    saveSettings({ ...settings, apiKeyConfig: { keys: newKeys } });
    setIsApiKeyModalOpen(false);
    if (retryAiTask) {
      retryAiTask();
      setRetryAiTask(null);
    }
  };

  const handleLoadConfigClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleLoadFanficFileClick = () => {
    fanficFileInputRef.current?.click();
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const loadedConfig = await loadWorldConfigFromFile(file);
        setConfig(loadedConfig);
        setNotificationContent({ title: 'Thành công!', messages: ['Đã tải thiết lập thế giới thành công.'] });
        setIsNotificationOpen(true);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
        setNotificationContent({ title: 'Lỗi Tải Tệp', messages: [errorMessage] });
        setIsNotificationOpen(true);
      }
    }
    if (event.target) {
      event.target.value = ''; // Reset file input
    }
  };
  
  const handleFanficFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
        try {
            const newKnowledgeFiles: { name: string; content: string }[] = [];
            // FIX: Iterate directly over the FileList to ensure correct typing.
            for (const file of files) {
                const content = await loadTextFromFile(file);
                newKnowledgeFiles.push({ name: file.name, content });
            }
            
            const existingNames = new Set((config.backgroundKnowledge || []).map(k => k.name));
            const finalNewKnowledge = newKnowledgeFiles.filter(k => !existingNames.has(k.name));

            const combined = [...(config.backgroundKnowledge || []), ...finalNewKnowledge];
            // Sort after adding new files
            combined.sort((a, b) => {
                const aIsSummary = a.name.startsWith('tom_tat_');
                const bIsSummary = b.name.startsWith('tom_tat_');
                if (aIsSummary && !bIsSummary) return -1;
                if (!aIsSummary && bIsSummary) return 1;
                return a.name.localeCompare(b.name);
            });

            setConfig(prev => ({
                ...prev,
                backgroundKnowledge: combined
            }));
            
            setNotificationContent({ 
                title: 'Thành công!', 
                messages: [`Đã tải ${files.length} tệp và thêm vào Kiến thức nền AI.`] 
            });
            setIsNotificationOpen(true);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
            setNotificationContent({ title: 'Lỗi Tải Tệp', messages: [errorMessage] });
            setIsNotificationOpen(true);
        }
    }
     if (event.target) {
      event.target.value = ''; // Reset file input
    }
  };

  const handleConfirmFanficSelection = (selectedFiles: FandomFile[]) => {
    // Sort files: summary files first.
    selectedFiles.sort((a, b) => {
      const aIsSummary = a.name.startsWith('tom_tat_');
      const bIsSummary = b.name.startsWith('tom_tat_');
      if (aIsSummary && !bIsSummary) return -1;
      if (!aIsSummary && bIsSummary) return 1;
      return a.name.localeCompare(b.name); // otherwise, sort alphabetically
    });

    const knowledge = selectedFiles.map(f => ({ name: f.name, content: f.content }));
    const existingNames = new Set((config.backgroundKnowledge || []).map(k => k.name));
    const newKnowledge = knowledge.filter(k => !existingNames.has(k.name));
    handleSimpleChange('backgroundKnowledge', [...(config.backgroundKnowledge || []), ...newKnowledge]);
    
    setIsFanficSelectModalOpen(false);
    setNotificationContent({ title: 'Thành công!', messages: [`Đã chọn ${selectedFiles.length} tệp và thêm vào Kiến thức nền AI.`] });
    setIsNotificationOpen(true);
  };


  const handleConfirmKnowledgeSelection = (selectedFiles: FandomFile[]) => {
    // Sort files: summary files first.
    selectedFiles.sort((a, b) => {
        const aIsSummary = a.name.startsWith('tom_tat_');
        const bIsSummary = b.name.startsWith('tom_tat_');
        if (aIsSummary && !bIsSummary) return -1;
        if (!aIsSummary && bIsSummary) return 1;
        return a.name.localeCompare(b.name); // otherwise, sort alphabetically
    });
    const knowledge = selectedFiles.map(f => ({ name: f.name, content: f.content }));
    handleSimpleChange('backgroundKnowledge', knowledge);
    setIsKnowledgeSelectModalOpen(false);
  };

  const handleKnowledgeFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
        const newKnowledgeFiles: { name: string; content: string }[] = [];
        // FIX: Iterate directly over the FileList to ensure correct typing.
        for (const file of files) {
            const content = await loadTextFromFile(file);
            newKnowledgeFiles.push({ name: file.name, content });
        }
        
        const combined = [...(config.backgroundKnowledge || []), ...newKnowledgeFiles];
        // Sort after adding new files
        combined.sort((a, b) => {
            const aIsSummary = a.name.startsWith('tom_tat_');
            const bIsSummary = b.name.startsWith('tom_tat_');
            if (aIsSummary && !bIsSummary) return -1;
            if (!aIsSummary && bIsSummary) return 1;
            return a.name.localeCompare(b.name);
        });
        
        setConfig(prev => ({
            ...prev,
            backgroundKnowledge: combined
        }));
        
        setNotificationContent({ 
            title: 'Thành công!', 
            messages: [`Đã tải lên ${files.length} tệp làm kiến thức nền.`] 
        });
        setIsNotificationOpen(true);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
        setNotificationContent({ title: 'Lỗi Tải Tệp', messages: [errorMessage] });
        setIsNotificationOpen(true);
    }
    
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleRemoveKnowledgeFile = (indexToRemove: number) => {
    const newKnowledge = (config.backgroundKnowledge || []).filter((_, index) => index !== indexToRemove);
    handleSimpleChange('backgroundKnowledge', newKnowledge);
  };

  return (
    <>
      <ApiKeyModal 
        isOpen={isApiKeyModalOpen} 
        onSave={handleApiKeySave}
        onCancel={() => setIsApiKeyModalOpen(false)}
      />
      <NotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        title={notificationContent.title}
        messages={notificationContent.messages}
      />
       <FandomFileLoadModal 
        isOpen={isFanficSelectModalOpen}
        onClose={() => setIsFanficSelectModalOpen(false)}
        onConfirm={handleConfirmFanficSelection}
        mode="multiple"
        title="Chọn Nguyên Tác Đồng Nhân Từ Kho"
      />
       <FandomFileLoadModal 
        isOpen={isKnowledgeSelectModalOpen}
        onClose={() => setIsKnowledgeSelectModalOpen(false)}
        onConfirm={handleConfirmKnowledgeSelection}
        mode="multiple"
        title="Chọn Kho Kiến Thức Nền"
      />
       <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".json"
      />
      <input
        type="file"
        ref={fanficFileInputRef}
        onChange={handleFanficFileChange}
        className="hidden"
        accept=".txt,.json"
        multiple
      />
      <input
        type="file"
        ref={knowledgeFileInputRef}
        onChange={handleKnowledgeFileChange}
        className="hidden"
        accept=".txt,.json"
        multiple
      />
      <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-100">Kiến Tạo Thế Giới Của Người Chơi</h1>
            <Button onClick={onBack} variant="secondary" className="!w-auto !py-2 !px-4 !text-base">
                <Icon name="back" className="w-5 h-5 mr-2"/>
                Quay lại
            </Button>
        </div>

        <div className="bg-slate-800/60 backdrop-blur-sm rounded-lg mb-8 border-l-4 border-fuchsia-500 p-4">
            <h3 className="text-xl font-bold text-left text-fuchsia-400 mb-2 flex items-center">
                <Icon name="magic" className="w-6 h-6 mr-3" />
                Ý Tưởng Cốt Truyện Ban Đầu (AI Hỗ Trợ)
            </h3>
            <p className='text-sm text-slate-400 mb-3'>Nhập một ý tưởng ngắn gọn, AI sẽ tự động kiến tạo toàn bộ thế giới cho bạn.</p>
            <div className="flex flex-col sm:flex-row items-center gap-2">
                <StyledInput 
                    placeholder="VD: một thám tử ma thuật ở Sài Gòn năm 2077..." 
                    value={storyIdea}
                    onChange={(e) => setStoryIdea(e.target.value)}
                />
                <AiAssistButton 
                    isLoading={loadingStates['worldIdea']} 
                    onClick={handleGenerateWorldFromIdea}
                    isFullWidth
                    className="sm:!w-auto"
                >
                    {loadingStates['distilling'] ? 'Đang chắt lọc...' : 'Kiến Tạo Nhanh'}
                </AiAssistButton>
            </div>
            {(loadingStates['worldIdea'] && loadingStates['distilling']) && (
                <p className="text-xs text-amber-300 mt-2 animate-pulse text-center sm:text-left">
                    AI đang phân tích và tóm tắt tệp kiến thức nền lớn. Quá trình này có thể mất vài phút...
                </p>
            )}
        </div>
        
        <div className="bg-slate-800/60 backdrop-blur-sm rounded-lg mb-8 border-l-4 border-violet-500 p-4">
            <h3 className="text-xl font-bold text-left text-violet-400 mb-2 flex items-center">
                <Icon name="magic" className="w-6 h-6 mr-3" />
                Ý Tưởng Đồng Nhân / Fanfiction (AI Hỗ Trợ)
            </h3>
            <p className='text-sm text-slate-400 mb-3'>Nhập tên tác phẩm và ý tưởng. Tải lên các tệp nguyên tác (.txt) sẽ tự động thêm chúng vào "Kiến thức nền AI" bên dưới để có kết quả chính xác nhất.</p>
            <div className="flex flex-col sm:flex-row items-center gap-2 mb-3">
                <StyledInput 
                    placeholder="VD: đồng nhân Naruto, nếu Obito không theo Madara..." 
                    value={fanfictionIdea}
                    onChange={(e) => setFanfictionIdea(e.target.value)}
                />
                <AiAssistButton 
                    isLoading={loadingStates['worldFanfictionIdea']} 
                    onClick={handleGenerateFanfictionFromIdea}
                    isFullWidth
                    className="sm:!w-auto"
                >
                    {loadingStates['distilling'] ? 'Đang chắt lọc...' : 'Kiến Tạo Đồng Nhân'}
                </AiAssistButton>
            </div>
            {(loadingStates['worldFanfictionIdea'] && loadingStates['distilling']) && (
                 <p className="text-xs text-amber-300 mt-2 animate-pulse text-center sm:text-left">
                    AI đang phân tích và tóm tắt tệp kiến thức nền lớn. Quá trình này có thể mất vài phút...
                </p>
            )}
            <div className='flex flex-col sm:flex-row items-center gap-2'>
                <Button onClick={handleLoadFanficFileClick} variant="secondary" className="!w-full sm:!w-auto !text-sm !py-2">
                    <Icon name="upload" className="w-4 h-4 mr-2" /> Tải từ máy (.txt)
                </Button>
                 <Button onClick={() => setIsFanficSelectModalOpen(true)} variant="secondary" className="!w-full sm:!w-auto !text-sm !py-2">
                    <Icon name="save" className="w-4 h-4 mr-2" /> Chọn từ Kho (.txt)
                </Button>
            </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:gap-x-8">
            {/* --- COLUMN 1 WRAPPER --- */}
            <div className="flex flex-col lg:w-1/2">
                {/* Bối Cảnh Truyện */}
                <div className="order-1">
                    <div className="bg-slate-800/60 backdrop-blur-sm rounded-lg mb-8 border-l-4 border-sky-500 p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-left text-sky-400 flex items-center"><Icon name="world" className="w-6 h-6 mr-3"/>Bối Cảnh Truyện</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <FormRow label="Tên Thế Giới:" labelClassName="text-sky-300">
                                <StyledInput 
                                    value={config.storyContext.worldName} 
                                    onChange={e => handleNestedChange('storyContext', 'worldName', e.target.value)} 
                                    placeholder="VD: Lục Địa Gió, Tinh Hệ X..."
                                />
                            </FormRow>
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-medium text-sky-300">Thể loại:</label>
                                    <AiAssistButton isLoading={loadingStates['genre']} onClick={() => runAiAssist('genre', () => aiService.generateGenre(config), res => handleNestedChange('storyContext', 'genre', res))} />
                                </div>
                                <StyledInput 
                                    value={config.storyContext.genre} 
                                    onChange={e => handleNestedChange('storyContext', 'genre', e.target.value)} 
                                    placeholder="VD: Tiên hiệp, Kỳ ảo đô thị..."
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-sky-300">Thế Giới/Bối Cảnh Cụ Thể:</label>
                                <AiAssistButton isLoading={loadingStates['setting']} onClick={() => runAiAssist('setting', () => aiService.generateSetting(config), res => handleNestedChange('storyContext', 'setting', res))} />
                            </div>
                            <StyledTextArea 
                                value={config.storyContext.setting} 
                                onChange={e => handleNestedChange('storyContext', 'setting', e.target.value)} 
                                rows={2} 
                                placeholder="VD: Một vương quốc bay lơ lửng trên mây, nơi các hiệp sĩ cưỡi rồng..."
                            />
                        </div>
                    </div>
                </div>

                {/* Độ Khó & Nội Dung */}
                <div className="order-2">
                    <div className="bg-slate-800/60 backdrop-blur-sm rounded-lg mb-8 border-l-4 border-lime-500 p-4">
                        <h3 className="text-xl font-bold text-left text-lime-400 mb-4 flex items-center"><Icon name="difficulty" className="w-6 h-6 mr-3"/>Độ Khó & Nội Dung</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormRow label="Chọn Độ Khó" labelClassName="text-lime-300">
                                <StyledSelect value={config.difficulty} onChange={e => handleSimpleChange('difficulty', e.target.value)}>
                                    {DIFFICULTY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </StyledSelect>
                            </FormRow>
                             <FormRow label="Độ Dài Phản Hồi Ưu Tiên Của AI" labelClassName="text-lime-300">
                                <StyledSelect value={config.aiResponseLength || AI_RESPONSE_LENGTH_OPTIONS[0]} onChange={e => handleSimpleChange('aiResponseLength', e.target.value)}>
                                    {AI_RESPONSE_LENGTH_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </StyledSelect>
                            </FormRow>
                        </div>

                        <div className="mt-4 border-t border-slate-700 pt-4">
                            <FormRow label="Kiến thức nền AI (Tùy chọn)" labelClassName="text-lime-300">
                                <p className="text-xs text-slate-400 mb-2">Chọn các tệp nguyên tác (.txt) từ kho hoặc tải lên từ máy để AI sử dụng làm kiến thức nền khi tạo thế giới và dẫn truyện.</p>
                                <div className="flex flex-wrap gap-2">
                                    <Button onClick={() => setIsKnowledgeSelectModalOpen(true)} variant="secondary" className="!w-auto !text-sm !py-2">
                                        <Icon name="save" className="w-4 h-4 mr-2" /> Chọn từ Kho
                                    </Button>
                                    <Button onClick={() => knowledgeFileInputRef.current?.click()} variant="secondary" className="!w-auto !text-sm !py-2">
                                        <Icon name="upload" className="w-4 h-4 mr-2" /> Tải từ máy
                                    </Button>
                                </div>
                                {config.backgroundKnowledge && config.backgroundKnowledge.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                        <p className="text-sm font-semibold text-slate-300">Đã chọn:</p>
                                        <ul className="space-y-1 max-h-52 overflow-y-auto pr-2">
                                            {config.backgroundKnowledge.map((file, index) => (
                                                <li key={index} className="flex items-center justify-between bg-slate-900/50 p-2 rounded-md text-sm">
                                                    <span className="text-slate-300 truncate">{file.name}</span>
                                                    <button onClick={() => handleRemoveKnowledgeFile(index)} className="p-1 text-red-400 hover:bg-red-500/20 rounded-full transition"><Icon name="trash" className="w-4 h-4"/></button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </FormRow>
                        </div>
                        
                        <div className="flex items-center space-x-2 mt-4 border-t border-slate-700 pt-4">
                            <input type="checkbox" id="adult-content" 
                                checked={config.allowAdultContent}
                                onChange={e => handleSimpleChange('allowAdultContent', e.target.checked)}
                                onClick={handleAdultContentClick}
                                disabled={isSafetyFilterEnabled}
                                className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500 disabled:opacity-50"
                            />
                            <label htmlFor="adult-content" className={`text-sm font-medium ${isSafetyFilterEnabled ? 'text-slate-500 cursor-not-allowed' : 'text-slate-300'}`}>Cho phép nội dung 18+</label>
                        </div>
                        {config.allowAdultContent && !isSafetyFilterEnabled && (
                          <div className="mt-4 space-y-4 border-t border-slate-700 pt-4 animate-fade-in">
                            <FormRow label="Phong Cách Miêu Tả Tình Dục" labelClassName="text-lime-300">
                                <StyledSelect value={config.sexualContentStyle} onChange={e => handleSimpleChange('sexualContentStyle', e.target.value)}>
                                    {SEXUAL_CONTENT_STYLE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </StyledSelect>
                            </FormRow>
                            <FormRow label="Mức Độ Miêu Tả Bạo Lực" labelClassName="text-lime-300">
                                <StyledSelect value={config.violenceLevel} onChange={e => handleSimpleChange('violenceLevel', e.target.value)}>
                                    {VIOLENCE_LEVEL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </StyledSelect>
                            </FormRow>
                            <FormRow label="Tông Màu Câu Chuyện" labelClassName="text-lime-300">
                                <StyledSelect value={config.storyTone} onChange={e => handleSimpleChange('storyTone', e.target.value)}>
                                    {STORY_TONE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </StyledSelect>
                            </FormRow>
                          </div>  
                        )}
                    </div>
                </div>
                
                {/* Luật Lệ Cốt Lõi */}
                <div className="order-5">
                    <Accordion title="Luật Lệ Cốt Lõi Của Thế Giới (Bất biến khi vào game)" icon={<Icon name="rules" />} titleClassName='text-yellow-400' borderColorClass='border-yellow-500'>
                         <div className="max-h-96 overflow-y-auto pr-2 space-y-2">
                            {config.coreRules.map((rule, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                    <StyledInput value={rule} onChange={e => handleCoreRuleChange(index, e.target.value)} placeholder={`Luật ${index + 1}`} />
                                    <button onClick={() => removeCoreRule(index)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-full transition"><Icon name="trash" className="w-5 h-5"/></button>
                                </div>
                            ))}
                            <Button onClick={addCoreRule} variant="warning" className="!w-full !text-base !py-2"><Icon name="plus" className="w-5 h-5 mr-2"/>Thêm Luật Lệ Cốt Lõi</Button>
                        </div>
                    </Accordion>
                </div>

                {/* Kiến Tạo Thực Thể Ban Đầu */}
                <div className="order-6">
                    <Accordion title="Kiến Tạo Thực Thể Ban Đầu (Tùy chọn)" icon={<Icon name="entity" />} titleClassName='text-green-400' borderColorClass='border-green-500'>
                         <div className="max-h-96 overflow-y-auto pr-2 space-y-4">
                            {config.initialEntities.map((entity, index) => (
                                <div key={index} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                       <div className="mb-4 sm:mb-0">
                                           <div className="flex items-center justify-between mb-1">
                                               <label className="block text-sm font-medium text-green-300">Tên Thực Thể:</label>
                                               <AiAssistButton isLoading={loadingStates[`entity_name_${index}`]} onClick={() => runAiAssist(`entity_name_${index}`, () => aiService.generateEntityName(config, entity), res => handleEntityChange(index, 'name', res))} />
                                           </div>
                                           <StyledInput 
                                               value={entity.name} 
                                               onChange={e => handleEntityChange(index, 'name', e.target.value)}
                                               placeholder="VD: Lão Ma Đầu, Thanh Cổ Kiếm..."
                                           />
                                       </div>
                                       <FormRow label="Loại Thực Thể:" labelClassName="text-green-300">
                                           <StyledSelect 
                                               value={entity.type} 
                                               onChange={e => handleEntityChange(index, 'type', e.target.value)}
                                           >
                                               {ENTITY_TYPE_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                                           </StyledSelect>
                                       </FormRow>
                                   </div>

                                    {entity.type === 'NPC' && (
                                        <div className="my-4">
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="block text-sm font-medium text-green-300">Tính Cách (Nếu là NPC):</label>
                                                <AiAssistButton isLoading={loadingStates[`entity_personality_${index}`]} onClick={() => runAiAssist(`entity_personality_${index}`, () => aiService.generateEntityPersonality(config, entity), res => handleEntityChange(index, 'personality', res))} />
                                            </div>
                                            <StyledTextArea 
                                                value={entity.personality} 
                                                onChange={e => handleEntityChange(index, 'personality', e.target.value)}
                                                rows={2}
                                                placeholder="VD: Lạnh lùng, đa nghi..."
                                            />
                                        </div>
                                    )}

                                    <div className="mb-4">
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-sm font-medium text-green-300">Mô Tả Thực Thể:</label>
                                            <AiAssistButton isLoading={loadingStates[`entity_description_${index}`]} onClick={() => runAiAssist(`entity_description_${index}`, () => aiService.generateEntityDescription(config, entity), res => handleEntityChange(index, 'description', res))} />
                                        </div>
                                        <StyledTextArea 
                                            value={entity.description} 
                                            onChange={e => handleEntityChange(index, 'description', e.target.value)}
                                            rows={3}
                                            placeholder="VD: Một thanh kiếm cổ..."
                                        />
                                    </div>
                                    
                                    <div className="flex justify-end mt-2">
                                        <button onClick={() => removeEntity(index)} className="flex items-center text-sm text-red-400 hover:text-red-300 transition">
                                            <Icon name="trash" className="w-4 h-4 mr-1"/>
                                            Xóa thực thể này
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <Button onClick={addEntity} variant="success" className="!w-full !text-base !py-2"><Icon name="plus" className="w-5 h-5 mr-2"/>Thêm Thực Thể</Button>
                        </div>
                    </Accordion>
                </div>
            </div>

            {/* --- COLUMN 2 WRAPPER --- */}
            <div className="flex flex-col lg:w-1/2">
                {/* Nhân Vật Chính */}
                <div className="order-3">
                    <div className="bg-slate-800/60 backdrop-blur-sm rounded-lg mb-8 border-l-4 border-pink-500 p-4">
                         <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-left text-pink-400 flex items-center"><Icon name="user" className="w-6 h-6 mr-3"/>Nhân Vật Chính</h3>
                        </div>
                        <FormRow label="Danh xưng (Tên nhân vật):" labelClassName="text-pink-300">
                            <StyledInput value={config.character.name} onChange={e => handleNestedChange('character', 'name', e.target.value)} placeholder="VD: Trần Dạ, Luna Nguyễn, K-7..."/>
                        </FormRow>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormRow label="Giới tính" labelClassName="text-pink-300">
                                <StyledSelect value={config.character.gender} onChange={e => handleNestedChange('character', 'gender', e.target.value)}>
                                    {GENDER_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </StyledSelect>
                            </FormRow>
                            <FormRow label="Tính cách" labelClassName="text-pink-300">
                                <StyledSelect value={config.character.personality} onChange={e => handleNestedChange('character', 'personality', e.target.value)}>
                                    {PERSONALITY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </StyledSelect>
                            </FormRow>
                        </div>
                         {config.character.personality === 'Tuỳ chỉnh' && (
                            <FormRow label="Mô tả tính cách tùy chỉnh" labelClassName="text-pink-300">
                                <StyledTextArea value={config.character.customPersonality} onChange={e => handleNestedChange('character', 'customPersonality', e.target.value)} rows={3} placeholder="VD: Một người cộc cằn..."/>
                            </FormRow>
                        )}
                         <div className="my-4">
                             <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-pink-300">Sơ Lược Tiểu Sử/ngoại hình:</label>
                                <AiAssistButton isLoading={loadingStates['bio']} onClick={handleGenerateBio} />
                            </div>
                            <StyledTextArea value={config.character.bio} onChange={e => handleNestedChange('character', 'bio', e.target.value)} rows={2} placeholder="VD: Là đứa con cuối cùng của một gia tộc cổ xưa..."/>
                        </div>
                         <div className="mb-4">
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-pink-300">Kỹ Năng Khởi Đầu (Tùy chọn):</label>
                                <AiAssistButton isLoading={loadingStates['skills']} onClick={handleGenerateSkills} />
                            </div>
                            <div className="space-y-3">
                                {config.character.skills.map((skill, index) => (
                                    <div key={index} className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-slate-400">Kỹ năng {index + 1}</span>
                                                <AiAssistButton isLoading={loadingStates[`skill_${index}`]} onClick={() => handleGenerateSingleSkill(index)} />
                                            </div>
                                            <button onClick={() => removeSkill(index)} className="p-1 text-red-400 hover:bg-red-500/20 rounded-full transition"><Icon name="trash" className="w-4 h-4"/></button>
                                        </div>
                                        <div className="space-y-2">
                                            <StyledInput value={skill.name} onChange={e => handleSkillChange(index, 'name', e.target.value)} placeholder="Tên kỹ năng. VD: Hỏa thuật, Đàm phán..."/>
                                            <StyledTextArea value={skill.description} onChange={e => handleSkillChange(index, 'description', e.target.value)} rows={2} placeholder="Mô tả kỹ năng. VD: Khả năng điều khiển lửa..."/>
                                        </div>
                                    </div>
                                ))}
                                <Button onClick={addSkill} variant="special" className="!w-full !text-sm !py-2"><Icon name="plus" className="w-4 h-4 mr-2"/>Thêm Kỹ Năng</Button>
                            </div>
                        </div>

                         <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-pink-300">Mục Tiêu/Động Lực:</label>
                                <AiAssistButton isLoading={loadingStates['motivation']} onClick={handleGenerateMotivation} />
                            </div>
                             <StyledTextArea value={config.character.motivation} onChange={e => handleNestedChange('character', 'motivation', e.target.value)} rows={2} placeholder="VD: Tìm lại di vật của gia đình..."/>
                        </div>
                    </div>
                </div>

                {/* Character Stats */}
                <div className="order-4">
                    <Accordion title="Hệ Thống Chỉ Số Nhân Vật" icon={<Icon name="status" />} titleClassName='text-teal-400' borderColorClass='border-teal-500'>
                        <div className="flex items-center space-x-2 mb-4">
                            <input type="checkbox" id="enable-stats"
                                checked={config.enableStatsSystem}
                                onChange={e => handleSimpleChange('enableStatsSystem', e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                            />
                            <label htmlFor="enable-stats" className="text-sm font-medium text-slate-300">Bật hệ thống chỉ số</label>
                        </div>

                        {config.enableStatsSystem && (
                            <div className="space-y-4 animate-fade-in">
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-medium text-teal-300">Các chỉ số:</label>
                                    <AiAssistButton isLoading={loadingStates['stats']} onClick={handleGenerateStats} />
                                </div>
                                <div className="max-h-96 overflow-y-auto pr-2 space-y-4">
                                    {(config.character.stats || []).map((stat, index) => (
                                        <div key={index} className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                                                <div className="mb-0">
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">Tên Chỉ Số</label>
                                                    <div className="flex items-center gap-2">
                                                        <StyledInput value={stat.name} onChange={e => handleStatChange(index, 'name', e.target.value)} disabled={index < 2} />
                                                        {index >= 2 && <AiAssistButton isLoading={loadingStates[`stat_${index}`]} onClick={() => handleGenerateSingleStat(index)} />}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="mb-0 flex-grow">
                                                         <label className="block text-sm font-medium text-slate-300 mb-1">Giá trị</label>
                                                        <StyledInput 
                                                            type="number" 
                                                            value={stat.value} 
                                                            onChange={e => handleStatChange(index, 'value', e.target.value)} 
                                                            max={stat.hasLimit === false ? 9999 : undefined}
                                                        />
                                                    </div>
                                                    {stat.hasLimit !== false && (
                                                        <>
                                                            <span className="pt-6">/</span>
                                                            <div className="mb-0 flex-grow">
                                                                <label className="block text-sm font-medium text-slate-300 mb-1">Tối đa</label>
                                                                <StyledInput type="number" value={stat.maxValue} onChange={e => handleStatChange(index, 'maxValue', e.target.value)} />
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="mt-3">
                                                <label className="block text-sm font-medium text-slate-300 mb-1">Mô tả (cho AI)</label>
                                                <StyledTextArea 
                                                    value={stat.description || ''} 
                                                    onChange={e => handleStatChange(index, 'description', e.target.value)} 
                                                    rows={2}
                                                    placeholder="VD: Tăng khả năng né tránh, thể hiện sức mạnh phép thuật..."
                                                />
                                            </div>
                                            <div className="mt-3 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <input 
                                                            type="checkbox" 
                                                            id={`has-limit-${index}`} 
                                                            checked={stat.hasLimit !== false}
                                                            onChange={e => handleStatChange(index, 'hasLimit', e.target.checked)} 
                                                            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                                            disabled={index < 2}
                                                        />
                                                        <label htmlFor={`has-limit-${index}`} className={`text-xs ${index < 2 ? 'text-slate-500' : 'text-slate-400'}`}>Có giới hạn tối đa?</label>
                                                    </div>
                                                    
                                                    {stat.hasLimit !== false && (
                                                        <div className="flex items-center gap-2">
                                                            <input type="checkbox" id={`is-percentage-${index}`} checked={stat.isPercentage} onChange={e => handleStatChange(index, 'isPercentage', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"/>
                                                            <label htmlFor={`is-percentage-${index}`} className="text-xs text-slate-400">Hiển thị dạng %</label>
                                                        </div>
                                                    )}
                                                </div>
                                                {index >= 2 && (
                                                    <button onClick={() => removeStat(index)} className="p-1 text-red-400 hover:bg-red-500/20 rounded-full transition"><Icon name="trash" className="w-4 h-4"/></button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <Button onClick={addStat} variant="info" className="!w-full !text-sm !py-2"><Icon name="plus" className="w-4 h-4 mr-2"/>Thêm Chỉ Số</Button>
                                </div>
                            </div>
                        )}
                    </Accordion>
                </div>
            </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex gap-4">
              <Button onClick={() => saveWorldConfigToFile(config)} variant="secondary" className="!w-auto">Lưu Thiết Lập</Button>
              <Button onClick={handleLoadConfigClick} variant="special" className="!w-auto">Tải Thiết Lập</Button>
            </div>
            <Button onClick={handleCreateWorld} variant="primary" className="!w-full sm:!w-auto !text-xl !px-10">Khởi Tạo Thế Giới</Button>
        </div>
        <style>{`.animate-fade-in { animation: fadeIn 0.5s ease-in-out; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
      </div>
    </>
  );
};

export default WorldCreationScreen;