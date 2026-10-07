import { Logger } from '@nestjs/common';
import type { Retriever } from '../../application/ports/retriever.port.js';
import type { KnowledgeChunk } from '../../domain/knowledge-chunk.js';

/**
 * Decorator: tries the primary retriever and, if it fails (embeddings API
 * down, quota reached), answers with the fallback instead of failing the
 * whole question.
 */
export class FallbackRetriever implements Retriever {
  private readonly logger = new Logger(FallbackRetriever.name);

  constructor(
    private readonly primary: Retriever,
    private readonly fallback: Retriever,
  ) {}

  async search(queries: string[]): Promise<KnowledgeChunk[]> {
    try {
      return await this.primary.search(queries);
    } catch (error) {
      this.logger.warn(`Search failed, using the fallback: ${String(error)}`);
      return this.fallback.search(queries);
    }
  }
}
