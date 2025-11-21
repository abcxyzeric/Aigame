

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
      version: "1.5.0 (Đại tu Trí tuệ & Logic Cốt lõi)",
      notes: [
        "**Hệ thống Xưng hô Thông minh:** Đại tu hoàn toàn logic xưng hô. AI giờ đây sẽ tuân thủ các quy tắc nghiêm ngặt về tuổi tác, vai vế và bối cảnh (Hiện đại, Cổ trang, Fantasy), khắc phục triệt để lỗi gọi 'Ông/Cháu' cho người trẻ.",
        "**Đại tu Hệ thống Danh vọng:** Danh vọng giờ đây khó kiếm và thực tế hơn. Các hành động nhỏ sẽ không còn được cộng điểm, trong khi tiếng xấu sẽ đồn xa (điểm trừ nặng hơn). Danh tiếng chỉ tăng khi có hành động ảnh hưởng đến cộng đồng hoặc nhân vật quan trọng.",
        "**Hệ thống Thời gian Logic:** AI giờ sẽ tự động quyết định mốc thời gian bắt đầu game (năm, tháng, ngày) một cách hợp lý, phù hợp với từng thể loại (VD: Cyberpunk năm 2077, Cổ trang năm 1024).",
        "**Nâng cấp Trí tuệ 'Chuẩn hóa Bách khoa':** Tính năng 'Chuẩn hóa' giờ đây có khả năng tự động nhận diện và hợp nhất các mục bị trùng lặp (VD: 'Lộ Na' và 'HLV Lộ Na'), đồng thời lọc bỏ các mục rác, giữ cho dữ liệu luôn sạch sẽ.",
        "**Cải tiến Văn phong & Chống lỗi 'Prohibited':** Hệ thống Prompt giờ đây có khả năng nhận diện thể loại (Genre-Aware), tự động điều chỉnh văn phong (từ vựng, cấu trúc câu) cho nội dung 18+ và bạo lực, giúp câu chuyện chân thực hơn và giảm thiểu lỗi bị chặn."
      ]
    },
    {
      version: "1.4.5 (Quản lý Thông Minh)",
      notes: [
        "**Nâng cấp Hệ thống Thời gian:** AI giờ đây sẽ hoạt động như một 'Người giữ thời gian' nghiêm ngặt, tự động tính toán và cập nhật thời gian (phút, giờ, ngày, tháng, năm) một cách logic sau MỖI hành động của người chơi, giúp thế giới vận hành chân thực hơn.",
        "**Đại tu Hệ thống Túi đồ:** Chuyển đổi sang logic Thêm/Bớt vật phẩm, loại bỏ hoàn toàn lỗi mất đồ hoặc sai số lượng. AI giờ đây sẽ sử dụng các lệnh `ITEM_ADD` và `ITEM_REMOVE` để quản lý túi đồ của bạn một cách chính xác tuyệt đối.",
        "**Cải thiện Logic Bách Khoa & Đồng hành:** AI sẽ chỉ tạo mô tả và tính cách cho NPC MỘT LẦN DUY NHẤT, các lần gặp sau chỉ cập nhật 'suy nghĩ về người chơi', giữ cho Bách khoa luôn gọn gàng. Bổ sung logic để đồng hành có thể rời nhóm.",
        "**Giới hạn File Lưu Tự động:** Hệ thống sẽ chỉ lưu tối đa 15 file. Khi vượt quá, file lưu tự động (auto save) cũ nhất sẽ bị xóa để tránh làm đầy bộ nhớ trình duyệt.",
        "**Phân loại File Lưu:** Các bản lưu giờ được đánh dấu rõ ràng là 'Thủ công' hoặc 'Tự động' trong màn hình tải game, giúp bạn dễ dàng quản lý.",
      ]
    },
    {
      version: "1.4.3 (Nâng Cấp Hệ Thống & Sửa Lỗi)",
      notes: [
        "**Cải thiện Xoay Vòng API Key:** Hệ thống giờ đây sẽ tự động chuyển sang API key tiếp theo trong danh sách nếu key hiện tại gặp lỗi (hết hạn mức, lỗi 429), đảm bảo trải nghiệm liền mạch cho người dùng có nhiều key.",
        "**Trợ lý RAG thông minh cho Kiến thức nền:** Tích hợp một AI phụ chạy ngầm để phân tích và chỉ chọn lọc những kiến thức nền liên quan nhất đến tình huống hiện tại trước khi gửi cho AI dẫn truyện. Giúp câu chuyện bám sát nguyên tác hơn mà vẫn tối ưu, không bị quá tải token.",
      ]
    },
    {
      version: "1.4.2 (Tinh Chỉnh & Sửa Lỗi)",
      notes: [
        "**Tinh chỉnh Hệ Thống Chỉ Số:** Cải thiện logic xử lý chỉ số trong màn hình kiến tạo, ngăn chặn việc nhập giá trị hiện tại lớn hơn giá trị tối đa và tự động điều chỉnh khi cần, đảm bảo dữ liệu luôn hợp lệ.",
        "**Cải thiện Hiển thị:** Sửa lỗi hiển thị các thẻ định dạng HTML (như `<important>`) trong modal 'Bộ Nhớ Của AI', đảm bảo Ký Ức Cốt Lõi và Tóm Tắt Diễn Biến luôn là văn bản thuần túy.",
        "**Nâng cao Trải nghiệm Người dùng:** Thêm tooltip mô tả công dụng cho từng chỉ số trong màn hình gameplay, giúp người chơi dễ dàng nắm bắt vai trò của chúng.",
        "**Tối ưu hóa AI:** Cải thiện các chỉ dẫn hệ thống để AI hiểu và áp dụng logic chỉ số (Tài Nguyên vs. Thuộc Tính) một cách nhất quán và thông minh hơn trong quá trình dẫn truyện."
      ]
    },
    {
      version: "1.4.0 (Đại Tu Giao Diện & Hệ Thống Chỉ Số)",
      notes: [
        "**Đại tu Giao diện Gameplay:** Thiết kế lại hoàn toàn giao diện gameplay với bố cục 2 cột trực quan (trên desktop), giúp người chơi dễ dàng theo dõi Bảng điều khiển nhân vật và diễn biến câu chuyện cùng lúc.",
        "**Hệ Thống Chỉ Số Nhân Vật (Stats System):** Tích hợp sâu hệ thống chỉ số (Sinh Lực, Thể Lực, và các chỉ số tùy chỉnh) vào cả màn hình kiến tạo thế giới và gameplay.",
        "**AI Nhận Thức về Chỉ Số:** AI dẫn truyện giờ đây có nhận thức đầy đủ về các chỉ số, tự động tính toán sát thương, sự mệt mỏi và các giới hạn hành động, tạo ra trải nghiệm nhập vai chân thực và có chiều sâu chiến thuật hơn.",
        "**Hỗ Trợ AI Tạo Chỉ Số:** Nâng cấp tính năng 'AI Hỗ Trợ' trong màn hình kiến tạo, cho phép AI tự động đề xuất một bộ chỉ số phù hợp dựa trên thể loại và tiểu sử nhân vật.",
        "**Cài đặt Hiệu suất AI:** Tinh chỉnh và làm rõ các cài đặt hiệu suất AI trong mục Cài đặt, giúp người dùng dễ dàng cân bằng giữa chất lượng và tốc độ phản hồi của AI.",
        "**Sửa lỗi và Cải tiến:** Khắc phục nhiều lỗi nhỏ, tối ưu hóa hiệu suất và cải thiện độ ổn định chung của trình giả lập."
      ]
    },
    {
      version: "1.3.5 (Nâng cấp Trí tuệ & Lưu trữ)",
      notes: [
        "**Nâng cấp Hệ thống Lưu trữ:** Chuyển đổi hoàn toàn sang IndexedDB, cho phép lưu game với dung lượng lớn không giới hạn và khắc phục triệt để lỗi 'Bộ nhớ đầy'. Dữ liệu cũ được tự động chuyển sang hệ thống mới.",
        "**Hiển thị Dung lượng:** Màn hình chính giờ đây sẽ hiển thị dung lượng bộ nhớ đã sử dụng cho các file save game.",
        "**Hệ thống Ký ức Cốt lõi Thông minh:** AI giờ đây sẽ tự động đánh giá và chỉ lưu lại những ký ức thực sự quan trọng, có ảnh hưởng lớn đến cốt truyện, giúp bộ nhớ của AI luôn tập trung vào những gì cốt lõi nhất.",
        "**Cài đặt Hiệu suất AI:** Thêm các tùy chọn nâng cao 'Thinking Budget' và 'Độ dài Bổ sung cho JSON' trong Cài đặt, cho phép người dùng tinh chỉnh hiệu suất và độ phức tạp của AI.",
        "**Cải thiện Giao diện:** Cập nhật hoạt ảnh 'AI đang suy nghĩ' mới, trực quan hơn."
      ]
    },
    {
      version: "1.3.3 (Cập nhật nhỏ)",
      notes: [
        "**Đồng bộ hóa Pop-up tường thuật:** Pop-up 'Toàn bộ diễn biến' giờ đây sẽ mở ra ở đúng vị trí bạn đang đọc trên màn hình chính, giúp theo dõi liền mạch hơn.",
        "**Quản lý Vật phẩm Tự động:** AI giờ đây sẽ tự động cộng/trừ số lượng vật phẩm trong túi đồ của bạn dựa trên diễn biến câu chuyện (sử dụng, nhận được).",
        "**Cải thiện Giao diện Thông tin Nhân vật:** Thêm tính năng đóng/mở để xem chi tiết kỹ năng, giúp giao diện gọn gàng và dễ nhìn hơn.",
      ]
    },
    {
      version: "1.3.0 (Cập nhật lớn)",
      notes: [
        "**Hệ thống Thời Gian & Danh Vọng:** Giới thiệu hệ thống Thời gian và Danh vọng, giúp thế giới trở nên sống động hơn. AI giờ đây sẽ tự quyết định thời điểm bắt đầu câu chuyện (ngày/tháng/năm) dựa trên bối cảnh. Danh vọng của bạn, thay đổi qua từng hành động, sẽ ảnh hưởng trực tiếp đến cách các NPC tương tác.",
        "**Cải thiện Giao diện Mobile:** Giao diện gameplay trên di động được thiết kế lại hoàn toàn. Toàn bộ các bảng thông tin (Trạng thái, Đồng hành, Nhiệm vụ...) được đưa vào một thanh menu bên cạnh có thể cuộn, giúp trải nghiệm gọn gàng và dễ sử dụng hơn.",
        "**Nâng cấp Bách Khoa Toàn Thư:** Bách khoa toàn thư được đại tu với các tab chức năng mới: Phân Tích (thống kê dữ liệu), Quản Lý (nhập/xuất file .json), và Tối ưu hóa bằng AI (tự động dọn dẹp, hợp nhất các mục trùng lặp).",
        "**Sửa Lỗi & Tinh Chỉnh:** Khắc phục lỗi không thể bấm vào các trạng thái để xem chi tiết. Sửa lỗi AI đôi khi lặp lại nội dung của lượt chơi trước, đảm bảo câu chuyện luôn liền mạch. Tinh chỉnh lại giao diện và độ ổn định chung.",
      ]
    },
    {
      version: "1.2.6",
      notes: [
        "**Sửa lỗi Phân Trang:** Khắc phục lỗi khiến việc chuyển trang đôi khi không hiển thị đúng lượt chơi.",
        "**Cải thiện Lùi 1 Lượt:** Tính năng lùi lượt giờ đây hoạt động ổn định và trực quan hơn, giữ lại hành động của người chơi một cách chính xác.",
        "**Fix Lỗi Thẻ Định Dạng:** Loại bỏ triệt để các thẻ định dạng (<entity>,...) xuất hiện không mong muốn trong hội thoại và hành động của người chơi.",
        "**Cải thiện Độ dài AI:** Tinh chỉnh prompt để AI luôn đưa ra các đoạn tường thuật chi tiết, có chiều sâu, khắc phục tình trạng trả lời ngắn.",
      ]
    },
    {
      version: "1.2.5",
      notes: [
        "**Kiến tạo từ Nguyên tác (Cải thiện):** Nâng cấp đáng kể độ chi tiết của các bản tóm tắt, đảm bảo AI nắm bắt đầy đủ các Arc/Saga, sự kiện nhỏ và nhân vật phụ, giúp thế giới đồng nhân trở nên sâu sắc và chính xác hơn.",
        "**Sửa lỗi & Tinh chỉnh Giao diện:** Thêm thanh cuộn cho mục 'Kiến Tạo Thực Thể Ban Đầu' để quản lý danh sách dài dễ dàng hơn. Cải thiện Bách Khoa Toàn Thư với khả năng cập nhật tự động bằng AI và tích hợp thông tin từ kiến thức nền.",
      ]
    },
    {
      version: "1.2.0",
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