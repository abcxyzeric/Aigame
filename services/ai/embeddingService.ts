import { generateEmbedding, generateEmbeddingsBatch } from '../core/geminiClient';

const BATCH_SIZE = 50;
const DELAY_BETWEEN_BATCHES = 1500; // ms

/**
 * Creates an embedding for a single piece of text.
 * @param text The text string to embed.
 * @returns A promise that resolves to an embedding vector.
 */
export async function embedContent(text: string): Promise<number[]> {
    return generateEmbedding(text);
}

/**
 * Creates embeddings for an array of text chunks using batching and delays to avoid rate limits.
 * @param chunks An array of text strings to embed.
 * @param onProgress A callback to report progress (0 to 1).
 * @returns A promise that resolves to an array of embedding vectors.
 */
export async function embedChunks(chunks: string[], onProgress: (progress: number) => void): Promise<number[][]> {
  const allEmbeddings: number[][] = [];
  onProgress(0);

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batchChunks = chunks.slice(i, i + BATCH_SIZE);
    
    try {
        const batchEmbeddings = await generateEmbeddingsBatch(batchChunks);
        allEmbeddings.push(...batchEmbeddings);
        
        const progress = Math.min(1, (i + batchChunks.length) / chunks.length);
        onProgress(progress);
        
        if (i + BATCH_SIZE < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
    } catch (error) {
        console.error(`Error processing embedding batch starting at chunk ${i}:`, error);
        throw new Error(`Lỗi khi tạo embeddings cho dữ liệu. Vui lòng thử lại. Chi tiết: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  onProgress(1);
  return allEmbeddings;
}
