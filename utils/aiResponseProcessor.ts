import { ActionSuggestion, GameItem, StatusEffect, Companion, Quest, CharacterStat, WorldTime, EncounteredNPC, EncounteredFaction, InitialEntity, TimePassed } from '../types';

const DEBUG_MODE = true; // Bật/tắt chế độ debug chi tiết trong Console (F12)

export const OBFUSCATION_MAP: Record<string, string> = {
    // Core words
    'lồn': '[l-ồ-n]',
    'cặc': '[c-ặ-c]',
    'địt': '[đ-ị-t]',
    'buồi': '[b-u-ồ-i]',
    'giao cấu': '[g-ia-o c-ấ-u]',
    
    // Anatomical terms
    'dương vật': '[d-ươ-ng v-ậ-t]',
    'âm đạo': '[â-m đ-ạ-o]',
    'âm vật': '[â-m v-ậ-t]',
    'tinh hoàn': '[t-i-nh h-o-à-n]',
    'hậu môn': '[h-ậ-u m-ô-n]',
    'nhũ hoa': '[n-h-ũ h-o-a]',

    // Slang & variations
    'cu': '[c-u]',
    'bướm': '[b-ư-ớ-m]',
    'chịch': '[c-h-ị-c-h]',
    'nện': '[n-ệ-n]',
    'đụ': '[đ-ụ]',
    
    // Actions
    'bú': '[b-ú]',
    'liếm': '[l-i-ế-m]',
    'mút': '[m-ú-t]',
    'sục': '[s-ụ-c]',
    'thông': '[t-h-ô-n-g]',
    
    // Bodily fluids
    'tinh dịch': '[t-i-nh d-ị-ch]',
    'dâm thủy': '[d-â-m th-ủ-y]',
    'tinh': '[t-i-nh]',
};

export function obfuscateText(text: string): string {
    let obfuscated = text;
    const sortedKeys = Object.keys(OBFUSCATION_MAP).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
        const regex = new RegExp(key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
        obfuscated = obfuscated.replace(regex, OBFUSCATION_MAP[key]);
    }
    return obfuscated;
}

export function processNarration(text: string): string {
    if (DEBUG_MODE) {
        console.groupCollapsed('🛠 [DEBUG] Text Processing');
        console.log('%c[RAW INPUT]', 'color: lightcoral;', text);
    }

    let processedText = text;
    let before: string;

    // Remove leaked JSON/Tag blocks
    before = processedText;
    processedText = processedText.replace(/```(json)?\s*[\s\S]*?\s*```/g, '');
    if (DEBUG_MODE && before !== processedText) {
        console.log('%c[CLEANED]', 'color: goldenrod;', 'Đã xóa pattern khối mã JSON (```json...```).');
    }
    
    before = processedText;
    processedText = processedText.replace(/\[(\w+):\s*([\s\S]*?)\]/g, '');
    if (DEBUG_MODE && before !== processedText) {
        console.log('%c[CLEANED]', 'color: goldenrod;', 'Đã xóa pattern thẻ dữ liệu game ([TAG:...]).');
    }

    // De-obfuscate words
    before = processedText;
    processedText = processedText.replace(/\[([^\]]+)\]/g, (match, p1) => p1.replace(/-/g, ''));
    if (DEBUG_MODE && before !== processedText) {
        console.log('%c[CLEANED]', 'color: goldenrod;', 'Đã giải mã pattern từ bị làm mờ ([x-y-z]).');
    }
    
    // Normalize smart quotes
    before = processedText;
    processedText = processedText.replace(/[“”]/g, '"');
    if (DEBUG_MODE && before !== processedText) {
        console.log('%c[CLEANED]', 'color: goldenrod;', 'Đã chuẩn hóa pattern dấu ngoặc kép thông minh (“”).');
    }

    // Strip tags inside <thought>
    before = processedText;
    processedText = processedText.replace(/<thought>(.*?)<\/thought>/gs, (match, innerContent) => {
        const strippedInnerContent = innerContent.replace(/<\/?(entity|important|status|exp)>/g, '');
        return `<thought>${strippedInnerContent}</thought>`;
    });
    if (DEBUG_MODE && before !== processedText) {
        console.log('%c[CLEANED]', 'color: goldenrod;', 'Đã xóa pattern thẻ lồng nhau bên trong <thought>.');
    }

    // Strip tags inside quoted text ""
    before = processedText;
    processedText = processedText.replace(/"(.*?)"/gs, (match, innerContent) => {
        const strippedInnerContent = innerContent.replace(/<[^>]*>/g, '');
        return `"${strippedInnerContent}"`;
    });
    if (DEBUG_MODE && before !== processedText) {
        console.log('%c[CLEANED]', 'color: goldenrod;', 'Đã xóa pattern thẻ bên trong dấu ngoặc kép ("...").');
    }

    // Replace <br> tags
    before = processedText;
    processedText = processedText.replace(/<br\s*\/?>/gi, '\n');
    if (DEBUG_MODE && before !== processedText) {
        console.log('%c[CLEANED]', 'color: goldenrod;', 'Đã thay thế pattern thẻ <br> bằng ký tự xuống dòng.');
    }

    // Clean up any remaining asterisks from markdown bold/italics
    before = processedText;
    processedText = processedText.replace(/\*/g, '');
    if (DEBUG_MODE && before !== processedText) {
        console.log('%c[CLEANED]', 'color: goldenrod;', 'Đã xóa pattern ký tự dấu sao (*).');
    }
    
    // Remove any stray closing tags
    before = processedText;
    processedText = processedText.replace(/<\/\s*(exp|thought|status|important|entity)\s*>/g, '');
    if (DEBUG_MODE && before !== processedText) {
        console.log('%c[CLEANED]', 'color: goldenrod;', 'Đã xóa pattern thẻ đóng bị thừa (</tag>).');
    }

    if (DEBUG_MODE) {
        console.log('%c[FINAL OUTPUT]', 'color: lightgreen;', processedText.trim());
        console.groupEnd();
    }

    return processedText.trim();
}

