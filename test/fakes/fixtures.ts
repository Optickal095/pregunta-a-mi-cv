import type { KnowledgeRepository } from '../../src/application/ports/knowledge-repository.port.js';
import type { LanguageDetector } from '../../src/application/ports/language-detector.port.js';
import type { Retriever } from '../../src/application/ports/retriever.port.js';
import type { QuestionLanguage } from '../../src/domain/conversation.js';
import type { KnowledgeChunk } from '../../src/domain/knowledge-chunk.js';

export function chunk(
  section: string,
  text: string,
  source = 'experiencia',
): KnowledgeChunk {
  return {
    source,
    section,
    label: { es: `Experiencia › ${section}`, en: `Experience › ${section}` },
    text,
  };
}

/** Retriever double that always returns the same chunks and records the queries. */
export class FixedRetriever implements Retriever {
  readonly queries: string[][] = [];

  constructor(private readonly chunks: KnowledgeChunk[]) {}

  search(queries: string[]): Promise<KnowledgeChunk[]> {
    this.queries.push(queries);
    return Promise.resolve(this.chunks);
  }
}

export class FixedLanguageDetector implements LanguageDetector {
  constructor(private readonly language: QuestionLanguage) {}

  detect(): QuestionLanguage {
    return this.language;
  }
}

export class InMemoryKnowledgeRepository implements KnowledgeRepository {
  constructor(private readonly chunks: KnowledgeChunk[]) {}

  getAll(): Promise<KnowledgeChunk[]> {
    return Promise.resolve(this.chunks);
  }
}
