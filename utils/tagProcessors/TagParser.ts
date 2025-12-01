

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
 * Sử dụng chiến lược "Trích Xuất" (Extraction) nghiêm ngặt để loại bỏ rác văn bản ngoài thẻ.
 * @param rawText - Toàn bộ văn bản phản hồi từ AI.
 * @returns Một đối tượng chứa `narration`, `tags`, `worldSim`, và `thinking`.
 */
export function parseResponse(rawText: string): { narration: string; tags: ParsedTag[]; worldSim?: string; thinking?: string } {
    let thinking = '';
    let worldSim: string | undefined = undefined;
    let narration = '';
    let tagsPart = '';
    const tags: ParsedTag[] = [];

    // --- PHASE 1: CHIẾN LƯỢC TRÍCH XUẤT (Extraction Strategy - Ưu tiên cao nhất) ---
    // Sử dụng Regex để bắt nội dung nằm TRONG thẻ. Mọi thứ bên ngoài thẻ sẽ tự động bị loại bỏ.
    
    // Regex đã được gia cố để bắt nội dung đa dòng ([\s\S]*?) và không tham lam
    const narrationMatch = rawText.match(/<narration>([\s\S]*?)<\/narration>/i);
    const dataTagsMatch = rawText.match(/<data_tags>([\s\S]*?)<\/data_tags>/i);
    const thinkingMatch = rawText.match(/<thinking>([\s\S]*?)<\/thinking>/i);
    const worldSimMatch = rawText.match(/<world_sim>([\s\S]*?)<\/world_sim>/i);

    if (narrationMatch) {
        // 1. Trích xuất Narration
        narration = narrationMatch[1].trim();

        // 2. Trích xuất Thinking (Log only)
        if (thinkingMatch) {
            thinking = thinkingMatch[1].trim();
        }

        // 3. Trích xuất và Vệ sinh World Sim
        if (worldSimMatch) {
            let content = worldSimMatch[1].trim();
            
            // Xóa các mẫu giải thích của AI (thường bắt đầu bằng "* **")
            // Ví dụ: "* **Điều kiện kích hoạt:**..."
            content = content.replace(/^\s*\*\s*\*\*.*?:.*/gm, '');
            content = content.replace(/^\s*\*\s*Điều kiện kích hoạt.*/gmi, '');
            content = content.replace(/^\s*\*\s*Sự kiện.*/gmi, '');
            
            content = content.trim();

            // Kiểm tra nghiêm ngặt: Nếu là "EMPTY", "NONE", hoặc rỗng thì bỏ qua
            if (content && !/^EMPTY\.?$/i.test(content) && content !== 'NONE') {
                worldSim = content;
            }
        }

        // 4. Trích xuất Data Tags
        if (dataTagsMatch) {
            tagsPart = dataTagsMatch[1].trim();
        }
    } else {
        // --- PHASE 2: CHIẾN LƯỢC DỰ PHÒNG (Fallback Strategy) ---
        // Chỉ chạy khi AI quên viết thẻ <narration> (hiếm gặp nhưng cần xử lý để tránh crash)
        
        // Tách phần tường thuật và phần thẻ lệnh dựa trên thẻ [NARRATION_END]
        const separatorRegex = /(\[NARRATION_END\]|NARRATION_END)/i;
        const separatorMatch = rawText.match(separatorRegex);

        if (separatorMatch && typeof separatorMatch.index === 'number') {
            let tempNarration = rawText.substring(0, separatorMatch.index).trim();
            // Xóa thủ công các thẻ khác nếu chúng tồn tại trong văn bản thô
            tempNarration = tempNarration.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
            tempNarration = tempNarration.replace(/<world_sim>[\s\S]*?<\/world_sim>/gi, '');
            narration = tempNarration.trim();

            tagsPart = rawText.substring(separatorMatch.index + separatorMatch[0].length).trim();
        } else {
            // Dự phòng cuối cùng: Tìm thẻ lệnh đầu tiên để cắt
            const firstTagMatch = rawText.match(/\n\s*\[\w+:/);
            if (firstTagMatch && typeof firstTagMatch.index === 'number') {
                let tempNarration = rawText.substring(0, firstTagMatch.index).trim();
                tempNarration = tempNarration.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
                tempNarration = tempNarration.replace(/<world_sim>[\s\S]*?<\/world_sim>/gi, '');
                narration = tempNarration.trim();

                tagsPart = rawText.substring(firstTagMatch.index).trim();
            } else {
                // Toàn bộ là narration
                let tempNarration = rawText.trim();
                tempNarration = tempNarration.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
                tempNarration = tempNarration.replace(/<world_sim>[\s\S]*?<\/world_sim>/gi, '');
                narration = tempNarration.trim();
                tagsPart = '';
            }
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
    
    return { narration, tags, worldSim, thinking };
}
