// utils/tagProcessors/ItemProcessor.ts
import { GameState, GameItem, VectorUpdate } from '../../types';

/**
 * Xử lý logic thêm hoặc cập nhật vật phẩm trong túi đồ.
 * @param currentState - Trạng thái game hiện tại.
 * @param params - Các tham số từ thẻ [ITEM_ADD], bao gồm name, quantity, và description.
 * @returns Một đối tượng chứa trạng thái game mới và các yêu cầu cập nhật vector.
 */
export function processItemAdd(currentState: GameState, params: any): { newState: GameState, vectorUpdates: VectorUpdate[] } {
    // Kiểm tra tính hợp lệ của tham số
    if (!params.name || !params.quantity || typeof params.quantity !== 'number' || params.quantity <= 0) {
        console.warn('Bỏ qua thẻ [ITEM_ADD] không hợp lệ:', params);
        return { newState: currentState, vectorUpdates: [] };
    }

    const newInventory = [...(currentState.inventory || [])];
    const key = params.name.toLowerCase();
    const existingItemIndex = newInventory.findIndex(item => item.name.toLowerCase() === key);
    
    let vectorUpdates: VectorUpdate[] = [];

    if (existingItemIndex > -1) {
        // Vật phẩm đã tồn tại, cộng dồn số lượng
        const updatedItem = { ...newInventory[existingItemIndex] };
        updatedItem.quantity += params.quantity;
        // Cập nhật mô tả nếu AI cung cấp mô tả mới
        if (params.description) {
            updatedItem.description = params.description;
        }
        newInventory[existingItemIndex] = updatedItem;
    } else {
        // Vật phẩm mới, thêm vào túi đồ
        const newItem: GameItem = {
            name: params.name,
            quantity: params.quantity,
            description: params.description || '',
            tags: params.tags ? (typeof params.tags === 'string' ? params.tags.split(',').map((t: string) => t.trim()) : params.tags) : [],
        };
        newInventory.push(newItem);

        // Tạo yêu cầu cập nhật vector cho vật phẩm mới
        const vectorContent = `Vật phẩm: ${newItem.name}\nMô tả: ${newItem.description}`;
        const vectorUpdate: VectorUpdate = {
            id: newItem.name,
            type: 'Item',
            content: vectorContent,
        };
        vectorUpdates.push(vectorUpdate);
    }

    return {
        newState: {
            ...currentState,
            inventory: newInventory,
        },
        vectorUpdates,
    };
}

/**
 * Xử lý logic xóa vật phẩm khỏi túi đồ.
 * @param currentState - Trạng thái game hiện tại.
 * @param params - Các tham số từ thẻ [ITEM_REMOVE], bao gồm name và quantity.
 * @returns Một đối tượng chứa trạng thái game mới và mảng vectorUpdates rỗng.
 */
export function processItemRemove(currentState: GameState, params: any): { newState: GameState, vectorUpdates: VectorUpdate[] } {
    if (!params.name || !params.quantity || typeof params.quantity !== 'number' || params.quantity <= 0) {
        console.warn('Bỏ qua thẻ [ITEM_REMOVE] không hợp lệ:', params);
        return { newState: currentState, vectorUpdates: [] };
    }

    const newInventory = [...(currentState.inventory || [])];
    const key = params.name.toLowerCase();
    const existingItemIndex = newInventory.findIndex(item => item.name.toLowerCase() === key);

    if (existingItemIndex > -1) {
        // Trừ số lượng vật phẩm
        const updatedItem = { ...newInventory[existingItemIndex] };
        updatedItem.quantity -= params.quantity;

        if (updatedItem.quantity > 0) {
            // Nếu vẫn còn, cập nhật lại vật phẩm
            newInventory[existingItemIndex] = updatedItem;
        } else {
            // Nếu hết, xóa vật phẩm khỏi mảng
            newInventory.splice(existingItemIndex, 1);
            // TODO: Cân nhắc xóa vector của vật phẩm khỏi DB
        }
    } else {
        // Nếu xóa vật phẩm không có trong túi đồ, bỏ qua và ghi log cảnh báo.
        console.warn(`Cố gắng xóa vật phẩm không có trong túi đồ: "${params.name}"`);
    }

    return {
        newState: {
            ...currentState,
            inventory: newInventory,
        },
        vectorUpdates: [],
    };
}
