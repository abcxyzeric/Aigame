import { WorldConfig, InitialEntity } from '../types';

export const getGenerateEntityNamePrompt = (config: WorldConfig, entity: InitialEntity): string => {
    const currentName = entity.name.trim();
    return currentName
        ? `Một thực thể loại "${entity.type}" hiện có tên là "${currentName}". Dựa vào tên này và bối cảnh thế giới "${config.storyContext.setting}", hãy gợi ý một cái tên khác hay hơn, hoặc một danh hiệu, hoặc một tên đầy đủ cho thực thể này. Chỉ trả lời bằng tên mới.`
        : `Dựa vào bối cảnh thế giới: "${config.storyContext.setting}", hãy gợi ý một cái tên phù hợp và độc đáo cho một thực thể thuộc loại "${entity.type}". Chỉ trả lời bằng tên.`;
};

export const getGenerateEntityPersonalityPrompt = (config: WorldConfig, entity: InitialEntity): string => {
    const currentPersonality = entity.personality.trim();
    return currentPersonality
        ? `Tính cách hiện tại của NPC "${entity.name}" là: "${currentPersonality}". Dựa vào đó và bối cảnh thế giới "${config.storyContext.setting}", hãy viết lại một phiên bản mô tả tính cách chi tiết hơn, có thể thêm vào các thói quen, mâu thuẫn nội tâm hoặc các chi tiết nhỏ để làm nhân vật trở nên sống động.`
        : `Mô tả RẤT ngắn gọn tính cách (1 câu) cho một NPC tên là "${entity.name}" trong bối cảnh thế giới: "${config.storyContext.setting}".`;
};

export const getGenerateEntityDescriptionPrompt = (config: WorldConfig, entity: InitialEntity): string => {
    const currentDescription = entity.description.trim();
    return currentDescription
        ? `Mô tả hiện tại của thực thể "${entity.name}" (loại: "${entity.type}") là: "${currentDescription}". Dựa vào đó và bối cảnh thế giới "${config.storyContext.setting}", hãy viết lại một phiên bản mô tả chi tiết và hấp dẫn hơn, có thể thêm vào lịch sử, chi tiết ngoại hình, hoặc công dụng/vai trò của nó trong thế giới.`
        : `Viết một mô tả RẤT ngắn gọn (1-2 câu) và hấp dẫn cho thực thể có tên "${entity.name}", thuộc loại "${entity.type}", trong bối cảnh thế giới: "${config.storyContext.setting}".`;
};
