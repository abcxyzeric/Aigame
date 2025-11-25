// utils/tagProcessors/types.ts
// Định nghĩa cấu trúc cho một thẻ lệnh sau khi đã được phân tích cú pháp.
export interface ParsedTag {
  // Tên của thẻ lệnh, ví dụ: 'ITEM_ADD', 'STAT_CHANGE'.
  tagName: string;
  // Một đối tượng chứa các tham số và giá trị của thẻ lệnh.
  params: Record<string, any>;
}
