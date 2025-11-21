import { Type } from "@google/genai";
import { AiPerformanceSettings, EncyclopediaData, GameState, GameTurn } from "../types";

export const analyticalCallConfig: Partial<AiPerformanceSettings> = { maxOutputTokens: 8192, thinkingBudget: 1000 };

export const getGenerateSummaryPrompt = (turns: GameTurn[]): string => {
    if (turns.length === 0) return "";
    const historyText = turns.map(turn => `${turn.type === 'action' ? 'Người chơi' : 'AI'}: ${turn.content.replace(/<[^>]*>/g, '')}`).join('\n\n');
    return `Bạn là một AI trợ lý ghi chép. Dựa vào đoạn hội thoại và diễn biến sau, hãy viết một đoạn tóm tắt ngắn gọn (3-4 câu) về các sự kiện chính, các nhân vật mới xuất hiện, và các thông tin quan trọng đã được tiết lộ. Tóm tắt này sẽ được dùng làm ký ức dài hạn.\n\n--- LỊCH SỬ CẦN TÓM TẮT ---\n${historyText}`;
};

export const getRetrieveRelevantSummariesPrompt = (context: string, allSummaries: string[], topK: number) => {
    const schema = {
        type: Type.OBJECT, properties: {
            relevant_summaries: { 
                type: Type.ARRAY, 
                description: `Một danh sách chứa ĐÚNG ${topK} (hoặc ít hơn nếu không đủ) chuỗi là bản sao chính xác của các bản tóm tắt liên quan nhất từ 'Kho lưu trữ ký ức'.`,
                items: { type: Type.STRING } 
            }
        }, required: ['relevant_summaries']
    };

    const prompt = `Bạn là một hệ thống truy xuất thông tin thông minh (RAG). Dựa vào 'Tình huống hiện tại', hãy phân tích danh sách 'Kho lưu trữ ký ức' bên dưới và trả về CHÍNH XÁC NỘI DUNG của ${topK} bản tóm tắt liên quan nhất, giúp cung cấp bối cảnh cần thiết cho diễn biến tiếp theo. Nếu không có gì liên quan, trả về một mảng trống.

## Tình huống hiện tại:
${context}

## Kho lưu trữ ký ức:
${allSummaries.map((s, i) => `[Ký ức ${i+1}]: ${s}`).join('\n\n')}
`;
    return { prompt, schema };
};

export const getRetrieveRelevantKnowledgePrompt = (context: string, detailFiles: {name: string, content: string}[], topK: number) => {
    const schema = {
        type: Type.OBJECT, properties: {
            relevant_files: {
                type: Type.ARRAY,
                description: `Một danh sách chứa tên của ${topK} (hoặc ít hơn) tệp kiến thức CHI TIẾT liên quan nhất từ 'Danh sách tệp' dựa trên 'Tình huống hiện tại'.`,
                items: { type: Type.STRING }
            }
        }, required: ['relevant_files']
    };

    const prompt = `Bạn là một hệ thống truy xuất thông tin thông minh (RAG). Dựa vào 'Tình huống hiện tại', hãy phân tích 'Danh sách tệp kiến thức chi tiết' và chọn ra ${topK} tệp có nội dung liên quan nhất để cung cấp bối cảnh cho AI dẫn truyện.

## Tình huống hiện tại:
${context}

## Danh sách tệp kiến thức chi tiết (Chỉ chứa tên tệp):
${detailFiles.map(f => `- ${f.name}`).join('\n')}

Chỉ trả về tên tệp chính xác. Nếu không có gì liên quan, trả về mảng trống.`;

    const smallAnalyticalConfig: Partial<AiPerformanceSettings> = { maxOutputTokens: 2048, thinkingBudget: 200 };

    return { prompt, schema, smallAnalyticalConfig };
};

