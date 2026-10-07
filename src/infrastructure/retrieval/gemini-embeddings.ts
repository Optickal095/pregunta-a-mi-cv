import { Embeddings } from '@langchain/core/embeddings';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

export const DEFAULT_EMBEDDINGS_MODEL = 'gemini-embedding-2';

/**
 * Gemini embeddings through its free API tier.
 *
 * `gemini-embedding-2` has no task-type parameter: queries and documents are
 * told apart with the text templates Google recommends for retrieval. It is
 * multilingual, so English questions still match the Spanish CV.
 */
export class GeminiEmbeddings extends Embeddings {
  private readonly client: GoogleGenerativeAIEmbeddings;

  constructor(apiKey: string, model = DEFAULT_EMBEDDINGS_MODEL) {
    super({});
    this.client = new GoogleGenerativeAIEmbeddings({
      apiKey,
      model,
      outputDimensionality: 768,
    });
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const vectors = await this.client.embedDocuments(
      texts.map((text) => `title: none | text: ${text}`),
    );
    // LangChain turns a failed batch into empty vectors instead of throwing;
    // fail loudly so retrieval does not silently rank everything as equal.
    if (vectors.some((vector) => vector.length === 0)) {
      throw new Error('Gemini returned empty embeddings');
    }
    return vectors;
  }

  embedQuery(text: string): Promise<number[]> {
    return this.client.embedQuery(`task: search result | query: ${text}`);
  }
}
