import { Type } from "@google/genai";
import { WorldConfig, InitialEntity, AiPerformanceSettings } from "../types";
import { PERSONALITY_OPTIONS, GENDER_OPTIONS, DIFFICULTY_OPTIONS, ENTITY_TYPE_OPTIONS } from '../constants';
import { getSettings } from "../services/settingsService";
import { DEFAULT_AI_PERFORMANCE_SETTINGS } from "../constants";
import { isFandomDataset, extractCleanTextFromDataset } from "../utils/datasetUtils";

const getCleanContent = (content: string): string => {
    return isFandomDataset(content) ? extractCleanTextFromDataset(content) : content;
};

const buildWorldCreationKnowledgePrompt = (knowledge?: {name: string, content: string}[]): string => {
    if (!knowledge || knowledge.length === 0) return '';

    let prompt = '\n\n--- KIẾN THỨC NỀN (TÀI LIỆU THAM KHẢO) ---\n';
    prompt += 'Đây là toàn bộ tài liệu tham khảo bạn có. Hãy đọc kỹ và sử dụng chúng làm cơ sở cốt lõi để kiến tạo thế giới.\n\n';

    prompt += knowledge.map(file => `--- NGUỒN TÀI LIỆU: ${file.name} ---\n${getCleanContent(file.content)}\n--- KẾT THÚC NGUỒN: ${file.name} ---`).join('\n\n');

    prompt += '\n\n--- KẾT THÚC KIẾN THỨC NỀN ---';
    return prompt;
};

export const buildBackgroundKnowledgePrompt = (knowledge?: {name: string, content: string}[], hasDetailFiles: boolean = false): string => {
    if (!knowledge || knowledge.length === 0) return '';
    
    const summaries = knowledge.filter(k => k.name.startsWith('tom_tat_'));
    const arcs = knowledge.filter(k => !k.name.startsWith('tom_tat_'));

    let prompt = '\n\n--- KIẾN THỨC NỀN (Bối cảnh tham khảo bổ sung) ---\n';
    if (hasDetailFiles) {
        prompt += 'Sử dụng các thông tin sau làm kiến thức nền. TÓM TẮT TỔNG QUAN luôn được cung cấp. CHI TIẾT LIÊN QUAN được chọn lọc và cung cấp dựa trên diễn biến gần đây. Hãy ưu tiên sử dụng chúng để làm rõ bối cảnh khi cần.\n';
    } else {
        prompt += 'Sử dụng các thông tin sau làm kiến thức nền. ƯU TIÊN đọc TÓM TẮT TỔNG QUAN trước, sau đó dùng các tệp PHÂN TÍCH CHI TIẾT để làm rõ khi cần.\n';
    }


    if (summaries.length > 0) {
        prompt += '\n### TÓM TẮT TỔNG QUAN ###\n';
        prompt += summaries.map(s => `--- NGUỒN: ${s.name} ---\n${getCleanContent(s.content)}`).join('\n\n');
    }

    if (arcs.length > 0) {
        prompt += `\n\n### ${hasDetailFiles ? 'CHI TIẾT LIÊN QUAN' : 'PHÂN TÍCH CHI TIẾT TỪNG PHẦN'} ###\n`;
        prompt += arcs.map(a => `--- NGUỒN: ${a.name} ---\n${getCleanContent(a.content)}`).join('\n\n');
    }

    prompt += '\n--- KẾT THÚC KIẾN THÚC NỀN ---';
    return prompt;
};

export const getGenerateGenrePrompt = (config: WorldConfig): string => {
  const currentGenre = config.storyContext.genre.trim();
  return currentGenre
    ? `Dựa trên thể loại ban đầu là "${currentGenre}" và bối cảnh "${config.storyContext.setting}", hãy phát triển hoặc bổ sung thêm để thể loại này trở nên chi tiết và độc đáo hơn. Chỉ trả lời bằng tên thể loại đã được tinh chỉnh.`
    : `Dựa vào bối cảnh sau đây (nếu có): "${config.storyContext.setting}", hãy gợi ý một thể loại truyện độc đáo. Chỉ trả lời bằng tên thể loại.`;
};

