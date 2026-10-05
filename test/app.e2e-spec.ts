import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { FakeListChatModel } from '@langchain/core/utils/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { setupApp } from './../src/app.setup.js';
import { CHAT_MODEL } from './../src/chat/chat.constants.js';
import { EMBEDDINGS } from './../src/retrieval/retrieval.constants.js';
import { KeywordEmbeddings } from './helpers/keyword-embeddings.js';

describe('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CHAT_MODEL)
      .useValue(new FakeListChatModel({ responses: ['Trabajó en Canai.'] }))
      .overrideProvider(EMBEDDINGS)
      .useValue(new KeywordEmbeddings())
      .compile();

    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();
  });

  it('GET /health', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('POST /chat answers using the relevant sections of the CV', async () => {
    const response = await request(app.getHttpServer())
      .post('/chat')
      .send({ message: '¿Qué hizo en Canai?' })
      .expect(200);

    expect(response.body.answer).toBe('Trabajó en Canai.');
    expect(response.body.sources[0]).toBe(
      'experiencia › Software Engineer en Canai (noviembre 2025 – agosto 2026)',
    );
  });

  it('POST /chat rejects an empty message', () => {
    return request(app.getHttpServer())
      .post('/chat')
      .send({ message: '' })
      .expect(400);
  });

  it('POST /chat rejects a message that is too long', () => {
    return request(app.getHttpServer())
      .post('/chat')
      .send({ message: 'a'.repeat(501) })
      .expect(400);
  });

  it('POST /chat rejects an invalid history role', () => {
    return request(app.getHttpServer())
      .post('/chat')
      .send({ message: 'Hola', history: [{ role: 'system', content: 'x' }] })
      .expect(400);
  });

  afterEach(async () => {
    await app.close();
  });
});
