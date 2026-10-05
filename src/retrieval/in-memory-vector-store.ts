import type { DocumentInterface } from '@langchain/core/documents';
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import { VectorStore } from '@langchain/core/vectorstores';

interface StoredVector {
  embedding: number[];
  document: DocumentInterface;
}

/**
 * Minimal vector store kept in memory, ranked by cosine similarity.
 *
 * The knowledge base is a few dozen chunks, so a linear scan is instant and a
 * vector database would only add cost. Extending LangChain's `VectorStore`
 * keeps `similaritySearch` and `asRetriever` available.
 */
export class InMemoryVectorStore extends VectorStore {
  private vectors: StoredVector[] = [];

  constructor(embeddings: EmbeddingsInterface) {
    super(embeddings, {});
  }

  _vectorstoreType(): string {
    return 'in-memory';
  }

  async addDocuments(documents: DocumentInterface[]): Promise<void> {
    const embeddings = await this.embeddings.embedDocuments(
      documents.map((doc) => doc.pageContent),
    );
    await this.addVectors(embeddings, documents);
  }

  addVectors(
    vectors: number[][],
    documents: DocumentInterface[],
  ): Promise<void> {
    this.vectors.push(
      ...vectors.map((embedding, i) => ({ embedding, document: documents[i] })),
    );
    return Promise.resolve();
  }

  similaritySearchVectorWithScore(
    query: number[],
    k: number,
  ): Promise<[DocumentInterface, number][]> {
    const results = this.vectors
      .map(
        ({ embedding, document }) =>
          [document, cosineSimilarity(query, embedding)] as [
            DocumentInterface,
            number,
          ],
      )
      .sort((a, b) => b[1] - a[1])
      .slice(0, k);
    return Promise.resolve(results);
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA && normB ? dot / Math.sqrt(normA * normB) : 0;
}
