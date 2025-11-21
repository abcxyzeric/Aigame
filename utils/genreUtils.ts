import { NARRATIVE_ARCHETYPES } from '../constants/narrative_styles';

export const resolveGenreArchetype = (genreString: string): string => {
    const lowerGenre = genreString.toLowerCase();

    const easternKeywords = ["tiên", "hiệp", "huyền", "cổ trang", "kiếm", "tu chân", "murim"];
    if (easternKeywords.some(keyword => lowerGenre.includes(keyword))) {
        return NARRATIVE_ARCHETYPES.EASTERN;
    }

    const modernKeywords = ["đô thị", "hiện đại", "tương lai", "học đường", "tổng tài", "sci-fi", "cyberpunk", "hầm ngục", "thợ săn", "hệ thống"];
    if (modernKeywords.some(keyword => lowerGenre.includes(keyword))) {
        return NARRATIVE_ARCHETYPES.MODERN;
    }

    const westernKeywords = ["fantasy", "ma thuật", "phương tây", "rồng", "dungeon", "trung cổ", "hiệp sĩ"];
    if (westernKeywords.some(keyword => lowerGenre.includes(keyword))) {
        return NARRATIVE_ARCHETYPES.WESTERN;
    }

    return NARRATIVE_ARCHETYPES.DEFAULT;
};
