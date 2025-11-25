// utils/arrayUtils.ts

/**
 * Hợp nhất hai mảng đối tượng và loại bỏ các mục trùng lặp dựa trên thuộc tính 'name'.
 * Các mục trong 'updates' sẽ ghi đè lên các mục trong 'original' nếu có cùng tên.
 * @param original - Mảng gốc.
 * @param updates - Mảng chứa các cập nhật.
 * @returns Một mảng mới đã được hợp nhất và không có mục trùng lặp.
 */
export const mergeAndDeduplicateByName = <T extends { name: string }>(original: T[] = [], updates: T[] = []): T[] => {
    const itemMap = new Map<string, T>();
    
    // Thêm tất cả các mục từ mảng gốc vào map trước
    [...original].forEach(item => {
        if (item && item.name) {
            itemMap.set(item.name.toLowerCase(), { ...item });
        }
    });
    
    // Sau đó, thêm/cập nhật các mục từ mảng updates.
    // Thao tác này sẽ ghi đè lên các mục đã có với cùng 'name', hoặc thêm mới nếu chưa có.
    [...updates].forEach(item => {
        if (item && item.name) {
             const existingItem = itemMap.get(item.name.toLowerCase()) || {};
            // Hợp nhất sâu hơn: giữ lại các thuộc tính cũ nếu thuộc tính mới không tồn tại
            itemMap.set(item.name.toLowerCase(), { ...existingItem, ...item });
        }
    });

    return Array.from(itemMap.values());
};
