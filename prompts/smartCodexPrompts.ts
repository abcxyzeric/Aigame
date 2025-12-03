
import { Type } from "@google/genai";
import { CORE_ENTITY_TYPES, ENTITY_TYPE_OPTIONS } from "../constants";

export const getSmartCodexPrompt = (command: string) => {
    // Schema đa hình để xử lý nhiều loại thực thể
    const schema = {
        type: Type.OBJECT,
        properties: {
            type: { 
                type: Type.STRING, 
                enum: ['Item', 'Skill', 'Faction', 'NPC'], 
                description: "Loại thực thể được xác định từ yêu cầu." 
            },
            data: {
                type: Type.OBJECT,
                description: "Dữ liệu chi tiết của thực thể.",
                properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING, description: "Mô tả chi tiết, văn học." },
                    // Item fields
                    quantity: { type: Type.NUMBER, description: "Số lượng (nếu là Item)." },
                    details: {
                        type: Type.OBJECT,
                        properties: {
                            rarity: { type: Type.STRING },
                            stats: { type: Type.STRING, description: "Các chỉ số (VD: +10 Sát thương)." },
                            effects: { type: Type.STRING, description: "Hiệu ứng đặc biệt." },
                            subType: { type: Type.STRING, description: "Loại phụ (VD: Kiếm, Áo giáp)." }
                        }
                    },
                    // NPC/Faction fields
                    personality: { type: Type.STRING },
                    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                    customCategory: { type: Type.STRING }
                },
                required: ['name', 'description']
            },
            ownerContext: {
                type: Type.OBJECT,
                properties: {
                    isPlayer: { type: Type.BOOLEAN, description: "True nếu thuộc về người chơi." },
                    npcName: { type: Type.STRING, description: "Tên NPC sở hữu (nếu có)." }
                },
                required: ['isPlayer']
            }
        },
        required: ['type', 'data', 'ownerContext']
    };

    const prompt = `Bạn là Trợ lý Kiến tạo RPG chuyên nghiệp.
Nhiệm vụ: Phân tích yêu cầu người dùng và tạo ra một thực thể game hoàn chỉnh.

--- CÂU LỆNH CỦA NGƯỜI DÙNG ---
"${command}"

--- YÊU CẦU XỬ LÝ ---
1. **Xác định Loại (Type):**
   - 'Item': Vật phẩm, trang bị, vũ khí, thuốc.
   - 'Skill': Kỹ năng, chiêu thức, công pháp.
   - 'Faction': Phe phái, tổ chức, môn phái.
   - 'NPC': Nhân vật phụ, quái vật.

2. **Sáng tạo Dữ liệu (Data):**
   - **Tên & Mô tả:** Phải hay, văn vẻ, phù hợp bối cảnh.
   - **Nếu là Item/Trang phục:** BẮT BUỘC bịa ra các chỉ số (stats) và hiệu ứng (effects) hợp lý trong trường \`details\`.
   - **Nếu là Kỹ năng:** Bịa ra hiệu ứng và mô tả cách thi triển.
   - **Phân loại:** Tự động điền \`customCategory\` (VD: "Vũ Khí", "Trang Phục", "Bí Kíp").

3. **Xác định Sở hữu (OwnerContext):**
   - Nếu câu lệnh có "cho tôi", "của tôi", "tôi muốn": set \`isPlayer = true\`.
   - Nếu câu lệnh có tên NPC (VD: "cho John", "của Lão Hạc"): set \`npcName = "Tên NPC"\`.

4. **Output:** Trả về JSON theo đúng Schema.`;

    return { prompt, schema };
};
