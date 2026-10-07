import { ConfigService } from '@nestjs/config';
import { KeywordEmbeddings } from '../../../test/helpers/keyword-embeddings.js';
import {
  chunk,
  FixedRetriever,
  InMemoryKnowledgeRepository,
} from '../../../test/fakes/fixtures.js';
import type { Retriever } from '../../application/ports/retriever.port.js';
import { FallbackRetriever } from './fallback-retriever.js';
import { createRetriever } from './retriever.factory.js';
import { interleaveUnique, VectorRetriever } from './vector-retriever.js';
import { WholeKnowledgeRetriever } from './whole-knowledge-retriever.js';

const canai = chunk('Canai', 'Experiencia › Canai\n\nAgente de IA.');
const umov = chunk('uMov', 'Experiencia › uMov\n\nGráficas de pacientes.');
const tocata = chunk(
  'Tocata',
  'Proyectos › Tocata\n\nRed social para músicos.',
  'proyectos',
);
const knowledge = new InMemoryKnowledgeRepository([canai, umov, tocata]);
const config = new ConfigService({ RAG_TOP_K: '1' });

const failing: Retriever = {
  search: () => Promise.reject(new Error('quota exceeded')),
};

describe('VectorRetriever', () => {
  it('returns the top-k chunks most similar to the question', async () => {
    const retriever = new VectorRetriever(new KeywordEmbeddings(), 1);
    await retriever.index([canai, umov, tocata]);
    expect(await retriever.search(['¿Qué hizo en uMov?'])).toEqual([umov]);
  });

  it('keeps the best match of every query when given several', async () => {
    const retriever = new VectorRetriever(new KeywordEmbeddings(), 1);
    await retriever.index([canai, umov, tocata]);
    const results = await retriever.search([
      '¿Qué estudió? Tocata',
      'Canai y uMov',
    ]);
    expect(results[0]).toBe(tocata);
    expect(results).toHaveLength(2);
  });
});

describe('interleaveUnique', () => {
  it('alternates the lists and drops repeats', () => {
    expect(
      interleaveUnique([
        [canai, umov],
        [tocata, canai],
      ]),
    ).toEqual([canai, tocata, umov]);
  });
});

describe('WholeKnowledgeRetriever', () => {
  it('returns the whole CV whatever the question', async () => {
    expect(
      await new WholeKnowledgeRetriever(knowledge).search(['x']),
    ).toHaveLength(3);
  });
});

describe('FallbackRetriever', () => {
  it('uses the primary retriever when it works', async () => {
    const retriever = new FallbackRetriever(
      new FixedRetriever([canai]),
      failing,
    );
    expect(await retriever.search(['x'])).toEqual([canai]);
  });

  it('uses the fallback when the primary fails', async () => {
    const retriever = new FallbackRetriever(
      failing,
      new FixedRetriever([umov]),
    );
    expect(await retriever.search(['x'])).toEqual([umov]);
  });
});

describe('createRetriever', () => {
  it('searches semantically, with the whole CV as fallback, when embeddings are available', async () => {
    const retriever = await createRetriever(
      new KeywordEmbeddings(),
      knowledge,
      config,
    );
    expect(retriever).toBeInstanceOf(FallbackRetriever);
    expect(await retriever.search(['¿Qué hizo en uMov?'])).toEqual([umov]);
  });

  it('uses the whole CV without embeddings', async () => {
    const retriever = await createRetriever(null, knowledge, config);
    expect(retriever).toBeInstanceOf(WholeKnowledgeRetriever);
  });

  it('uses the whole CV when indexing fails', async () => {
    const embeddings = new KeywordEmbeddings();
    vi.spyOn(embeddings, 'embedDocuments').mockRejectedValue(new Error('429'));
    const retriever = await createRetriever(embeddings, knowledge, config);
    expect(retriever).toBeInstanceOf(WholeKnowledgeRetriever);
  });
});
