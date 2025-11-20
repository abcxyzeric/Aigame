import { Type } from "@google/genai";
import { WorldConfig, GameState } from "../types";
import { getGameMasterSystemInstruction, getAdultContentDirectives, getResponseLengthDirective } from './systemInstructions';
import { obfuscateText } from '../utils/aiResponseProcessor';
import { getSettings } from "../services/settingsService";

const getTagInstructions = () => `
--- QUY TẮC ĐỊNH DẠNG DỮ LIỆU (BẮT BUỘC TUÂN THỦ) ---
Sau khi viết xong phần tường thuật, bạn PHẢI xuống dòng và viết chính xác thẻ '[NARRATION_END]'.
Sau thẻ đó, bạn PHẢI liệt kê TOÀN BỘ các thay đổi về dữ liệu game bằng cách sử dụng các thẻ định dạng sau. Mỗi thẻ trên một dòng riêng.
Bên trong mỗi thẻ là một đối tượng JSON hợp lệ (hoặc một chuỗi JSON cho MEMORY/SUMMARY).

[SUGGESTION: {"description": "...", "successRate": 1-100, "risk": "...", "reward": "..."}] (BẮT BUỘC có 4 thẻ này)
[STAT_UPDATE: {"name": "Tên chỉ số", "value": số, "maxValue": số, "isPercentage": boolean, "description": "...", "hasLimit": boolean}] (Sử dụng cho mỗi chỉ số thay đổi)
[ITEM_UPDATE: {"name": "Tên vật phẩm", "description": "...", "quantity": số}] (Ghi đè vật phẩm. quantity > 0: Thêm/cập nhật. quantity <= 0: Xóa)
[STATUS_ADD: {"name": "Tên trạng thái", "description": "...", "type": "buff" | "debuff"}]
[STATUS_REMOVE: {"name": "Tên trạng thái cần xóa"}]
[QUEST_UPDATE: {"name": "Tên nhiệm vụ", "description": "...", "status": "đang tiến hành" | "hoàn thành"}] (Dùng cho cả nhiệm vụ mới và cập nhật)
[COMPANION_ADD: {"name": "Tên đồng hành", "description": "...", "personality": "..."}]
[NPC_UPDATE: {"name": "Tên NPC", "description": "...", "personality": "...", "thoughtsOnPlayer": "..."}] (Dùng cho cả NPC mới và cập nhật)
[FACTION_UPDATE: {"name": "Tên phe phái", "description": "..."}]
[ENTITY_DISCOVER: {"name": "Tên thực thể", "type": "Loại", "description": "..."}] (Dùng cho các lore, địa điểm mới)
[MEMORY_ADD: "Nội dung ký ức cốt lõi mới."] (Dùng khi có sự kiện cực kỳ quan trọng. Nội dung là một chuỗi JSON)
[SUMMARY_ADD: "Nội dung tóm tắt mới."] (Dùng khi đến lượt tóm tắt. Nội dung là một chuỗi JSON)
[TIME_PASS: {"hours": số, "minutes": số}]
[REPUTATION_CHANGE: {"score": số, "reason": "..."}]

--- DÀNH RIÊNG CHO LƯỢT ĐẦU TIÊN (startGame) ---
[WORLD_TIME_SET: {"year": số, "month": số, "day": số, "hour": số}] (Thời gian bắt đầu game)
[REPUTATION_TIERS: ["Cấp 1", "Cấp 2", "Cấp 3", "Cấp 4", "Cấp 5"]] (5 cấp danh vọng từ xấu nhất đến tốt nhất)
`;

export const getStartGamePrompt = (config: WorldConfig) => {
    const systemInstruction = `Bạn là một tiểu thuyết gia AI bậc thầy, một Quản trò (Game Master - GM) cho một game nhập vai text-based. Nhiệm vụ của bạn là viết chương mở đầu thật chi tiết, sống động, dài tối thiểu 1000 từ và tuyệt đối không tóm tắt.
    ${getGameMasterSystemInstruction(config)}`;
    const adultContentDirectives = getAdultContentDirectives(config);
    const lengthDirective = getResponseLengthDirective(config.aiResponseLength);

    const prompt = `Hãy bắt đầu cuộc phiêu lưu!

Đây là toàn bộ thông tin về thế giới và nhân vật chính mà bạn sẽ quản lý:
${JSON.stringify(config, null, 2)}
${adultContentDirectives}

**YÊU CẦU CỦA BẠN:**

1.  **VIẾT TRUYỆN:** Viết một đoạn văn mở đầu thật chi tiết, sâu sắc và lôi cuốn như một tiểu thuyết gia. ${lengthDirective}
    *   Thiết lập không khí, giới thiệu nhân vật trong một tình huống cụ thể, và gợi mở cốt truyện.
    *   Sử dụng các thẻ định dạng (<entity>, <important>, <thought>...) trong lời kể một cách tự nhiên.
2.  **ĐỊNH DẠNG DỮ LIỆU:** Sau khi viết xong, hãy tuân thủ nghiêm ngặt các quy tắc trong ${getTagInstructions()}
    *   BẮT BUỘC tạo 5 cấp bậc danh vọng (\`REPUTATION_TIERS\`) phù hợp với thế giới.
    *   BẮT BUỘC quyết định thời gian bắt đầu logic (\`WORLD_TIME_SET\`).
    *   BẮT BUỘC tạo 4 gợi ý hành động (\`SUGGESTION\`) đa dạng.
    *   Nếu có, hãy thêm các thẻ cập nhật khác (vật phẩm, trạng thái ban đầu, danh vọng...).

**OUTPUT:** Phản hồi của bạn PHẢI là một chuỗi văn bản thô (raw string) duy nhất, bao gồm cả phần tường thuật và phần thẻ dữ liệu.`;
    
    return { prompt, systemInstruction };
};

