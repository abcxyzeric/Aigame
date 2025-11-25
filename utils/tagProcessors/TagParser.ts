// utils/tagProcessors/TagParser.ts
import { ParsedTag } from './types';

/**
 * Phân tích một chuỗi key-value mạnh mẽ, có thể xử lý các giá trị không có dấu ngoặc, có dấu ngoặc đơn và dấu ngoặc kép.
 * Được thiết kế để chống lại các lỗi định dạng phổ biến của AI.
 * @param content - Chuỗi nội dung bên trong thẻ, ví dụ: 'name="Kiếm Sắt", quantity=1'
 * @returns Một đối tượng Record<string, any> chứa các cặp key-value.
 */
function parseKeyValue(content: string): Record<string, any> {
    const result: Record<string, any> = {};
    // Regex để tìm các cặp key=value. Value có thể nằm trong dấu ngoặc kép, ngoặc đơn, hoặc không có ngoặc.
    const regex = /(\w+)\s*=\s*("([^"]*)"|'([^']*)'|([^,\]\n]+))/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        const key = match[1];
        // Lấy giá trị từ các nhómจับคู่ khác nhau của regex
        let valueStr: string = (match[3] ?? match[4] ?? match[5] ?? '').trim();
        let value: string | number | boolean = valueStr;

        // Tự động chuyển đổi kiểu dữ liệu
        if (valueStr.match(/^-?\d+(\.\d+)?$/) && valueStr.trim() !== '') {
            value = Number(valueStr); // Chuyển sang số
        } else if (valueStr.toLowerCase() === 'true') {
            value = true; // Chuyển sang boolean true
        } else if (valueStr.toLowerCase() === 'false') {
            value = false; // Chuyển sang boolean false
        }
        result[key] = value;
    }
    return result;
}

/**
 * Tách phản hồi thô của AI thành phần tường thuật và một danh sách các thẻ lệnh đã được phân tích.
 * @param rawText - Toàn bộ văn bản phản hồi từ AI.
 * @returns Một đối tượng chứa `narration` và một mảng `tags`.
 */
export function parseResponse(rawText: string): { narration: string; tags: ParsedTag[] } {
    let narration = '';
    let tagsPart = '';
    const tags: ParsedTag[] = [];

    // Tách phần tường thuật và phần thẻ lệnh dựa trên thẻ [NARRATION_END]
    const separatorRegex = /(\[NARRATION_END\]|NARRATION_END)/i;
    const separatorMatch = rawText.match(separatorRegex);

    if (separatorMatch && typeof separatorMatch.index === 'number') {
        narration = rawText.substring(0, separatorMatch.index).trim();
        tagsPart = rawText.substring(separatorMatch.index + separatorMatch[0].length).trim();
    } else {
        // Xử lý dự phòng nếu AI quên thẻ [NARRATION_END]
        const firstTagMatch = rawText.match(/\n\s*\[\w+:/);
        if (firstTagMatch && typeof firstTagMatch.index === 'number') {
            narration = rawText.substring(0, firstTagMatch.index).trim();
            tagsPart = rawText.substring(firstTagMatch.index).trim();
        } else {
            narration = rawText.trim();
            tagsPart = '';
        }
    }

    // Phân tích các thẻ lệnh từ phần tagsPart
    const tagBlockRegex = /\[(\w+):\s*([\s\S]*?)\]/g;
    let match;
    while ((match = tagBlockRegex.exec(tagsPart)) !== null) {
        const tagName = match[1].toUpperCase();
        const content = match[2].trim();
        try {
            const params = parseKeyValue(content);
            tags.push({ tagName, params });
        } catch (e) {
            console.error(`Không thể phân tích nội dung cho thẻ [${tagName}]:`, content, e);
        }
    }
    
    return { narration, tags };
}
