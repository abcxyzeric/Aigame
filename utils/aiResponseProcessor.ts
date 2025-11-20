import { ActionSuggestion, GameItem, StatusEffect, Companion, Quest, CharacterStat, WorldTime, EncounteredNPC, EncounteredFaction, InitialEntity } from './types';

export const OBFUSCATION_MAP: Record<string, string> = {
    'lồn': '[l-ồ-n]',
    'cặc': '[c-ặ-c]',
    'địt': '[đ-ị-t]',
    'buồi': '[b-u-ồ-i]',
    'dương vật': '[d-ươ-ng v-ậ-t]',
    'âm đạo': '[â-m đ-ạ-o]',
    'giao cấu': '[g-ia-o c-ấ-u]',
    'bú': '[b-ú]',
    'liếm': '[l-i-ế-m]',
    'mút': '[m-ú-t]',
    // Add more related words
    'âm vật': '[â-m v-ậ-t]',
    'tinh dịch': '[t-i-nh d-ị-ch]',
    'dâm thủy': '[d-â-m th-ủ-y]',
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
    // De-obfuscate words like [â-m-đ-ạ-o] back to 'âm đạo'
    let processedText = text.replace(/\[([^\]]+)\]/g, (match, p1) => p1.replace(/-/g, ''));
    
    // Normalize smart quotes to straight quotes BEFORE stripping tags
    processedText = processedText.replace(/[“”]/g, '"');

    // Strip tags inside <thought> tags to prevent rendering issues
    processedText = processedText.replace(/<thought>(.*?)<\/thought>/gs, (match, innerContent) => {
        const strippedInnerContent = innerContent.replace(/<\/?(entity|important|status|exp)>/g, '');
        return `<thought>${strippedInnerContent}</thought>`;
    });

    // Strip tags inside quoted text ""
    processedText = processedText.replace(/"(.*?)"/gs, (match, innerContent) => {
        const strippedInnerContent = innerContent.replace(/<[^>]*>/g, '');
        return `"${strippedInnerContent}"`;
    });

    // Replace <br> tags with newlines
    processedText = processedText.replace(/<br\s*\/?>/gi, '\n');

    return processedText;
}

export interface ParsedAiResponse {
    narration: string;
    suggestions: ActionSuggestion[];
    updatedInventory: GameItem[];
    addedStatuses: StatusEffect[];
    removedStatuses: { name: string }[];
    updatedQuests: Quest[];
    updatedStats: CharacterStat[];
    addedCompanions: Companion[];
    updatedNPCs: EncounteredNPC[];
    updatedFactions: EncounteredFaction[];
    discoveredEntities: InitialEntity[];
    newMemories: string[];
    newSummary?: string;
    timePassed?: { hours?: number; minutes?: number };
    reputationChange?: { score: number; reason: string };
    // Start game specific
    initialWorldTime?: WorldTime;
    reputationTiers?: string[];
}


export function parseAiResponse(rawText: string): ParsedAiResponse {
    let narration = '';
    let tagsPart = '';
    
    const separatorRegex = /(\[NARRATION_END\]|NARRATION_END)/i;
    const separatorMatch = rawText.match(separatorRegex);

    if (separatorMatch && typeof separatorMatch.index === 'number') {
        const separatorIndex = separatorMatch.index;
        const separatorLength = separatorMatch[0]?.length || 0;
        narration = processNarration(rawText.substring(0, separatorIndex).trim());
        tagsPart = rawText.substring(separatorIndex + separatorLength).trim();
    } else {
        // Fallback: If separator is missing, try to find the first tag-like line
        const lines = rawText.split('\n');
        let firstTagLineIndex = -1;
        
        const validTags = [
            'SUGGESTION', 'STAT_UPDATE', 'ITEM_UPDATE', 'STATUS_ADD', 'STATUS_REMOVE',
            'QUEST_UPDATE', 'COMPANION_ADD', 'NPC_UPDATE', 'FACTION_UPDATE', 'ENTITY_DISCOVER',
            'MEMORY_ADD', 'SUMMARY_ADD', 'TIME_PASS', 'REPUTATION_CHANGE',
            'WORLD_TIME_SET', 'REPUTATION_TIERS'
        ];
        const potentialTagRegex = new RegExp(`^\\s*\\[?(${validTags.join('|')}):\\s*`, 'i');

        for (let i = 0; i < lines.length; i++) {
            if (potentialTagRegex.test(lines[i])) {
                firstTagLineIndex = i;
                break;
            }
        }

        if (firstTagLineIndex !== -1) {
            narration = processNarration(lines.slice(0, firstTagLineIndex).join('\n').trim());
            tagsPart = lines.slice(firstTagLineIndex).join('\n').trim();
        } else {
            // No tags found, assume whole text is narration
            narration = processNarration(rawText);
            tagsPart = '';
        }
    }

    const response: ParsedAiResponse = {
        narration,
        suggestions: [],
        updatedInventory: [],
        addedStatuses: [],
        removedStatuses: [],
        updatedQuests: [],
        updatedStats: [],
        addedCompanions: [],
        updatedNPCs: [],
        updatedFactions: [],
        discoveredEntities: [],
        newMemories: [],
    };

    const tagRegex = /^\s*\[?(\w+):\s*([\s\S]+?)(?=\s*\[?\w+:\s*|$)/gm;
    let match;

    while ((match = tagRegex.exec(tagsPart)) !== null) {
        const tagName = match[1];
        let content = match[2].trim();

        if (content.endsWith(',') || content.endsWith(']')) {
             content = content.slice(0, -1).trim();
        }

        try {
            if (tagName.toUpperCase() === 'REPUTATION_TIERS' && !content.startsWith('[')) {
                content = `[${content}]`;
            }

            if (tagName.toUpperCase() === 'MEMORY_ADD' || tagName.toUpperCase() === 'SUMMARY_ADD') {
                 const stringContent = JSON.parse(content); 
                 if (tagName.toUpperCase() === 'MEMORY_ADD') {
                    response.newMemories.push(stringContent);
                 } else {
                    response.newSummary = stringContent;
                 }
                 continue;
            }

            const data = JSON.parse(content);

            switch (tagName.toUpperCase()) {
                case 'SUGGESTION':
                    response.suggestions.push(data);
                    break;
                case 'STAT_UPDATE':
                    response.updatedStats.push(data);
                    break;
                case 'ITEM_UPDATE':
                    response.updatedInventory.push(data);
                    break;
                case 'STATUS_ADD':
                    response.addedStatuses.push(data);
                    break;
                case 'STATUS_REMOVE':
                    response.removedStatuses.push(data);
                    break;
                case 'QUEST_UPDATE':
                    response.updatedQuests.push(data);
                    break;
                case 'COMPANION_ADD':
                    response.addedCompanions.push(data);
                    break;
                case 'NPC_UPDATE':
                    response.updatedNPCs.push(data);
                    break;
                case 'FACTION_UPDATE':
                    response.updatedFactions.push(data);
                    break;
                case 'ENTITY_DISCOVER':
                    response.discoveredEntities.push(data);
                    break;
                case 'TIME_PASS':
                    response.timePassed = data;
                    break;
                case 'REPUTATION_CHANGE':
                    response.reputationChange = data;
                    break;
                case 'WORLD_TIME_SET':
                    response.initialWorldTime = data;
                    break;
                case 'REPUTATION_TIERS':
                    response.reputationTiers = data;
                    break;
            }
        } catch (e) {
            console.error(`Failed to parse content for tag [${tagName}]:`, content, e);
        }
    }
    return response;
}
