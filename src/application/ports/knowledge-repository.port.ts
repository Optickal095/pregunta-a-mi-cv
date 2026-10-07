import type { KnowledgeChunk } from '../../domain/knowledge-chunk.js';

/** Port to wherever Eduardo's CV is stored. */
export interface KnowledgeRepository {
  getAll(): Promise<KnowledgeChunk[]>;
}

export const KNOWLEDGE_REPOSITORY = Symbol('KnowledgeRepository');
