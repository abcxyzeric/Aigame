// utils/reputationUtils.ts

/**
 * Xác định cấp bậc danh vọng dựa trên điểm số và một mảng 5 cấp bậc.
 * @param score - Điểm danh vọng hiện tại (-100 đến 100).
 * @param tiers - Mảng chứa đúng 5 tên cấp bậc, từ tai tiếng nhất đến danh giá nhất.
 * @returns Tên của cấp bậc danh vọng tương ứng.
 */
export const getReputationTier = (score: number, tiers: string[]): string => {
    if (!tiers || tiers.length !== 5) {
        // Trả về một giá trị mặc định an toàn nếu mảng tiers không hợp lệ
        return "Vô Danh";
    }
    if (score <= -75) return tiers[0]; // Rất thấp
    if (score <= -25) return tiers[1]; // Thấp
    if (score < 25) return tiers[2];  // Trung bình
    if (score < 75) return tiers[3];  // Cao
    return tiers[4]; // Rất cao
};
