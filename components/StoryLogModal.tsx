import React, { useEffect, useRef } from 'react';
import { GameTurn } from '../types';
import Icon from './common/Icon';

const FormattedNarration: React.FC<{ content: string }> = React.memo(({ content }) => {
    // This regex splits the text by the tags, keeping the tags in the result array.
    const cleanedContent = content.replace(/\s+<\/(entity|important)>/g, '</$1>');
    const parts = cleanedContent.split(/(<exp>.*?<\/exp>|<thought>.*?<\/thought>|<status>.*?<\/status>|<important>.*?<\/important>|<entity>.*?<\/entity>)/gs).filter(Boolean);

    return (
        <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
            {parts.map((part, index) => {
                // More robust regex to handle potential whitespace issues from AI generation
                const tagMatch = part.match(/^<(\w+)\s*?>(.*?)<\/\s*\1\s*>$/s);
                if (tagMatch) {
                    const tagName = tagMatch[1];
                    const innerText = tagMatch[2];

                    switch (tagName) {
                        case 'exp':
                            return <span key={index} className="text-purple-400 italic">"{innerText}"</span>;
                        case 'thought':
                            return <span key={index} className="text-cyan-300 italic">"{innerText}"</span>;
                        case 'status':
                            return <span key={index} className="text-cyan-400 font-semibold">{innerText}</span>;
                        case 'important':
                            return <span key={index} className="text-yellow-400 font-semibold">{innerText}</span>;
                        case 'entity':
                             return <span key={index} className="text-cyan-400 font-semibold">{innerText}</span>;
                        default:
                            return part; // Fallback
                    }
                }
                // This is plain text, clean up any stray closing tags
                const cleanedPart = part.replace(/<\/\s*(exp|thought|status|important|entity)\s*>/g, '');
                return cleanedPart;
            })}
        </p>
    );
});

interface StoryLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: GameTurn[];
  title: string;
  initialScrollTop?: number | null;
}

const StoryLogModal: React.FC<StoryLogModalProps> = ({ isOpen, onClose, history, title, initialScrollTop = null }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (isOpen && scrollRef.current && initialScrollTop !== null) {
        // Use timeout to ensure content is rendered before scrolling
        setTimeout(() => {
            if (scrollRef.current) {
              scrollRef.current.scrollTop = initialScrollTop;
            }
        }, 50);
    }
  }, [isOpen, initialScrollTop]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-6 w-full max-w-4xl relative animate-fade-in-up flex flex-col"
        style={{ height: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-xl font-bold text-green-400 flex items-center">
            <Icon name="news" className="w-6 h-6 mr-3" />
            {title}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
             <Icon name="xCircle" className="w-7 h-7" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-grow overflow-y-auto pr-3 space-y-6">
          {history.map((turn, index) => (
            <div key={index}>
              {turn.type === 'narration' ? (
                <FormattedNarration content={turn.content} />
              ) : (
                <div className="bg-blue-900/20 border-l-4 border-blue-500 rounded-r-lg p-4">
                  <p className="text-blue-300 font-semibold mb-1">Hành động của bạn:</p>
                  <p className="text-slate-200 italic whitespace-pre-wrap leading-relaxed">
                    {turn.content}
                  </p>
                </div>
              )}
            </div>
          ))}
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

export default StoryLogModal;