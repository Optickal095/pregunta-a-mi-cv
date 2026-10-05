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

/** Finds the knowledge chunks most relevant to a question. */
@Injectable()
export class RetrievalService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RetrievalService.name);
  private readonly store: InMemoryVectorStore;
  private readonly topK: number;

  constructor(
    @Inject(EMBEDDINGS) embeddings: EmbeddingsInterface,
    @Inject(KnowledgeService) private readonly knowledge: KnowledgeService,
    @Inject(ConfigService) config: ConfigService,
  ) {
    this.store = new InMemoryVectorStore(embeddings);
    this.topK = Number(config.get('RAG_TOP_K')) || DEFAULT_TOP_K;
  }

  /** Runs after every module has initialised, so the knowledge is already loaded. */
  async onApplicationBootstrap(): Promise<void> {
    const startedAt = Date.now();
    const chunks = this.knowledge.getChunks();
    await this.store.addDocuments([...chunks]);
    this.logger.log(
      `Indexed ${chunks.length} chunks in ${Date.now() - startedAt} ms`,
    );
  }

  search(query: string): Promise<DocumentInterface<ChunkMetadata>[]> {
    return this.store.similaritySearch(query, this.topK) as Promise<
      DocumentInterface<ChunkMetadata>[]
    >;
  }
}
