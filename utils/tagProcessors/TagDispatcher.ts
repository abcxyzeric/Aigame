// utils/tagProcessors/TagDispatcher.ts
import { GameState, VectorUpdate } from '../../types';
import { ParsedTag } from './types';
import { processItemAdd, processItemRemove } from './ItemProcessor';
import { processStatChange } from './StatsProcessor';
import { processTimePass } from './TimeProcessor';
import { processCompanionNew, processCompanionRemove } from './CompanionProcessor';
import { processFactionUpdate, processEntityDiscovered } from './EntityProcessor';
import { processPlayerStatsInit, processWorldTimeSet, processReputationTiersSet } from './InitProcessor';
import { processMemoryAdd } from './MemoryProcessor';
import { processMilestoneUpdate } from './MilestoneProcessor';
import { processNpcNewOrUpdate, processNpcThoughtsUpdate, processMemoryFlag } from './NpcProcessor';
import { processQuestUpdate } from './QuestProcessor';
import { processReputationChange } from './ReputationProcessor';
import { processSkillLearned } from './SkillProcessor';
import { processStatusAcquired, processStatusRemoved } from './StatusProcessor';

/**
 * Điều phối viên chính, nhận danh sách thẻ lệnh và áp dụng chúng tuần tự vào trạng thái game.
 * @param currentState - Trạng thái game ban đầu.
 * @param tags - Một mảng các thẻ lệnh đã được phân tích.
 * @returns Một đối tượng chứa trạng thái game cuối cùng (`finalState`) và danh sách các yêu cầu cập nhật vector (`vectorUpdates`).
 */
export function dispatchTags(currentState: GameState, tags: ParsedTag[]): { finalState: GameState, vectorUpdates: VectorUpdate[] } {
    
    const result = tags.reduce(
        (acc: { state: GameState; updates: VectorUpdate[] }, tag) => {
            
            let processResult: { newState: GameState; vectorUpdates: VectorUpdate[] };

            switch (tag.tagName) {
                // === Init Tags (Lượt đầu tiên) ===
                case 'PLAYER_STATS_INIT':
                    processResult = processPlayerStatsInit(acc.state, tag.params);
                    break;
                case 'WORLD_TIME_SET':
                    processResult = processWorldTimeSet(acc.state, tag.params);
                    break;
                case 'REPUTATION_TIERS_SET':
                    processResult = processReputationTiersSet(acc.state, tag.params);
                    break;

                // === Time & Environment ===
                case 'TIME_PASS':
                    processResult = processTimePass(acc.state, tag.params);
                    break;

                // === Character State ===
                case 'STAT_CHANGE':
                    processResult = processStatChange(acc.state, tag.params);
                    break;
                case 'MILESTONE_UPDATE':
                    processResult = processMilestoneUpdate(acc.state, tag.params);
                    break;
                case 'SKILL_LEARNED':
                    processResult = processSkillLearned(acc.state, tag.params);
                    break;
                case 'STATUS_ACQUIRED':
                    processResult = processStatusAcquired(acc.state, tag.params);
                    break;
                case 'STATUS_REMOVED':
                    processResult = processStatusRemoved(acc.state, tag.params);
                    break;

                // === Inventory ===
                case 'ITEM_ADD':
                case 'ITEM_DEFINED':
                     processResult = processItemAdd(acc.state, tag.params);
                     break;
                case 'ITEM_REMOVE':
                    processResult = processItemRemove(acc.state, tag.params);
                    break;

                // === World & Story ===
                case 'QUEST_NEW':
                case 'QUEST_UPDATE':
                    processResult = processQuestUpdate(acc.state, tag.params);
                    break;
                case 'COMPANION_NEW':
                    processResult = processCompanionNew(acc.state, tag.params);
                    break;
                case 'COMPANION_REMOVE':
                    processResult = processCompanionRemove(acc.state, tag.params);
                    break;
                case 'NPC_NEW':
                    processResult = processNpcNewOrUpdate(acc.state, tag.params);
                    break;
                case 'NPC_UPDATE':
                    processResult = processNpcThoughtsUpdate(acc.state, tag.params);
                    break;
                case 'FACTION_UPDATE':
                    processResult = processFactionUpdate(acc.state, tag.params);
                    break;
                case 'LOCATION_DISCOVERED':
                     processResult = processEntityDiscovered(acc.state, tag.params, 'Địa điểm');
                     break;
                case 'LORE_DISCOVERED':
                    processResult = processEntityDiscovered(acc.state, tag.params, 'Hệ thống sức mạnh / Lore');
                    break;
                case 'MEMORY_ADD':
                    processResult = processMemoryAdd(acc.state, tag.params);
                    break;
                case 'REPUTATION_CHANGED':
                    processResult = processReputationChange(acc.state, tag.params);
                    break;
                case 'MEM_FLAG':
                    processResult = processMemoryFlag(acc.state, tag.params);
                    break;
                
                // Các thẻ không thay đổi state như SUGGESTION sẽ được bỏ qua ở đây
                case 'SUGGESTION':
                    processResult = { newState: acc.state, vectorUpdates: [] };
                    break;

                default:
                    console.warn(`Không tìm thấy processor cho thẻ: ${tag.tagName}`);
                    processResult = { newState: acc.state, vectorUpdates: [] };
                    break;
            }

            return {
                state: processResult.newState,
                updates: acc.updates.concat(processResult.vectorUpdates),
            };
        },
        { state: currentState, updates: [] }
    ); 

    return { finalState: result.state, vectorUpdates: result.updates };
}