export const getRelevantContextEntitiesPrompt = (gameState: GameState, playerAction: string) => {
    const { inventory, playerStatus, companions, quests, encounteredNPCs, encounteredFactions, character } = gameState;

    const manifest: { [key: string]: string[] } = {
        availableNPCs: encounteredNPCs.map(e => e.name), availableItems: inventory.map(e => e.name),
        activeQuests: quests.filter(q => q.status !== 'hoàn thành').map(e => e.name), availableFactions: encounteredFactions.map(e => e.name),
        availableCompanions: companions.map(e => e.name), characterSkills: character.skills.map(e => e.name),
        currentPlayerStatus: playerStatus.map(e => e.name),
    };
    for (const key in manifest) { if (Array.isArray(manifest[key]) && manifest[key].length === 0) { delete manifest[key]; } }
    
    if (Object.keys(manifest).length === 0) return null;

    const schema = {
        type: Type.OBJECT, properties: {
            relevantNPCs: { type: Type.ARRAY, items: { type: Type.STRING } }, relevantItems: { type: Type.ARRAY, items: { type: Type.STRING } },
            relevantQuests: { type: Type.ARRAY, items: { type: Type.STRING } }, relevantFactions: { type: Type.ARRAY, items: { type: Type.STRING } },
            relevantCompanions: { type: Type.ARRAY, items: { type: Type.STRING } }, relevantSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
            relevantPlayerStatus: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
    };
    const systemInstruction = `You are a highly efficient Context Analyzer AI. Your sole job is to identify which entities from a provided manifest are relevant to a player's action.`;
    const prompt = `
--- PLAYER ACTION ---
"${playerAction}"

--- AVAILABLE ENTITIES (BY NAME) ---
${JSON.stringify(manifest, null, 2)}

--- TASK ---
Based *only* on the player's action, identify which of the available entities are directly mentioned or clearly implied.
- Be strict. Only include an entity if it's highly relevant.
- Match the names exactly as they appear in the manifest.
- If no entities from a category are relevant, return an empty array for that category.
- Return a JSON object with the names of the relevant entities.
`;
    const smallAnalyticalConfig: Partial<AiPerformanceSettings> = { maxOutputTokens: 2048, thinkingBudget: 200 };
    return { prompt, schema, systemInstruction, smallAnalyticalConfig };
};

export const createUpdatePrompt = (narration: string, context: object, instructions: string) => {
    return `Bạn là một AI quản lý dữ liệu. Nhiệm vụ của bạn là đọc một đoạn tường thuật từ game nhập vai và cập nhật lại dữ liệu của trò chơi một cách chính xác.

--- BỐI CẢNH DỮ LIỆU HIỆN TẠI ---
${JSON.stringify(context, null, 2)}

--- ĐOẠN TƯỜNG THUẬT CẦN PHÂN TÍCH ---
${narration.replace(/<[^>]*>/g, '')}
--- KẾT THÚC TƯỜNG THUẬT ---

**YÊU CẦU BẮT BUỘC:**

1.  **ĐỌC & SO SÁNH:** Đọc kỹ đoạn tường thuật và so sánh với "DỮ LIỆU HIỆN TẠI".
2.  **XÁC ĐỊNH THAY ĐỔI:** ${instructions}
3.  **TRẢ VỀ DANH SÁCH ĐẦY ĐỦ:** Đối với các trường là danh sách, bạn phải trả về **TOÀN BỘ** danh sách mới sau khi đã cập nhật, chứ không chỉ những mục thay đổi.
4.  **KHÔNG THAY ĐỔI:** Nếu một danh mục không có gì thay đổi, hãy để trống (không trả về) trường đó trong JSON.
5.  **CHÍNH XÁC & KHÔNG SUY DIỄN:** Chỉ cập nhật những gì được đề cập hoặc ngụ ý rõ ràng trong đoạn tường thuật.

**OUTPUT:** Trả về MỘT đối tượng JSON duy nhất tuân thủ schema đã cho. Nếu không có bất kỳ thay đổi nào, bạn có thể trả về một đối tượng JSON trống \`{}\`.`;
};

export const getDynamicStateUpdatePrompt = (gameState: GameState, lastNarration: string) => {
    const { inventory, playerStatus, companions, quests, character } = gameState;
    const gameItemSchema = { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, quantity: { type: Type.NUMBER } }, required: ['name', 'description', 'quantity'] };
    const statusEffectSchema = { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, type: { type: Type.STRING, enum: ['buff', 'debuff'] } }, required: ['name', 'description', 'type'] };
    const companionSchema = { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, personality: { type: Type.STRING } }, required: ['name', 'description'] };
    const questSchema = { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, status: { type: Type.STRING, enum: ['đang tiến hành', 'hoàn thành'] } }, required: ['name', 'description', 'status'] };
    const statSchema = { type: Type.OBJECT, properties: { name: { type: Type.STRING }, value: { type: Type.NUMBER }, maxValue: { type: Type.NUMBER }, isPercentage: { type: Type.BOOLEAN }, description: { type: Type.STRING }, hasLimit: { type: Type.BOOLEAN }, }, required: ['name', 'value', 'maxValue', 'isPercentage', 'description', 'hasLimit'] };
    const schema = {
        type: Type.OBJECT, properties: {
            updatedInventory: { type: Type.ARRAY, description: "Toàn bộ danh sách vật phẩm trong túi đồ sau khi đã được cập nhật.", items: gameItemSchema },
            updatedPlayerStatus: { type: Type.ARRAY, description: "Toàn bộ danh sách trạng thái của người chơi sau khi đã được cập nhật.", items: statusEffectSchema },
            updatedCompanions: { type: Type.ARRAY, description: "Danh sách đồng hành đã được cập nhật hoặc mới xuất hiện.", items: companionSchema },
            updatedQuests: { type: Type.ARRAY, description: "Danh sách nhiệm vụ đã được cập nhật hoặc mới xuất hiện.", items: questSchema },
            updatedStats: { type: Type.ARRAY, description: "Toàn bộ danh sách chỉ số nhân vật đã được cập nhật sau hành động.", items: statSchema },
        },
    };
    const instructions = `Tìm ra tất cả những thay đổi liên quan đến trạng thái động của game:
- **Vật phẩm (\`updatedInventory\`):** Có vật phẩm nào được thêm, bớt, hay thay đổi số lượng không?
- **Trạng thái (\`updatedPlayerStatus\`):** Có trạng thái nào được thêm mới hoặc gỡ bỏ không?
- **Đồng hành (\`updatedCompanions\`):** Có đồng hành mới, hoặc thông tin về đồng hành cũ có thay đổi không?
- **Nhiệm vụ (\`updatedQuests\`):** Có nhiệm vụ mới, hoặc trạng thái nhiệm vụ cũ có thay đổi không?
- **Chỉ số (\`updatedStats\`):** Có thay đổi nào về chỉ số của nhân vật (Sinh lực, Thể lực...) không? Nếu có, trả về TOÀN BỘ danh sách chỉ số đã cập nhật.`;
    const prompt = createUpdatePrompt(lastNarration, { inventory, playerStatus, companions, quests, stats: character.stats }, instructions);
    return { prompt, schema };
};

