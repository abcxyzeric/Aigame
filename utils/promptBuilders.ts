import { WorldConfig } from "../types";
import { getSettings } from "../services/settingsService";
import { NARRATIVE_STYLES, NARRATIVE_ARCHETYPES, DEOBFUSCATION_PROMPT } from '../constants/narrative_styles';
import { PRONOUN_RULES } from '../constants/pronoun_rules';
import { REPUTATION_RULES_PROMPT } from '../constants/reputation_rules';
import { TIME_RULES } from '../constants/time_rules';
import { resolveGenreArchetype } from './genreUtils';

export const buildNsfwPayload = (config: WorldConfig): string => {
    const { safetySettings } = getSettings();
    if (!config.allowAdultContent || safetySettings.enabled) {
        return '';
    }

    const archetype = resolveGenreArchetype(config.storyContext.genre);
    const payload: string[] = [];

    const getStylePrompt = (styleType: 'sexualContentStyle' | 'violenceLevel' | 'storyTone', styleKey?: string) => {
        if (!styleKey) return undefined;
        
        const archetypeStyles = NARRATIVE_STYLES[archetype]?.[styleType];
        const defaultStyles = NARRATIVE_STYLES[NARRATIVE_ARCHETYPES.DEFAULT]?.[styleType];

        return archetypeStyles?.[styleKey] ?? defaultStyles?.[styleKey];
    };

    const sexualStylePrompt = getStylePrompt('sexualContentStyle', config.sexualContentStyle);
    if (sexualStylePrompt) {
        payload.push(sexualStylePrompt);
    }
    
    const violenceStylePrompt = getStylePrompt('violenceLevel', config.violenceLevel);
    if (violenceStylePrompt) {
        payload.push(violenceStylePrompt);
    }
    
    const storyTonePrompt = getStylePrompt('storyTone', config.storyTone);
    if (storyTonePrompt) {
        payload.push(storyTonePrompt);
    }
    
    payload.push(DEOBFUSCATION_PROMPT);

    if (payload.length > 1) {
        return `
--- HƯỚNG DẪN NỘI DUNG NHẠY CẢM (PAYLOAD) ---
${payload.join('\n\n')}
--- KẾT THÚC PAYLOAD ---
`;
    }
    
    return '';
}

export const buildPronounPayload = (genre: string): string => {
    const archetype = resolveGenreArchetype(genre);
    const pronounRule = PRONOUN_RULES[archetype] ?? PRONOUN_RULES[NARRATIVE_ARCHETYPES.DEFAULT];

    if (pronounRule) {
        return `
--- LUẬT XƯNG HÔ (BẮT BUỘC) ---
${pronounRule}
--- KẾT THÚC LUẬT XƯNG HÔ ---
`;
    }
    return '';
};

export const buildReputationPayload = (): string => {
    // REPUTATION_RULES_PROMPT already includes the header/footer, so just return it.
    return REPUTATION_RULES_PROMPT;
};

export const buildTimePayload = (genre: string): string => {
    const archetype = resolveGenreArchetype(genre);
    const timeRule = TIME_RULES[archetype] ?? TIME_RULES[NARRATIVE_ARCHETYPES.DEFAULT];

    if (timeRule) {
        return `
--- LUẬT THỜI GIAN (BẮT BUỘC) ---
${timeRule}
--- KẾT THÚC LUẬT THỜI GIAN ---
`;
    }
    return '';
};
