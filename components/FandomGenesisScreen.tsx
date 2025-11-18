

import React, { useState, useEffect, useRef } from 'react';
import Button from './common/Button';
import Icon from './common/Icon';
import * as aiService from '../services/aiService';
import { saveTextToFile } from '../services/fileService';
import * as fandomFileService from '../services/fandomFileService';
import { FandomFile } from '../types';
import NotificationModal from './common/NotificationModal';
import FandomFileLoadModal from './FandomFileLoadModal';

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
  const [workName, setWorkName] = useState('');
  const [authorName, setAuthorName] = useState('');
  
  const [loadingStates, setLoadingStates] = useState({ summary: false, arc: false });
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef<number | null>(null);

  const [notification, setNotification] = useState({ isOpen: false, title: '', messages: [''] });
  const [generatedResult, setGeneratedResult] = useState<{ name: string, content: string, type: 'txt' | 'json' } | null>(null);
  const [savedFiles, setSavedFiles] = useState<FandomFile[]>([]);
  const [renamingFileId, setRenamingFileId] = useState<number | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const fileUploadRef = useRef<HTMLInputElement>(null);

  const [isSummarySelectModalOpen, setIsSummarySelectModalOpen] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<FandomFile | null>(null);
  
  const [arcList, setArcList] = useState<string[]>([]);
  const [selectedArcs, setSelectedArcs] = useState<Set<string>>(new Set());

  const [arcProcessingProgress, setArcProcessingProgress] = useState({ current: 0, total: 0, status: 'idle' as 'idle' | 'extracting_arcs' | 'summarizing' | 'done', currentArcName: '' });


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
            
            const jsonContent = await aiService.generateFandomGenesis(selectedSummary.content, arcName, workNameFromSummary, authorName);
            const fileName = `${workNameFromSummary.replace(/[\s/\\?%*:|"<>]/g, '_')}_${arcName.replace(/[\s/\\?%*:|"<>]/g, '_')}.json`;
            await fandomFileService.saveFandomFile(fileName, JSON.stringify(jsonContent, null, 2));
            await refreshSavedFiles();
        }

        setArcProcessingProgress({ current: arcsToProcess.length, total: arcsToProcess.length, status: 'done', currentArcName: '' });
        setNotification({ isOpen: true, title: 'Hoàn tất!', messages: [`AI đã tóm tắt và lưu thành công ${arcsToProcess.length} tệp .json vào kho.`] });
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

  const handleDownload = (name: string, content: string) => {
    saveTextToFile(content, name);
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
      <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8">
        <div className="flex justify-between items-center mb-8 mt-4">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-100">Kiến Tạo từ Nguyên Tác</h1>
             <Button onClick={onBack} variant="secondary" className="!w-auto !py-2 !px-4 !text-base">
                <Icon name="back" className="w-5 h-5 mr-2"/>
                Quay lại
            </Button>
        </div>

        <div className="space-y-8">
            {/* --- Step 1: Summary --- */}
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-lg p-6 border border-slate-700/50">
                <h2 className="text-xl font-bold text-sky-400 mb-2">Bước 1: Tạo Tóm Tắt Tổng Quan (.txt)</h2>
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
            </div>

            {/* --- Step 2: Arc Analysis --- */}
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-lg p-6 border border-slate-700/50">
                <h2 className="text-xl font-bold text-special-400 mb-2">Bước 2: Tóm Tắt Chi Tiết Tự Động Theo Arc (.json)</h2>
                <p className="text-slate-400 mb-4 text-sm">Chọn tệp tóm tắt (`tom_tat_...`) từ kho, sau đó quét để lấy danh sách các Arc. Cuối cùng, chọn các Arc bạn muốn AI tóm tắt chi tiết.</p>
                
                {/* Step 2A: Select summary and Scan */}
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

                {/* Step 2B: Select Arcs and Generate */}
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
                            {arcProcessingProgress.status === 'done' && <p className="font-semibold text-green-400">Hoàn tất! Đã tạo và lưu {arcProcessingProgress.total} tệp .json vào kho.</p>}
                        </div>
                    )}

                    <div className="mt-6 flex justify-end">
                        <Button onClick={handleGenerateSelectedArcs} variant="special" disabled={selectedArcs.size === 0 || loadingStates.arc} className="!w-auto !text-base !py-2 !px-6">
                            {loadingStates.arc && arcProcessingProgress.status === 'summarizing' ? 'Đang xử lý...' : <><Icon name="magic" className="w-5 h-5 mr-2" />Bắt Đầu Tóm Tắt ({selectedArcs.size} mục đã chọn)</>}
                        </Button>
                    </div>
                </div>
                )}
            </div>
        </div>

        {generatedResult && (
          <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 my-8 animate-fade-in">
              <h3 className="text-lg font-semibold text-green-300">Phân tích hoàn tất!</h3>
              <p className="text-sm text-slate-300 mt-1">AI đã tạo xong tệp <span className="font-mono bg-slate-700 px-1 rounded">{generatedResult.name}</span>.</p>
               <p className="text-sm text-amber-300 mt-2 flex items-start">
                <Icon name="info" className="w-4 h-4 inline mr-2 mt-0.5 flex-shrink-0"/>
                <span>Lưu ý: Tên tệp đã được chuẩn hóa thành <span className="font-mono bg-slate-700 px-1 rounded">tom_tat_...</span>. Vui lòng không đổi tên tệp này để AI có thể nhận diện và ưu tiên xử lý chính xác.</span>
              </p>
              <div className="flex gap-4 mt-4">
                  <Button onClick={handleSaveToBrowser} variant="success" className="!w-auto !py-2 !px-4 !text-sm"><Icon name="save" className="w-4 h-4 mr-2"/>Lưu vào trình duyệt</Button>
                  <Button onClick={() => handleDownload(generatedResult.name, generatedResult.content)} variant="secondary" className="!w-auto !py-2 !px-4 !text-sm"><Icon name="download" className="w-4 h-4 mr-2"/>Tải về máy</Button>
                   <button onClick={() => setGeneratedResult(null)} className="text-slate-400 hover:text-white transition text-sm font-medium px-4 py-2">Đóng</button>
              </div>
          </div>
        )}

        <div className="bg-slate-800/60 backdrop-blur-sm rounded-lg p-6 border border-slate-700/50 mt-8">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-100">Kho Nguyên Tác Đã Lưu</h2>
                <Button
                    onClick={() => fileUploadRef.current?.click()}
                    variant="secondary"
                    className="!w-auto !py-2 !px-4 !text-sm"
                >
                    <Icon name="upload" className="w-4 h-4 mr-2"/>
                    Tải lên từ máy
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
                                <button onClick={() => handleDownload(file.name, file.content)} className="p-2 text-sky-400 hover:bg-sky-500/20 rounded-full transition" title="Tải xuống tệp">
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