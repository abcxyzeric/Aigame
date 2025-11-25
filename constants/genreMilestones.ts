import { CharacterMilestone } from '../types';

// --- BỘ CỘT MỐC CHI TIẾT CHO TỪNG THỂ LOẠI ---

export const TU_TIEN_MILESTONES: CharacterMilestone[] = [
  { 
    name: 'Cảnh Giới Tu Luyện', 
    value: 'Phàm Nhân', 
    description: `Cấp bậc tu vi, cảnh giới sức mạnh cốt lõi của nhân vật. Hệ thống phân chia phổ biến: Luyện Khí -> Trúc Cơ -> Kim Đan -> Nguyên Anh -> Hóa Thần... Mỗi đại cảnh giới thường chia thành các tiểu cảnh giới như: Sơ kỳ, Trung kỳ, Hậu kỳ, Đỉnh phong (hoặc Đại viên mãn).`, 
    category: 'Tu Luyện' 
  },
  { 
    name: 'Công Pháp Chủ Tu', 
    value: 'Chưa có', 
    description: `Bộ tâm pháp, công pháp chính mà nhân vật đang tu luyện để nâng cao tu vi. Phẩm cấp công pháp thường được chia: Thiên - Địa - Huyền - Hoàng.`, 
    category: 'Tu Luyện' 
  },
  { 
    name: 'Cảnh Giới Luyện Thể', 
    value: 'Phàm Thể', 
    description: `Cấp bậc của nhục thân, thể hiện sức mạnh thể chất và khả năng phòng ngự thuần túy. Hệ thống phổ biến: Luyện Bì -> Luyện Nhục -> Luyện Cân -> Luyện Cốt -> Luyện Tủy...`, 
    category: 'Thân Thể' 
  },
  { 
    name: 'Linh Căn', 
    value: 'Chưa thức tỉnh', 
    description: `Tư chất tu tiên bẩm sinh, quyết định tốc độ tu luyện và thuộc tính linh lực. Phẩm cấp thường chia: Thiên, Địa, Huyền, Hoàng. Loại phổ biến: Kim, Mộc, Thủy, Hỏa, Thổ (Ngũ Hành), và các Dị linh căn hiếm có (Băng, Lôi, Phong, Ám, Quang...).`, 
    category: 'Thân Thể' 
  },
  { 
    name: 'Thể Chất Đặc Thù', 
    value: 'Không có', 
    description: `Loại thể chất đặc biệt bẩm sinh hoặc do kỳ ngộ mà có, mang lại những năng lực phi thường. Ví dụ: Tiên Thiên Đạo Thể, Bách Độc Bất Xâm, Cửu Dương Thần Thể...`, 
    category: 'Thân Thể' 
  },
];

export const KIEM_HIEP_MILESTONES: CharacterMilestone[] = [
    { 
        name: 'Cảnh Giới Võ Học', 
        value: 'Chưa nhập môn', 
        description: `Trình độ võ công của nhân vật, thể hiện qua sự lĩnh ngộ và thực lực. Hệ thống phân chia phổ biến: Tam lưu, Nhị lưu, Nhất lưu, Siêu hạng, Tuyệt đỉnh, Tông sư.`, 
        category: 'Tu Luyện' 
    },
    { 
        name: 'Nội Công Tâm Pháp', 
        value: 'Chưa có', 
        description: `Bộ tâm pháp nội công chính mà nhân vật đang tu luyện, quyết định độ thâm hậu của nội lực. Ví dụ: Dịch Cân Kinh, Cửu Dương Thần Công, Bắc Minh Thần Công...`, 
        category: 'Tu Luyện' 
    },
    {
        name: 'Căn Cốt',
        value: 'Bình thường',
        description: 'Tư chất bẩm sinh để luyện võ, ảnh hưởng đến tốc độ lĩnh ngộ và tu luyện nội công. Cấp bậc thường được mô tả là: Bình thường, Luyện võ kỳ tài, Tuyệt thế kỳ tài, Vạn năm có một.',
        category: 'Thân Thể'
    }
];

