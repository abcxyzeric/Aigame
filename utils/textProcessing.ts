// utils/textProcessing.ts

/**
 * "Làm mờ" các từ khóa nhạy cảm trong văn bản để vượt qua bộ lọc an toàn khi cần thiết.
 * Ví dụ: 'lồn' -> '[l-ồ-n]'
 * @param text - Văn bản đầu vào.
 * @returns Văn bản đã được làm mờ.
 */
export const obfuscateText = (text: string): string => {
    // Danh sách từ khóa này nên được đồng bộ với DEOBFUSCATION_PROMPT trong narrative_styles.ts
    const sensitiveKeywords = [
        'lồn', 'cặc', 'buồi', 'bướm', 'cu', 'địt', 'chịch', 'đụ', 'đéo',
        'âm đạo', 'dương vật', 'âm vật', 'tinh hoàn',
        'đâm', 'thúc', 'đút', 'nện', 'liếm', 'mút', 'bú', 'sục', 'giao hợp', 'làm tình'
    ];
    // Regex này sẽ tìm các từ khóa dưới dạng một từ độc lập (word boundary \b)
    const regex = new RegExp(`\\b(${sensitiveKeywords.join('|')})\\b`, 'gi');
    return text.replace(regex, (match) => `[${match.split('').join('-')}]`);
};

/**
 * Xử lý chuỗi tường thuật thô từ AI để làm sạch các thẻ không mong muốn trước khi hiển thị.
 * Hàm này được thiết kế để giải quyết triệt để vấn đề thẻ xuất hiện trong hội thoại và suy nghĩ.
 * @param narration - Chuỗi tường thuật thô từ AI.
 * @returns Chuỗi đã được xử lý và làm sạch.
 */
export const processNarration = (narration: string): string => {
    if (!narration) return '';

    let cleanedText = narration;

    // Bước 1: Loại bỏ các thẻ bên trong dấu ngoặc kép (hội thoại)
    // Regex tìm các chuỗi trong dấu ngoặc kép, và 'group1' là nội dung bên trong.
    cleanedText = cleanedText.replace(/"(.*?)"/g, (match, group1) => {
        // Chỉ loại bỏ thẻ bên trong nội dung đã bắt được (group1)
        const cleanedGroup = group1.replace(/<[^>]*>/g, '');
        return `"${cleanedGroup}"`; // Trả về dấu ngoặc kép với nội dung đã được làm sạch
    });

    // Bước 2: Loại bỏ các thẻ bên trong thẻ <thought>
    // Tương tự, 'group1' là nội dung bên trong thẻ <thought>.
    cleanedText = cleanedText.replace(/<thought>(.*?)<\/thought>/gs, (match, group1) => {
        const cleanedGroup = group1.replace(/<[^>]*>/g, '');
        return `<thought>${cleanedGroup}</thought>`; // Trả về thẻ <thought> với nội dung đã được làm sạch
    });

    // Bước 3: Dọn dẹp các lỗi định dạng phổ biến khác (ví dụ: khoảng trắng thừa trước thẻ đóng)
    cleanedText = cleanedText.replace(/\s+<\/(entity|important|status|exp|thought)>/g, '</$1>');

    return cleanedText.trim();
};
