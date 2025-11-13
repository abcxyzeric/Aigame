

import React from 'react';
import Icon from './common/Icon';
import Button from './common/Button';

interface UpdateLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UpdateLogModal: React.FC<UpdateLogModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const updates = [
    {
      version: "1.2.0 (Cập nhật hiện tại)",
      notes: [
        "**Kiến tạo từ Nguyên tác (Thử nghiệm):** Thêm một công cụ mạnh mẽ cho phép AI phân tích sâu các tác phẩm bạn yêu thích (truyện, phim, game...), tự động tạo ra các tệp dữ liệu lore chi tiết (.txt, .json) để bạn có thể sáng tạo thế giới đồng nhân một cách chính xác nhất.",
        "**Độ Dài Phản Hồi Ưu Tiên Của AI:** Cho phép bạn tùy chỉnh độ dài tối thiểu của mỗi lượt kể chuyện do AI tạo ra, giúp kiểm soát nhịp độ của cuộc phiêu lưu.",
        "**Kiến thức nền AI (Tùy chọn):** Cung cấp các tệp dữ liệu lore (.txt, .json) cho AI làm 'bộ nhớ tham khảo', giúp nó kiến tạo thế giới và dẫn dắt câu chuyện có chiều sâu, bám sát nguyên tác hơn.",
      ]
    },
    {
      version: "1.1.0",
      notes: [
        "**Bách Khoa Toàn Thư:** Cập nhật tính năng bách khoa toàn thư, giúp lưu trữ mọi dữ liệu về thế giới.",
        "**Hệ Thống Phân Trang:** Cập nhật tính năng trang, giờ đây cứ mỗi 10 lượt sẽ sang 1 trang mới và bạn hoàn toàn có thể quay lại các trang cũ.",
      ]
    },
    {
      version: "1.0.0",
      notes: [
        "**Phát hành chính thức:** Ra mắt trình giả lập Nhập Vai A.I Simulator với các tính năng cốt lõi: Kiến tạo thế giới, tạo nhân vật, hệ thống luật lệ, và AI dẫn truyện.",
      ]
    }
  ];

  const formatNote = (note: string) => {
    // A simple markdown-like bold formatter
    return note.split('**').map((text, index) => 
      index % 2 === 1 ? <strong key={index} className="text-slate-200">{text}</strong> : text
    );
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-6 w-full max-w-2xl relative animate-fade-in-up flex flex-col"
        style={{ maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-xl font-bold text-special-400 flex items-center gap-3">
            <Icon name="news" className="w-6 h-6 text-fuchsia-400" />
            Nhật Ký Cập Nhật Game
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
             <Icon name="xCircle" className="w-7 h-7" />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto pr-2 space-y-6">
          {updates.map((update, index) => (
            <div key={index}>
              <h3 className="text-lg font-semibold text-fuchsia-300 border-b border-fuchsia-500/30 pb-1 mb-2">{update.version}</h3>
              <ul className="list-disc list-inside space-y-2 text-slate-300 text-sm">
                {update.notes.map((note, noteIndex) => (
                  <li key={noteIndex}>{formatNote(note)}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-6 flex-shrink-0">
            <Button onClick={onClose} variant="special" className="!w-auto !py-2 !px-5 !text-base">
                Đóng
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

export default UpdateLogModal;