export const getEncyclopediaUpdatePrompt = (gameState: GameState, lastNarration: string) => {
    const { encounteredNPCs, encounteredFactions, discoveredEntities } = gameState;
    const npcSchema = { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, personality: { type: Type.STRING }, thoughtsOnPlayer: { type: Type.STRING } }, required: ['name', 'description'] };
    const factionSchema = { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING } }, required: ['name', 'description'] };
    const entitySchema = { type: Type.OBJECT, properties: { name: { type: Type.STRING }, type: { type: Type.STRING }, personality: { type: Type.STRING }, description: { type: Type.STRING } }, required: ['name', 'type', 'description'] };
    const schema = {
        type: Type.OBJECT, properties: {
            updatedEncounteredNPCs: { type: Type.ARRAY, description: "Danh sách NPC đã được cập nhật hoặc mới xuất hiện.", items: npcSchema },
            updatedEncounteredFactions: { type: Type.ARRAY, description: "Danh sách phe phái đã được cập nhật hoặc mới xuất hiện.", items: factionSchema },
            updatedDiscoveredEntities: { type: Type.ARRAY, description: "Danh sách thực thể khác (địa điểm, lore...) đã được cập nhật hoặc mới xuất hiện.", items: entitySchema },
        },
    };
    const instructions = `Tìm ra tất cả những thay đổi liên quan đến các thực thể trong Bách khoa toàn thư:
- **NPC (\`updatedEncounteredNPCs\`):** Có NPC mới nào xuất hiện không? Hoặc thông tin về NPC cũ (mô tả, tính cách, suy nghĩ về người chơi) có được cập nhật không?
- **Phe phái (\`updatedEncounteredFactions\`):** Có phe phái, tổ chức mới nào xuất hiện hoặc được mô tả chi tiết hơn không?
- **Thực thể khác (\`updatedDiscoveredEntities\`):** Có địa điểm, khái niệm lore, hoặc các thực thể khác được giới thiệu hoặc mô tả thêm không?`;
    const prompt = createUpdatePrompt(lastNarration, { encounteredNPCs, encounteredFactions, discoveredEntities }, instructions);
    return { prompt, schema };
};