export const getGenerateSettingPrompt = (config: WorldConfig): string => {
  const currentSetting = config.storyContext.setting.trim();
  return currentSetting
    ? `Đây là bối cảnh ban đầu: "${currentSetting}". Dựa trên bối cảnh này và thể loại "${config.storyContext.genre}", hãy viết lại một phiên bản đầy đủ và chi tiết hơn, tích hợp và mở rộng ý tưởng gốc.`
    : `Dựa vào thể loại sau đây: "${config.storyContext.genre}", hãy gợi ý một bối cảnh thế giới chi tiết và hấp dẫn. Trả lời bằng một đoạn văn ngắn (2-3 câu).`;
};

const getWorldCreationSchema = () => {
    const entitySchema = {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING, description: "Tên của thực thể." },
            type: { type: Type.STRING, enum: ENTITY_TYPE_OPTIONS, description: "Loại của thực thể." },
            personality: { type: Type.STRING, description: "Mô tả tính cách (chỉ dành cho NPC, có thể để trống cho các loại khác)." },
            description: { type: Type.STRING, description: "Mô tả chi tiết về thực thể." },
            tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Một danh sách các tags mô tả ngắn gọn (VD: 'Vật phẩm', 'Cổ đại', 'Học thuật', 'Vũ khí', 'NPC quan trọng', 'Linh dược') để phân loại thực thể." },
        },
        required: ['name', 'type', 'description', 'tags']
    };

    const statSchema = {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            value: { type: Type.NUMBER },
            maxValue: { type: Type.NUMBER },
            isPercentage: { type: Type.BOOLEAN },
        },
        required: ['name', 'value', 'maxValue', 'isPercentage']
    };

    return {
        type: Type.OBJECT,
        properties: {
            storyContext: {
                type: Type.OBJECT,
                properties: {
                    worldName: { type: Type.STRING, description: "Một cái tên độc đáo và hấp dẫn cho thế giới này." },
                    genre: { type: Type.STRING, description: "Thể loại của câu chuyện (VD: Tiên hiệp, Khoa học viễn tưởng)." },
                    setting: { type: Type.STRING, description: "Bối cảnh chi tiết của thế giới." }
                },
                required: ['worldName', 'genre', 'setting']
            },
            character: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "Tên nhân vật chính." },
                    personality: { type: Type.STRING, enum: PERSONALITY_OPTIONS.slice(1), description: "Tính cách của nhân vật (không chọn 'Tuỳ chỉnh')." },
                    gender: { type: Type.STRING, enum: GENDER_OPTIONS, description: "Giới tính của nhân vật." },
                    bio: { type: Type.STRING, description: "Tiểu sử sơ lược của nhân vật." },
                    skills: { 
                        type: Type.ARRAY,
                        description: "Danh sách 1-3 kỹ năng khởi đầu của nhân vật.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                description: { type: Type.STRING }
                            },
                            required: ['name', 'description']
                        }
                    },
                    stats: {
                        type: Type.ARRAY,
                        description: "Danh sách các chỉ số của nhân vật, luôn bao gồm Sinh Lực và Thể Lực, và có thể thêm các chỉ số khác phù hợp với thể loại.",
                        items: statSchema
                    },
                    motivation: { type: Type.STRING, description: "Mục tiêu hoặc động lực chính của nhân vật." },
                },
                required: ['name', 'personality', 'gender', 'bio', 'skills', 'stats', 'motivation']
            },
            difficulty: { type: Type.STRING, enum: DIFFICULTY_OPTIONS, description: "Độ khó của game." },
            allowAdultContent: { type: Type.BOOLEAN, description: "Cho phép nội dung người lớn hay không." },
            enableStatsSystem: { type: Type.BOOLEAN, description: "Bật hay tắt hệ thống chỉ số. Luôn đặt là true." },
            initialEntities: {
                type: Type.ARRAY,
                description: "Danh sách từ 5 đến 8 thực thể ban đầu trong thế giới (NPC, địa điểm, vật phẩm, phe phái...).",
                items: entitySchema
            }
        },
        required: ['storyContext', 'character', 'difficulty', 'allowAdultContent', 'enableStatsSystem', 'initialEntities']
    };
};

