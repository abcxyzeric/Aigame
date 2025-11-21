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
    
    const systemInstruction = "Bạn là một nhà biên niên sử AI và chuyên gia phân tích văn học. Nhiệm vụ của bạn là ghi chép lại một cách CỰC KỲ CHI TIẾT và TOÀN DIỆN một phần của tác phẩm, đảm bảo không bỏ sót bất kỳ chi tiết nào.";

    const prompt = `Bạn là một nhà biên niên sử chuyên nghiệp. Dưới đây là TÓM TẮT TỔNG QUAN về tác phẩm "${workName}"${authorInfo}.

--- TÓM TẮT TỔNG QUAN ---
${summaryContent}
--- KẾT THÚC TÓM TẮT ---

**NHIỆM VỤ TỐI CAO:** Dựa vào bản tóm tắt trên, hãy viết một **BIÊN NIÊN SỬ CHI TIẾT**, tập trung DUY NHẤT vào phần truyện (Arc/Saga) có tên là: "${arcName}".

**QUY TẮC BẮT BUỘC (TUYỆT ĐỐI):**

1.  **KHÔNG TÓM TẮT:** TUYỆT ĐỐI CẤM tóm tắt. Mục tiêu của bạn là **MỞ RỘNG** và **LÀM RÕ** mọi chi tiết. Hãy viết càng dài và càng chi tiết càng tốt, khai thác tối đa giới hạn token cho phép.
2.  **LIỆT KÊ TOÀN BỘ:**
    *   **Nhân vật:** BẮT BUỘC liệt kê tên của TẤT CẢ các nhân vật xuất hiện trong Arc này, dù là nhân vật chính, phụ, hay chỉ xuất hiện thoáng qua.
    *   **Hội thoại:** Ghi lại những đoạn hội thoại quan trọng, giữ nguyên giọng điệu và ý nghĩa.
    *   **Chi tiết:** Mô tả chi tiết bối cảnh, các chiêu thức được sử dụng, các vật phẩm được đề cập, và các sự kiện nhỏ nhất.
3.  **CẤU TRÚC MARKDOWN BẮT BUỘC:** Trả về một bài văn bản thuần túy (plain text) tuân thủ nghiêm ngặt cấu trúc Markdown sau:

# BIÊN NIÊN SỬ ARC: ${arcName}

## 1. Diễn Biến Chi Tiết
(Viết một đoạn văn xuôi CỰC KỲ DÀI và chi tiết, kể lại toàn bộ câu chuyện của Arc này như một cuốn biên niên sử. Mô tả từng sự kiện, từng trận đánh, từng cuộc đối thoại một cách tường tận.)

## 2. Dòng Sự Kiện Then Chốt
(Liệt kê các sự kiện chính theo trình tự thời gian dưới dạng gạch đầu dòng)
- **[Tên Sự kiện 1]**: Mô tả chi tiết về sự kiện, các nhân vật tham gia, và kết quả.
- **[Tên Sự kiện 2]**: Mô tả chi tiết...

## 3. Hồ Sơ Nhân Vật Trong Arc
(Liệt kê TẤT CẢ các nhân vật xuất hiện và phân tích vai trò của họ CHỈ TRONG ARC NÀY)
- **[Tên Nhân Vật 1 (Vai trò: Chính/Phụ/Phản diện)]**: Phân tích chi tiết hành động, quyết định, sự phát triển và mối quan hệ của nhân vật trong suốt Arc.
- **[Tên Nhân Vật 2 (Vai trò: ...)]**: Phân tích chi tiết...

## 4. Bối Cảnh & Thế Lực
(Mô tả các địa điểm, phe phái, tổ chức mới xuất hiện hoặc đóng vai trò quan trọng trong Arc này.)

## 5. Dữ liệu (Sức Mạnh, Vật Phẩm, Thuật Ngữ)
(Phân tích chi tiết các chiêu thức, bảo vật, công nghệ, hoặc thuật ngữ mới được giới thiệu trong Arc này.)

4.  **XỬ LÝ ARC DÀI:** Nếu Arc "${arcName}" quá dài và phức tạp để có thể phân tích chi tiết trong một lần trả lời, bạn BẮT BUỘC phải tự động chia nó thành các phần nhỏ hơn (Phần 1, Phần 2...). Trong trường hợp này, hãy chỉ phân tích phần đầu tiên và kết thúc tên tiêu đề chính bằng \`(Phần 1)\`. Ví dụ: \`# BIÊN NIÊN SỬ ARC: ${arcName} (Phần 1)\`.

5.  **KHÔNG TÌM THẤY:** Nếu Arc "${arcName}" không được đề cập trong bản tóm tắt, hãy trả về một chuỗi duy nhất: "ARC_NOT_FOUND".
`;
    
    const { aiPerformanceSettings } = getSettings();
    const perfSettings = aiPerformanceSettings || DEFAULT_AI_PERFORMANCE_SETTINGS;
    const creativeCallConfig: Partial<AiPerformanceSettings> = {
        maxOutputTokens: perfSettings.maxOutputTokens + (perfSettings.jsonBuffer || 0),
        thinkingBudget: perfSettings.thinkingBudget + (perfSettings.jsonBuffer || 0)
    };
    
    return { prompt, systemInstruction, creativeCallConfig };
};
