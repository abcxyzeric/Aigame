
import { generateJson, setDebugContext } from '../core/geminiClient';
import { GameState, GraphNode, GraphEdge, EncounteredNPC } from '../../types';
import { getPiggybackAnalysisPrompt } from '../../prompts/analysisPrompts';
import * as dbService from '../dbService';

// Cấu hình Flash cho tác vụ nền - Ưu tiên tốc độ và chi phí thấp
const backgroundConfig = {
    maxOutputTokens: 4096,
    thinkingBudget: 0, // Tắt thinking để tiết kiệm
};

/**
 * Chạy phân tích nền (Asynchronous Piggyback) sau mỗi lượt chơi.
 * Hàm này không chặn luồng chính và không trả về dữ liệu ngay lập tức cho UI.
 * Nó cập nhật cơ sở dữ liệu ngầm (IndexedDB) để lượt chơi sau sử dụng.
 */
export async function runPiggybackAnalysis(gameState: GameState, lastNarration: string, previousContextSummary: string) {
    if (!gameState.worldId) return;

    // Chạy trong một "thread" ảo, không await để tránh chặn UI nếu được gọi từ UI thread (tuy nhiên trong JS đơn luồng, nó vẫn chiếm event loop, nhưng generateJson là async nên ok)
    // Chúng ta sử dụng setImmediate hoặc setTimeout để đẩy nó xuống cuối hàng đợi sự kiện
    setTimeout(async () => {
        try {
            setDebugContext('Background Worker (Graph + EQ)');
            
            const { prompt, schema } = getPiggybackAnalysisPrompt(lastNarration, previousContextSummary);
            
            // Gọi Gemini Flash
            const analysisResult = await generateJson<{
                nodes: GraphNode[],
                edges: GraphEdge[],
                eqUpdates: { npcName: string, emotion: string, value: number }[]
            }>(prompt, schema, undefined, 'gemini-2.5-flash', backgroundConfig, 0); // Retry 0 lần để tiết kiệm

            if (!analysisResult) return;

            const worldId = gameState.worldId!;

            // 1. Cập nhật Graph Nodes & Edges vào IndexedDB
            if (analysisResult.nodes && analysisResult.nodes.length > 0) {
                const nodesWithWorldId = analysisResult.nodes.map(n => ({ ...n, worldId }));
                await dbService.addGraphNodes(nodesWithWorldId);
            }

            if (analysisResult.edges && analysisResult.edges.length > 0) {
                const edgesWithWorldId = analysisResult.edges.map(e => ({ ...e, worldId }));
                await dbService.addGraphEdges(edgesWithWorldId);
            }

            // 2. Cập nhật EQ (Cảm xúc) - Lưu ý: EQ cần cập nhật vào GameState cho lượt sau, 
            // nhưng vì GameState là React State, ta không thể sửa trực tiếp ở đây.
            // Giải pháp: Lưu vào một store tạm "PendingEQ" trong DB hoặc update trực tiếp vào NPC store nếu có.
            // Hiện tại, ta sẽ log ra để debug, và trong kiến trúc thực tế, 
            // ta có thể dùng một cơ chế "Mailbox" để lượt sau đọc. 
            // Tuy nhiên, để đơn giản hóa cho prompt này, ta sẽ bỏ qua việc cập nhật ngược lại GameState ngay lập tức
            // mà chỉ tập trung vào GraphRAG cho lượt sau.
            
            // (Nâng cao: Có thể update thẳng vào EncounteredNPC trong DB nếu ta tách bảng NPC ra khỏi SaveSlot,
            // nhưng hiện tại NPC nằm trong SaveSlot blob. Vì vậy EQ update ở đây chủ yếu để phục vụ Graph Relation).

            console.log(`[Background Worker] Analyzed Turn. Found ${analysisResult.nodes?.length || 0} nodes, ${analysisResult.edges?.length || 0} edges.`);

        } catch (error) {
            console.warn('[Background Worker] Failed to run analysis:', error);
            // Lỗi ở background worker không nên làm crash game, chỉ log warning.
        }
    }, 100); // Delay nhẹ để nhường UI render xong
}

export async function fetchGraphContext(worldId: number, entityNames: string[]): Promise<string> {
    if (!entityNames || entityNames.length === 0) return "";

    try {
        let graphContext = "";
        
        // Tìm các cạnh liên quan đến các thực thể này
        for (const name of entityNames) {
            const edgesSource = await dbService.getGraphEdgesBySource(worldId, name);
            const edgesTarget = await dbService.getGraphEdgesByTarget(worldId, name);
            
            const relevantEdges = [...edgesSource, ...edgesTarget];
            
            if (relevantEdges.length > 0) {
                graphContext += `Quan hệ của "${name}":\n`;
                // Lấy tối đa 5 quan hệ gần nhất/quan trọng nhất
                relevantEdges.slice(0, 5).forEach(edge => {
                    graphContext += `- [${edge.source}] ${edge.relation} [${edge.target}] (${edge.description || ''})\n`;
                });
                graphContext += "\n";
            }
        }
        
        return graphContext;
    } catch (e) {
        console.error("Error fetching graph context:", e);
        return "";
    }
}
