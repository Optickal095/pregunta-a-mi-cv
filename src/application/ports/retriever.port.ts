import type { KnowledgeChunk } from '../../domain/knowledge-chunk.js';

/** Port that finds the CV sections relevant to a question. */
export interface Retriever {
  /** Searches with every query and returns the merged results, most relevant first. */
  search(queries: string[]): Promise<KnowledgeChunk[]>;
}

export const RETRIEVER = Symbol('Retriever');
