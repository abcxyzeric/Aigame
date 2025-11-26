// utils/tagProcessors/NpcProcessor.ts
import { GameState, EncounteredNPC, VectorUpdate } from '../../types';
import { mergeAndDeduplicateByName } from '../arrayUtils';
import { sanitizeEntityName } from '../textProcessing';

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

    const sanitizedName = sanitizeEntityName(params.name);

    const newNpcData: EncounteredNPC = {
        name: sanitizedName,
        description: params.description || '',
        personality: params.personality || '',
        thoughtsOnPlayer: params.thoughtsOnPlayer || 'Chưa có',
        tags: params.tags ? (typeof params.tags === 'string' ? params.tags.split(',').map((t: string) => t.trim()) : params.tags) : [],
        customCategory: params.category,
        locationId: currentState.currentLocationId, // Tự động gán vị trí hiện tại
        physicalState: params.physicalState || '', // Thêm trạng thái vật lý
    };

    const updatedNpcs = mergeAndDeduplicateByName(currentState.encounteredNPCs || [], [newNpcData]);
    
    const vectorContent = `NPC: ${newNpcData.name}\nMô tả: ${newNpcData.description}\nTính cách: ${newNpcData.personality}\nSuy nghĩ về người chơi: ${newNpcData.thoughtsOnPlayer}\nTrạng thái vật lý: ${newNpcData.physicalState || 'Bình thường'}`;
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
    if (!params.name) { // thoughtsOnPlayer giờ là tùy chọn
        console.warn('Bỏ qua thẻ [NPC_UPDATE] không hợp lệ (thiếu tên):', params);
        return { newState: currentState, vectorUpdates: [] };
    }

    const sanitizedName = sanitizeEntityName(params.name);
    const npcNameLower = sanitizedName.toLowerCase();
    let npcFound = false;
    let finalNpcData: EncounteredNPC | null = null;

    const updatedNpcs = (currentState.encounteredNPCs || []).map(npc => {
        if (npc.name.toLowerCase() === npcNameLower) {
            npcFound = true;
            // Cập nhật cả suy nghĩ, vị trí và trạng thái vật lý
            const updatedNpc = { 
                ...npc, 
                thoughtsOnPlayer: params.thoughtsOnPlayer || npc.thoughtsOnPlayer, // Giữ lại suy nghĩ cũ nếu không có cập nhật
                locationId: currentState.currentLocationId, // Luôn cập nhật vị trí khi tương tác
                physicalState: params.physicalState || npc.physicalState, // Cập nhật trạng thái vật lý
            };
            finalNpcData = updatedNpc;
            return updatedNpc;
        }
        return npc;
    });

    if (!npcFound) {
        console.warn(`Thẻ [NPC_UPDATE] được gọi cho NPC chưa tồn tại: "${sanitizedName}". Tự động tạo mới.`);
        const newNpc: EncounteredNPC = {
            name: sanitizedName,
            description: 'Chưa rõ',
            personality: 'Chưa rõ',
            thoughtsOnPlayer: params.thoughtsOnPlayer || 'Chưa có',
            locationId: currentState.currentLocationId, // Gán vị trí khi tạo mới
            physicalState: params.physicalState || '',
        };
        updatedNpcs.push(newNpc);
        finalNpcData = newNpc;
    }

    let vectorUpdates: VectorUpdate[] = [];
    if (finalNpcData) {
        const vectorContent = `NPC: ${finalNpcData.name}\nMô tả: ${finalNpcData.description}\nTính cách: ${finalNpcData.personality}\nSuy nghĩ về người chơi: ${finalNpcData.thoughtsOnPlayer}\nTrạng thái vật lý: ${finalNpcData.physicalState || 'Bình thường'}`;
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
    
    const sanitizedName = sanitizeEntityName(params.npc);
    const npcNameLower = sanitizedName.toLowerCase();
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
        console.warn(`Thẻ [MEM_FLAG] được gọi cho NPC chưa tồn tại: "${sanitizedName}". Tự động tạo mới.`);
        const newNpc: EncounteredNPC = {
            name: sanitizedName,
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