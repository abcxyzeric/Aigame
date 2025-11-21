import { generate, generateJson } from '../core/geminiClient';
import { GameState, GameTurn, FandomDataset } from '../../types';
import { 
    getGenerateSummaryPrompt,
    getRetrieveRelevantSummariesPrompt,
    getRetrieveRelevantKnowledgePrompt,
    getDistillKnowledgePrompt
} from '../../prompts/analysisPrompts';
import { buildBackgroundKnowledgePrompt } from '../../prompts/worldCreationPrompts';
import { isFandomDataset, extractCleanTextFromDataset } from '../../utils/datasetUtils';
import * as embeddingService from './embeddingService';
import * as fandomFileService from '../fandomFileService';
import { cosineSimilarity } from '../../utils/vectorUtils';
import { generateEmbedding } from '../core/geminiClient';

export async function generateSummary(turns: GameTurn[]): Promise<string> {
    if (turns.length === 0) return "";
    const prompt = getGenerateSummaryPrompt(turns);
    const summary = await generate(prompt);
    return summary.replace(/<[^>]*>/g, '');
}

export async function retrieveRelevantSummaries(context: string, allSummaries: string[], topK: number): Promise<string> {
    if (allSummaries.length === 0) return "";
    
    const { prompt, schema } = getRetrieveRelevantSummariesPrompt(context, allSummaries, topK);
    const result = await generateJson<{ relevant_summaries: string[] }>(prompt, schema);
    return (result.relevant_summaries || []).join('\n\n');
}

export async function retrieveRelevantKnowledge(context: string, allKnowledge: {name: string, content: string}[], topK: number): Promise<string> {
    if (!allKnowledge || allKnowledge.length === 0) return "";

    const summaries = allKnowledge.filter(k => k.name.startsWith('tom_tat_'));
    const datasetFiles = allKnowledge.filter(k => k.name.startsWith('[DATASET]'));
    
    let relevantChunks: { text: string; score: number }[] = [];

    if (datasetFiles.length > 0 && context) {
        try {
            const queryEmbedding = await generateEmbedding(context);
            
            for (const file of datasetFiles) {
                try {
                    const dataset: FandomDataset = JSON.parse(file.content);
                    if (dataset.metadata?.embeddingModel && dataset.chunks?.every(c => Array.isArray(c.embedding))) {
                        for (const chunk of dataset.chunks) {
                            const score = cosineSimilarity(queryEmbedding, chunk.embedding!);
                            if (score > 0.7) { 
                                relevantChunks.push({ text: chunk.text, score });
                            }
                        }
                    }
                } catch (e) {
                    console.error(`Could not parse or process dataset file for vector search: ${file.name}`, e);
                }
            }
        } catch (error) {
            console.error("Error during vector search in RAG:", error);
        }
    }

    relevantChunks.sort((a, b) => b.score - a.score);
    const topKChunks = relevantChunks.slice(0, topK);

    const selectedKnowledgeFiles = [
        ...summaries,
        ...topKChunks.map((chunk, i) => ({
            name: `Chi_tiet_lien_quan_${i + 1}`,
            content: chunk.text
        }))
    ];
    
    if (selectedKnowledgeFiles.length === 0) return "";
    
    const hasDetailFiles = topKChunks.length > 0;
    return buildBackgroundKnowledgePrompt(selectedKnowledgeFiles, hasDetailFiles);
}

const CHUNK_SIZE_DISTILL = 15000;
const BATCH_SIZE_DISTILL = 3;
const DELAY_BETWEEN_BATCHES_DISTILL = 2000;

export async function distillKnowledgeForWorldCreation(
    idea: string,
    knowledge: { name: string; content: string }[]
): Promise<{ name: string; content: string }[]> {
    const fullContent = knowledge.map(k => {
        return isFandomDataset(k.content) ? extractCleanTextFromDataset(k.content) : k.content;
    }).join('\n\n');
    
    const textChunks: string[] = [];
    for (let i = 0; i < fullContent.length; i += CHUNK_SIZE_DISTILL) {
        textChunks.push(fullContent.substring(i, i + CHUNK_SIZE_DISTILL));
    }

    const createAndSaveEmbeddedDataset = async () => {
        try {
            console.log("Starting background task: Create and save embedded dataset...");
            const embeddings = await embeddingService.embedChunks(textChunks, (p) => console.log(`Background embedding progress: ${Math.round(p*100)}%`));
            
            if (embeddings.length !== textChunks.length) {
                throw new Error('Mismatch between number of chunks and embeddings returned.');
            }

            const dataset: FandomDataset = {
                metadata: {
                    sourceName: knowledge[0]?.name || 'tổng_hợp',
                    createdAt: new Date().toISOString(),
                    totalChunks: textChunks.length,
                    chunkSize: CHUNK_SIZE_DISTILL,
                    overlap: 0, 
                    embeddingModel: 'text-embedding-004',
                },
                chunks: textChunks.map((text, index) => ({
                    id: `${(knowledge[0]?.name || 'chunk').replace(/\.\w+$/, '')}-part-${index}`,
                    text: text,
                    embedding: embeddings[index],
                }))
            };

            const baseName = dataset.metadata.sourceName.replace(/\.txt$/i, '').replace(/[\s/\\?%*:|"<>]/g, '_');
            const fileName = `[DATASET]_${baseName}.json`;
            await fandomFileService.saveFandomFile(fileName, JSON.stringify(dataset, null, 2));
            console.log(`Successfully created and saved embedded dataset in background: ${fileName}`);
        } catch (error) {
            console.error("Failed to create and save embedded dataset in the background:", error);
        }
    };
    
    createAndSaveEmbeddedDataset();

    if (textChunks.length <= 1) {
        return knowledge;
    }

    const chunkSummaries: string[] = [];
    for (let i = 0; i < textChunks.length; i += BATCH_SIZE_DISTILL) {
        const batch = textChunks.slice(i, i + BATCH_SIZE_DISTILL);
        const batchPromises = batch.map(chunk => {
            const prompt = getDistillKnowledgePrompt(idea, chunk);
            return generate(prompt);
        });

        try {
            const summaries = await Promise.all(batchPromises);
            chunkSummaries.push(...summaries);
        } catch (error) {
            console.error(`Error processing batch starting at chunk ${i}:`, error);
            throw new Error(`Lỗi khi đang chắt lọc kiến thức nền. Vui lòng thử lại. Lỗi chi tiết: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        if (i + BATCH_SIZE_DISTILL < textChunks.length) {
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_DISTILL));
        }
    }

    const combinedSummaries = chunkSummaries.join('\n\n---\n\n');
    const finalReducePrompt = getDistillKnowledgePrompt(idea, combinedSummaries, true);
    const finalSummary = await generate(finalReducePrompt);
    
    return [{
        name: `tom_tat_dai_cuong_tu_${knowledge.length}_tep.txt`,
        content: finalSummary
    }];
}
