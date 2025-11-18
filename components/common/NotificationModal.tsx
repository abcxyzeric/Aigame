import React from 'react';
import Button from './Button';
import Icon from './Icon';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  messages: string[];
}

const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose, title, messages }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4" onClick={onClose}>
      <div 
        className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-6 w-full max-w-lg relative animate-fade-in-up"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        <div className="flex items-start">
            <div className="flex-shrink-0">
                <Icon name="warning" className="w-8 h-8 text-amber-400" />
            </div>
            <div className="ml-4 flex-grow">
                <h2 className="text-xl font-bold mb-2 text-amber-400">{title}</h2>
                <div className="text-sm text-slate-300 space-y-1">
                {messages.map((msg, index) => (
                    <p key={index}>{msg}</p>
                ))}
                </div>
            </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button
            onClick={onClose}
            variant="warning"
            className="!w-auto !py-2 !px-5 !text-base"
          >
            Đã hiểu
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

export default NotificationModal;