import { Embeddings } from '@langchain/core/embeddings';
import {
  type FeatureExtractionPipeline,
  pipeline,
} from '@huggingface/transformers';

export const DEFAULT_EMBEDDINGS_MODEL = 'Xenova/multilingual-e5-small';

/**
 * Multilingual E5 embeddings computed locally with Transformers.js: free, no
 * API key, and Spanish questions match English ones (and vice versa).
 *
 * E5 models expect a `query: ` or `passage: ` prefix on every input.
 * The model is downloaded on first use and cached on disk.
 */
export class E5Embeddings extends Embeddings {
  private extractor?: Promise<FeatureExtractionPipeline>;

  constructor(private readonly modelName = DEFAULT_EMBEDDINGS_MODEL) {
    super({});
  }

  embedDocuments(texts: string[]): Promise<number[][]> {
    return this.embed(texts.map((text) => `passage: ${text}`));
  }

  async embedQuery(text: string): Promise<number[]> {
    const [vector] = await this.embed([`query: ${text}`]);
    return vector;
  }

  private async embed(texts: string[]): Promise<number[][]> {
    this.extractor ??= pipeline('feature-extraction', this.modelName, {
      dtype: 'q8',
    }) as Promise<FeatureExtractionPipeline>;
    const extractor = await this.extractor;
    const output = await extractor(texts, { pooling: 'mean', normalize: true });
    return output.tolist() as number[][];
  }
}