export const getGenerateWorldFromIdeaPrompt = (idea: string, backgroundKnowledge?: {name: string, content: string}[]) => {
    const backgroundKnowledgePrompt = buildWorldCreationKnowledgePrompt(backgroundKnowledge);
    const prompt = `Bạn là một Quản trò game nhập vai (GM) bậc thầy, một người kể chuyện sáng tạo với kiến thức uyên bác về văn học, đặc biệt là tiểu thuyết, đồng nhân (fan fiction) và văn học mạng. Dựa trên ý tưởng ban đầu sau: "${idea}", hãy dành thời gian suy nghĩ kỹ lưỡng để kiến tạo một cấu hình thế giới game hoàn chỉnh, CỰC KỲ chi tiết và có chiều sâu bằng tiếng Việt.
${backgroundKnowledgePrompt}

YÊU CẦU BẮT BUỘC:
1.  **HIỂU SÂU Ý TƯỞNG VÀ TÀI LIỆU:** Phân tích kỹ ý tưởng chính. Nếu "KIẾN THỨC NỀN" được cung cấp, bạn BẮT BUỘC phải coi đó là nguồn thông tin chính. Nếu trong tài liệu có mô tả về hệ thống sức mạnh, địa danh, hay nhân vật, bạn BẮT BUỘC phải sử dụng chúng. Chỉ được sáng tạo thêm những chỗ tài liệu không đề cập.
2.  **MÔ TẢ HỆ THỐNG SỨC MẠNH:** Trong phần \`setting\` (Bối cảnh chi tiết của thế giới), bạn BẮT BUỘC phải mô tả một **hệ thống sức mạnh** (ví dụ: ma thuật, tu luyện, công nghệ...) rõ ràng và chi tiết. Hệ thống này phải logic và phù hợp với thể loại của thế giới, đồng thời được tích hợp một cách tự nhiên vào mô tả bối cảnh chung, đảm bảo mô tả bối cảnh vẫn phong phú và không chỉ tập trung vào hệ thống sức mạnh.
3.  **CHI TIẾT VÀ LIÊN KẾT:** Các yếu tố bạn tạo ra (Bối cảnh, Nhân vật, Thực thể) PHẢI có sự liên kết chặt chẽ với nhau. Ví dụ: tiểu sử nhân vật phải gắn liền với bối cảnh, và các thực thể ban đầu phải có vai trò rõ ràng trong câu chuyện sắp tới của nhân vật.
4.  **CHẤT LƯỢNG CAO:** Hãy tạo ra một thế giới phong phú. Bối cảnh phải cực kỳ chi tiết. Nhân vật phải có chiều sâu. Tạo ra 5 đến 8 thực thể ban đầu (initialEntities) đa dạng (NPC, địa điểm, vật phẩm...) và mô tả chúng một cách sống động.
5.  **HỆ THỐNG TAGS:** Với mỗi thực thể, hãy phân tích kỹ lưỡng và tạo ra một danh sách các 'tags' mô tả ngắn gọn (ví dụ: 'Vật phẩm', 'Cổ đại', 'Học thuật', 'Vũ khí', 'NPC quan trọng', 'Linh dược') để phân loại chúng một cách chi tiết.
6.  **HỆ THỐNG CHỈ SỐ:** BẮT BUỘC phải bật \`enableStatsSystem: true\`. BẮT BUỘC tạo một bộ chỉ số (\`stats\`) cho nhân vật. Bộ chỉ số này LUÔN phải bao gồm 'Sinh Lực' (100/100, isPercentage: true) và 'Thể Lực' (100/100, isPercentage: true), cộng thêm 1-3 chỉ số khác phù hợp với thể loại (VD: 'Linh Lực' cho tiên hiệp, 'Năng Lượng' cho sci-fi).
7.  **KHÔNG TẠO LUẬT:** Không tạo ra luật lệ cốt lõi (coreRules) hoặc luật tạm thời (temporaryRules).
8.  **KHÔNG SỬ DỤNG TAG HTML:** TUYỆT ĐỐI không sử dụng các thẻ định dạng như <entity> hoặc <important> trong bất kỳ trường nào của JSON output.`;

    const schema = getWorldCreationSchema();

    const { aiPerformanceSettings } = getSettings();
    const perfSettings = aiPerformanceSettings || DEFAULT_AI_PERFORMANCE_SETTINGS;
    const creativeCallConfig: Partial<AiPerformanceSettings> = {
        maxOutputTokens: perfSettings.maxOutputTokens + (perfSettings.jsonBuffer || 0),
        thinkingBudget: perfSettings.thinkingBudget + (perfSettings.jsonBuffer || 0)
    };
    
    return { prompt, schema, creativeCallConfig };
};

