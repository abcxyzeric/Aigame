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
    
    const fandomGenesisSchema = {
        type: Type.OBJECT,
        properties: {
            arc_name: { type: Type.STRING, description: "Tên chính xác của Arc đang được tóm tắt." },
            plot_and_events_summary: { 
                type: Type.STRING, 
                description: "Một đoạn văn tóm tắt TOÀN DIỆN và CỰC KỲ CHI TIẾT về diễn biến cốt truyện chính và các sự kiện quan trọng xảy ra trong Arc này. Bao gồm cả các sự kiện nhỏ, các chi tiết phụ và các tình tiết có vẻ không quan trọng nhưng góp phần xây dựng thế giới."
            },
            character_summary: {
                type: Type.OBJECT,
                properties: {
                    detailed_characters: {
                        type: Type.ARRAY,
                        description: "Danh sách TOÀN BỘ các nhân vật có vai trò hoặc có lời thoại trong Arc này, kể cả những nhân vật chỉ xuất hiện thoáng qua. Cung cấp mô tả chi tiết cho tất cả họ.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                role_and_summary: { type: Type.STRING, description: "Mô tả chi tiết vai trò, tính cách, và tất cả hành động chính của nhân vật trong Arc này, dù là nhỏ nhất." }
                            },
                            required: ['name', 'role_and_summary']
                        }
                    },
                    mentioned_characters: {
                        type: Type.ARRAY,
                        description: "Danh sách tên của các nhân vật được nhắc đến nhưng không xuất hiện trực tiếp trong Arc. CHỈ liệt kê tên, KHÔNG mô tả.",
                        items: { type: Type.STRING }
                    }
                },
                required: ['detailed_characters', 'mentioned_characters']
            },
            location_and_lore_summary: {
                type: Type.STRING,
                description: "Một đoạn văn tóm tắt chi tiết về tất cả các địa điểm, các khái niệm lore, hoặc các tổ chức được giới thiệu hoặc đóng vai trò quan trọng trong Arc này, bao gồm cả những chi tiết nhỏ nhất."
            },
            style_guide_vector: {
                type: Type.OBJECT,
                description: "Vector Hướng dẫn Văn phong. Phân tích văn phong của tác phẩm gốc để tạo ra các quy tắc này.",
                properties: {
                    pronoun_rules: { type: Type.STRING, description: "Quy tắc xưng hô chính trong tác phẩm. Ví dụ: 'Hiện đại: tôi-cậu, tớ-cậu', 'Cổ trang: tại hạ-công tử, ta-ngươi'." },
                    exclusion_list: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Danh sách các từ khóa hoặc khái niệm TUYỆT ĐỐI KHÔNG được sử dụng vì không phù hợp với thế giới. Ví dụ trong thế giới kiếm hiệp: 'linh khí', 'tu vi', 'hệ thống'." }
                },
                required: ['pronoun_rules', 'exclusion_list']
            }
        },
        required: ['arc_name', 'plot_and_events_summary', 'character_summary', 'location_and_lore_summary', 'style_guide_vector']
    };
    
    const prompt = `Bạn là một chuyên gia phân tích văn học. Dưới đây là TÓM TẮT TỔNG QUAN về tác phẩm "${workName}"${authorInfo}.

--- TÓM TẮT TỔNG QUAN ---
${summaryContent}
--- KẾT THÚC TÓM TẮT ---

Nhiệm vụ của bạn là đọc kỹ bản tóm tắt trên và tạo ra một bản tóm tắt CHI TIẾT SÂU SẮC và TOÀN DIỆN, tập trung DUY NHẤT vào phần truyện (Arc/Saga) có tên là: "${arcName}".

QUY TẮC PHÂN TÍCH (CỰC KỲ QUAN TRỌNG):
1.  **PHẠM VI HẸP:** Chỉ trích xuất, tổng hợp và suy luận thông tin liên quan đến Arc "${arcName}".
2.  **ĐỘ CHI TIẾT TỐI ĐA:** BẮT BUỘC phải tóm tắt đầy đủ tất cả các chi tiết. Không được bỏ sót bất kỳ sự kiện nào, dù là nhỏ nhất. Liệt kê TẤT CẢ các nhân vật xuất hiện, kể cả những nhân vật phụ chỉ có một vài lời thoại hoặc hành động nhỏ.
3.  **TẠO VECTOR VĂN PHONG:** Phân tích kỹ lưỡng văn phong, cách xưng hô và các thuật ngữ đặc trưng của tác phẩm để tạo ra một "Vector Hướng dẫn Văn phong" (style_guide_vector) chi tiết. Đây là phần CỰC KỲ QUAN TRỌNG.
    - **Quy tắc Xưng hô:** Ghi lại cách xưng hô phổ biến (VD: 'ta-ngươi', 'tôi-cậu').
    - **Danh sách Loại trừ:** Liệt kê các thuật ngữ từ các thể loại khác không nên xuất hiện (VD: trong truyện kiếm hiệp thì không có 'linh khí', 'hệ thống').
4.  **CẤU TRÚC JSON BẮT BUỘC:** Trả về MỘT đối tượng JSON duy nhất, tuân thủ nghiêm ngặt schema đã cho, bao gồm cả style_guide_vector.
5.  **KHÔNG TÌM THẤY:** Nếu Arc "${arcName}" không được đề cập trong bản tóm tắt, hãy trả về một đối tượng JSON với trường "arc_name" chứa chuỗi "ARC_NOT_FOUND".
`;
    const systemInstruction = "Bạn là một chuyên gia phân tích văn học.";
    const { aiPerformanceSettings } = getSettings();
    const perfSettings = aiPerformanceSettings || DEFAULT_AI_PERFORMANCE_SETTINGS;
    const creativeCallConfig: Partial<AiPerformanceSettings> = {
        maxOutputTokens: perfSettings.maxOutputTokens + (perfSettings.jsonBuffer || 0),
        thinkingBudget: perfSettings.thinkingBudget + (perfSettings.jsonBuffer || 0)
    };
    
    return { prompt, schema: fandomGenesisSchema, systemInstruction, creativeCallConfig };
};
