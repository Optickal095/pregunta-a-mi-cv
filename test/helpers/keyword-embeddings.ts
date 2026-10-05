import { Embeddings } from '@langchain/core/embeddings';

/**
 * Deterministic stand-in for the real embeddings model: each dimension counts
 * one keyword. Lets tests check retrieval without downloading a model.
 */
export class KeywordEmbeddings extends Embeddings {
  constructor(
    private readonly keywords = [
      'canai',
      'umov',
      'tocata',
      'liderado',
      'inglés',
    ],
  ) {
    super({});
  }

  embedDocuments(texts: string[]): Promise<number[][]> {
    return Promise.resolve(texts.map((text) => this.vectorize(text)));
  }

  embedQuery(text: string): Promise<number[]> {
    return Promise.resolve(this.vectorize(text));
  }

  private vectorize(text: string): number[] {
    const lower = text.toLowerCase();
    return this.keywords.map((keyword) => lower.split(keyword).length - 1);
  }
}