export const getNextTurnPrompt = (gameState: GameState, fullContext: any, relevantKnowledge: string, relevantMemories: string) => {
    const { worldConfig, history, worldTime, reputation, reputationTiers, character } = gameState;
    const systemInstruction = `Bạn là một tiểu thuyết gia AI bậc thầy, một Quản trò (Game Master - GM). Nhiệm vụ của bạn là viết tiếp câu chuyện một cách chi tiết, sống động, dài tối thiểu 1000 từ và tuyệt đối không tóm tắt, dựa trên hành động mới nhất của người chơi.
    ${getGameMasterSystemInstruction(worldConfig)}`;
    const adultContentDirectives = getAdultContentDirectives(worldConfig);
    const lastPlayerAction = history[history.length - 1];
    
    const recentHistoryForPrompt = history.slice(0, -1).slice(-4).map(turn => `${turn.type === 'action' ? 'Người chơi' : 'AI'}: ${turn.content.replace(/<[^>]*>/g, '')}`).join('\n\n');
    const playerActionContent = (!worldConfig.allowAdultContent || getSettings().safetySettings.enabled)
        ? lastPlayerAction.content
        : obfuscateText(lastPlayerAction.content);

    const lengthDirective = getResponseLengthDirective(worldConfig.aiResponseLength);
    
    const prompt = `--- BỐI CẢNH TOÀN DIỆN ---
*   **Thông tin Cốt lõi:**
    ${JSON.stringify({
        worldConfig: { storyContext: worldConfig.storyContext, difficulty: worldConfig.difficulty, coreRules: worldConfig.coreRules, temporaryRules: worldConfig.temporaryRules, aiResponseLength: worldConfig.aiResponseLength },
        character: { name: character.name, gender: character.gender, bio: character.bio, motivation: character.motivation, personality: character.personality === 'Tuỳ chỉnh' ? character.customPersonality : character.personality, stats: character.stats },
        worldTime: worldTime,
        reputation: { ...reputation, reputationTiers },
    }, null, 2)}
*   **Bách Khoa Toàn Thư (Toàn bộ các thực thể đã gặp):**
    ${Object.keys(fullContext).length > 0 ? JSON.stringify(fullContext, null, 2) : "Chưa gặp thực thể nào."}
*   **Kiến thức Nền liên quan:**
    ${relevantKnowledge || "Không có."}
*   **Ký ức Dài hạn liên quan:**
    ${relevantMemories || "Không có."}
*   **Diễn biến gần đây nhất:**
    ${recentHistoryForPrompt}
--- KẾT THÚC BỐI CẢNH ---

${adultContentDirectives}

--- HÀNH ĐỘNG MỚI CỦA NGƯỜI CHƠI ---
"${playerActionContent}"
--- KẾT THÚC HÀNH ĐỘNG ---

**YÊU CẦU CỦA BẠN:**

1.  **VIẾT TIẾP CÂU CHUYỆN:** Dựa vào **TOÀN BỘ BỐI CẢNH** và hành động của người chơi, hãy viết một đoạn tường thuật **HOÀN TOÀN MỚI**. ${lengthDirective}
    *   Áp dụng "GIAO THỨC MỞ RỘNG HÀNH ĐỘNG" để miêu tả chi tiết.
    *   Sử dụng các thẻ định dạng (<entity>, <important>...) trong lời kể.
2.  **ĐỊNH DẠNG DỮ LIỆU:** Sau khi viết xong, hãy tuân thủ nghiêm ngặt các quy tắc trong ${getTagInstructions()}
    *   BẮT BUỘC tạo 4 gợi ý hành động (\`SUGGESTION\`) đa dạng.
    *   Thêm các thẻ cập nhật khác (STATS_UPDATE, ITEM_UPDATE, TIME_PASS...) nếu có thay đổi trong lượt này.

**OUTPUT:** Phản hồi của bạn PHẢI là một chuỗi văn bản thô (raw string) duy nhất.`;

    return { prompt, systemInstruction };
};

export const getGenerateReputationTiersPrompt = (genre: string) => {
    const schema = {
        type: Type.OBJECT, properties: {
            tiers: { type: Type.ARRAY, description: "Một danh sách gồm ĐÚNG 5 chuỗi (string), là tên các cấp bậc danh vọng.", items: { type: Type.STRING } }
        }, required: ['tiers']
    };

    const prompt = `Dựa trên thể loại game là "${genre}", hãy tạo ra ĐÚNG 5 cấp bậc danh vọng bằng tiếng Việt, sắp xếp theo thứ tự từ tai tiếng nhất đến danh giá nhất.
Các cấp bậc này tương ứng với các mức điểm: -100, -50, 0, +50, +100.

Ví dụ:
- Nếu thể loại là "Tu tiên", có thể là: ["Ma Đầu Huyết Sát", "Kẻ Bị Truy Nã", "Vô Danh Tiểu Tốt", "Đại Thiện Nhân", "Chính Đạo Minh Chủ"]
- Nếu thể loại là "Hiện đại / One Piece", có thể là: ["Tội Phạm Toàn Cầu", "Mối Đe Dọa", "Người Bình Thường", "Người Nổi Tiếng", "Anh Hùng Dân Tộc"]

Hãy sáng tạo các tên gọi thật độc đáo và phù hợp với thể loại "${genre}". Chỉ trả về một đối tượng JSON chứa một mảng chuỗi có tên là "tiers".`;

    return { prompt, schema };
};