export const getGenerateFanfictionWorldPrompt = (idea: string, backgroundKnowledge?: {name: string, content: string}[]) => {
    const backgroundKnowledgePrompt = buildWorldCreationKnowledgePrompt(backgroundKnowledge);
    const prompt = `Bạn là một Quản trò game nhập vai (GM) bậc thầy, một người kể chuyện sáng tạo với kiến thức uyên bác về văn học, đặc biệt là các tác phẩm gốc (tiểu thuyết, truyện tranh, game) và văn học mạng (đồng nhân, fan fiction). Dựa trên ý tưởng đồng nhân/fanfiction sau: "${idea}", hãy sử dụng kiến thức sâu rộng của bạn về tác phẩm gốc được đề cập để kiến tạo một cấu hình thế giới game hoàn chỉnh, CỰC KỲ chi tiết và có chiều sâu bằng tiếng Việt.
${backgroundKnowledgePrompt}

YÊU CẦU BẮT BUỘC:
1.  **HIỂU SÂU TÁC PHẨM GỐC:** Phân tích ý tưởng để xác định tác phẩm gốc. Nếu "Kiến thức nền" được cung cấp, HÃY COI ĐÓ LÀ NGUỒN KIẾN THỨC DUY NHẤT VÀ TUYỆT ĐỐI. Nếu trong tài liệu có mô tả về hệ thống sức mạnh, địa danh, hay nhân vật, bạn BẮT BUỘC phải sử dụng chúng. Chỉ được sáng tạo thêm những chỗ tài liệu không đề cập. Nếu không có kiến thức nền, hãy vận dụng kiến thức của bạn về tác phẩm gốc làm nền tảng.
2.  **MÔ TẢ HỆ THỐNG SỨC MẠNH:** Trong phần \`setting\` (Bối cảnh chi tiết của thế giới), bạn BẮT BUỘC phải mô tả một **hệ thống sức mạnh** (ví dụ: ma thuật, tu luyện, công nghệ...) rõ ràng và chi tiết. Hệ thống này phải logic và phù hợp với thể loại của thế giới, đồng thời được tích hợp một cách tự nhiên vào mô tả bối cảnh chung, đảm bảo mô tả bối cảnh vẫn phong phú và không chỉ tập trung vào hệ thống sức mạnh.
3.  **SÁNG TẠO DỰA TRÊN Ý TƯỞNG:** Tích hợp ý tưởng cụ thể của người chơi (VD: 'nếu nhân vật A không chết', 'nhân vật B xuyên không vào thế giới X') để tạo ra một dòng thời gian hoặc một kịch bản hoàn toàn mới và độc đáo. Câu chuyện phải có hướng đi riêng, khác với nguyên tác.
4.  **CHI TIẾT VÀ LIÊN KẾT:** Các yếu tố bạn tạo ra (Bối cảnh, Nhân vật mới, Thực thể) PHẢI có sự liên kết chặt chẽ với nhau và với thế giới gốc. Nhân vật chính có thể là nhân vật gốc được thay đổi hoặc một nhân vật hoàn toàn mới phù hợp với bối cảnh.
5.  **CHẤT LƯỢNG CAO:** Tạo ra 5 đến 8 thực thể ban đầu (initialEntities) đa dạng (NPC, địa điểm, vật phẩm...) và mô tả chúng một cách sống động, phù hợp với cả thế giới gốc và ý tưởng mới.
6.  **HỆ THỐNG TAGS:** Với mỗi thực thể, hãy phân tích kỹ lưỡng và tạo ra một danh sách các 'tags' mô tả ngắn gọn (ví dụ: 'Vật phẩm', 'Cổ đại', 'Học thuật', 'Vũ khí', 'NPC quan trọng', 'Linh dược') để phân loại chúng một cách chi tiết.
7.  **HỆ THỐNG CHỈ SỐ:** BẮT BUỘC phải bật \`enableStatsSystem: true\`. BẮT BUỘC tạo một bộ chỉ số (\`stats\`) cho nhân vật. Bộ chỉ số này LUÔN phải bao gồm 'Sinh Lực' (100/100, isPercentage: true) và 'Thể Lực' (100/100, isPercentage: true), cộng thêm 1-3 chỉ số khác phù hợp với thể loại của tác phẩm gốc.
8.  **KHÔNG TẠO LUẬT:** Không tạo ra luật lệ cốt lõi (coreRules) hoặc luật tạm thời (temporaryRules).
9.  **KHÔNG SỬ DỤNG TAG HTML:** TUYỆT ĐỐI không sử dụng các thẻ định dạng như <entity> hoặc <important> trong bất kỳ trường nào của JSON output.`;

    const schema = getWorldCreationSchema();
    
    const { aiPerformanceSettings } = getSettings();
    const perfSettings = aiPerformanceSettings || DEFAULT_AI_PERFORMANCE_SETTINGS;
    const creativeCallConfig: Partial<AiPerformanceSettings> = {
        maxOutputTokens: perfSettings.maxOutputTokens + (perfSettings.jsonBuffer || 0),
        thinkingBudget: perfSettings.thinkingBudget + (perfSettings.jsonBuffer || 0)
    };

    return { prompt, schema, creativeCallConfig };
};