export const HUYEN_HUYEN_MILESTONES: CharacterMilestone[] = [
    { 
        name: 'Cảnh Giới Lực Lượng', 
        value: 'Phàm Nhân', 
        description: `Cấp bậc sức mạnh của nhân vật trong hệ thống tu luyện đặc thù của thế giới. Ví dụ: Đấu Giả -> Đấu Sư -> Đại Đấu Sư; hoặc Hoàng Cảnh -> Huyền Cảnh -> Địa Cảnh -> Thiên Cảnh. Mỗi cấp thường có từ 1 đến 9 sao/tinh.`, 
        category: 'Tu Luyện' 
    },
    { 
        name: 'Huyết Mạch', 
        value: 'Bình thường', 
        description: `Dòng máu đặc biệt mang lại sức mạnh hoặc tiềm năng tiềm ẩn. Cấp bậc huyết mạch thường được chia theo phẩm cấp (VD: Nhất phẩm đến Cửu phẩm) hoặc theo thần thú/thần tộc (VD: Long tộc huyết mạch, Phượng Hoàng huyết mạch).`, 
        category: 'Thân Thể' 
    },
];

export const DO_THI_DI_NANG_MILESTONES: CharacterMilestone[] = [
    { 
        name: 'Cấp Bậc Dị Năng', 
        value: 'Chưa thức tỉnh', 
        description: `Cấp bậc sức mạnh của dị năng, thường được phân loại theo hệ thống chữ cái. Hệ thống phổ biến: F, E, D, C, B, A, S, SS, SSS. Mỗi cấp có thể chia nhỏ thành Sơ kỳ, Trung kỳ, Hậu kỳ.`, 
        category: 'Tu Luyện' 
    },
    {
        name: 'Thể Chất Cường Hóa',
        value: 'Bình thường',
        description: 'Mức độ cường hóa của cơ thể để thích ứng với dị năng. Cấp bậc thường tương ứng với Cấp Bậc Dị Năng hoặc được đo lường riêng biệt (VD: Cường hóa cấp 1, cấp 2...).',
        category: 'Thân Thể'
    }
];

// Đây là bộ Cột mốc MẪU, dùng để làm placeholder
export const GENERIC_DEFAULT_MILESTONES: CharacterMilestone[] = [
    { 
        name: 'Cấp Bậc Sức Mạnh', 
        value: 'Chưa xếp hạng', 
        description: 'Cấp bậc, thứ hạng hoặc đẳng cấp sức mạnh của nhân vật trong hệ thống của thế giới.', 
        category: 'Tu Luyện' 
    },
    {
        name: 'Thể Chất',
        value: 'Bình thường',
        description: 'Tình trạng thể chất hoặc các đặc tính bẩm sinh của cơ thể nhân vật.',
        category: 'Thân Thể'
    }
];

// Đây là bộ Cột mốc TRỐNG, dùng để khởi tạo trạng thái
export const EMPTY_GENERIC_MILESTONES: CharacterMilestone[] = [
    { 
        name: '', 
        value: '', 
        description: '', 
        category: 'Tu Luyện' 
    },
    {
        name: '',
        value: '',
        description: '',
        category: 'Thân Thể'
    }
];


/**
 * Dựa vào chuỗi thể loại, trả về một bộ Cột mốc mặc định phù hợp.
 * @param genreString Chuỗi thể loại do người dùng nhập.
 * @returns Một mảng các CharacterMilestone.
 */
export const resolveMilestonesByGenre = (genreString: string): CharacterMilestone[] => {
    const lowerGenre = genreString.toLowerCase();

    if (lowerGenre.includes('tu tiên') || lowerGenre.includes('tu chân')) {
        return TU_TIEN_MILESTONES;
    }
    if (lowerGenre.includes('kiếm hiệp') || lowerGenre.includes('võ lâm') || lowerGenre.includes('giang hồ')) {
        return KIEM_HIEP_MILESTONES;
    }
    if (lowerGenre.includes('huyền huyễn') || lowerGenre.includes('dị giới')) {
        return HUYEN_HUYEN_MILESTONES;
    }
    if (lowerGenre.includes('đô thị') && (lowerGenre.includes('dị năng') || lowerGenre.includes('hệ thống'))) {
        return DO_THI_DI_NANG_MILESTONES;
    }

    // Fallback cho các thể loại khác hoặc không xác định
    return GENERIC_DEFAULT_MILESTONES;
};