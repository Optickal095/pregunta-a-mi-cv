import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { DocumentInterface } from '@langchain/core/documents';
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import { KnowledgeService } from '../knowledge/knowledge.service.js';
import type { ChunkMetadata } from '../knowledge/markdown-chunker.js';
import { InMemoryVectorStore } from './in-memory-vector-store.js';
import { DEFAULT_TOP_K, EMBEDDINGS } from './retrieval.constants.js';

type Chunk = DocumentInterface<ChunkMetadata>;

/**
 * Finds the knowledge chunks most relevant to a question.
 *
 * Without embeddings (no API key, or indexing failed) it falls back to the
 * whole CV: answers stay correct, each question just costs more tokens.
 */
@Injectable()
export class RetrievalService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RetrievalService.name);
  private readonly topK: number;
  private store: InMemoryVectorStore | null = null;

  constructor(
    @Inject(EMBEDDINGS) private readonly embeddings: EmbeddingsInterface | null,
    @Inject(KnowledgeService) private readonly knowledge: KnowledgeService,
    @Inject(ConfigService) config: ConfigService,
  ) {
    this.topK = Number(config.get('RAG_TOP_K')) || DEFAULT_TOP_K;
  }

  /** Runs after every module has initialised, so the knowledge is already loaded. */
  async onApplicationBootstrap(): Promise<void> {
    if (!this.embeddings) {
      this.logger.warn('No GEMINI_API_KEY: every question gets the whole CV');
      return;
    }

    const startedAt = Date.now();
    const chunks = this.knowledge.getChunks();
    try {
      const store = new InMemoryVectorStore(this.embeddings);
      await store.addDocuments([...chunks]);
      this.store = store;
      this.logger.log(
        `Indexed ${chunks.length} chunks in ${Date.now() - startedAt} ms`,
      );
    } catch (error) {
      this.logger.error(
        'Indexing failed: every question gets the whole CV',
        error,
      );
    }
  }

  /**
   * Searches with each query and merges the results, alternating between them
   * so every query keeps its best matches. Returns at most top-k + 2 chunks.
   */
  async search(...queries: string[]): Promise<Chunk[]> {
    const store = this.store;
    if (!store) return this.allChunks();
    try {
      const results = await Promise.all(
        queries.map(
          (query) =>
            store.similaritySearch(query, this.topK) as Promise<Chunk[]>,
        ),
      );
      return interleaveUnique(results).slice(0, this.topK + 2);
    } catch (error) {
      this.logger.warn(`Search failed, using the whole CV: ${String(error)}`);
      return this.allChunks();
    }
  }

  private allChunks(): Chunk[] {
    return [...this.knowledge.getChunks()];
  }
}

/** [[a1, a2], [b1, a1]] → [a1, b1, a2]: alternates lists, dropping repeats. */
function interleaveUnique(lists: Chunk[][]): Chunk[] {
  const merged: Chunk[] = [];
  const seen = new Set<string>();
  const longest = Math.max(0, ...lists.map((list) => list.length));
  for (let i = 0; i < longest; i++) {
    for (const list of lists) {
      const chunk = list[i];
      if (chunk && !seen.has(chunk.pageContent)) {
        seen.add(chunk.pageContent);
        merged.push(chunk);
      }
    }
  }
  return merged;
}