export const getCharacterStateUpdatePrompt = (gameState: GameState, lastNarration: string) => {
    const { character, worldTime, reputation } = gameState;
    const skillSchema = { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING } }, required: ['name', 'description'] };
    const timePassedSchema = { type: Type.OBJECT, description: "Thời gian đã trôi qua sau hành động, tính bằng giờ hoặc phút.", properties: { hours: { type: Type.NUMBER }, minutes: { type: Type.NUMBER } } };
    const reputationChangeSchema = { type: Type.OBJECT, description: "Sự thay đổi về điểm danh vọng của người chơi sau hành động (nếu có).", properties: { score: { type: Type.NUMBER, description: "Số điểm thay đổi (có thể là số dương hoặc âm)." }, reason: { type: Type.STRING, description: "Lý do ngắn gọn cho sự thay đổi danh vọng." } } };
    const schema = {
        type: Type.OBJECT, properties: {
            updatedCharacter: { type: Type.OBJECT, description: "Cập nhật nếu có sự thay đổi LÂU DÀI về tiểu sử hoặc động lực của nhân vật.", properties: { bio: { type: Type.STRING }, motivation: { type: Type.STRING } } },
            updatedSkills: { type: Type.ARRAY, description: "Danh sách kỹ năng đã được cập nhật hoặc mới học được.", items: skillSchema },
            newMemories: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Chỉ thêm ký ức nếu có sự kiện CỰC KỲ quan trọng, thay đổi cốt truyện xảy ra." },
            timePassed: timePassedSchema, reputationChange: reputationChangeSchema,
        },
    };
    const instructions = `Tìm ra tất cả những thay đổi liên quan đến sự phát triển của nhân vật chính và diễn biến thế giới:
- **Nhân vật (\`updatedCharacter\`):** Có sự thay đổi LÂU DÀI, quan trọng nào về tiểu sử hoặc động lực của nhân vật không?
- **Kỹ năng (\`updatedSkills\`):** Nhân vật có học được kỹ năng mới, hoặc kỹ năng cũ có được nâng cấp/thay đổi không?
- **Ký ức (\`newMemories\`):** Có sự kiện nào CỰC KỲ quan trọng (plot twist, thay đổi cuộc đời...) xảy ra đáng để ghi lại làm ký ức cốt lõi không?
- **Thời gian (\`timePassed\`):** Ước tính thời gian (giờ, phút) đã trôi qua trong đoạn tường thuật.
- **Danh vọng (\`reputationChange\`):** Hành động trong tường thuật có ảnh hưởng đến danh vọng không? Nếu có, tính toán điểm thay đổi và lý do.`;
    const prompt = createUpdatePrompt(lastNarration, { character: { bio: character.bio, motivation: character.motivation, skills: character.skills }, worldTime, reputation }, instructions);
    return { prompt, schema };
};

