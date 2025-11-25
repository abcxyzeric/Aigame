import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

interface TooltipProps {
  text: string;
}

const Tooltip: React.FC<TooltipProps> = ({ text }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null); // Ref cho icon dấu hỏi

  // Hàm tính toán và cập nhật vị trí của tooltip
  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const tooltipWidth = 256; // tương ứng với class w-64

      // Tính toán vị trí để tooltip hiện lên trên icon
      let top = rect.top + window.scrollY - 8; // 8px lề
      let left = rect.left + window.scrollX + rect.width / 2 - tooltipWidth / 2;
      
      // Kiểm tra và điều chỉnh để không bị tràn ra ngoài màn hình
      if (left < 8) left = 8;
      if (left + tooltipWidth > window.innerWidth - 8) {
        left = window.innerWidth - tooltipWidth - 8;
      }
      if (rect.top < 100) { // Nếu icon quá gần đỉnh, hiển thị tooltip bên dưới
          top = rect.bottom + window.scrollY + 8;
          setPosition({ top, left });
          return; // Dừng lại sau khi set vị trí bên dưới
      }


      // Mặc định, vị trí được tính để hiển thị bên trên (transformY -100%)
      setPosition({ top, left });
    }
  };

  const showTooltip = () => {
    updatePosition();
    setIsVisible(true);
  };
  
  const hideTooltip = () => {
    setIsVisible(false);
  };
  
  // Xử lý đóng khi click ra ngoài (cho mobile)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        hideTooltip();
      }
    };
    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible]);

  // Nội dung tooltip sẽ được render vào một "cổng" (portal)
  const TooltipContent = isVisible ? createPortal(
    (
      <div
        // Vị trí được set bằng style, transform để căn chỉnh box lên trên
        style={{ 
            top: `${position.top}px`, 
            left: `${position.left}px`,
            transform: triggerRef.current && triggerRef.current.getBoundingClientRect().top < 100 ? 'translateY(0)' : 'translateY(-100%)',
        }}
        className={`
          absolute w-64 p-3
          bg-slate-900 text-white text-xs rounded-lg shadow-lg 
          border border-slate-700 z-50 transition-opacity duration-200
          ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        role="tooltip"
      >
        {text}
      </div>
    ),
    document.body
  ) : null;

  return (
    <>
      <div 
        ref={triggerRef} 
        className="inline-flex items-center ml-1.5"
        // Tương tác trên desktop
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        // Tương tác trên mobile (click để bật/tắt)
        onClick={(e) => {
          e.stopPropagation();
          isVisible ? hideTooltip() : showTooltip();
        }}
      >
        <button
          type="button"
          className="text-slate-400 hover:text-slate-200 focus:outline-none md:cursor-help"
          aria-label="Thông tin chi tiết"
        >
          <Icon name="info" className="w-4 h-4" />
        </button>
      </div>
      {TooltipContent}
    </>
  );
};

export default Tooltip;
