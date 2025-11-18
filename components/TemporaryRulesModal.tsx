import React, { useState, useEffect } from 'react';
import { TemporaryRule } from '../types';
import Button from './common/Button';
import Icon from './common/Icon';
import ToggleSwitch from './common/ToggleSwitch';

interface TemporaryRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rules: TemporaryRule[]) => void;
  initialRules: TemporaryRule[];
}

const TemporaryRulesModal: React.FC<TemporaryRulesModalProps> = ({ isOpen, onClose, onSave, initialRules }) => {
  const [rules, setRules] = useState<TemporaryRule[]>(initialRules);

  useEffect(() => {
    // Sync state with props when modal opens or initialRules change
    if (isOpen) {
      setRules(initialRules);
    }
  }, [isOpen, initialRules]);

  const handleCloseAndSave = () => {
    onSave(rules);
    onClose();
  };
  
  const handleRuleTextChange = (index: number, text: string) => {
    const newRules = [...rules];
    newRules[index].text = text;
    setRules(newRules);
  };
  
  const handleToggleRule = (index: number) => {
    const newRules = [...rules];
    newRules[index].enabled = !newRules[index].enabled;
    setRules(newRules);
  };
  
  const handleAddRule = () => {
    setRules([...rules, { text: '', enabled: true }]);
  };
  
  const handleRemoveRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={handleCloseAndSave}>
      <div 
        className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-6 w-full max-w-2xl relative animate-fade-in-up flex flex-col"
        style={{ maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-xl font-bold text-blue-400 flex items-center">
            <Icon name="rules" className="w-6 h-6 mr-3" />
            Luật Tạm Thời & Ghi Chú Tình Huống
          </h2>
          <button onClick={handleCloseAndSave} className="text-slate-400 hover:text-white transition">
             <Icon name="xCircle" className="w-7 h-7" />
          </button>
        </div>
        
        <div className="bg-slate-900/70 border border-blue-900/50 rounded-md p-3 mb-4 text-xs text-slate-400 flex-shrink-0">
            <p className="font-semibold text-slate-300">Lưu ý quan trọng:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Chỉ nên thêm các quy tắc tạm thời hoặc ghi chú tình huống mới phát sinh tại đây (VD: "Trong hang động này, ma thuật lửa bị yếu đi", "Nhân vật đang bị cảm lạnh").</li>
                <li>AI sẽ ghi nhớ và tuân thủ các luật đang <span className="text-green-400">Bật</span>. Các thay đổi sẽ được tự động lưu khi bạn đóng cửa sổ này.</li>
                <li>Các luật lệ cốt lõi của thế giới nên được đặt ở màn hình "Kiến Tạo Thế Giới" để AI hoạt động ổn định nhất.</li>
            </ul>
        </div>

        <div className="flex-grow overflow-y-auto pr-2 space-y-3 min-h-0">
          {rules.map((rule, index) => (
            <div key={index} className="flex items-center gap-3 bg-slate-900/50 p-2 rounded-lg">
                <ToggleSwitch enabled={rule.enabled} setEnabled={() => handleToggleRule(index)} />
                <input 
                    type="text"
                    placeholder={`Luật/ghi chú tạm thời ${index + 1}`}
                    value={rule.text}
                    onChange={(e) => handleRuleTextChange(index, e.target.value)}
                    className={`flex-grow bg-slate-800 border border-slate-600 rounded-md px-3 py-1.5 text-slate-200 transition focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!rule.enabled ? 'text-slate-500 line-through' : ''}`}
                />
                <button onClick={() => handleRemoveRule(index)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-full transition flex-shrink-0">
                    <Icon name="trash" className="w-5 h-5"/>
                </button>
            </div>
          ))}
          {rules.length === 0 && (
            <p className="text-slate-500 text-center py-4">Chưa có luật tạm thời nào.</p>
          )}
        </div>

        <div className="mt-4 flex-shrink-0 flex justify-between items-center">
          <Button onClick={handleAddRule} variant="secondary" className="!w-auto !py-2 !px-4 !text-sm">
            <Icon name="plus" className="w-5 h-5 mr-2" />
            Thêm Luật Mới
          </Button>
           <Button onClick={handleCloseAndSave} variant="primary" className="!w-auto !py-2 !px-5 !text-sm">
            Đóng & Lưu
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

export default TemporaryRulesModal;