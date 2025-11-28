
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
    [...updates].forEach(item => {
        if (item && item.name) {
             const key = item.name.toLowerCase();
             const existingItem = itemMap.get(key);

             if (existingItem) {
                // Logic gộp thông minh: Ngăn chặn chuỗi rỗng ghi đè lên dữ liệu có thật
                const merged = { ...existingItem };
                
                // Duyệt qua các key của item mới
                Object.keys(item).forEach(k => {
                    const propKey = k as keyof T;
                    const newValue = item[propKey];
                    
                    // Chỉ cập nhật nếu giá trị mới hợp lệ (không phải null/undefined)
                    if (newValue !== undefined && newValue !== null) {
                        if (typeof newValue === 'string') {
                            // Nếu là chuỗi, chỉ ghi đè nếu chuỗi mới KHÔNG RỖNG
                            // Điều này ngăn chặn việc description='...' bị ghi đè bởi description=''
                            if (newValue.trim() !== '') {
                                merged[propKey] = newValue;
                            }
                        } else {
                            // Với các kiểu khác (số, boolean...), cập nhật bình thường
                            merged[propKey] = newValue;
                        }
                    }
                });
                itemMap.set(key, merged);
             } else {
                // Nếu chưa tồn tại, dùng trực tiếp item mới
                itemMap.set(key, { ...item });
             }
        }
    });

    return Array.from(itemMap.values());
};
