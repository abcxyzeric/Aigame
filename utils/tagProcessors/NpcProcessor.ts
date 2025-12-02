
// utils/tagProcessors/NpcProcessor.ts
import { GameState, EncounteredNPC, VectorUpdate, InitialEntity } from '../../types';
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

    // FIX: Sử dụng 'any' để cho phép truyền undefined cho description/personality.
    // Điều này báo hiệu cho hàm mergeAndDeduplicateByName biết không được ghi đè dữ liệu cũ.
    const newNpcData: any = {
        name: sanitizedName,
        // Nếu không có giá trị, để undefined (thay vì gán chuỗi rỗng || '')
        description: params.description, 
        personality: params.personality,
        thoughtsOnPlayer: params.thoughtsOnPlayer || 'Chưa có',
        tags: params.tags ? (typeof params.tags === 'string' ? params.tags.split(',').map((t: string) => t.trim()) : params.tags) : [],
        customCategory: params.category, // Capture custom category
        locationId: currentState.currentLocationId, // Tự động gán vị trí hiện tại
        physicalState: params.physicalState || '', // Thêm trạng thái vật lý
    };

    const updatedNpcs = mergeAndDeduplicateByName(currentState.encounteredNPCs || [], [newNpcData]);
    
    // Khi tạo vector, sử dụng fallback an toàn để tránh in ra 'undefined'
    const vectorContent = `NPC: ${newNpcData.name}\nMô tả: ${newNpcData.description || 'Chưa rõ'}\nPhân loại: ${newNpcData.customCategory || 'Chưa rõ'}\nTính cách: ${newNpcData.personality || 'Chưa rõ'}\nSuy nghĩ về người chơi: ${newNpcData.thoughtsOnPlayer}\nTrạng thái vật lý: ${newNpcData.physicalState || 'Bình thường'}`;
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
    if (!params.name) {
        console.warn('Bỏ qua thẻ [NPC_UPDATE] không hợp lệ (thiếu tên):', params);
        return { newState: currentState, vectorUpdates: [] };
    }

    const sanitizedName = sanitizeEntityName(params.name);
    const npcNameLower = sanitizedName.toLowerCase();
    
    let updatedNpcs = [...(currentState.encounteredNPCs || [])];
    let finalNpcData: EncounteredNPC | null = null;
    let vectorUpdates: VectorUpdate[] = [];

    // Giai đoạn 1: Tìm trong "Hồ sơ sống" (encounteredNPCs)
    const existingNpcIndex = updatedNpcs.findIndex(npc => npc.name.toLowerCase() === npcNameLower);

    if (existingNpcIndex > -1) {
        // Trường hợp 1: NPC đã "sống", cập nhật nó.
        const originalNpc = updatedNpcs[existingNpcIndex];
        const updatedNpc = {
            ...originalNpc,
            thoughtsOnPlayer: params.thoughtsOnPlayer || originalNpc.thoughtsOnPlayer,
            locationId: currentState.currentLocationId,
            physicalState: params.physicalState || originalNpc.physicalState,
            customCategory: params.category || originalNpc.customCategory, // Update category if provided
        };
        updatedNpcs[existingNpcIndex] = updatedNpc;
        finalNpcData = updatedNpc;
    } else {
        // Giai đoạn 2: Tìm trong "Khai báo ban đầu" (initialEntities)
        const initialEntityNpc = (currentState.worldConfig.initialEntities || [])
            .find(entity => (entity.type === 'NPC' || !entity.type) && entity.name.toLowerCase() === npcNameLower);

        if (initialEntityNpc) {
            // Trường hợp 2: NPC cần "Nâng cấp", sao chép và hợp nhất.
            const newEncounteredNpc: EncounteredNPC = {
                // a. Sao chép toàn bộ dữ liệu gốc
                name: initialEntityNpc.name,
                description: initialEntityNpc.description,
                personality: initialEntityNpc.personality || 'Chưa rõ',
                tags: initialEntityNpc.tags || [],
                customCategory: initialEntityNpc.customCategory,
                
                // b. Hợp nhất thông tin mới từ thẻ lệnh
                thoughtsOnPlayer: params.thoughtsOnPlayer || 'Chưa có',
                physicalState: params.physicalState || '',
                locationId: currentState.currentLocationId,

                // c. Khởi tạo các giá trị mặc định cho "hồ sơ sống"
                memoryFlags: {}, 
            };
            updatedNpcs.push(newEncounteredNpc);
            finalNpcData = newEncounteredNpc;
        } else {
            // Trường hợp 3: NPC hoàn toàn mới do AI sáng tạo ra.
            console.warn(`Thẻ [NPC_UPDATE] được gọi cho NPC chưa tồn tại trong initialEntities: "${sanitizedName}". Tự động tạo mới.`);
            const newNpc: EncounteredNPC = {
                name: sanitizedName,
                description: 'Chưa rõ',
                personality: 'Chưa rõ',
                thoughtsOnPlayer: params.thoughtsOnPlayer || 'Chưa có',
                locationId: currentState.currentLocationId,
                physicalState: params.physicalState || '',
                memoryFlags: {},
                customCategory: params.category, // New category for new NPC
            };
            updatedNpcs.push(newNpc);
            finalNpcData = newNpc;
        }
    }

    // Luôn tạo yêu cầu cập nhật vector cho NPC đã được thay đổi hoặc tạo mới
    if (finalNpcData) {
        const vectorContent = `NPC: ${finalNpcData.name}\nMô tả: ${finalNpcData.description}\nPhân loại: ${finalNpcData.customCategory || 'Chưa rõ'}\nTính cách: ${finalNpcData.personality}\nSuy nghĩ về người chơi: ${finalNpcData.thoughtsOnPlayer}\nTrạng thái vật lý: ${finalNpcData.physicalState || 'Bình thường'}`;
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

/**
 * Xử lý cập nhật cảm xúc NPC (EQ).
 * @param currentState
 * @param params 
 */
export function processNpcEmotion(currentState: GameState, params: any): { newState: GameState, vectorUpdates: VectorUpdate[] } {
    if (!params.name || !params.state) {
        return { newState: currentState, vectorUpdates: [] };
    }

    const sanitizedName = sanitizeEntityName(params.name);
    const npcNameLower = sanitizedName.toLowerCase();
    
    const updatedNpcs = (currentState.encounteredNPCs || []).map(npc => {
        if (npc.name.toLowerCase() === npcNameLower) {
            return {
                ...npc,
                emotionalState: {
                    current: params.state,
                    value: Number(params.value) || 50
                }
            };
        }
        return npc;
    });

    // EQ changes are transient and don't necessarily need immediate vector updates unless critical
    // We update state for immediate UI feedback (if any) and next turn context injection.
    return {
        newState: {
            ...currentState,
            encounteredNPCs: updatedNpcs,
        },
        vectorUpdates: [],
    };
}