export const getOptimizeEncyclopediaPrompt = (dataToOptimize: EncyclopediaData) => {
    const npcSchema = { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, personality: { type: Type.STRING }, thoughtsOnPlayer: { type: Type.STRING }, tags: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ['name', 'description', 'personality', 'thoughtsOnPlayer'] };
    const factionSchema = { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, tags: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ['name', 'description'] };
    const entitySchema = { type: Type.OBJECT, properties: { name: { type: Type.STRING }, type: { type: Type.STRING }, personality: { type: Type.STRING }, description: { type: Type.STRING }, tags: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ['name', 'type', 'description'] };
    const itemSchema = { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, quantity: { type: Type.NUMBER }, tags: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ['name', 'description', 'quantity'] };
    const companionSchema = { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, personality: { type: Type.STRING }, tags: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ['name', 'description'] };
    const questSchema = { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, status: { type: Type.STRING, enum: ['đang tiến hành', 'hoàn thành'] }, tags: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ['name', 'description', 'status'] };
    const skillSchema = { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING } }, required: ['name', 'description'] };
    const schema = {
        type: Type.OBJECT, properties: {
            optimizedNPCs: { type: Type.ARRAY, description: "Danh sách NPC đã được tối ưu hóa.", items: npcSchema },
            optimizedFactions: { type: Type.ARRAY, description: "Danh sách phe phái đã được tối ưu hóa.", items: factionSchema },
            optimizedDiscoveredEntities: { type: Type.ARRAY, description: "Danh sách các thực thể khác đã được tối ưu hóa.", items: entitySchema },
            optimizedInventory: { type: Type.ARRAY, description: "Danh sách vật phẩm đã được tối ưu hóa.", items: itemSchema },
            optimizedCompanions: { type: Type.ARRAY, description: "Danh sách đồng hành đã được tối ưu hóa.", items: companionSchema },
            optimizedQuests: { type: Type.ARRAY, description: "Danh sách nhiệm vụ đã được tối ưu hóa.", items: questSchema },
            optimizedSkills: { type: Type.ARRAY, description: "Danh sách kỹ năng đã được tối ưu hóa.", items: skillSchema },
        }, required: ['optimizedNPCs', 'optimizedFactions', 'optimizedDiscoveredEntities', 'optimizedInventory', 'optimizedCompanions', 'optimizedQuests', 'optimizedSkills']
    };
    const prompt = `Bạn là một Biên tập viên Dữ liệu AI chuyên nghiệp, có khả năng suy luận và phân tích sâu. Nhiệm vụ của bạn là "dọn dẹp", "hợp nhất" và "chuẩn hóa" toàn bộ dữ liệu Bách Khoa Toàn Thư của một game nhập vai để đảm bảo tính chính xác và nhất quán.

Dữ liệu đầu vào (có thể chứa lỗi, trùng lặp và rác):
${JSON.stringify(dataToOptimize, null, 2)}

--- QUY TRÌNH XỬ LÝ BẮT BUỘC ---

**GIAI ĐOẠN 1: HỢP NHẤT VÀ LÀM SẠCH (MERGE & CLEANUP PHASE)**

1.  **Quét trùng lặp mờ (Fuzzy Deduplication - CỰC KỲ QUAN TRỌNG):**
    *   **Mục tiêu:** Tìm và hợp nhất các mục đang nói về CÙNG MỘT thực thể nhưng có tên khác nhau.
    *   **Quy trình:** Quét qua TẤT CẢ các mục trong mỗi danh sách (NPCs, Factions, v.v.).
    *   **Điều kiện hợp nhất:**
        a.  Tên của mục A là một phần của tên mục B (hoặc ngược lại). Ví dụ: "Lộ Na" và "Huấn luyện viên Lộ Na", "Đức" và "HLV Đức", "Thanh kiếm" và "Thanh kiếm Cổ".
        b.  **VÀ** mô tả, vai trò, hoặc bối cảnh của chúng cho thấy rõ ràng chúng là cùng một thực thể.
    *   **Hành động:** Nếu cả hai điều kiện trên đều đúng, bạn BẮT BUỘC phải hợp nhất chúng thành MỘT mục duy nhất.
    *   **Luật hợp nhất:**
        *   **Giữ lại tên đầy đủ nhất:** Luôn giữ lại cái tên có nhiều thông tin hơn (VD: giữ "Huấn luyện viên Lộ Na", bỏ "Lộ Na").
        *   **Tổng hợp thông tin:** Kết hợp mô tả, tính cách, và các thông tin khác từ tất cả các mục bị trùng lặp để tạo ra một mô tả đầy đủ và chi tiết nhất cho mục đã hợp nhất.

2.  **Lọc rác (Sanitization):**
    *   **Mục tiêu:** Loại bỏ các mục không hợp lệ.
    *   **Quy trình:** Sau khi đã hợp nhất, hãy rà soát lại toàn bộ danh sách một lần nữa.
    *   **Điều kiện xóa:** Nếu bạn phát hiện bất kỳ mục nào rõ ràng KHÔNG phải là một thực thể trong game (ví dụ: tên là một động từ như 'Chạy trốn', một cảm xúc như 'Buồn bã', một bộ phận cơ thể như 'Cánh tay', hoặc một danh từ chung không có định danh cụ thể như 'Cái cây', 'Viên đá').
    *   **Hành động:** BẠN BẮT BUỘC phải **XÓA BỎ HOÀN TOÀN** mục đó khỏi danh sách kết quả cuối cùng.

**GIAI ĐOẠN 2: CHUẨN HÓA VÀ LÀM GIÀU (STANDARDIZE & ENRICH PHASE)**

Sau khi đã làm sạch, hãy xử lý các mục còn lại:
1.  **Chuẩn hóa tên:** Viết hoa chữ cái đầu của tất cả các tên một cách nhất quán.
2.  **Làm giàu mô tả:** Dựa vào thông tin tổng thể, hãy viết lại các mô tả một cách súc tích hơn nhưng vẫn giữ đầy đủ ý, hoặc bổ sung thêm chi tiết nếu cần để làm rõ vai trò của thực thể.
3.  **Phân loại Tags:** Xem xét lại và chuẩn hóa các 'tags' cho mỗi mục. Xóa các tags không liên quan và thêm các tags phù hợp nếu thiếu.
4.  **Giữ nguyên số lượng:** Nếu một vật phẩm trong \`inventory\` có số lượng (quantity), hãy giữ nguyên số lượng đó.

--- KẾT QUẢ ĐẦU RA ---
Trả về một đối tượng JSON duy nhất chứa toàn bộ dữ liệu đã được tối ưu hóa, tuân thủ nghiêm ngặt schema đã cho. Danh sách cuối cùng phải sạch, gọn, không trùng lặp và không chứa rác.`;
    return { prompt, schema };
};

