const TU_TIEN_SYSTEM = `
8.  **HỆ THỐNG PHÂN LOẠI THỰC THỂ (ENTITY TAGGING SYSTEM) - TU TIÊN (QUAN TRỌNG)**
    BẠN BẮT BUỘC PHẢI tuân thủ hệ thống phân loại (tags) sau đây khi tạo ra bất kỳ thực thể (entity) nào trong cốt truyện.

    a.  **[Cảnh giới]:**
        *   **Định nghĩa:** Các cấp bậc tu luyện, tu vi.
        *   **Cách dùng:** Bọc trong thẻ \`<important>\`.
        *   **Ví dụ:** Nàng đã đột phá <important>Trúc Cơ</important> kỳ. Hắn là một lão quái <important>Nguyên Anh</important>.

    b.  **[Công pháp / Kỹ năng]:**
        *   **Định nghĩa:** Các phương pháp tu luyện, bí kíp võ công, hoặc chiêu thức.
        *   **Cách dùng:** Bọc trong thẻ \`<important>\`.
        *   **Ví dụ:** Hắn vận dụng <important>Hấp Tinh Đại Pháp</important>. Chiêu <important>Vạn Kiếm Quy Tông</important> bay ra.

    c.  **[Vật phẩm / Đan dược / Pháp bảo]:**
        *   **Định nghĩa:** Các vật thể cụ thể. Bao gồm thuốc (đan dược), vũ khí (pháp bảo), nguyên liệu.
        *   **Cách dùng:** Bọc trong thẻ \`<important>\`.
        *   **Ví dụ:** Nàng nuốt một viên <important>Hồi Nguyên Đan</important>. Thanh <important>Phi Kiếm</important> bay vút đi.

    d.  **[Nhân vật]:**
        *   **Định nghĩa:** Bất kỳ sinh vật sống có tên riêng hoặc danh xưng cụ thể (trừ nhân vật chính).
        *   **Cách dùng:** Bọc trong thẻ \`<entity>\`.
        *   **Ví dụ:** <entity>Lão Già bí ẩn</entity> xuất hiện. <entity>Ma Tôn</entity> tái thế.

    e.  **[Thế lực / Tông môn]:**
        *   **Định nghĩa:** Một tổ chức, gia tộc, phe phái, hoặc môn phái.
        *   **Cách dùng:** Bọc trong thẻ \`<entity>\`.
        *   **Ví dụ:** Đệ tử của <entity>Thiên Kiếm Môn</entity>. Hắn gia nhập <entity>Ma Giáo</entity>.

    f.  **[Địa danh]:**
        *   **Định nghĩa:** Tên của một địa điểm, vùng đất, bí cảnh.
        *   **Cách dùng:** Bọc trong thẻ \`<entity>\`.
        *   **Ví dụ:** Rừng rậm <entity>Hắc Ám Sâm Lâm</entity>. Bên trong <entity>Thung lũng Tử Vong</entity>.
`;

const SCI_FI_SYSTEM = `
8.  **HỆ THỐNG PHÂN LOẠI THỰC THỂ (ENTITY TAGGING SYSTEM) - SCI-FI (QUAN TRỌNG)**
    BẠN BẮT BUỘC PHẢI tuân thủ hệ thống phân loại (tags) sau đây khi tạo ra bất kỳ thực thể (entity) nào trong cốt truyện.

    a.  **[Công nghệ / Khái niệm]:**
        *   **Định nghĩa:** Tên các công nghệ, giao thức, khái niệm khoa học viễn tưởng.
        *   **Cách dùng:** Bọc trong thẻ \`<important>\`.
        *   **Ví dụ:** Con tàu kích hoạt <important>động cơ warp</important>. Mạng lưới <important>Neuralink</important> bị nhiễu.

    b.  **[Vật phẩm / Thiết bị]:**
        *   **Định nghĩa:** Các vật thể, vũ khí, công cụ, tàu vũ trụ cụ thể.
        *   **Cách dùng:** Bọc trong thẻ \`<important>\`.
        *   **Ví dụ:** Anh ta rút khẩu <important>súng plasma</important>. Con tàu <important>The Odyssey</important> rời bệ phóng.

    c.  **[Nhân vật / Chủng loài]:**
        *   **Định nghĩa:** Bất kỳ sinh vật sống có tên riêng hoặc tên chủng loài (trừ nhân vật chính).
        *   **Cách dùng:** Bọc trong thẻ \`<entity>\`.
        *   **Ví dụ:** <entity>Thuyền trưởng Eva</entity> ra lệnh. Chủng loài <entity>K'tharr</entity> rất hiếu chiến.

    d.  **[Thế lực / Tổ chức]:**
        *   **Định nghĩa:** Một tập đoàn, liên minh, đế chế, hoặc phe phái.
        *   **Cách dùng:** Bọc trong thẻ \`<entity>\`.
        *   **Ví dụ:** Hạm đội của <entity>Liên Minh Thiên Hà</entity>. Tập đoàn <entity>CyberCorp</entity> kiểm soát tất cả.

    e.  **[Hành tinh / Địa danh]:**
        *   **Định nghĩa:** Tên của một hành tinh, hệ sao, trạm không gian, thành phố.
        *   **Cách dùng:** Bọc trong thẻ \`<entity>\`.
        *   **Ví dụ:** Họ hạ cánh xuống <entity>Xylos-7</entity>. Bên trong <entity>Trạm không gian Omega</entity>.
`;

export const GENRE_TAGGING_SYSTEMS: { [key: string]: { system: string; commonKeywords: string[] } } = {
  'tu_tien': {
    system: TU_TIEN_SYSTEM,
    commonKeywords: ['Ma Đạo', 'Thiên Đạo', 'Chính Đạo', 'Đạo', 'Cảnh giới', 'Tu vi', 'Linh khí'],
  },
  'sci_fi': {
    system: SCI_FI_SYSTEM,
    commonKeywords: ['Công nghệ', 'Không gian', 'Thời gian', 'Robot', 'AI'],
  },
};
