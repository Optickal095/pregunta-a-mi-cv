import { Test, TestingModule } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { FakeListChatModel } from '@langchain/core/utils/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { setupApp } from './../src/app.setup.js';
import { CHAT_MODEL } from './../src/chat/chat.constants.js';
import { EMBEDDINGS } from './../src/retrieval/retrieval.constants.js';
import { KeywordEmbeddings } from './helpers/keyword-embeddings.js';

describe('API (e2e)', () => {
  let app: NestExpressApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CHAT_MODEL)
      .useValue(new FakeListChatModel({ responses: ['Trabajó en Canai.'] }))
      .overrideProvider(EMBEDDINGS)
      .useValue(new KeywordEmbeddings())
      .compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    setupApp(app);
    await app.init();
  });

  it('GET /health', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('GET / redirects to the chat in the portfolio', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(302)
      .expect('Location', 'https://optickal095.github.io/portfolio/#pregunta');
  });

  it('limits each IP to 5 questions per minute', async () => {
    const ask = (ip: string) =>
      request(app.getHttpServer())
        .post('/chat')
        .set('X-Forwarded-For', ip)
        .send({ message: '¿Qué hizo en Canai?' });

    for (let i = 0; i < 5; i++) await ask('203.0.113.1').expect(200);

    const blocked = await ask('203.0.113.1').expect(429);
    expect(blocked.body.message).toContain('muchas preguntas');
    // Another visitor is not affected.
    await ask('203.0.113.2').expect(200);
  });

  it('does not rate-limit GET /health', async () => {
    for (let i = 0; i < 8; i++) {
      await request(app.getHttpServer()).get('/health').expect(200);
    }
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

  it('POST /chat/stream sends the sources, the answer in pieces and a final event', async () => {
    const response = await request(app.getHttpServer())
      .post('/chat/stream')
      .send({ message: '¿Qué hizo en Canai?' })
      .expect(200)
      .expect('Content-Type', /text\/event-stream/);

    const events = response.text
      .split('\n\n')
      .filter((block) => block.startsWith('data: '))
      .map((block) => JSON.parse(block.slice('data: '.length)));

    expect(events[0].type).toBe('sources');
    expect(events.at(-1)).toEqual({ type: 'done' });
    const tokens = events.filter((event) => event.type === 'token');
    expect(tokens.length).toBeGreaterThan(1);
    expect(tokens.map((event) => event.text).join('')).toBe(
      'Trabajó en Canai.',
    );
  });

  it('POST /chat/stream validates the body like POST /chat', () => {
    return request(app.getHttpServer())
      .post('/chat/stream')
      .send({ message: '' })
      .expect(400);
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
