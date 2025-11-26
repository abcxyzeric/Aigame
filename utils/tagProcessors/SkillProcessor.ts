// utils/tagProcessors/SkillProcessor.ts
import { GameState, VectorUpdate } from '../../types';
import { mergeAndDeduplicateByName } from '../arrayUtils';
import { sanitizeEntityName } from '../textProcessing';

/**
 * Xử lý logic thêm một kỹ năng mới cho nhân vật.
 * @param currentState - Trạng thái game hiện tại.
 * @param params - Các tham số từ thẻ [SKILL_LEARNED].
 * @returns Một đối tượng chứa trạng thái game mới và các yêu cầu cập nhật vector.
 */
export function processSkillLearned(currentState: GameState, params: any): { newState: GameState, vectorUpdates: VectorUpdate[] } {
    if (!params.name) {
        console.warn('Bỏ qua thẻ [SKILL_LEARNED] không hợp lệ:', params);
        return { newState: currentState, vectorUpdates: [] };
    }

    const sanitizedName = sanitizeEntityName(params.name);

    const newSkill = {
        name: sanitizedName,
        description: params.description || '',
    };

    const updatedSkills = mergeAndDeduplicateByName(currentState.character.skills || [], [newSkill]);
    
    const vectorContent = `Kỹ năng: ${newSkill.name}\nMô tả: ${newSkill.description}`;
    const vectorUpdate: VectorUpdate = {
        id: newSkill.name,
        type: 'Skill',
        content: vectorContent,
    };

    return {
        newState: {
            ...currentState,
            character: {
                ...currentState.character,
                skills: updatedSkills,
            },
        },
        vectorUpdates: [vectorUpdate],
    };
}
