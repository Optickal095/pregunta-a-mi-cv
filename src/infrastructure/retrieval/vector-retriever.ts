import { Document } from '@langchain/core/documents';
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import type { Retriever } from '../../application/ports/retriever.port.js';
import type { KnowledgeChunk } from '../../domain/knowledge-chunk.js';
import { InMemoryVectorStore } from './in-memory-vector-store.js';

/**
 * Retriever adapter: semantic search with embeddings over an in-memory
 * vector store. Call `index` once before searching.
 */
export class VectorRetriever implements Retriever {
  private readonly store: InMemoryVectorStore;

  constructor(
    embeddings: EmbeddingsInterface,
    private readonly topK: number,
  ) {
    this.store = new InMemoryVectorStore(embeddings);
  }

  async index(chunks: KnowledgeChunk[]): Promise<void> {
    await this.store.addDocuments(
      chunks.map(
        (chunk) => new Document({ pageContent: chunk.text, metadata: chunk }),
      ),
    );
  }

  /**
   * Searches with each query and merges the results, alternating between them
   * so every query keeps its best matches. Returns at most top-k + 2 chunks.
   */
  async search(queries: string[]): Promise<KnowledgeChunk[]> {
    const results = await Promise.all(
      queries.map(async (query) =>
        (await this.store.similaritySearch(query, this.topK)).map(
          (doc) => doc.metadata as KnowledgeChunk,
        ),
      ),
    );
    return interleaveUnique(results).slice(0, this.topK + 2);
  }
}

/** [[a1, a2], [b1, a1]] → [a1, b1, a2]: alternates lists, dropping repeats. */
export function interleaveUnique(lists: KnowledgeChunk[][]): KnowledgeChunk[] {
  const merged: KnowledgeChunk[] = [];
  const seen = new Set<string>();
  const longest = Math.max(0, ...lists.map((list) => list.length));
  for (let i = 0; i < longest; i++) {
    for (const list of lists) {
      const chunk = list[i];
      if (chunk && !seen.has(chunk.text)) {
        seen.add(chunk.text);
        merged.push(chunk);
      }
    }
  }
  return merged;
}
