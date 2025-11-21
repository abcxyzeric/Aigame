import { Type } from "@google/genai";
import { AiPerformanceSettings } from "../types";
import { getSettings } from "../services/settingsService";
import { DEFAULT_AI_PERFORMANCE_SETTINGS } from "../constants";

export const getGenerateFandomSummaryPrompt = (workName: string, authorName?: string): { prompt: string, systemInstruction: string } => {
    const authorInfo = authorName ? ` (tác giả: ${authorName})` : '';
    const prompt = `Bạn là một chuyên gia phân tích văn học. Nhiệm vụ của bạn là viết một bản tóm tắt CỰC KỲ CHI TIẾT và TOÀN DIỆN về tác phẩm "${workName}"${authorInfo}. 
    Bản tóm tắt phải bao gồm các phần chính, mỗi phần được mô tả kỹ lưỡng:
    1.  **Tổng quan Cốt truyện:** Tóm tắt toàn bộ diễn biến chính từ đầu đến cuối.
    2.  **DANH SÁCH CÁC ARC/SAGA (BẮT BUỘC):** Liệt kê ĐẦY ĐỦ TẤT CẢ các phần truyện (Arc/Saga) chính của tác phẩm theo thứ tự thời gian. Đây là yêu cầu BẮT BUỘC và cực kỳ quan trọng để đảm bảo không bỏ sót bất kỳ phần nào.
    3.  **Giới thiệu Nhân vật:** Mô tả chi tiết về các nhân vật chính, nhân vật phụ quan trọng, và các phe phản diện, bao gồm vai trò, tính cách và mục tiêu của họ.
    4.  **Bối cảnh Thế giới:** Mô tả chi tiết về thế giới, các quốc gia, địa điểm quan trọng và văn hóa.
    5.  **Hệ thống Sức mạnh / Luật lệ:** Giải thích chi tiết về các hệ thống sức mạnh, ma thuật, hoặc các quy tắc đặc biệt của thế giới.
    6.  **Các Chủ đề chính:** Phân tích các chủ đề triết học hoặc xã hội cốt lõi của tác phẩm.

    Hãy trả lời bằng một bài văn bản thuần túy, có cấu trúc rõ ràng. Nếu không tìm thấy thông tin, hãy trả về chuỗi "WORK_NOT_FOUND".`;
    
    const systemInstruction = "Bạn là một chuyên gia phân tích văn học.";
    return { prompt, systemInstruction };
};

export const getExtractArcListFromSummaryPrompt = (summaryContent: string) => {
    const schema = {
        type: Type.OBJECT,
        properties: {
            arcs: { 
                type: Type.ARRAY, 
                description: "Một danh sách các chuỗi (string) chứa tên của tất cả các phần truyện (Arc/Saga) chính có trong bản tóm tắt.",
                items: { type: Type.STRING } 
            }
        },
        required: ['arcs']
    };

    const prompt = `Từ bản tóm tắt tác phẩm sau đây, hãy xác định và trích xuất tên của TẤT CẢ các phần truyện (Arc hoặc Saga) chính. Trả về một đối tượng JSON chỉ chứa một mảng chuỗi có tên là "arcs".

--- BẢN TÓM TẮT ---
${summaryContent}
--- KẾT THÚC BẢN TÓM TẮT ---`;

    return { prompt, schema };
};

export const getGenerateFandomGenesisPrompt = (summaryContent: string, arcName: string, workName: string, authorName?: string) => {
    const authorInfo = authorName ? ` (tác giả: ${authorName})` : '';
    
    const systemInstruction = "Bạn là một chuyên gia phân tích văn học và biên kịch chuyên nghiệp. Nhiệm vụ của bạn là phân tích sâu một phần của tác phẩm và trình bày nó một cách có cấu trúc, chi tiết và logic.";

    const prompt = `Bạn là một biên kịch chuyên nghiệp đang phân tích kịch bản. Dưới đây là TÓM TẮT TỔNG QUAN về tác phẩm "${workName}"${authorInfo}.

--- TÓM TẮT TỔNG QUAN ---
${summaryContent}
--- KẾT THÚC TÓM TẮT ---

Nhiệm vụ của bạn là đọc kỹ bản tóm tắt trên và tạo ra một bản phân tích CHI TIẾT SÂU SẮC và TOÀN DIỆN, tập trung DUY NHẤT vào phần truyện (Arc/Saga) có tên là: "${arcName}".

QUY TẮC PHÂN TÍCH (CỰC KỲ QUAN TRỌNG):
1.  **PHẠM VI HẸP:** Chỉ trích xuất, tổng hợp và suy luận thông tin liên quan đến Arc "${arcName}".
2.  **ĐỘ CHI TIẾT TỐI ĐA:** BẮT BUỘC phải phân tích đầy đủ tất cả các chi tiết. Không được bỏ sót bất kỳ sự kiện nào, dù là nhỏ nhất. Liệt kê TẤT CẢ các nhân vật xuất hiện, kể cả những nhân vật phụ chỉ có một vài lời thoại hoặc hành động nhỏ. Tập trung vào chiều sâu và sự liên kết logic.
3.  **CẤU TRÚC MARKDOWN BẮT BUỘC:** Trả về một bài văn bản thuần túy (plain text) tuân thủ nghiêm ngặt cấu trúc Markdown sau:

# ARC: ${arcName}

## 1. Tóm Tắt Cốt Truyện
(Viết một đoạn văn xuôi chi tiết, đầy đủ diễn biến, các tình tiết chính và phụ trong Arc này.)

## 2. Sự Kiện Quan Trọng
(Liệt kê các sự kiện then chốt dưới dạng gạch đầu dòng)
- [Tên Sự kiện 1]: Mô tả chi tiết về sự kiện và tầm ảnh hưởng của nó.
- [Tên Sự kiện 2]: Mô tả chi tiết về sự kiện và tầm ảnh hưởng của nó.

## 3. Nhân Vật & Chuyển Biến
(Liệt kê các nhân vật quan trọng trong Arc và phân tích sự phát triển của họ)
- **[Tên Nhân Vật 1]**: Phân tích chi tiết vai trò, hành động, thay đổi tâm lý, sức mạnh và mối quan hệ của nhân vật trong suốt Arc.
- **[Tên Nhân Vật 2]**: Phân tích chi tiết vai trò, hành động, thay đổi tâm lý, sức mạnh và mối quan hệ của nhân vật trong suốt Arc.

## 4. Thế Lực & Bối Cảnh Mới
(Mô tả các địa điểm, phe phái, tổ chức mới xuất hiện hoặc đóng vai trò quan trọng trong Arc này.)

## 5. Hệ Thống Sức Mạnh / Vật Phẩm (Nếu có)
(Phân tích các chiêu thức, cấp độ, bảo vật, hoặc công nghệ mới được giới thiệu hoặc sử dụng nhiều trong Arc này.)

4.  **KHÔNG TÌM THẤY:** Nếu Arc "${arcName}" không được đề cập trong bản tóm tắt, hãy trả về một chuỗi duy nhất: "ARC_NOT_FOUND".
`;
    
    const { aiPerformanceSettings } = getSettings();
    const perfSettings = aiPerformanceSettings || DEFAULT_AI_PERFORMANCE_SETTINGS;
    const creativeCallConfig: Partial<AiPerformanceSettings> = {
        maxOutputTokens: perfSettings.maxOutputTokens + (perfSettings.jsonBuffer || 0),
        thinkingBudget: perfSettings.thinkingBudget + (perfSettings.jsonBuffer || 0)
    };
    
    return { prompt, systemInstruction, creativeCallConfig };
};