export interface ParsedAiResponse {
    narration: string;
    suggestions: ActionSuggestion[];
    updatedInventory: GameItem[];
    addedStatuses: StatusEffect[];
    removedStatuses: { name: string }[];
    updatedQuests: Quest[];
    updatedStats: CharacterStat[];
    updatedSkills: { name: string; description: string; }[];
    addedCompanions: Companion[];
    removedCompanions: { name: string }[];
    updatedNPCs: EncounteredNPC[];
    updatedFactions: EncounteredFaction[];
    discoveredEntities: InitialEntity[];
    newMemories: string[];
    newSummary?: string;
    timePassed?: TimePassed;
    reputationChange?: { score: number; reason: string };
    // Start game specific
    initialWorldTime?: WorldTime;
    reputationTiers?: string[];
    initialStats?: CharacterStat[];
}

/**
 * A robust key-value parser that can handle unquoted, single-quoted, and double-quoted values.
 * It's designed to be resilient to common AI formatting errors.
 */
function robustParseKeyValue(content: string): Record<string, any> {
    const result: Record<string, any> = {};
    const regex = /(\w+)\s*=\s*("([^"]*)"|'([^']*)'|([^,\]\n]+))/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        const key = match[1];
        let valueStr: string = (match[3] ?? match[4] ?? match[5] ?? '').trim();
        let value: string | number | boolean = valueStr;

        if (valueStr.match(/^-?\d+(\.\d+)?$/) && valueStr.trim() !== '') {
            value = Number(valueStr);
        } else if (valueStr.toLowerCase() === 'true') {
            value = true;
        } else if (valueStr.toLowerCase() === 'false') {
            value = false;
        }
        result[key] = value;
    }
    return result;
}


