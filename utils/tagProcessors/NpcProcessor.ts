// utils/tagProcessors/NpcProcessor.ts
import { GameState, EncounteredNPC, VectorUpdate } from '../../types';
import { mergeAndDeduplicateByName } from '../arrayUtils';

/**
 * Xử lý logic thêm hoặc cập nhật thông tin một NPC.
 * Thẻ này có thể dùng để giới thiệu NPC mới hoặc cập nhật toàn bộ thông tin của NPC đã có.
 * @param currentState - Trạng thái game hiện tại.
 * @param params - Các tham số từ thẻ [NPC_NEW].
 * @returns Một đối tượng chứa trạng thái game mới và các yêu cầu cập nhật vector.
 */
export function processNpcNewOrUpdate(currentState: GameState, params: any): { newState: GameState, vectorUpdates: VectorUpdate[] } {
    if (!params.name) {
        console.warn('Bỏ qua thẻ [NPC_NEW] không hợp lệ:', params);
        return { newState: currentState, vectorUpdates: [] };
    }

    const newNpcData: EncounteredNPC = {
        name: params.name,
        description: params.description || '',
        personality: params.personality || '',
        thoughtsOnPlayer: params.thoughtsOnPlayer || '',
        tags: params.tags ? (typeof params.tags === 'string' ? params.tags.split(',').map((t: string) => t.trim()) : params.tags) : [],
    };

    const updatedNpcs = mergeAndDeduplicateByName(currentState.encounteredNPCs || [], [newNpcData]);
    
    const vectorContent = `NPC: ${newNpcData.name}\nMô tả: ${newNpcData.description}\nTính cách: ${newNpcData.personality}\nSuy nghĩ về người chơi: ${newNpcData.thoughtsOnPlayer}`;
    const vectorUpdate: VectorUpdate = {
        id: newNpcData.name,
        type: 'NPC',
        content: vectorContent,
    };
    
    return {
        newState: {
            ...currentState,
            encounteredNPCs: updatedNpcs,
        },
        vectorUpdates: [vectorUpdate],
    };
}

/**
 * Xử lý logic chỉ cập nhật suy nghĩ của một NPC về người chơi.
 * @param currentState - Trạng thái game hiện tại.
 * @param params - Các tham số từ thẻ [NPC_UPDATE].
 * @returns Một đối tượng chứa trạng thái game mới và các yêu cầu cập nhật vector.
 */
export function processNpcThoughtsUpdate(currentState: GameState, params: any): { newState: GameState, vectorUpdates: VectorUpdate[] } {
    if (!params.name || !params.thoughtsOnPlayer) {
        console.warn('Bỏ qua thẻ [NPC_UPDATE] không hợp lệ:', params);
        return { newState: currentState, vectorUpdates: [] };
    }

    const npcNameLower = params.name.toLowerCase();
    let npcFound = false;
    let finalNpcData: EncounteredNPC | null = null;

    const updatedNpcs = (currentState.encounteredNPCs || []).map(npc => {
        if (npc.name.toLowerCase() === npcNameLower) {
            npcFound = true;
            const updatedNpc = { ...npc, thoughtsOnPlayer: params.thoughtsOnPlayer };
            finalNpcData = updatedNpc;
            return updatedNpc;
        }
        return npc;
    });

    if (!npcFound) {
        console.warn(`Thẻ [NPC_UPDATE] được gọi cho NPC chưa tồn tại: "${params.name}". Tự động tạo mới.`);
        const newNpc: EncounteredNPC = {
            name: params.name,
            description: 'Chưa rõ',
            personality: 'Chưa rõ',
            thoughtsOnPlayer: params.thoughtsOnPlayer,
        };
        updatedNpcs.push(newNpc);
        finalNpcData = newNpc;
    }

    let vectorUpdates: VectorUpdate[] = [];
    if (finalNpcData) {
        const vectorContent = `NPC: ${finalNpcData.name}\nMô tả: ${finalNpcData.description}\nTính cách: ${finalNpcData.personality}\nSuy nghĩ về người chơi: ${finalNpcData.thoughtsOnPlayer}`;
        const vectorUpdate: VectorUpdate = {
            id: finalNpcData.name,
            type: 'NPC',
            content: vectorContent,
        };
        vectorUpdates.push(vectorUpdate);
    }

    return {
        newState: {
            ...currentState,
            encounteredNPCs: updatedNpcs,
        },
        vectorUpdates,
    };
}

/**
 * Xử lý logic thiết lập một "cờ ghi nhớ" (memory flag) cho một NPC.
 * @param currentState - Trạng thái game hiện tại.
 * @param params - Các tham số từ thẻ [MEM_FLAG].
 * @returns Một đối tượng chứa trạng thái game mới và mảng vectorUpdates rỗng.
 */
export function processMemoryFlag(currentState: GameState, params: any): { newState: GameState, vectorUpdates: VectorUpdate[] } {
    if (!params.npc || !params.flag || typeof params.value === 'undefined') {
        console.warn('Bỏ qua thẻ [MEM_FLAG] không hợp lệ:', params);
        return { newState: currentState, vectorUpdates: [] };
    }

    const npcNameLower = params.npc.toLowerCase();
    let npcFound = false;
    
    const updatedNpcs = (currentState.encounteredNPCs || []).map(npc => {
        if (npc.name.toLowerCase() === npcNameLower) {
            npcFound = true;
            const newMemoryFlags = { ...(npc.memoryFlags || {}), [params.flag]: params.value };
            return { ...npc, memoryFlags: newMemoryFlags };
        }
        return npc;
    });

    if (!npcFound) {
        console.warn(`Thẻ [MEM_FLAG] được gọi cho NPC chưa tồn tại: "${params.npc}". Tự động tạo mới.`);
        const newNpc: EncounteredNPC = {
            name: params.npc,
            description: 'Chưa rõ',
            personality: 'Chưa rõ',
            thoughtsOnPlayer: '',
            memoryFlags: { [params.flag]: params.value },
        };
        updatedNpcs.push(newNpc);
    }

    // Ghi nhớ cứng không cần cập nhật vector vì nó được tiêm trực tiếp vào context
    return {
        newState: {
            ...currentState,
            encounteredNPCs: updatedNpcs,
        },
        vectorUpdates: [],
    };
}
