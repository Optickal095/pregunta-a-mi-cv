import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import type { KnowledgeRepository } from '../../application/ports/knowledge-repository.port.js';
import type { Retriever } from '../../application/ports/retriever.port.js';
import {
  DEFAULT_EMBEDDINGS_MODEL,
  GeminiEmbeddings,
} from './gemini-embeddings.js';
import { FallbackRetriever } from './fallback-retriever.js';
import { VectorRetriever } from './vector-retriever.js';
import { WholeKnowledgeRetriever } from './whole-knowledge-retriever.js';

export const DEFAULT_TOP_K = 4;

/** Injection token for the embeddings model, so tests can swap in a fake. */
export const EMBEDDINGS = Symbol('Embeddings');

export function createEmbeddings(
  config: ConfigService,
): EmbeddingsInterface | null {
  const apiKey = config.get<string>('GEMINI_API_KEY');
  if (!apiKey) return null;
  return new GeminiEmbeddings(
    apiKey,
    config.get<string>('EMBEDDINGS_MODEL') ?? DEFAULT_EMBEDDINGS_MODEL,
  );
}

/**
 * Factory: semantic search when embeddings are available and the CV indexes
 * fine, wrapped so a failed search falls back to the whole CV. Otherwise, the
 * whole CV for every question.
 */
export async function createRetriever(
  embeddings: EmbeddingsInterface | null,
  knowledge: KnowledgeRepository,
  config: ConfigService,
): Promise<Retriever> {
  const logger = new Logger('RetrieverFactory');
  const wholeKnowledge = new WholeKnowledgeRetriever(knowledge);

  if (!embeddings) {
    logger.warn('No GEMINI_API_KEY: every question gets the whole CV');
    return wholeKnowledge;
  }

  const startedAt = Date.now();
  const chunks = await knowledge.getAll();
  const vector = new VectorRetriever(
    embeddings,
    Number(config.get('RAG_TOP_K')) || DEFAULT_TOP_K,
  );
  try {
    await vector.index(chunks);
  } catch (error) {
    logger.error('Indexing failed: every question gets the whole CV', error);
    return wholeKnowledge;
  }
  logger.log(`Indexed ${chunks.length} chunks in ${Date.now() - startedAt} ms`);
  return new FallbackRetriever(vector, wholeKnowledge);
}
