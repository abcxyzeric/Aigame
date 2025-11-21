// utils/datasetUtils.ts
import { FandomDataset } from '../types';

/**
 * Kiểm tra xem nội dung chuỗi có phải là Fandom Dataset JSON hợp lệ hay không.
 * Hàm này thực hiện kiểm tra cấu trúc cơ bản cho các trường metadata và mảng chunks.
 * @param content Nội dung chuỗi của tệp.
 * @returns True nếu là dataset hợp lệ, ngược lại là false.
 */
export const isFandomDataset = (content: string): boolean => {
  try {
    // Trim content to handle potential leading/trailing whitespace
    const trimmedContent = content.trim();
    // A valid JSON object must start with '{'
    if (!trimmedContent.startsWith('{')) {
        return false;
    }
    const data = JSON.parse(trimmedContent) as Partial<FandomDataset>;
    // Kiểm tra sự tồn tại và kiểu dữ liệu cơ bản của các thuộc tính chính
    return (
      typeof data === 'object' &&
      data !== null &&
      typeof data.metadata === 'object' &&
      Array.isArray(data.chunks) &&
      // Tùy chọn, kiểm tra xem chunk đầu tiên có thuộc tính 'text' hay không
      (data.chunks.length === 0 || typeof data.chunks[0]?.text === 'string')
    );
  } catch (error) {
    // Nếu JSON.parse thất bại, nó không phải là JSON hợp lệ, do đó không phải là dataset của chúng ta.
    return false;
  }
};

/**
 * Trích xuất và nối tất cả văn bản từ các chunk của một Fandom Dataset.
 * @param content Nội dung chuỗi của tệp Fandom Dataset JSON.
 * @returns Một chuỗi duy nhất chứa tất cả văn bản đã được nối, hoặc nội dung gốc nếu nó không phải là dataset hợp lệ.
 */
export const extractCleanTextFromDataset = (content: string): string => {
  if (!isFandomDataset(content)) {
    // Nếu không phải là dataset, trả về nội dung gốc, giả định đó là văn bản thuần túy.
    return content;
  }

  try {
    const data = JSON.parse(content) as FandomDataset;
    // Nối văn bản từ mỗi chunk, cách nhau bằng hai dấu xuống dòng để tạo ngắt đoạn.
    return data.chunks.map(chunk => chunk.text).join('\n\n');
  } catch (error) {
    // Điều này lý tưởng sẽ không xảy ra do đã có kiểm tra isFandomDataset, nhưng để dự phòng:
    console.error("Lỗi khi phân tích dataset ngay cả sau khi đã xác thực:", error);
    return content; // Trả về nội dung gốc khi có lỗi
  }
};
