import { ConfigService } from '@nestjs/config';
import { Document } from '@langchain/core/documents';
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import { KeywordEmbeddings } from '../../test/helpers/keyword-embeddings.js';
import type { KnowledgeService } from '../knowledge/knowledge.service.js';
import { RetrievalService } from './retrieval.service.js';

const chunks = [
  new Document({
    pageContent: 'Experiencia › Canai\n\nAgente de IA.',
    metadata: { source: 'experiencia', section: 'Canai' },
  }),
  new Document({
    pageContent: 'Experiencia › uMov\n\nGráficas de pacientes.',
    metadata: { source: 'experiencia', section: 'uMov' },
  }),
  new Document({
    pageContent: 'Proyectos › Tocata\n\nRed social para músicos.',
    metadata: { source: 'proyectos', section: 'Tocata' },
  }),
];
const knowledge = { getChunks: () => chunks } as unknown as KnowledgeService;
const config = new ConfigService({ RAG_TOP_K: '1' });

async function createService(embeddings: EmbeddingsInterface | null) {
  const service = new RetrievalService(embeddings, knowledge, config);
  await service.onApplicationBootstrap();
  return service;
}

describe('RetrievalService', () => {
  it('returns the top-k chunks most similar to the question', async () => {
    const service = await createService(new KeywordEmbeddings());
    const results = await service.search('¿Qué hizo en uMov?');
    expect(results.map((chunk) => chunk.metadata.section)).toEqual(['uMov']);
  });

  it('keeps the best match of every query when given several', async () => {
    const service = await createService(new KeywordEmbeddings());
    const results = await service.search(
      '¿Qué estudió? Tocata',
      'Canai y uMov',
    );
    const sections = results.map((chunk) => chunk.metadata.section);
    expect(sections[0]).toBe('Tocata');
    expect(sections).toHaveLength(2);
  });

  it('uses the whole CV when there are no embeddings', async () => {
    const service = await createService(null);
    expect(await service.search('¿Qué hizo en uMov?')).toHaveLength(3);
  });

  it('uses the whole CV when indexing fails', async () => {
    const failing = new KeywordEmbeddings();
    vi.spyOn(failing, 'embedDocuments').mockRejectedValue(new Error('429'));
    const service = await createService(failing);
    expect(await service.search('¿Qué hizo en uMov?')).toHaveLength(3);
  });

  it('uses the whole CV when a search fails', async () => {
    const flaky = new KeywordEmbeddings();
    const service = await createService(flaky);
    vi.spyOn(flaky, 'embedQuery').mockRejectedValue(new Error('timeout'));
    expect(await service.search('¿Qué hizo en uMov?')).toHaveLength(3);
  });
});
