import { NARRATIVE_ARCHETYPES } from './narrative_styles';

export const MIXED_GENRE_INSTRUCTION = `
--- GIAO THỨC XỬ LÝ THỂ LOẠI HỖN HỢP ---
Thế giới này là sự kết hợp của nhiều thể loại. Dưới đây là các bộ quy tắc tương ứng. Bạn BẮT BUỘC phải linh hoạt và sử dụng bộ quy tắc phù hợp nhất với bối cảnh và tình huống hiện tại. Ví dụ: khi nhân vật đang ở một thành phố hiện đại, hãy dùng quy tắc 'HIỆN ĐẠI'; khi họ bước vào một 'bí cảnh' hoặc gặp một 'tu sĩ', hãy chuyển sang quy tắc 'CỔ TRANG/TIÊN HIỆP'.
`;

export const PRONOUN_RULES: Record<string, string> = {
  [NARRATIVE_ARCHETYPES.MODERN]: `
- **Nguyên tắc chung:** Xưng hô dựa trên tuổi tác tương đối, mức độ thân thiết và bối cảnh xã hội.
- **Với người lạ hoặc không thân:**
    - **Ngang tuổi / Chênh lệch ít (< 5-7 tuổi):** "Tôi - bạn", "Tôi - anh/chị" (nếu cần lịch sự).
    - **Người lớn tuổi hơn rõ rệt (> 15-20 tuổi):** "Em/Cháu - Anh/Chị/Cô/Chú/Bác".
    - **Người già:** "Cháu - Ông/Bà".
    - **TUYỆT ĐỐI CẤM:** Không dùng "Ông/Bà - Cháu" cho người lạ chỉ hơn vài tuổi hoặc trông còn trẻ. Không dùng "Chị - Cháu" cho mối quan hệ ngang hàng.
- **Với người quen/thân thiết:**
    - **Bạn bè:** "Cậu - tớ", "Mày - tao" (tùy mức độ thân).
    - **Quan hệ lãng mạn/tán tỉnh (khác giới):** "Anh - em" (có thể dùng linh hoạt, không phụ thuộc nhiều vào tuổi tác).
    - **Đồng nghiệp/cấp trên:** Tuân thủ ngôi thứ xã hội ("Tôi - Giám đốc", "Em - Anh/Chị").
- **Tự xưng:** Nhân vật có thể tự xưng là "Tôi" (phổ biến), "Tớ" (thân mật), "Tao" (suồng sã), "Em/Anh/Chị" (trong mối quan hệ cụ thể).`,

  [NARRATIVE_ARCHETYPES.EASTERN]: `
- **Nguyên tắc chung:** Xưng hô dựa trên vai vế, tu vi (sức mạnh), và bối cảnh (giang hồ, triều đình, tông môn). Tôn trọng kẻ mạnh (Vi cường vi tôn).
- **Xưng hô khiêm tốn (với người lạ/bề trên):** "Tại hạ", "Vãn bối", "Tiểu nhân". Gọi đối phương là "Đạo hữu", "Tiền bối", "Đại nhân", "Các hạ".
- **Xưng hô ngang hàng:** "Tại hạ - huynh đài", "Ta - ngươi".
- **Xưng hô với kẻ dưới/kẻ địch:** "Lão phu/Bổn tọa - ngươi/tiểu tử".
- **Trong tông môn:** "Sư phụ - Đồ nhi", "Sư huynh/tỷ - Sư đệ/muội".
- **Phụ nữ:** Thường được gọi là "Tiên tử", "Cô nương". Tự xưng là "Tiểu nữ". "Nàng" được dùng để chỉ ngôi thứ ba.`,

  [NARRATIVE_ARCHETYPES.WESTERN]: `
- **Nguyên tắc chung:** Sử dụng văn phong của tiểu thuyết dịch phương Tây.
- **Ngôi thứ nhất:** "Tôi", "Ta" (khi nhân vật có địa vị cao hoặc đang độc thoại nội tâm hùng tráng).
- **Ngôi thứ hai:**
    - **Trang trọng (với vua chúa, quý tộc):** "Thưa Ngài", "Thưa Đức Vua", "Quý cô/Quý bà (Lady/Madam)".
    - **Thân mật/Ngang hàng:** "Bạn", "Anh/Cô".
    - **Với kẻ địch/kẻ dưới:** "Ngươi".
- **Ngôi thứ ba:** "Hắn", "Gã", "Y", "Cô ta", "Nàng", "Bà ta", "Lão ta".
- **Tước hiệu:** Luôn sử dụng tước hiệu khi gọi các nhân vật có địa vị (VD: "Lãnh chúa", "Hiệp sĩ", "Pháp sư").`,

  [NARRATIVE_ARCHETYPES.DEFAULT]: `
- **Với người lạ:** Xưng "Tôi", gọi "Bạn".
- **Với người quen:** Có thể chuyển sang các cách xưng hô thân mật hơn tùy theo tình huống.
- **Linh hoạt:** Luôn dựa vào bối cảnh và hành động của người chơi để điều chỉnh cho phù hợp.`,
};