export const getGenerateEntityInfoOnTheFlyPrompt = (worldConfig: WorldConfig, history: any[], entityName: string) => {
    const recentHistory = history.slice(-6).map(turn => `${turn.type === 'action' ? 'Người chơi' : 'AI'}: ${turn.content.replace(/<[^>]*>/g, '')}`).join('\n\n');

    const schema = {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING, description: "Tên chính xác của thực thể được cung cấp." },
            type: { type: Type.STRING, enum: ENTITY_TYPE_OPTIONS, description: "Loại của thực thể." },
            personality: { type: Type.STRING, description: "Mô tả RẤT ngắn gọn tính cách (1 câu) (chỉ dành cho NPC, có thể để trống cho các loại khác)." },
            description: { type: Type.STRING, description: "Mô tả chi tiết, hợp lý và sáng tạo về thực thể dựa trên bối cảnh." },
            tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Một danh sách các tags mô tả ngắn gọn (VD: 'Vật phẩm', 'Cổ đại', 'Học thuật', 'Vũ khí', 'NPC quan trọng') để phân loại thực thể." },
            details: { 
                type: Type.OBJECT,
                description: "Một đối tượng chứa các thuộc tính chi tiết nếu thực thể là 'Vật phẩm' (VD: vũ khí, áo giáp, trang sức). Để trống nếu không phải Vật phẩm. Các thuộc tính phải phù hợp với thể loại của thế giới (VD: fantasy thì có 'Sát thương phép', cyberpunk thì có 'Tốc độ hack').",
                properties: {
                    subType: { type: Type.STRING, description: "Loại phụ của vật phẩm (VD: Kiếm, Khiên, Nhẫn, Độc dược)." },
                    rarity: { type: Type.STRING, description: "Độ hiếm của vật phẩm (VD: Phổ thông, Hiếm, Sử thi)." },
                    stats: { type: Type.STRING, description: "Các chỉ số chính của vật phẩm, định dạng dưới dạng chuỗi, mỗi chỉ số trên một dòng (VD: 'Sát thương: 10-15\\nĐộ bền: 100/100')." },
                    effects: { type: Type.STRING, description: "Các hiệu ứng đặc biệt của vật phẩm, mỗi hiệu ứng trên một dòng." }
                }
            }
        },
        required: ['name', 'type', 'description', 'tags']
    };

    const prompt = `Trong bối cảnh câu chuyện sau:
- Thể loại: ${worldConfig.storyContext.genre}
- Bối cảnh: ${worldConfig.storyContext.setting}
- Diễn biến gần đây:
${recentHistory}

Một thực thể có tên là "${entityName}" vừa được nhắc đến nhưng không có trong cơ sở dữ liệu. Dựa vào bối cảnh và diễn biến gần đây, hãy thực hiện quy trình sau:
1.  **Phân tích & Mô tả:** Đầu tiên, hãy suy nghĩ và viết một mô tả chi tiết, hợp lý và sáng tạo về thực thể này là gì và vai trò của nó trong thế giới.
2.  **Phân loại chính xác:** Dựa trên mô tả bạn vừa tạo, hãy xác định chính xác **loại (type)** của thực thể. Hãy lựa chọn cẩn thận từ danh sách sau: NPC, Địa điểm, Vật phẩm, Phe phái/Thế lực, Cảnh giới, Công pháp / Kỹ năng, hoặc **'Hệ thống sức mạnh / Lore'**.
    - **LƯU Ý QUAN TRỌNG:** Loại **'Hệ thống sức mạnh / Lore'** được dùng cho các quy tắc, định luật vô hình của thế giới, sự kiện lịch sử, hoặc các khái niệm trừu tượng. Ví dụ, 'Hồng Nhan Thiên Kiếp' được mô tả là một 'quy tắc bất thành văn', một 'thế lực vô hình', một 'kiếp nạn định mệnh' - do đó, nó phải được phân loại là **'Hệ thống sức mạnh / Lore'**, TUYỆT ĐỐI KHÔNG phải là 'Phe phái/Thế lực'.

Sau khi đã xác định rõ mô tả và loại, hãy tạo ra các thông tin chi tiết khác.
- Nếu thực thể là 'Vật phẩm', hãy điền thêm các thông tin chi tiết vào trường 'details'.
- Hãy tạo ra một danh sách các 'tags' mô tả ngắn gọn (ví dụ: 'Vật phẩm', 'Cổ đại', 'Học thuật', 'Vũ khí', 'NPC quan trọng') để phân loại thực thể này.
Trả về một đối tượng JSON tuân thủ schema đã cho.`;

    const { aiPerformanceSettings } = getSettings();
    const perfSettings = aiPerformanceSettings || DEFAULT_AI_PERFORMANCE_SETTINGS;
    const creativeCallConfig: Partial<AiPerformanceSettings> = {
        maxOutputTokens: perfSettings.maxOutputTokens + (perfSettings.jsonBuffer || 0),
        thinkingBudget: perfSettings.thinkingBudget + (perfSettings.jsonBuffer || 0)
    };

    return { prompt, schema, creativeCallConfig };
};
