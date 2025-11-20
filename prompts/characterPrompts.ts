import { Type } from "@google/genai";
import { WorldConfig, CharacterStat } from "../types";

export const getGenerateCharacterBioPrompt = (config: WorldConfig): string => {
    const { storyContext, character } = config;
    const currentBio = character.bio.trim();
    return currentBio
        ? `Một nhân vật tên là "${character.name}" trong thế giới (Thể loại: ${storyContext.genre}, Bối cảnh: ${storyContext.setting}) có tiểu sử/ngoại hình ban đầu là: "${currentBio}". Hãy dựa vào đó và viết lại một phiên bản chi tiết, hấp dẫn và có chiều sâu hơn.`
        : `Dựa trên bối cảnh thế giới (Thể loại: ${storyContext.genre}, Bối cảnh: ${storyContext.setting}), hãy viết một đoạn tiểu sử/ngoại hình ngắn (2-4 câu) cho nhân vật có tên "${character.name}".`;
};

export const getGenerateCharacterSkillsPrompt = (config: WorldConfig) => {
    const { storyContext, character } = config;

    const skillSchema = {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING, description: "Tên của kỹ năng." },
            description: { type: Type.STRING, description: "Mô tả ngắn gọn về kỹ năng." }
        },
        required: ['name', 'description']
    };
    
    const schema = {
        type: Type.ARRAY,
        description: "Một danh sách từ 1-3 kỹ năng khởi đầu phù hợp.",
        items: skillSchema
    };

    const prompt = `Dựa trên nhân vật (Tên: ${character.name}, Tiểu sử: ${character.bio}) và bối cảnh thế giới (Thể loại: ${storyContext.genre}, Bối cảnh: ${storyContext.setting}), hãy tạo ra một danh sách từ 1 đến 3 kỹ năng khởi đầu độc đáo và phù hợp cho nhân vật này, bao gồm cả tên và mô tả cho mỗi kỹ năng.`;

    return { prompt, schema };
};

export const getGenerateCharacterStatsPrompt = (config: WorldConfig) => {
    const { storyContext, character } = config;

    const statSchema = {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            value: { type: Type.NUMBER },
            maxValue: { type: Type.NUMBER },
            isPercentage: { type: Type.BOOLEAN },
            description: { type: Type.STRING, description: "Mô tả ngắn gọn về công dụng của chỉ số này trong game." },
            hasLimit: { type: Type.BOOLEAN, description: "Đặt là 'true' cho các chỉ số có giới hạn (như Máu, Năng lượng). Đặt là 'false' cho các chỉ số thuộc tính có thể tăng vô hạn (như Sức mạnh, Trí tuệ)." },
        },
        required: ['name', 'value', 'maxValue', 'isPercentage', 'description', 'hasLimit']
    };
    
    const schema = {
        type: Type.ARRAY,
        description: "Một danh sách từ 2-4 chỉ số nhân vật bổ sung (không bao gồm Sinh Lực và Thể Lực đã có sẵn) phù hợp với thể loại và tiểu sử.",
        items: statSchema
    };

    const prompt = `Dựa trên nhân vật (Tiểu sử: ${character.bio}) và bối cảnh thế giới (Thể loại: ${storyContext.genre}), hãy tạo ra một danh sách từ 2 đến 4 chỉ số nhân vật BỔ SUNG.
    - KHÔNG bao gồm 'Sinh Lực' hoặc 'Thể Lực' vì chúng đã có sẵn.
    - Các chỉ số phải phù hợp với thể loại. Ví dụ: Tiên hiệp có thể có 'Linh Lực', 'Căn Cơ'. Cyberpunk có thể có 'Năng lượng Lõi', 'Tốc độ Hack'.
    - Với mỗi chỉ số, hãy cung cấp một 'description' (mô tả) ngắn gọn về công dụng của nó.
    - Quyết định xem chỉ số có giới hạn tối đa không ('hasLimit'). 'hasLimit: true' cho các chỉ số dạng thanh tài nguyên (Máu, Năng lượng). 'hasLimit: false' cho các chỉ số thuộc tính có thể tăng tiến (Sức mạnh, Trí tuệ). Nếu 'hasLimit: false', hãy đặt 'maxValue' bằng 'value' và 'isPercentage' là false.
    - Đặt giá trị (value, maxValue) hợp lý.`;

    return { prompt, schema };
};

