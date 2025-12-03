
// utils/textProcessing.ts
import { CoreEntityType } from '../types';

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
        'đâm', 'thúc', 'đút', 'nện', 'liếm', 'mút', 'bú', 'sục', 'giao hợp', 'làm tình',
        'giết', 'máu', 'chém', 'hiếp', 'dâm' // Thêm các từ khóa bạo lực và nhạy cảm
    ];
    // Regex này sẽ tìm các từ khóa dưới dạng một từ độc lập (word boundary \b)
    const regex = new RegExp(`\\b(${sensitiveKeywords.join('|')})\\b`, 'gi');
    return text.replace(regex, (match) => `[${match.split('').join('-')}]`);
};

/**
 * Giải mã các từ bị làm mờ (ví dụ: '[t-h-ú-c]') thành văn bản gốc.
 * Hàm này sẽ bỏ qua các thẻ lệnh game (ví dụ: '[ITEM_ADD:...]').
 * @param text - Văn bản đầu vào có thể chứa các từ bị làm mờ.
 * @returns Văn bản đã được giải mã.
 */
export const deobfuscateText = (text: string): string => {
    if (!text) return '';
    // Regex để tìm nội dung trong ngoặc vuông có chứa dấu gạch ngang nhưng không chứa dấu hai chấm.
    // [^:\]]*   : khớp với bất kỳ ký tự nào không phải là ':' và ']' không hoặc nhiều lần.
    // -         : đảm bảo có ít nhất một dấu gạch ngang.
    // [^\]]*    : khớp với bất kỳ ký tự nào không phải là ']' cho đến cuối ngoặc.
    const regex = /\[([^:\]]*-[^\]]*)\]/g;
    
    return text.replace(regex, (match, group1) => {
        // group1 là nội dung bên trong ngoặc.
        // Xóa tất cả các dấu gạch ngang khỏi nội dung.
        return group1.replace(/-/g, '');
    });
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

    // Bước 4: VỆ SINH THẺ LẠ (Whitelist Filter) - QUAN TRỌNG
    // Loại bỏ bất kỳ thẻ nào có dạng <...> hoặc </...> NẾU tên thẻ KHÔNG nằm trong danh sách cho phép.
    // Danh sách cho phép: entity, important, status, exp, thought.
    // Regex: Tìm < hoặc </, theo sau là tên thẻ KHÔNG phải whitelist, rồi đến các thuộc tính và >
    // (?!(?:...)\b): Negative Lookahead - Đảm bảo chuỗi tiếp theo KHÔNG phải là các từ trong nhóm.
    // [a-zA-Z][^>]*: Bắt đầu bằng chữ cái (tên thẻ rác) và các ký tự còn lại cho đến >.
    cleanedText = cleanedText.replace(/<\/?(?!(?:entity|important|status|exp|thought)\b)[a-zA-Z][^>]*>/gi, '');

    // Bước 5: Giải mã các từ bị làm mờ (ví dụ: [t-h-ú-c] -> thúc)
    cleanedText = deobfuscateText(cleanedText);

    return cleanedText.trim();
};

/**
 * Tự động cắt bỏ các phần mô tả phẩm cấp/trạng thái khỏi tên thực thể.
 * Ví dụ: "Thanh Tâm Liên - Tuyệt Phẩm" -> "Thanh Tâm Liên"
 * @param name - Tên thực thể đầu vào.
 * @returns Tên đã được làm sạch.
 */
export const sanitizeEntityName = (name: string): string => {
    if (!name) return '';
    // Cắt bỏ phần sau dấu gạch ngang có khoảng trắng
    return name.split(/\s*-\s*/)[0].trim();
};

/**
 * "Đoán" loại và danh mục chi tiết của một thực thể dựa trên tên của nó bằng regex.
 * @param name - Tên của thực thể.
 * @returns Một đối tượng chứa `type` (CoreEntityType) và `category` (string) đã được đoán.
 */
export function detectEntityTypeAndCategory(name: string): { type: CoreEntityType | null, category: string | null } {
    const lowerName = name.toLowerCase();

    // Cảnh giới
    if (/\b(tầng|kỳ|viên mãn|cảnh)\b/.test(lowerName)) {
        return { type: 'Hệ thống sức mạnh / Lore', category: 'Cảnh giới' };
    }
    // Vũ khí
    if (/\b(kiếm|đao|thương|cung|nỏ|trượng|búa|rìu|chùy|giáo)\b/.test(lowerName)) {
        return { type: 'Vật phẩm', category: 'Vũ khí' };
    }
    // Phòng cụ
    if (/\b(giáp|khiên|mũ|nón|thuẫn)\b/.test(lowerName)) {
        return { type: 'Vật phẩm', category: 'Phòng cụ' };
    }
    // Đan dược
    if (/\b(đan|dược|thuốc|linh dịch|cao)\b/.test(lowerName)) {
        return { type: 'Vật phẩm', category: 'Đan dược' };
    }
    // Thức uống đặc biệt
    if (/\b(tửu|trà)\b/.test(lowerName)) {
        return { type: 'Vật phẩm', category: 'Thức uống' };
    }
     // Nguyên liệu
    if (/\b(thảo|cỏ|đá|ngọc|quả|hạt|tinh|hạch|gỗ|xương|lông)\b/.test(lowerName)) {
        return { type: 'Vật phẩm', category: 'Nguyên liệu' };
    }
    // Thế lực
    if (/\b(bang|phái|môn|giáo|tông|gia|tộc|cung|điện|lâu|các)\b/.test(lowerName) && !/\b(công pháp|tâm pháp)\b/.test(lowerName)) {
        return { type: 'Phe phái/Thế lực', category: 'Thế lực' };
    }
    // Nền Tảng Số (Digital Platform)
    if (/\b(app|web|mạng|diễn đàn|facebook|onlyfans|tiktok|twitter|instagram)\b/.test(lowerName)) {
        return { type: 'Hệ thống sức mạnh / Lore', category: 'Nền Tảng Số' };
    }
    // Địa điểm
     if (/\b(thành|làng|hang|động|sông|núi|rừng|thung lũng|quốc|cốc|viện|phủ|biển|hồ|đảo)\b/.test(lowerName)) {
        return { type: 'Địa điểm', category: 'Địa điểm' };
    }


    return { type: null, category: null };
}
