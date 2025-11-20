import { generate, generateJson } from '../core/geminiClient';
import { GameState, WorldConfig } from '../../types';
import { getStartGamePrompt, getNextTurnPrompt, getGenerateReputationTiersPrompt } from '../../prompts/gameplayPrompts';
import * as ragService from './ragService';
import { getSettings } from '../settingsService';

export const startGame = (config: WorldConfig): Promise<string> => {
    const { prompt, systemInstruction } = getStartGamePrompt(config);
    return generate(prompt, systemInstruction);
};

export const generateReputationTiers = async (genre: string): Promise<string[]> => {
    const { prompt, schema } = getGenerateReputationTiersPrompt(genre);
    const result = await generateJson<{ tiers: string[] }>(prompt, schema);
    return result.tiers || ["Tai Tiếng", "Bị Ghét", "Vô Danh", "Được Mến", "Nổi Vọng"];
};

export const getNextTurn = async (gameState: GameState): Promise<string> => {
    const { history, summaries, memories, worldConfig, encounteredNPCs, encounteredFactions, discoveredEntities, companions, quests, character, inventory, playerStatus } = gameState;
    const { ragSettings } = getSettings();
    
    const lastPlayerAction = history[history.length - 1];
    if (!lastPlayerAction || lastPlayerAction.type !== 'action') {
        throw new Error("Lỗi logic: Lượt đi cuối cùng phải là hành động của người chơi.");
    }
    
    let newSummary: string | undefined = undefined;
    const narrationTurnsCount = history.filter(t => t.type === 'narration').length;
    const shouldSummarize = narrationTurnsCount > 0 && narrationTurnsCount % ragSettings.summaryFrequency === 0;

    if (shouldSummarize) {
        const lastSummaryTurnIndex = history.length - (ragSettings.summaryFrequency * 2);
        const turnsToSummarize = history.slice(lastSummaryTurnIndex > 0 ? lastSummaryTurnIndex : 0);
        newSummary = await ragService.generateSummary(turnsToSummarize);
    }
    
    let relevantMemories = '';
    const combinedMemories = [
        ...memories.map(m => `[Ký ức cốt lõi]: ${m}`), 
        ...summaries.map(s => `[Tóm tắt]: ${s}`),
        ...(newSummary ? [`[Tóm tắt mới]: ${newSummary}`] : [])
    ];

    if (combinedMemories.length > 0) {
        let ragQuery = `Hành động của người chơi: ${lastPlayerAction.content}\nDiễn biến trước đó:\n${history.slice(-3, -1).map(t => t.content).join('\n')}`;
        if (ragSettings.summarizeBeforeRag) {
            ragQuery = await ragService.generateSummary(history.slice(-4));
        }
        relevantMemories = await ragService.retrieveRelevantSummaries(ragQuery, combinedMemories, ragSettings.topK);
    }

    let relevantKnowledge = '';
    if (worldConfig.backgroundKnowledge && worldConfig.backgroundKnowledge.length > 0) {
        let ragQuery = `Hành động của người chơi: ${lastPlayerAction.content}\nDiễn biến trước đó:\n${history.slice(-3, -1).map(t => t.content).join('\n')}`;
        if (ragSettings.summarizeBeforeRag) { ragQuery = await ragService.generateSummary(history.slice(-4)); }
        relevantKnowledge = await ragService.retrieveRelevantKnowledge(ragQuery, worldConfig.backgroundKnowledge, 3);
    }
    
    // Provide full context instead of filtering
    const fullContext = {
        inventory,
        playerStatus,
        companions,
        activeQuests: quests.filter(q => q.status !== 'hoàn thành'),
        encounteredNPCs,
        encounteredFactions,
        discoveredEntities,
        characterSkills: character.skills,
    };
    // Clean up empty arrays from context
    Object.keys(fullContext).forEach(key => {
        const typedKey = key as keyof typeof fullContext;
        if (Array.isArray(fullContext[typedKey]) && fullContext[typedKey].length === 0) {
            delete fullContext[typedKey];
        }
    });

    const { prompt, systemInstruction } = getNextTurnPrompt(gameState, fullContext, relevantKnowledge, relevantMemories);
    
    // The raw string response will contain narration and tags, including a potential new summary tag.
    return generate(prompt, systemInstruction);
};