export function parseAiResponse(rawText: string): ParsedAiResponse {
    let rawNarration = '';
    let tagsPart = '';
    
    const separatorRegex = /(\[NARRATION_END\]|NARRATION_END)/i;
    const separatorMatch = rawText.match(separatorRegex);

    if (separatorMatch && typeof separatorMatch.index === 'number') {
        rawNarration = rawText.substring(0, separatorMatch.index).trim();
        tagsPart = rawText.substring(separatorMatch.index + separatorMatch[0].length).trim();
    } else {
        // Fallback if separator is missing: find the first potential tag and split there
        const firstTagMatch = rawText.match(/\n\s*\[?\w+:/);
        if (firstTagMatch && typeof firstTagMatch.index === 'number') {
            console.warn("NARRATION_END separator not found. Splitting at the first detected tag.");
            rawNarration = rawText.substring(0, firstTagMatch.index).trim();
            tagsPart = rawText.substring(firstTagMatch.index).trim();
        } else {
            console.warn("NARRATION_END separator and any tags not found in AI response. Treating whole response as narration.");
            rawNarration = rawText;
            tagsPart = '';
        }
    }

    // Process narration AFTER splitting it from the tags part
    const narration = processNarration(rawNarration);

    const response: ParsedAiResponse = {
        narration,
        suggestions: [],
        updatedInventory: [],
        addedStatuses: [],
        removedStatuses: [],
        updatedQuests: [],
        updatedStats: [],
        updatedSkills: [],
        addedCompanions: [],
        removedCompanions: [],
        updatedNPCs: [],
        updatedFactions: [],
        discoveredEntities: [],
        newMemories: [],
        initialStats: [],
    };

    const tagBlockRegex = /\[(\w+):\s*([\s\S]*?)\]/g;
    let match;

    while ((match = tagBlockRegex.exec(tagsPart)) !== null) {
        const tagName = match[1].toUpperCase();
        const content = match[2].trim();

        try {
            const data = robustParseKeyValue(content);
            switch (tagName) {
                case 'SUGGESTION':
                    if (data.description && data.successRate !== undefined && data.risk && data.reward) {
                        data.successRate = Number(data.successRate);
                        if (!isNaN(data.successRate)) {
                            response.suggestions.push(data as ActionSuggestion);
                        }
                    }
                    break;
                case 'PLAYER_STATS_UPDATE':
                case 'PLAYER_STATS_INIT':
                    if (data.name && data.value !== undefined) {
                        const statsList = tagName === 'PLAYER_STATS_INIT' ? response.initialStats : response.updatedStats;
                        statsList?.push(data as CharacterStat);
                    }
                    break;
                case 'ITEM_ADD':
                    if (data.name && data.quantity) {
                        response.updatedInventory.push({ ...data, description: data.description || '' } as GameItem);
                    }
                    break;
                case 'ITEM_REMOVE':
                     if (data.name && data.quantity) {
                        response.updatedInventory.push({ ...data, quantity: -Math.abs(data.quantity), description: '' } as GameItem);
                    }
                    break;
                case 'STATUS_ACQUIRED':
                    if (data.name && data.description && data.type) {
                        response.addedStatuses.push(data as StatusEffect);
                    }
                    break;
                case 'STATUS_REMOVED':
                    if (data.name) {
                        response.removedStatuses.push({ name: data.name as string });
                    }
                    break;
                case 'SKILL_LEARNED':
                    if (data.name && data.description) {
                        response.updatedSkills.push({ name: data.name as string, description: data.description as string });
                    }
                    break;
                case 'QUEST_NEW':
                    if (data.name && data.description) {
                        response.updatedQuests.push({ ...data, status: 'đang tiến hành' } as Quest);
                    }
                    break;
                case 'QUEST_UPDATE':
                    if (data.name && data.status) {
                        response.updatedQuests.push({ ...data, description: data.description || '' } as Quest);
                    }
                    break;
                case 'COMPANION_NEW':
                     if (data.name && data.description) {
                        response.addedCompanions.push(data as Companion);
                    }
                    break;
                case 'COMPANION_REMOVE':
                    if (data.name) {
                        response.removedCompanions.push({ name: data.name as string });
                    }
                    break;
                case 'NPC_NEW':
                    if (data.name && data.description) {
                        response.updatedNPCs.push(data as EncounteredNPC);
                    }
                    break;
                case 'NPC_UPDATE':
                     if (data.name && data.thoughtsOnPlayer) {
                        // Push a partial update. The merge logic will handle it.
                        response.updatedNPCs.push({ name: data.name, thoughtsOnPlayer: data.thoughtsOnPlayer } as EncounteredNPC);
                    }
                    break;
                case 'FACTION_UPDATE':
                    if (data.name && data.description) {
                        response.updatedFactions.push(data as EncounteredFaction);
                    }
                    break;
                case 'ITEM_DEFINED':
                case 'SKILL_DEFINED':
                case 'LOCATION_DISCOVERED':
                case 'LORE_DISCOVERED':
                    if (data.name && data.description) {
                         let type = 'Hệ thống sức mạnh / Lore';
                         if (tagName === 'ITEM_DEFINED') type = 'Vật phẩm';
                         if (tagName === 'LOCATION_DISCOVERED') type = 'Địa điểm';
                         if (tagName === 'SKILL_DEFINED') type = 'Công pháp / Kỹ năng';
                        response.discoveredEntities.push({ ...data, type } as InitialEntity);
                    }
                    break;
                case 'MEMORY_ADD':
                    if (data.content) response.newMemories.push(data.content as string);
                    break;
                case 'SUMMARY_ADD':
                    if (data.content) response.newSummary = data.content as string;
                    break;
                case 'TIME_PASSED':
                    response.timePassed = data as TimePassed;
                    break;
                case 'REPUTATION_CHANGED':
                    response.reputationChange = data as { score: number, reason: string };
                    break;
                case 'WORLD_TIME_SET':
                    response.initialWorldTime = data as WorldTime;
                    break;
                case 'REPUTATION_TIERS_SET':
                    if (typeof data.tiers === 'string') {
                        response.reputationTiers = data.tiers.split(',').filter(Boolean);
                    }
                    break;
            }
        } catch (e) {
            console.error(`Failed to parse content for tag [${tagName}]:`, content, e);
        }
    }
    return response;
}