export const getDistillKnowledgePrompt = (storyIdea: string, chunk: string, isFinalReduce: boolean = false) => {
    const task = isFinalReduce
        ? `Dưới đây là tập hợp các bản tóm tắt từ nhiều phần của một tài liệu lớn. Hãy tổng hợp chúng thành MỘT bản tóm tắt cốt lõi, mạch lạc và súc tích. Bản tóm tắt cuối cùng này phải nắm bắt được tất cả các điểm chính đã được chắt lọc.`
        : `Bạn là một AI chuyên chắt lọc thông tin. Dựa trên "Ý tưởng game" của người dùng, hãy đọc "Đoạn văn bản" dưới đây và rút ra những thông tin QUAN TRỌNG NHẤT (nhân vật, địa điểm, sự kiện, lore) liên quan trực tiếp đến ý tưởng đó. Trả lời bằng một bản tóm tắt ngắn gọn.`;

    return `
--- Ý TƯỞNG GAME ---
"${storyIdea}"

--- ${isFinalReduce ? 'CÁC BẢN TÓM TẮT CẦN TỔNG HỢP' : 'ĐOẠN VĂN BẢN'} ---
${chunk}

--- NHIỆM VỤ ---
${task}
Chỉ trả về nội dung tóm tắt.
`;
};
