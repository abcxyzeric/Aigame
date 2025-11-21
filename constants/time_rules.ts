import { NARRATIVE_ARCHETYPES } from './narrative_styles';

export const TIME_RULES: Record<string, string> = {
  [NARRATIVE_ARCHETYPES.MODERN]: `
- **Năm Cơ Sở (Base Year):** Bối cảnh là hiện đại hoặc tương lai. Năm bắt đầu nên từ 2024 trở đi. Ví dụ: 2024 (hiện đại), 2077 (cyberpunk), 2150 (viễn tưởng gần).
- **Logic Thời Gian:** Một ngày có 24 giờ. Thời gian trôi qua phải thực tế.`,

  [NARRATIVE_ARCHETYPES.EASTERN]: `
- **Năm Cơ Sở (Base Year):** Bối cảnh là cổ trang/hư cấu phương Đông. Năm bắt đầu có thể là một năm cụ thể trong lịch sử (ví dụ: năm 1024) hoặc một năm hư cấu theo niên hiệu (ví dụ: Đại Lịch năm thứ 5). Tránh dùng năm theo lịch Gregory (lịch Tây) trừ khi bối cảnh cho phép.
- **Logic Thời Gian:** Có thể sử dụng hệ thống 'canh giờ' (Canh một, canh hai...) để miêu tả ban đêm.`,

  [NARRATIVE_ARCHETYPES.WESTERN]: `
- **Năm Cơ Sở (Base Year):** Bối cảnh là fantasy/trung cổ phương Tây. Năm bắt đầu nên là một năm trong khoảng 800 - 1600, hoặc một năm hư cấu theo kỷ nguyên (ví dụ: Kỷ nguyên Rồng thứ 3, năm 54).
- **Logic Thời Gian:** Một ngày có 24 giờ. Thời gian trôi qua phải thực tế.`,

  [NARRATIVE_ARCHETYPES.DEFAULT]: `
- **Năm Cơ Sở (Base Year):** Hãy chọn một năm bắt đầu thật hợp lý với thể loại và bối cảnh đã được cung cấp.
- **Logic Thời Gian:** Một ngày có 24 giờ. Thời gian trôi qua phải thực tế.`,
};
