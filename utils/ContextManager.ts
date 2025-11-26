// utils/ContextManager.ts
import { GameState, EncounteredNPC, EncounteredFaction, InitialEntity, GameItem, Companion, Quest, StatusEffect } from '../types';

// Định nghĩa cấu trúc cho ngữ cảnh đã được lọc
interface PartialContext {
    inventory: GameItem[];
    playerStatus: StatusEffect[];
    companions: Companion[];
    activeQuests: Quest[];
    encounteredNPCs: EncounteredNPC[];
    encounteredFactions: EncounteredFaction[];
    discoveredEntities: InitialEntity[];
    characterSkills: { name: string; description: string; }[];
}

/**
 * Chọn lọc và trả về một phần ngữ cảnh liên quan từ trạng thái game đầy đủ.
 * @param gameState - Trạng thái game hiện tại.
 * @param playerInput - Hành động của người chơi.
 * @returns Một đối tượng chứa các phần của Bách khoa toàn thư đã được lọc.
 */
export function selectRelevantContext(gameState: GameState, playerInput: string): Partial<PartialContext> {
    const partialContext: Partial<PartialContext> = {};
    const lowerCaseInput = playerInput.toLowerCase();

    // Dùng Set để quản lý các thực thể đã thêm, tránh trùng lặp
    const includedNpcNames = new Set<string>();
    const includedFactionNames = new Set<string>();
    const includedEntityNames = new Set<string>();
    const includedCompanionNames = new Set<string>();
    const includedQuestNames = new Set<string>();
    const includedItemNames = new Set<string>();
    const includedSkillNames = new Set<string>();

    // --- Lớp 1 (Luôn gửi) ---
    partialContext.playerStatus = gameState.playerStatus;
    partialContext.companions = gameState.companions;
    if(partialContext.companions) partialContext.companions.forEach(c => includedCompanionNames.add(c.name.toLowerCase()));
    
    partialContext.activeQuests = (gameState.quests || []).filter(q => q.status !== 'hoàn thành');
    if(partialContext.activeQuests) partialContext.activeQuests.forEach(q => includedQuestNames.add(q.name.toLowerCase()));
    
    // Luôn gửi túi đồ và kỹ năng
    partialContext.inventory = gameState.inventory;
    if(partialContext.inventory) partialContext.inventory.forEach(i => includedItemNames.add(i.name.toLowerCase()));
    
    partialContext.characterSkills = gameState.character.skills;
    if(partialContext.characterSkills) partialContext.characterSkills.forEach(s => includedSkillNames.add(s.name.toLowerCase()));

    // Khởi tạo các mảng để thêm vào
    partialContext.encounteredNPCs = [];
    partialContext.encounteredFactions = [];
    partialContext.discoveredEntities = [];

    // --- Lớp 2 (Theo Vị trí) ---
    if (gameState.currentLocationId) {
        const lowerCaseLocation = gameState.currentLocationId.toLowerCase();

        // Thêm chính thực thể địa điểm hiện tại
        const locationEntity = [...(gameState.discoveredEntities || []), ...(gameState.worldConfig.initialEntities || [])]
            .find(e => e.name.toLowerCase() === lowerCaseLocation && e.type === 'Địa điểm');
        if (locationEntity && !includedEntityNames.has(lowerCaseLocation)) {
            partialContext.discoveredEntities.push(locationEntity);
            includedEntityNames.add(lowerCaseLocation);
        }

        // Thêm các NPC ở vị trí hiện tại
        (gameState.encounteredNPCs || []).forEach(npc => {
            if (npc.locationId?.toLowerCase() === lowerCaseLocation && !includedNpcNames.has(npc.name.toLowerCase())) {
                partialContext.encounteredNPCs!.push(npc);
                includedNpcNames.add(npc.name.toLowerCase());
            }
        });
        
        // Thêm các thực thể khác ở vị trí hiện tại
        [...(gameState.discoveredEntities || []), ...(gameState.worldConfig.initialEntities || [])].forEach(entity => {
            if (entity.locationId?.toLowerCase() === lowerCaseLocation && !includedEntityNames.has(entity.name.toLowerCase())) {
                partialContext.discoveredEntities!.push(entity);
                includedEntityNames.add(entity.name.toLowerCase());
            }
        });
    }

    // --- Lớp 3 (Theo Từ khóa) ---
    const allSearchableEntities = [
        ...(gameState.encounteredNPCs || []),
        ...(gameState.encounteredFactions || []),
        ...(gameState.discoveredEntities || []),
        ...(gameState.worldConfig.initialEntities || []),
        ...(gameState.companions || []),
        ...(gameState.quests || []),
        ...(gameState.inventory || []),
        ...(gameState.character.skills || []),
    ];

    allSearchableEntities.forEach(entity => {
        if (entity.name && lowerCaseInput.includes(entity.name.toLowerCase())) {
            const entityNameLower = entity.name.toLowerCase();

            // Phân loại và thêm vào đúng danh sách, tránh trùng lặp
            if ('thoughtsOnPlayer' in entity && !includedNpcNames.has(entityNameLower)) { // Đây là EncounteredNPC
                partialContext.encounteredNPCs!.push(entity as EncounteredNPC);
                includedNpcNames.add(entityNameLower);
            } else if ('status' in entity && !includedQuestNames.has(entityNameLower)) { // Đây là Quest
                 if (!(partialContext.activeQuests?.some(q => q.name.toLowerCase() === entityNameLower))) {
                   partialContext.activeQuests = [...(partialContext.activeQuests || []), entity as Quest];
                }
                includedQuestNames.add(entityNameLower);
            } else if ('quantity' in entity && !includedItemNames.has(entityNameLower)) { // Đây là GameItem
                 if (!(partialContext.inventory?.some(i => i.name.toLowerCase() === entityNameLower))) {
                   partialContext.inventory = [...(partialContext.inventory || []), entity as GameItem];
                }
                includedItemNames.add(entityNameLower);
            } else if ('personality' in entity && 'description' in entity && !('thoughtsOnPlayer' in entity) && !includedCompanionNames.has(entityNameLower)) { // Đây là Companion
                 if (!(partialContext.companions?.some(c => c.name.toLowerCase() === entityNameLower))) {
                   partialContext.companions = [...(partialContext.companions || []), entity as Companion];
                }
                includedCompanionNames.add(entityNameLower);
            // FIX: The logic to identify factions from InitialEntity was flawed.
            // Correctly cast to InitialEntity, check the 'type' property, and handle factions
            // and other entities separately to avoid type errors and logical bugs.
            } else if ('type' in entity) { // Đây là một InitialEntity
                const initialEntity = entity as InitialEntity;
                if (initialEntity.type === 'Phe phái/Thế lực') {
                    if (!includedFactionNames.has(entityNameLower)) {
                        partialContext.encounteredFactions!.push({
                            name: initialEntity.name,
                            description: initialEntity.description,
                            tags: initialEntity.tags,
                            customCategory: initialEntity.customCategory,
                        });
                        includedFactionNames.add(entityNameLower);
                    }
                } else { // Not a faction
                    if (!includedEntityNames.has(entityNameLower)) {
                        partialContext.discoveredEntities!.push(initialEntity);
                        includedEntityNames.add(entityNameLower);
                    }
                }
            } else if ('description' in entity && !('value' in entity) && !includedSkillNames.has(entityNameLower)) { // Đây là Skill
                 if (!(partialContext.characterSkills?.some(s => s.name.toLowerCase() === entityNameLower))) {
                   partialContext.characterSkills = [...(partialContext.characterSkills || []), entity as { name: string; description: string; }];
                }
                includedSkillNames.add(entityNameLower);
            }
        }
    });

    // --- Lớp 4 (Quan hệ sâu) ---
    (gameState.encounteredNPCs || []).forEach(npc => {
        if (npc.memoryFlags) {
            const hasImportantFlag = Object.keys(npc.memoryFlags).some(flag => ['đã kết hôn', 'kẻ thù truyền kiếp'].includes(flag));
            if (hasImportantFlag && !includedNpcNames.has(npc.name.toLowerCase())) {
                partialContext.encounteredNPCs!.push(npc);
                includedNpcNames.add(npc.name.toLowerCase());
            }
        }
    });
    
    // Dọn dẹp các mảng rỗng nếu không có gì được thêm vào để prompt gọn gàng hơn
    if (partialContext.encounteredNPCs?.length === 0) delete partialContext.encounteredNPCs;
    if (partialContext.encounteredFactions?.length === 0) delete partialContext.encounteredFactions;
    if (partialContext.discoveredEntities?.length === 0) delete partialContext.discoveredEntities;

    return partialContext;
}
