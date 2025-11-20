import { generate, generateJson } from '../core/geminiClient';
import { WorldConfig, CharacterStat } from '../../types';
import { 
    getGenerateCharacterBioPrompt,
    getGenerateCharacterSkillsPrompt,
    getGenerateCharacterStatsPrompt,
    getGenerateSingleStatPrompt,
    getGenerateSingleSkillPrompt,
    getGenerateCharacterMotivationPrompt
} from '../../prompts/characterPrompts';

export const generateCharacterBio = (config: WorldConfig): Promise<string> => {
    const prompt = getGenerateCharacterBioPrompt(config);
    return generate(prompt);
};

export const generateCharacterSkills = (config: WorldConfig): Promise<{ name: string; description: string; }[]> => {
    const { prompt, schema } = getGenerateCharacterSkillsPrompt(config);
    return generateJson<{ name: string; description: string; }[]>(prompt, schema);
};

export const generateCharacterStats = (config: WorldConfig): Promise<CharacterStat[]> => {
    const { prompt, schema } = getGenerateCharacterStatsPrompt(config);
    return generateJson<CharacterStat[]>(prompt, schema);
};

export const generateSingleStat = (config: WorldConfig, statName: string): Promise<CharacterStat> => {
    const { prompt, schema } = getGenerateSingleStatPrompt(config, statName);
    return generateJson<CharacterStat>(prompt, schema);
};

export const generateSingleSkill = (config: WorldConfig, existingName?: string): Promise<{ name: string; description: string; }> => {
    const { prompt, schema } = getGenerateSingleSkillPrompt(config, existingName);
    return generateJson<{ name: string; description: string; }>(prompt, schema);
};

export const generateCharacterMotivation = (config: WorldConfig): Promise<string> => {
    const prompt = getGenerateCharacterMotivationPrompt(config);
    return generate(prompt);
};
