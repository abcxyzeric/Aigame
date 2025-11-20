import { GameItem } from '../types';

/**
 * Updates the inventory based on a list of delta changes (items to add or remove).
 * @param currentInventory The current list of items in the inventory.
 * @param inventoryDeltas An array of items representing changes. Positive quantity for adding, negative for removing.
 * @returns The new, updated inventory list.
 */
export const updateInventory = (currentInventory: GameItem[], inventoryDeltas: GameItem[]): GameItem[] => {
    if (!inventoryDeltas || inventoryDeltas.length === 0) {
        return currentInventory;
    }

    // Use a map for efficient lookups, keyed by lowercase item name for case-insensitivity.
    const inventoryMap = new Map<string, GameItem>();
    currentInventory.forEach(item => {
        inventoryMap.set(item.name.toLowerCase(), { ...item });
    });

    inventoryDeltas.forEach(delta => {
        if (!delta.name) return;
        const key = delta.name.toLowerCase();
        const existingItem = inventoryMap.get(key);

        if (existingItem) {
            // Item exists, update quantity
            existingItem.quantity += delta.quantity;
            // If the delta also provides a new description (e.g., from ITEM_ADD), update it.
            if (delta.description && delta.quantity > 0) {
                existingItem.description = delta.description;
            }
        } else if (delta.quantity > 0) {
            // Item doesn't exist and it's an addition, so add it to the map.
            // Ensure a new object is created to avoid reference issues.
            inventoryMap.set(key, { ...delta });
        }
        // If an item doesn't exist and the delta is a removal, we do nothing.
    });

    // Convert map back to array and filter out items with zero or negative quantity.
    const newInventory: GameItem[] = [];
    inventoryMap.forEach(item => {
        if (item.quantity > 0) {
            newInventory.push(item);
        }
    });
    
    return newInventory;
};
