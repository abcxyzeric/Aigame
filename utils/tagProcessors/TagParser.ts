
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
 * Tách phản hồi thô của AI thành các phần: Tư duy, Mô phỏng Thế giới, Tường thuật và Danh sách thẻ lệnh.
 * Hỗ trợ cả định dạng XML mới và định dạng cũ (fallback).
 * @param rawText - Toàn bộ văn bản phản hồi từ AI.
 * @returns Một đối tượng chứa `narration`, `tags`, `worldSim`, và `thinking`.
 */
export function parseResponse(rawText: string): { narration: string; tags: ParsedTag[]; worldSim?: string; thinking?: string } {
    let thinking = '';
    let worldSim = '';
    let narration = '';
    let tagsPart = '';
    const tags: ParsedTag[] = [];

    // --- PHASE 1: Thử phân tích theo cấu trúc XML (Deep Simulation Architecture) ---
    
    // Extract Thinking
    const thinkingMatch = rawText.match(/<thinking>([\s\S]*?)<\/thinking>/i);
    if (thinkingMatch) {
        thinking = thinkingMatch[1].trim();
    }

    // Extract World Sim
    const worldSimMatch = rawText.match(/<world_sim>([\s\S]*?)<\/world_sim>/i);
    if (worldSimMatch) {
        worldSim = worldSimMatch[1].trim();
    }

    // Extract Narration (Primary Method)
    const narrationMatch = rawText.match(/<narration>([\s\S]*?)<\/narration>/i);
    if (narrationMatch) {
        narration = narrationMatch[1].trim();
    }

    // Extract Data Tags (Primary Method)
    const dataTagsMatch = rawText.match(/<data_tags>([\s\S]*?)<\/data_tags>/i);
    if (dataTagsMatch) {
        tagsPart = dataTagsMatch[1].trim();
    }

    // --- PHASE 2: Fallback Logic (Nếu AI không tuân thủ cấu trúc XML hoàn toàn) ---

    // Fallback cho Narration & Tags nếu không dùng thẻ <narration> hoặc <data_tags>
    if (!narration && !tagsPart) {
        // Tách phần tường thuật và phần thẻ lệnh dựa trên thẻ [NARRATION_END]
        const separatorRegex = /(\[NARRATION_END\]|NARRATION_END)/i;
        const separatorMatch = rawText.match(separatorRegex);

        if (separatorMatch && typeof separatorMatch.index === 'number') {
            // Nếu có thẻ phân tách, phần trước đó là narration (sau khi loại bỏ thinking/world_sim nếu có)
            let tempNarration = rawText.substring(0, separatorMatch.index).trim();
            // Loại bỏ các thẻ XML đã extracted để tránh lặp lại
            tempNarration = tempNarration.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
            tempNarration = tempNarration.replace(/<world_sim>[\s\S]*?<\/world_sim>/gi, '');
            narration = tempNarration.trim();

            tagsPart = rawText.substring(separatorMatch.index + separatorMatch[0].length).trim();
        } else {
            // Dự phòng: Tìm thẻ lệnh đầu tiên để cắt
            const firstTagMatch = rawText.match(/\n\s*\[\w+:/);
            if (firstTagMatch && typeof firstTagMatch.index === 'number') {
                let tempNarration = rawText.substring(0, firstTagMatch.index).trim();
                tempNarration = tempNarration.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
                tempNarration = tempNarration.replace(/<world_sim>[\s\S]*?<\/world_sim>/gi, '');
                narration = tempNarration.trim();

                tagsPart = rawText.substring(firstTagMatch.index).trim();
            } else {
                // Nếu không tìm thấy thẻ lệnh nào, toàn bộ là narration
                let tempNarration = rawText.trim();
                tempNarration = tempNarration.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
                tempNarration = tempNarration.replace(/<world_sim>[\s\S]*?<\/world_sim>/gi, '');
                narration = tempNarration.trim();
                tagsPart = '';
            }
        }
    } else if (narration && !tagsPart) {
        // Trường hợp có <narration> nhưng quên <data_tags>, tìm thẻ lệnh sau </narration>
        const afterNarration = rawText.split(/<\/narration>/i)[1] || '';
        tagsPart = afterNarration.trim();
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
    
    return { narration, tags, worldSim, thinking };
}
