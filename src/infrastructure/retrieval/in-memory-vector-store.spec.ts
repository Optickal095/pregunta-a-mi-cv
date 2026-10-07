import { Document } from '@langchain/core/documents';
import { KeywordEmbeddings } from '../../../test/helpers/keyword-embeddings.js';
import {
  cosineSimilarity,
  InMemoryVectorStore,
} from './in-memory-vector-store.js';

describe('cosineSimilarity', () => {
  it('is 1 for the same direction and 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 2], [2, 4])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
  });

  it('is 0 when a vector is all zeros', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});

describe('InMemoryVectorStore', () => {
  it('returns the k most similar documents, best first', async () => {
    const store = new InMemoryVectorStore(new KeywordEmbeddings());
    await store.addDocuments([
      new Document({ pageContent: 'Trabajó en uMov' }),
      new Document({ pageContent: 'Trabajó en Canai con un agente' }),
      new Document({ pageContent: 'Tocata, su proyecto de título' }),
    ]);

    const results = await store.similaritySearch('¿Qué hizo en Canai?', 2);

    expect(results).toHaveLength(2);
    expect(results[0].pageContent).toContain('Canai');
  });
});
