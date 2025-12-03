
import { generateEmbeddingsBatch } from '../core/geminiClient';
import { EntityVector } from '../../types';
import * as dbService from '../dbService';

const BATCH_SIZE = 100; // Tăng giới hạn batch theo API
const DELAY_BETWEEN_BATCHES = 1000; // Giảm độ trễ vì ít request hơn

/**
 * Creates embeddings for an array of text chunks using batching and delays to avoid rate limits.
 * This is the primary and only function for generating embeddings to ensure optimization.
 * @param chunks An array of text strings to embed.
 * @param onProgress A callback to report progress (0 to 1).
 * @returns A promise that resolves to an array of embedding vectors.
 */
export async function embedContents(chunks: string[], onProgress: (progress: number) => void = () => {}): Promise<number[][]> {
  if (!chunks || chunks.length === 0) {
    return [];
  }

  const allEmbeddings: number[][] = [];
  onProgress(0);

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batchChunks = chunks.slice(i, i + BATCH_SIZE);
    
    try {
        const batchEmbeddings = await generateEmbeddingsBatch(batchChunks);
        allEmbeddings.push(...batchEmbeddings);
        
        const progress = Math.min(1, (i + batchChunks.length) / chunks.length);
        onProgress(progress);
        
        // Chỉ thêm độ trễ nếu còn batch tiếp theo
        if (i + BATCH_SIZE < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
    } catch (error) {
        console.error(`Lỗi khi xử lý embedding batch bắt đầu từ chunk ${i}:`, error);
        // Ném lỗi ra để các hàm gọi có thể xử lý, thay vì chỉ trả về mảng rỗng
        throw new Error(`Lỗi khi tạo embeddings cho dữ liệu. Vui lòng thử lại. Chi tiết: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  onProgress(1);
  return allEmbeddings;
}

/**
 * Tạo vector cho một thực thể duy nhất và lưu ngay vào Database.
 * Dùng cho tính năng "Tạo Codex" để đồng bộ dữ liệu tức thì.
 */
export async function createEntityVector(entityId: string, content: string, worldId: number): Promise<void> {
    try {
        const embeddings = await embedContents([content]);
        if (embeddings.length > 0) {
            const vector: EntityVector = {
                id: entityId,
                worldId: worldId,
                embedding: embeddings[0]
            };
            await dbService.addEntityVector(vector);
            console.log(`[Embedding] Đã tạo và lưu vector cho thực thể: ${entityId}`);
        }
    } catch (error) {
        console.error(`[Embedding] Lỗi khi tạo vector cho thực thể ${entityId}:`, error);
    }
}
