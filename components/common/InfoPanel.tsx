import React, { useState } from 'react';
import Icon from './Icon';

interface InfoPanelProps {
  title: string;
  iconName: any;
  children: React.ReactNode;
  borderColorClass?: string;
  textColorClass?: string;
  isInitiallyOpen?: boolean;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ title, iconName, children, borderColorClass = 'border-yellow-500', textColorClass = 'text-yellow-400', isInitiallyOpen = true }) => {
  const [isOpen, setIsOpen] = useState(isInitiallyOpen);

  return (
    <div className={`bg-slate-800/60 border-l-4 ${borderColorClass} rounded-r-lg overflow-hidden flex flex-col`}>
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex-shrink-0">
        <div className="flex items-center justify-between w-full p-3 group">
          <div className="flex items-center min-w-0">
            <Icon name={iconName} className="w-5 h-5 mr-2 flex-shrink-0" />
            <h3 className={`text-sm font-bold ${textColorClass} text-left truncate`}>
              {title}
            </h3>
          </div>
          <Icon name={isOpen ? 'arrowUp' : 'arrowDown'} className="w-4 h-4 text-slate-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
        </div>
      </button>
      
      <div 
        className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="px-3 pb-3 overflow-y-auto max-h-36">
          {children}
        </div>
      </div>
    </div>
  );
};

export default InfoPanel;
