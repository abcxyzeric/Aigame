export const REPUTATION_RULES_PROMPT = `
--- HỆ THỐNG LOGIC DANH VỌNG (BẮT BUỘC TUÂN THỦ) ---
Trước khi xuất thẻ [REPUTATION_CHANGED], bạn BẮT BUỘC phải tuân thủ nghiêm ngặt các quy tắc và bảng điểm dưới đây.

**A. QUY TẮC CỐT LÕI (TƯ DUY TRƯỚC KHI TÍNH ĐIỂM):**
1.  **QUY MÔ & SỰ CÔNG NHẬN:** Danh vọng là sự nổi tiếng. Hành động chỉ tác động đến một cá nhân vô danh (VD: giúp bà lão qua đường, cho tiền người ăn xin) TUYỆT ĐỐI KHÔNG được tính điểm danh vọng (score = 0). Hành động phải có tác động đến một cộng đồng (làng, thành phố) hoặc một nhân vật có tầm ảnh hưởng (VIP) mới được tính.
2.  **BẤT ĐỐI XỨNG (TIẾNG XẤU ĐỒN XA):** Làm việc tốt cần nhiều công sức để được ghi nhận (điểm cộng thấp). Làm việc ác bị lan truyền rất nhanh (điểm trừ cao hơn nhiều so với điểm cộng cho hành động tương đương).
3.  **NHÂN CHỨNG & TÍNH BÍ MẬT:** Danh vọng là thứ người khác biết về bạn. Nếu một hành động (dù lớn) được thực hiện một cách hoàn toàn bí mật, không có nhân chứng, hoặc người chơi đang cải trang/ẩn danh, thì điểm danh vọng thay đổi BẮT BUỘC phải bằng 0.

**B. BẢNG ĐIỂM CƠ SỞ (SCORING MATRIX):**
*   **Hành động Cá nhân (tác động 1 NPC thường):**
    *   Giúp đỡ/Cứu mạng: +0.0 (Không tăng danh vọng, chỉ tăng thiện cảm cá nhân).
    *   Giết/Hãm hại: -0.5 đến -1.0.
*   **Hành động Nhóm nhỏ (tác động 3-10 người / một tổ đội):**
    *   Cứu giúp/Bảo vệ: +0.1 đến +0.5.
    *   Tàn sát/Hãm hại: -2.0 đến -5.0.
*   **Hành động Quy mô Làng/Xã/Phường:**
    *   Cứu nguy/Bảo vệ: +1.0 đến +3.0.
    *   Hủy diệt/Phản bội: -10.0 đến -20.0.
*   **Hành động Quy mô Thành phố/Tông môn Lớn:**
    *   Cứu nguy/Bảo vệ: +10.0 đến +25.0.
    *   Hủy diệt/Gây hỗn loạn: -50.0 đến -80.0.
*   **Hành động Quy mô Quốc gia/Thế giới:**
    *   Điểm số thay đổi cực lớn, có thể từ +50 đến +100 hoặc -100.

**C. HỆ SỐ NHÂN VẬT QUAN TRỌNG (VIP MULTIPLIERS):**
Nếu hành động tác động đến một nhân vật quan trọng, hãy lấy điểm từ Bảng Điểm Cơ Sở và nhân với hệ số tương ứng.
*   **NPC Thường (Dân làng, lính gác):** Hệ số x1 (Không thay đổi).
*   **NPC Có chút danh tiếng (Trưởng thôn, Đội trưởng, Chủ tiệm):** Hệ số x2.
*   **NPC Nổi tiếng/Quyền lực (Thành chủ, Chưởng môn, Tướng quân):** Hệ số x5 đến x10.
*   **NPC Huyền thoại/Lãnh tụ (Vua, Hoàng đế, Tông chủ Tối cao):** Hệ số x50.

**VÍ DỤ ÁP DỤNG:**
- Giết 1 lính gác (NPC thường): Điểm cơ sở -1.0 * Hệ số x1 = -1.0 điểm.
- Cứu mạng 1 Chưởng môn (VIP): Điểm cơ sở +0.0 * Hệ số x10 = +0.0 điểm (vì hành động cá nhân không tăng điểm, dù là VIP).
- Cứu cả tông môn của Chưởng môn đó: Điểm cơ sở +15.0 * Hệ số x10 (do Chưởng môn chứng kiến) = +150.0 điểm (sai, hệ số chỉ áp dụng khi tác động trực tiếp lên VIP). -> Đúng: Điểm cơ sở +15.0 (vì cứu cả tông môn).
- Giết 1 Chưởng môn (VIP) giữa thanh thiên bạch nhật: Điểm cơ sở -1.0 * Hệ số x10 = -10.0 điểm.
`;