export const getGenerateSingleStatPrompt = (config: WorldConfig, statName: string) => {
    const { storyContext, character } = config;

    const schema = {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING, description: "Tên của chỉ số, phải là giá trị được cung cấp trong prompt." },
            value: { type: Type.NUMBER },
            maxValue: { type: Type.NUMBER },
            isPercentage: { type: Type.BOOLEAN },
            description: { type: Type.STRING, description: "Mô tả ngắn gọn về công dụng của chỉ số này trong game." },
            hasLimit: { type: Type.BOOLEAN, description: "Đặt là 'true' nếu là chỉ số có giới hạn (Máu, Năng lượng). Đặt là 'false' nếu là chỉ số thuộc tính (Sức mạnh, Trí tuệ)." },
        },
        required: ['name', 'value', 'maxValue', 'isPercentage', 'description', 'hasLimit']
    };

    const prompt = `Một nhân vật có tiểu sử: "${character.bio}" trong thế giới thể loại "${storyContext.genre}".
    Hãy đề xuất các giá trị cho một chỉ số có tên là "${statName}".
    - Trả về tên chỉ số trong trường 'name'.
    - Cung cấp giá trị khởi đầu ('value').
    - Quyết định xem nó có giới hạn không ('hasLimit'). Nếu có ('true'), cung cấp 'maxValue'. Nếu không ('false'), đặt 'maxValue' bằng 'value'.
    - Quyết định 'isPercentage'.
    - Cung cấp một 'description' (mô tả) ngắn gọn về công dụng của chỉ số này.
    Trả về một đối tượng JSON.`;
    
    return { prompt, schema };
};

export const getGenerateSingleSkillPrompt = (config: WorldConfig, existingName?: string) => {
    const { storyContext, character } = config;

    const schema = {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING, description: "Tên của kỹ năng." },
            description: { type: Type.STRING, description: "Mô tả ngắn gọn, hấp dẫn về kỹ năng." }
        },
        required: ['name', 'description']
    };
    
    let prompt: string;
    if (existingName && existingName.trim()) {
        prompt = `Một nhân vật (Tên: ${character.name}, Tiểu sử: ${character.bio}) trong thế giới (Thể loại: ${storyContext.genre}) có một kỹ năng tên là "${existingName}". Hãy viết một mô tả ngắn gọn và hấp dẫn cho kỹ năng này.`;
    } else {
        prompt = `Dựa trên nhân vật (Tên: ${character.name}, Tiểu sử: ${character.bio}) và bối cảnh thế giới (Thể loại: ${storyContext.genre}), hãy tạo ra MỘT kỹ năng khởi đầu độc đáo và phù hợp, bao gồm cả tên và mô tả.`;
    }

    return { prompt, schema };
};

export const getGenerateCharacterMotivationPrompt = (config: WorldConfig): string => {
    const { storyContext, character } = config;
    const currentMotivation = character.motivation.trim();
    const skillsString = character.skills.map(s => s.name).filter(Boolean).join(', ') || 'Chưa có';
    return currentMotivation
        ? `Nhân vật "${character.name}" (Tiểu sử: ${character.bio}, Kỹ năng: ${skillsString}) hiện có động lực là: "${currentMotivation}". Dựa vào toàn bộ thông tin về nhân vật và thế giới, hãy phát triển động lực này để nó trở nên cụ thể, có chiều sâu và tạo ra một mục tiêu rõ ràng hơn cho cuộc phiêu lưu.`
        : `Dựa trên nhân vật (Tên: ${character.name}, Tiểu sử: ${character.bio}, Kỹ năng: ${skillsString}) và bối cảnh thế giới (Thể loại: ${storyContext.genre}), hãy đề xuất một mục tiêu hoặc động lực hấp dẫn để bắt đầu cuộc phiêu lưu của họ. Trả lời bằng một câu ngắn gọn.`;
};
