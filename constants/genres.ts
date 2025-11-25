// constants/genres.ts

export interface Genre {
    name: string;
    description: string;
}

export const GENRES: Genre[] = [
    {
        name: 'Tùy chỉnh',
        description: 'Tự do nhập thể loại của riêng bạn hoặc kết hợp nhiều thể loại.',
    },
    {
        name: 'Tiên hiệp / Tu tiên',
        description: 'Thế giới của các tu sĩ tu luyện để trường sinh bất lão, phi thăng thành tiên, đối mặt với thiên kiếp và các thế lực ma đạo.',
    },
    {
        name: 'Kiếm hiệp / Võ lâm',
        description: 'Bối cảnh giang hồ võ lâm, nơi các hiệp khách hành tẩu, tranh đoạt bí kíp võ công và phân định chính tà.',
    },
    {
        name: 'Huyền huyễn / Dị giới',
        description: 'Một thế giới kỳ ảo với các chủng tộc, ma pháp, và hệ thống sức mạnh độc đáo, thường không tuân theo quy tắc vật lý thông thường.',
    },
    {
        name: 'Khoa học viễn tưởng / Cyberpunk',
        description: 'Tương lai công nghệ cao, du hành vũ trụ, trí tuệ nhân tạo, và những thành phố neon u ám nơi con người và máy móc hòa làm một.',
    },
    {
        name: 'Fantasy / Ma thuật phương Tây',
        description: 'Thế giới trung cổ với rồng, yêu tinh, người lùn, các hiệp sĩ, pháp sư và những lâu đài cổ kính.',
    },
    {
        name: 'Đô thị / Hiện đại',
        description: 'Bối cảnh xã hội hiện đại, tập trung vào các mối quan hệ, công việc, và những vấn đề đời thường.',
    },
    {
        name: 'Lịch sử / Dã sử',
        description: 'Câu chuyện dựa trên các sự kiện hoặc bối cảnh lịch sử có thật, có thể pha trộn yếu tố hư cấu.',
    },
    {
        name: 'Kinh dị / Linh dị',
        description: 'Thế giới của ma quỷ, những hiện tượng siêu nhiên, và các câu chuyện rùng rợn, bí ẩn không lời giải đáp.',
    },
    {
        name: 'Hầm ngục / Thợ săn / Hệ thống',
        description: 'Thế giới hiện đại hoặc dị giới nơi các "Cổng" hoặc "Hầm ngục" xuất hiện, và những "Thợ săn" thức tỉnh sức mạnh để chiến đấu với quái vật.',
    },
    {
        name: 'Dark Fantasy / Erotica (18+)',
        description: 'Thế giới kỳ ảo đen tối, tàn bạo, kết hợp với các yếu tố lãng mạn, nhục dục và các mối quan hệ phức tạp dành cho người lớn.',
    },
];