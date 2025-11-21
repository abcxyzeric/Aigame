import React, { useState, useEffect, useRef } from 'react';
import Button from './common/Button';
import Icon from './common/Icon';
import * as aiService from '../services/aiService';
import { saveTextToFile, saveJsonToFile } from '../services/fileService';
import * as fandomFileService from '../services/fandomFileService';
import { FandomFile, FandomDataset } from '../types';
import NotificationModal from './common/NotificationModal';
import FandomFileLoadModal from './FandomFileLoadModal';
import Accordion from './common/Accordion';

interface FandomGenesisScreenProps {
  onBack: () => void;
}

const StyledInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className="w-full bg-slate-900/70 border border-slate-700 rounded-md px-3 py-2 text-slate-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition placeholder:text-slate-500"
  />
);


const FandomGenesisScreen: React.FC<FandomGenesisScreenProps> = ({ onBack }) => {
  // --- State for Steps 1 & 2 ---
  const [workName, setWorkName] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [loadingStates, setLoadingStates] = useState({ summary: false, arc: false, training: false });
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef<number | null>(null);
  const [generatedResult, setGeneratedResult] = useState<{ name: string, content: string, type: 'txt' | 'json' } | null>(null);
  const [savedFiles, setSavedFiles] = useState<FandomFile[]>([]);
  const [renamingFileId, setRenamingFileId] = useState<number | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [isSummarySelectModalOpen, setIsSummarySelectModalOpen] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<FandomFile | null>(null);
  const [arcList, setArcList] = useState<string[]>([]);
  const [selectedArcs, setSelectedArcs] = useState<Set<string>>(new Set());
  const [arcProcessingProgress, setArcProcessingProgress] = useState({ current: 0, total: 0, status: 'idle' as 'idle' | 'extracting_arcs' | 'summarizing' | 'done', currentArcName: '' });

  // --- State for Train Data ---
  const [chunkSize, setChunkSize] = useState(1000);
  const [overlap, setOverlap] = useState(100);
  const [sourceTrainFile, setSourceTrainFile] = useState<{ name: string; content: string } | null>(null);
  const [trainingProgress, setTrainingProgress] = useState({ current: 0, total: 0 });
  const [trainedDataset, setTrainedDataset] = useState<FandomDataset | null>(null);
  const [trainingStatusText, setTrainingStatusText] = useState('');
  
  // --- Common State ---
  const [notification, setNotification] = useState({ isOpen: false, title: '', messages: [''] });
  const fileUploadRef = useRef<HTMLInputElement>(null);
  const trainFileUploadRef = useRef<HTMLInputElement>(null);

  // --- Constants for Train Data ---
  const TOKEN_PER_WORD = 1.5;
  const MAX_CHUNK_TOKENS = 4096;
  const estimatedTokens = Math.round(chunkSize * TOKEN_PER_WORD);
  const isChunkSettingValid = estimatedTokens < MAX_CHUNK_TOKENS && chunkSize > 0 && overlap >= 0 && chunkSize > overlap;


  const refreshSavedFiles = async () => {
    setSavedFiles(await fandomFileService.getAllFandomFiles());
  };

  useEffect(() => {
    refreshSavedFiles();
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const startProgressSimulation = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setProgress(0);
    progressIntervalRef.current = window.setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
          return prev;
        }
        return prev + 5;
      });
    }, 800);
  };

  const stopProgressSimulation = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setProgress(0);
  };

  const handleGenerateSummary = async () => {
    if (!workName.trim()) {
      setNotification({ isOpen: true, title: 'Thiếu thông tin', messages: ['Vui lòng nhập tên tác phẩm.'] });
      return;
    }
    setLoadingStates(p => ({...p, summary: true}));
    startProgressSimulation();
    setGeneratedResult(null);
    try {
      const result = await aiService.generateFandomSummary(workName, authorName);
      const fileName = `tom_tat_${workName.replace(/[\s/\\?%*:|"<>]/g, '_')}.txt`;
      setGeneratedResult({ name: fileName, content: result, type: 'txt' });
      setProgress(100);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định.';
      setNotification({ isOpen: true, title: 'Lỗi', messages: [errorMessage] });
    } finally {
      setLoadingStates(p => ({...p, summary: false}));
      stopProgressSimulation();
    }
  };

  const handleSelectSummary = (files: FandomFile[]) => {
    if (files.length > 0) {
        setSelectedSummary(files[0]);
        setArcList([]); // Reset arc list when a new summary is selected
        setSelectedArcs(new Set());
    }
    setIsSummarySelectModalOpen(false);
  };
  
  const handleExtractArcList = async () => {
    if (!selectedSummary) {
        setNotification({ isOpen: true, title: 'Chưa chọn tệp', messages: ['Vui lòng chọn một tệp tóm tắt (.txt) từ kho để bắt đầu.'] });
        return;
    }
    setLoadingStates(p => ({...p, arc: true}));
    setArcProcessingProgress({ current: 0, total: 0, status: 'extracting_arcs', currentArcName: '' });
    setArcList([]);
    try {
        const arcs = await aiService.extractArcListFromSummary(selectedSummary.content);
        if (!arcs || arcs.length === 0) {
            setNotification({ isOpen: true, title: 'Không tìm thấy Arc', messages: ['AI không thể xác định được các phần truyện (Arc) nào từ tệp tóm tắt này.'] });
            setArcList([]);
        } else {
            setArcList(arcs);
            setSelectedArcs(new Set()); // Reset selection
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định.';
        setNotification({ isOpen: true, title: 'Lỗi Phân Tích', messages: [errorMessage] });
    } finally {
        setLoadingStates(p => ({...p, arc: false}));
        setArcProcessingProgress(prev => ({ ...prev, status: 'idle' }));
    }
  };

  const handleGenerateSelectedArcs = async () => {
    if (!selectedSummary || selectedArcs.size === 0) {
        setNotification({ isOpen: true, title: 'Chưa chọn Arc', messages: ['Vui lòng chọn ít nhất một Arc để tóm tắt.'] });
        return;
    }

    setLoadingStates(p => ({...p, arc: true}));
    const arcsToProcess = Array.from(selectedArcs);
    setArcProcessingProgress({ current: 0, total: arcsToProcess.length, status: 'summarizing', currentArcName: '' });
    try {
        const workNameFromSummary = selectedSummary.name.replace(/^tom_tat_|\.txt$/gi, '').replace(/_/g, ' ');

        for (let i = 0; i < arcsToProcess.length; i++) {
            const arcName = arcsToProcess[i];
            setArcProcessingProgress(prev => ({ ...prev, current: i + 1, currentArcName: arcName }));
            
            const textContent = await aiService.generateFandomGenesis(selectedSummary.content, arcName, workNameFromSummary, authorName);
            const fileName = `${workNameFromSummary.replace(/[\s/\\?%*:|"<>]/g, '_')}_${(arcName as string).replace(/[\s/\\?%*:|"<>]/g, '_')}.txt`;
            await fandomFileService.saveFandomFile(fileName, textContent);
            await refreshSavedFiles();
        }

        setArcProcessingProgress({ current: arcsToProcess.length, total: arcsToProcess.length, status: 'done', currentArcName: '' });
        setNotification({ isOpen: true, title: 'Hoàn tất!', messages: [`AI đã tóm tắt và lưu thành công ${arcsToProcess.length} tệp .txt vào kho.`] });
        setSelectedArcs(new Set()); // Clear selection after processing
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định.';
        setNotification({ isOpen: true, title: 'Lỗi', messages: [errorMessage] });
        setArcProcessingProgress(prev => ({...prev, status: 'idle'}));
    } finally {
        setLoadingStates(p => ({...p, arc: false}));
    }
  };
  
  const handleToggleArcSelection = (arcName: string) => {
    setSelectedArcs(prev => {
        const newSet = new Set(prev);
        if (newSet.has(arcName)) {
            newSet.delete(arcName);
        } else {
            newSet.add(arcName);
        }
        return newSet;
    });
  };

  const handleSelectAllArcs = () => {
      setSelectedArcs(new Set(arcList));
  };


  const handleSaveToBrowser = async () => {
    if (!generatedResult) return;
    await fandomFileService.saveFandomFile(generatedResult.name, generatedResult.content);
    setNotification({ isOpen: true, title: 'Đã lưu!', messages: [`Đã lưu "${generatedResult.name}" vào kho lưu trữ của trình duyệt.`] });
    setGeneratedResult(null);
    await refreshSavedFiles();
  };

  const handleDownload = (name: string, content: string, type: 'txt' | 'json') => {
    if (type === 'txt') {
        saveTextToFile(content, name);
    } else {
        try {
            const jsonData = JSON.parse(content);
            saveJsonToFile(jsonData, name);
        } catch (e) {
             setNotification({ isOpen: true, title: 'Lỗi', messages: ['Nội dung không phải là JSON hợp lệ để tải xuống.'] });
        }
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Bạn có chắc muốn xóa tệp này khỏi kho lưu trữ?')) {
      await fandomFileService.deleteFandomFile(id);
      await refreshSavedFiles();
    }
  };

  const handleStartRename = (file: FandomFile) => {
    setRenamingFileId(file.id);
    setNewFileName(file.name);
  };

  const handleConfirmRename = async () => {
    if (renamingFileId && newFileName.trim()) {
      await fandomFileService.renameFandomFile(renamingFileId, newFileName.trim());
      setRenamingFileId(null);
      setNewFileName('');
      await refreshSavedFiles();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
        for (const file of files) {
            const content = await file.text();
            await fandomFileService.saveFandomFile(file.name, content);
        }
        await refreshSavedFiles();
        setNotification({ 
            isOpen: true, 
            title: 'Thành công!', 
            messages: [`Đã tải lên và lưu ${files.length} tệp vào kho.`] 
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định.';
        setNotification({ isOpen: true, title: 'Lỗi Tải Tệp', messages: [errorMessage] });
    }

    if (event.target) {
        event.target.value = '';
    }
  };
  
  // --- Train Data Logic ---

  const handleTrainFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.type === 'text/plain' || file.name.endsWith('.txt'))) {
        const content = await file.text();
        setSourceTrainFile({ name: file.name, content });
        setTrainedDataset(null);
        setNotification({ isOpen: true, title: 'Tải tệp thành công', messages: [`Đã tải tệp "${file.name}". Giờ bạn có thể bắt đầu Train.`] });
    } else if (file) {
        setNotification({ isOpen: true, title: 'Lỗi', messages: ['Vui lòng chỉ chọn tệp .txt.'] });
    }
    if (event.target) event.target.value = '';
  };

  const performChunking = () => {
    if (!sourceTrainFile) {
        setNotification({ isOpen: true, title: 'Chưa có tệp', messages: ['Vui lòng nhập một tệp .txt trước khi Train.'] });
        return;
    }
    if (!isChunkSettingValid) {
        setNotification({ isOpen: true, title: 'Cài đặt không hợp lệ', messages: ['Vui lòng kiểm tra lại cài đặt Chunk. Số từ chồng lấn phải nhỏ hơn số từ mỗi chunk.'] });
        return;
    }
    setLoadingStates(p => ({...p, training: true}));
    setTrainedDataset(null);
    setTrainingProgress({ current: 0, total: 0 });
    
    setTimeout(async () => {
        try {
            setTrainingStatusText('Đang cắt nhỏ tệp...');
            const words = sourceTrainFile.content.split(/[\s\n\r]+/).filter(Boolean);
            const textChunks: string[] = [];
            const step = chunkSize - overlap > 0 ? chunkSize - overlap : chunkSize;
            for (let i = 0; i < words.length; i += step) {
                textChunks.push(words.slice(i, i + chunkSize).join(' '));
            }

            setTrainingStatusText(`Đang tạo embeddings cho ${textChunks.length} chunks...`);
            const embeddings = await aiService.embedChunks(textChunks, (progress) => {
                const currentChunk = Math.round(progress * textChunks.length);
                setTrainingProgress({ current: currentChunk, total: textChunks.length });
                setTrainingStatusText(`Đang tạo embedding cho chunk ${currentChunk}/${textChunks.length}...`);
            });
            
            setTrainingStatusText('Đang đóng gói Dataset...');
            const dataset: FandomDataset = {
                metadata: {
                    sourceName: sourceTrainFile.name,
                    createdAt: new Date().toISOString(),
                    totalChunks: textChunks.length,
                    chunkSize,
                    overlap,
                    embeddingModel: 'text-embedding-004',
                },
                chunks: textChunks.map((chunkText, index) => ({
                    id: `${sourceTrainFile.name.replace(/\.txt$/i, '')}-part-${index + 1}`,
                    text: chunkText,
                    embedding: embeddings[index],
                }))
            };

            setTrainedDataset(dataset);
            setNotification({
                isOpen: true,
                title: 'Hoàn thành!',
                messages: [`Đã đóng gói và tạo vector thành công ${textChunks.length} chunks vào Dataset. Dữ liệu đã được chuẩn hóa để tối ưu cho bộ nhớ AI.`]
            });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định.';
            setNotification({ isOpen: true, title: 'Lỗi khi xử lý tệp', messages: [errorMessage] });
        } finally {
            setLoadingStates(p => ({...p, training: false}));
            setTrainingProgress({ current: 0, total: 0 });
            setTrainingStatusText('');
        }
    }, 100);
  };

  const handleSaveDataset = async () => {
    if (!trainedDataset) return;
    setLoadingStates(p => ({...p, training: true}));
    try {
        const baseName = trainedDataset.metadata.sourceName.replace(/\.txt$/i, '');
        const fileName = `[DATASET]_${baseName}.json`;
        await fandomFileService.saveFandomFile(fileName, JSON.stringify(trainedDataset, null, 2));
        
        setNotification({ isOpen: true, title: 'Thành công!', messages: [`Đã lưu Dataset "${fileName}" vào Kho Nguyên Tác.`] });
        await refreshSavedFiles();
        setTrainedDataset(null);
        setSourceTrainFile(null);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định.';
        setNotification({ isOpen: true, title: 'Lỗi khi lưu tệp', messages: [errorMessage] });
    } finally {
        setLoadingStates(p => ({...p, training: false}));
    }
  };


  return (
    <>
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={() => setNotification(prev => ({ ...prev, isOpen: false }))}
        title={notification.title}
        messages={notification.messages}
      />
      <FandomFileLoadModal
        isOpen={isSummarySelectModalOpen}
        onClose={() => setIsSummarySelectModalOpen(false)}
        onConfirm={handleSelectSummary}
        mode="single"
        title="Chọn Tệp Tóm Tắt (.txt)"
        fileTypeFilter="txt"
      />
      <input
        type="file"
        ref={fileUploadRef}
        onChange={handleFileUpload}
        className="hidden"
        accept=".txt,.json"
        multiple
      />
       <input
        type="file"
        ref={trainFileUploadRef}
        onChange={handleTrainFileChange}
        className="hidden"
        accept=".txt"
      />
      <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8">
        <div className="flex justify-between items-center mb-8 mt-4">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-100">Kiến Tạo từ Nguyên Tác</h1>
             <Button onClick={onBack} variant="secondary" className="!w-auto !py-2 !px-4 !text-base">
                <Icon name="back" className="w-5 h-5 mr-2"/>
                Quay lại
            </Button>
        </div>

        <div className="space-y-8">
            <Accordion title="Bước 1: Tạo Tóm Tắt Tổng Quan (.txt)" icon={<Icon name="magic"/>} borderColorClass='border-sky-500' titleClassName='text-sky-400' startOpen={true}>
                <p className="text-slate-400 mb-4 text-sm">Cung cấp cho AI cái nhìn tổng quan về tác phẩm. Tệp tóm tắt này là **đầu vào bắt buộc** cho Bước 2.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Tên tác phẩm:</label>
                        <StyledInput placeholder="VD: Harry Potter, Naruto, One Piece..." value={workName} onChange={e => setWorkName(e.target.value)} disabled={loadingStates.summary || loadingStates.arc}/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Tên tác giả (Tùy chọn):</label>
                        <StyledInput placeholder="VD: J. K. Rowling, Kishimoto Masashi..." value={authorName} onChange={e => setAuthorName(e.target.value)} disabled={loadingStates.summary || loadingStates.arc}/>
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <Button onClick={handleGenerateSummary} variant="info" disabled={loadingStates.summary || loadingStates.arc} className="!w-auto !text-base !py-2 !px-6">
                        {loadingStates.summary ? 'Đang tóm tắt...' : <><Icon name="magic" className="w-5 h-5 mr-2" />Tạo Tóm Tắt</>}
                    </Button>
                </div>
            </Accordion>
            
            <Accordion title="Bước 2: Phân Tích Chi Tiết theo Arc (.txt)" icon={<Icon name="news"/>} borderColorClass='border-fuchsia-500' titleClassName='text-fuchsia-400'>
                <p className="text-slate-400 mb-4 text-sm">Chọn tệp tóm tắt (`tom_tat_...`) từ kho, sau đó quét để lấy danh sách các Arc. Cuối cùng, chọn các Arc bạn muốn AI tóm tắt chi tiết.</p>
                <div className="bg-slate-900/30 p-4 rounded-md border border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-200 mb-3">Giai đoạn 2A: Quét danh sách Arc</h3>
                    <div className="flex flex-col sm:flex-row gap-4 items-center mb-4">
                        <Button onClick={() => setIsSummarySelectModalOpen(true)} variant="secondary" className="!w-full sm:!w-auto !text-sm !py-2">
                            <Icon name="save" className="w-4 h-4 mr-2" /> Chọn Tệp Tóm Tắt (.txt) Từ Kho
                        </Button>
                        {selectedSummary && (
                            <p className="text-sm text-slate-300">Đã chọn: <span className="font-semibold">{selectedSummary.name}</span></p>
                        )}
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={handleExtractArcList} variant="info" disabled={!selectedSummary || loadingStates.arc} className="!w-auto !text-base !py-2 !px-6">
                            {loadingStates.arc && arcProcessingProgress.status === 'extracting_arcs' ? 'Đang phân tích...' : <><Icon name="news" className="w-5 h-5 mr-2" />Phân Tích Danh Sách Arc</>}
                        </Button>
                    </div>
                </div>

                {arcList.length > 0 && (
                <div className="mt-6 bg-slate-900/30 p-4 rounded-md border border-slate-700 animate-fade-in">
                    <h3 className="text-lg font-semibold text-slate-200 mb-3">Giai đoạn 2B: Chọn lọc & Tạo tóm tắt</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2 border-y border-slate-700 py-2 mb-4">
                        {arcList.map((arc, index) => (
                            <label key={index} className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-700/50 cursor-pointer">
                                <input type="checkbox" checked={selectedArcs.has(arc)} onChange={() => handleToggleArcSelection(arc)} className="h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 bg-slate-700"/>
                                <span className="text-slate-300">{arc}</span>
                            </label>
                        ))}
                    </div>
                    
                    <div className="flex gap-4 mb-4">
                        <button onClick={handleSelectAllArcs} className="text-xs text-blue-400 hover:underline">Chọn tất cả</button>
                        <button onClick={() => setSelectedArcs(new Set())} className="text-xs text-blue-400 hover:underline">Bỏ chọn tất cả</button>
                    </div>

                    {arcProcessingProgress.status !== 'idle' && arcProcessingProgress.status !== 'extracting_arcs' && (
                        <div className="mt-4 p-3 bg-slate-900/50 rounded-md text-sm text-slate-300 animate-fade-in">
                            {arcProcessingProgress.status === 'summarizing' && <p className="flex items-center gap-2"><svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Đang tóm tắt Arc {arcProcessingProgress.current}/{arcProcessingProgress.total}: <span className="font-semibold text-purple-300">{arcProcessingProgress.currentArcName}</span>...</p>}
                            {arcProcessingProgress.status === 'done' && <p className="font-semibold text-green-400">Hoàn tất! Đã tạo và lưu {arcProcessingProgress.total} tệp .txt vào kho.</p>}
                        </div>
                    )}

                    <div className="mt-6 flex justify-end">
                        <Button onClick={handleGenerateSelectedArcs} variant="special" disabled={selectedArcs.size === 0 || loadingStates.arc} className="!w-auto !text-base !py-2 !px-6">
                            {loadingStates.arc && arcProcessingProgress.status === 'summarizing' ? 'Đang xử lý...' : <><Icon name="magic" className="w-5 h-5 mr-2" />Bắt Đầu Tóm Tắt ({selectedArcs.size} mục đã chọn)</>}
                        </Button>
                    </div>
                </div>
                )}
            </Accordion>

            <Accordion title="Train Data File TXT (Công cụ xử lý dữ liệu)" icon={<Icon name="settings"/>} borderColorClass='border-yellow-500' titleClassName='text-yellow-400'>
                <p className="text-slate-400 mb-4 text-sm">Công cụ này giúp bạn xử lý một tệp .txt lớn (nguyên tác), cắt nhỏ (chunking), tạo vector và đóng gói thành một tệp Dataset (.json). Tệp .json này được tối ưu hóa để làm 'Kiến thức nền', giúp AI truy xuất thông tin hiệu quả và chính xác hơn.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Settings Panel */}
                    <div className="bg-slate-900/30 p-4 rounded-md border border-slate-700 space-y-4">
                        <h3 className="text-lg font-semibold text-slate-200">Cài đặt</h3>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Số từ mỗi chunk (đoạn):</label>
                            <StyledInput type="number" value={chunkSize} onChange={e => setChunkSize(parseInt(e.target.value, 10) || 0)} min="100"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Số từ chồng lấn (overlap):</label>
                            <StyledInput type="number" value={overlap} onChange={e => setOverlap(parseInt(e.target.value, 10) || 0)} min="0" max={chunkSize > 0 ? chunkSize -1 : 0}/>
                        </div>
                        <div className="bg-slate-800 p-3 rounded-md">
                            <p className="text-sm font-semibold text-slate-300">Ước tính Token:</p>
                            <div className="w-full bg-slate-700 rounded-full h-2.5 my-2">
                                <div className={`h-2.5 rounded-full ${isChunkSettingValid ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, (estimatedTokens / MAX_CHUNK_TOKENS) * 100)}%` }}></div>
                            </div>
                            <div className={`flex items-center gap-2 text-xs font-bold ${isChunkSettingValid ? 'text-green-400' : 'text-red-400'}`}>
                                <Icon name={isChunkSettingValid ? 'checkCircle' : 'xCircle'} className="w-4 h-4" />
                                <span>{estimatedTokens} / {MAX_CHUNK_TOKENS} tokens. {isChunkSettingValid ? 'Cài đặt hợp lệ.' : 'Vượt giới hạn!'}</span>
                            </div>
                        </div>
                    </div>
                    {/* Action Panel */}
                    <div className="bg-slate-900/30 p-4 rounded-md border border-slate-700 flex flex-col justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-200 mb-3">Thao tác</h3>
                            <Button onClick={() => trainFileUploadRef.current?.click()} variant="secondary" className="!w-full !text-sm !py-2 mb-4">
                                <Icon name="upload" className="w-4 h-4 mr-2" /> {sourceTrainFile ? `Đã chọn: ${sourceTrainFile.name}` : 'Nhập file .TXT cần xử lý'}
                            </Button>
                        </div>
                        <Button onClick={performChunking} variant="warning" disabled={!sourceTrainFile || !isChunkSettingValid || loadingStates.training} className="!w-full !text-base !py-2 !px-6 mt-auto">
                            {loadingStates.training ? 'Đang xử lý...' : <><Icon name="magic" className="w-5 h-5 mr-2" />Train Data</>}
                        </Button>
                    </div>
                </div>
                {trainingProgress.total > 0 && (
                    <div className="mt-4">
                        <p className="text-sm text-center text-slate-300">{trainingStatusText || `Đang xử lý...`}</p>
                        <div className="w-full bg-slate-700 rounded-full h-2.5 mt-2">
                            <div className="bg-yellow-400 h-2.5 rounded-full" style={{ width: `${(trainingProgress.current / trainingProgress.total) * 100}%` }}></div>
                        </div>
                    </div>
                )}
            </Accordion>
        </div>

        {(generatedResult || trainedDataset) && (
          <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 my-8 animate-fade-in">
              {generatedResult && (
                  <>
                      <h3 className="text-lg font-semibold text-green-300">Phân tích hoàn tất!</h3>
                      <p className="text-sm text-slate-300 mt-1">AI đã tạo xong tệp <span className="font-mono bg-slate-700 px-1 rounded">{generatedResult.name}</span>.</p>
                      <p className="text-sm text-amber-300 mt-2 flex items-start">
                          <Icon name="info" className="w-4 h-4 inline mr-2 mt-0.5 flex-shrink-0"/>
                          <span>Lưu ý: Tên tệp đã được chuẩn hóa thành <span className="font-mono bg-slate-700 px-1 rounded">tom_tat_...</span>. Vui lòng không đổi tên tệp này để AI có thể nhận diện và ưu tiên xử lý chính xác.</span>
                      </p>
                      <div className="flex gap-4 mt-4">
                          <Button onClick={handleSaveToBrowser} variant="success" className="!w-auto !py-2 !px-4 !text-sm"><Icon name="save" className="w-4 h-4 mr-2"/>Lưu vào kho</Button>
                          <Button onClick={() => handleDownload(generatedResult.name, generatedResult.content, generatedResult.type)} variant="secondary" className="!w-auto !py-2 !px-4 !text-sm"><Icon name="download" className="w-4 h-4 mr-2"/>Tải về máy</Button>
                          <button onClick={() => setGeneratedResult(null)} className="text-slate-400 hover:text-white transition text-sm font-medium px-4 py-2">Đóng</button>
                      </div>
                  </>
              )}
              {trainedDataset && (
                  <>
                      <h3 className="text-lg font-semibold text-green-300">Xử lý hoàn tất!</h3>
                      <p className="text-sm text-slate-300 mt-1">Đã đóng gói tệp nguồn thành <span className="font-bold">{trainedDataset.metadata.totalChunks}</span> chunks trong một Dataset.</p>
                      <p className="text-sm text-amber-300 mt-2 flex items-start">
                          <Icon name="info" className="w-4 h-4 inline mr-2 mt-0.5 flex-shrink-0"/>
                          <span>Lưu Dataset này vào kho để sử dụng làm "Kiến thức nền" trong màn hình "Kiến tạo Thế giới".</span>
                      </p>
                      <div className="flex gap-4 mt-4">
                          <Button onClick={handleSaveDataset} variant="success" disabled={loadingStates.training} className="!w-auto !py-2 !px-4 !text-sm"><Icon name="save" className="w-4 h-4 mr-2"/>Lưu Dataset vào kho</Button>
                           <Button onClick={() => saveJsonToFile(trainedDataset, `[DATASET]_${trainedDataset.metadata.sourceName.replace(/\.txt$/i, '')}.json`)} variant="secondary" className="!w-auto !py-2 !px-4 !text-sm"><Icon name="download" className="w-4 h-4 mr-2"/>Tải Dataset (.json)</Button>
                          <button onClick={() => setTrainedDataset(null)} className="text-slate-400 hover:text-white transition text-sm font-medium px-4 py-2">Hủy</button>
                      </div>
                  </>
              )}
          </div>
        )}

        <div className="bg-slate-800/60 backdrop-blur-sm rounded-lg p-6 border border-slate-700/50 mt-8">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-100">Kho Nguyên Tác Đã Lưu</h2>
                <Button onClick={() => fileUploadRef.current?.click()} variant="secondary" className="!w-auto !py-2 !px-4 !text-sm">
                    <Icon name="upload" className="w-4 h-4 mr-2"/> Tải lên từ máy
                </Button>
            </div>
            {savedFiles.length > 0 ? (
                 <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                    {savedFiles.map((file) => (
                        <div key={file.id} className="bg-slate-900/50 p-3 rounded-lg flex items-center justify-between gap-4">
                           {renamingFileId === file.id ? (
                                <div className="flex-grow flex items-center gap-2">
                                    <StyledInput 
                                        value={newFileName}
                                        onChange={(e) => setNewFileName(e.target.value)}
                                        className="!py-1"
                                    />
                                    <button onClick={handleConfirmRename} className="p-2 text-green-400 hover:bg-green-500/20 rounded-full transition" title="Lưu"><Icon name="checkCircle" className="w-5 h-5"/></button>
                                    <button onClick={() => setRenamingFileId(null)} className="p-2 text-slate-400 hover:bg-slate-500/20 rounded-full transition" title="Hủy"><Icon name="xCircle" className="w-5 h-5"/></button>
                                </div>
                            ) : (
                                <div className="flex-grow min-w-0">
                                    <p className="font-bold text-slate-200 truncate">{file.name}</p>
                                    <p className="text-xs text-slate-400 mt-1">Tạo lúc: {new Date(file.date).toLocaleString('vi-VN')}</p>
                                </div>
                            )}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button onClick={() => handleStartRename(file)} className="p-2 text-yellow-400 hover:bg-yellow-500/20 rounded-full transition" title="Đổi tên">
                                    <Icon name="pencil" className="w-5 h-5"/>
                                </button>
                                <button onClick={() => handleDownload(file.name, file.content, file.name.endsWith('.json') ? 'json' : 'txt')} className="p-2 text-sky-400 hover:bg-sky-500/20 rounded-full transition" title="Tải xuống tệp">
                                    <Icon name="download" className="w-5 h-5"/>
                                </button>
                                <button onClick={() => handleDelete(file.id)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-full transition" title="Xóa tệp">
                                <Icon name="trash" className="w-5 h-5"/>
                                </button>
                            </div>
                        </div>
                    ))}
                 </div>
            ) : (
                <p className="text-slate-500 text-center py-4">Chưa có tệp nào được lưu.</p>
            )}
        </div>
      </div>
       <style>{`.animate-fade-in { animation: fadeIn 0.5s ease-in-out; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </>
  );
};

export default FandomGenesisScreen;
