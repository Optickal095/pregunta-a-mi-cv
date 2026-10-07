import type { KnowledgeRepository } from '../../application/ports/knowledge-repository.port.js';
import type { Retriever } from '../../application/ports/retriever.port.js';
import type { KnowledgeChunk } from '../../domain/knowledge-chunk.js';

/**
 * Retriever that ignores the question and returns the whole CV. Used when
 * semantic search is not available: answers stay correct, each question just
 * costs more tokens.
 */
export class WholeKnowledgeRetriever implements Retriever {
  constructor(private readonly knowledge: KnowledgeRepository) {}

  search(_queries: string[]): Promise<KnowledgeChunk[]> {
    return this.knowledge.getAll();
  }
}
