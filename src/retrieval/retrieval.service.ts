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

  async search(query: string): Promise<Chunk[]> {
    if (!this.store) return this.allChunks();
    try {
      return (await this.store.similaritySearch(query, this.topK)) as Chunk[];
    } catch (error) {
      this.logger.warn(`Search failed, using the whole CV: ${String(error)}`);
      return this.allChunks();
    }
  }

  private allChunks(): Chunk[] {
    return [...this.knowledge.getChunks()];
  }
}
