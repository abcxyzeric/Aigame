/**
 * Calculates a simple keyword match score between a query and a document.
 * @param query The search query.
 * @param doc The document content.
 * @returns A numerical score based on matching tokens.
 */
export function calculateKeywordScore(query: string, doc: string): number {
    if (!query || !doc) return 0;
    const getTokens = (text: string) => new Set(text.toLowerCase().split(/[\s\W]+/).filter(Boolean));
    
    const queryTokens = getTokens(query);
    const docTokens = getTokens(doc);

    if (queryTokens.size === 0 || docTokens.size === 0) return 0;

    let intersectionSize = 0;
    for (const token of queryTokens) {
        if (docTokens.has(token)) {
            intersectionSize++;
        }
    }
    
    // Jaccard similarity
    const unionSize = queryTokens.size + docTokens.size - intersectionSize;
    return intersectionSize / unionSize;
}

interface RankedItem<T> {
    id: any;
    data: T;
}

/**
 * Merges multiple ranked lists of items using the Reciprocal Rank Fusion (RRF) algorithm.
 * @param rankedLists An array of ranked lists. Each list contains objects with at least an 'id' property.
 * @param k A constant to control the influence of lower ranks. Defaults to 60.
 * @returns A single, re-ranked list of unique items.
 */
export function reciprocalRankFusion<T extends { id: any; data: any }>(rankedLists: Array<Array<T>>, k: number = 60): T[] {
    const scores = new Map<any, number>();
    const itemsById = new Map<any, T>();

    for (const list of rankedLists) {
        for (let i = 0; i < list.length; i++) {
            const item = list[i];
            const rank = i + 1;
            
            // Add to RRF score
            const currentScore = scores.get(item.id) || 0;
            scores.set(item.id, currentScore + 1 / (k + rank));
            
            // Store the item data if it's the first time we've seen it
            if (!itemsById.has(item.id)) {
                itemsById.set(item.id, item);
            }
        }
    }

    // Sort item IDs by their fused score
    const fused = Array.from(scores.entries());
    fused.sort(([, scoreA], [, scoreB]) => scoreB - scoreA);

    // Map sorted IDs back to their original item data
    return fused.map(([id]) => itemsById.get(id)!);
}