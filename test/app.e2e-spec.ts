import { Test, TestingModule } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { setupApp } from './../src/app.setup.js';
import { CHAT_MODEL } from './../src/application/ports/chat-model.port.js';
import {
  AssistantNotConfiguredError,
  AssistantRateLimitedError,
} from './../src/domain/errors.js';
import { EMBEDDINGS } from './../src/infrastructure/retrieval/retriever.factory.js';
import { ScriptedChatModel } from './fakes/scripted-chat-model.js';
import { KeywordEmbeddings } from './helpers/keyword-embeddings.js';

describe('API (e2e)', () => {
  let app: NestExpressApplication;
  let model: ScriptedChatModel;

  beforeEach(async () => {
    model = new ScriptedChatModel(['Trabajó en Canai. [fuentes: 1]']);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CHAT_MODEL)
      .useValue(model)
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

  it('POST /chat answers 429 when the model provider is rate-limited', async () => {
    model.failWith(new AssistantRateLimitedError());
    const response = await request(app.getHttpServer())
      .post('/chat')
      .send({ message: '¿Qué hizo en Canai?' })
      .expect(429);
    expect(response.body.message).toContain('muchas preguntas');
  });

  it('POST /chat/stream answers 503 before streaming when no model is configured', async () => {
    model.failWith(new AssistantNotConfiguredError());
    const response = await request(app.getHttpServer())
      .post('/chat/stream')
      .send({ message: '¿Qué hizo en Canai?' })
      .expect(503)
      .expect('Content-Type', /json/);
    expect(response.body.message).toContain('GROQ_API_KEY');
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
        .set('CF-Connecting-IP', ip)
        .send({ message: '¿Qué hizo en Canai?' });

    for (let i = 0; i < 5; i++) await ask('203.0.113.1').expect(200);

    const blocked = await ask('203.0.113.1').expect(429);
    expect(blocked.body.message).toContain('muchas preguntas');
    // Another visitor is not affected.
    await ask('203.0.113.2').expect(200);
  });

  it('ignores X-Forwarded-For, which visitors can spoof', async () => {
    const ask = (spoofedIp: string) =>
      request(app.getHttpServer())
        .post('/chat')
        .set('X-Forwarded-For', spoofedIp)
        .send({ message: '¿Qué hizo en Canai?' });

    for (let i = 0; i < 5; i++) await ask(`198.51.100.${i}`).expect(200);
    await ask('198.51.100.99').expect(429);
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
    expect(response.body.sources).toEqual([
      {
        es: 'Experiencia profesional › Software Engineer en Canai',
        en: 'Professional experience › Software Engineer at Canai',
      },
    ]);
  });

  it('POST /chat/stream sends the answer in pieces, then the sources and a final event', async () => {
    const response = await request(app.getHttpServer())
      .post('/chat/stream')
      .send({ message: '¿Qué hizo en Canai?' })
      .expect(200)
      .expect('Content-Type', /text\/event-stream/);

    const events = response.text
      .split('\n\n')
      .filter((block) => block.startsWith('data: '))
      .map((block) => JSON.parse(block.slice('data: '.length)));

    expect(events.map((event) => event.type).slice(-2)).toEqual([
      'sources',
      'done',
    ]);
    expect(events.at(-2).sources).toHaveLength(1);
    const tokens = events.filter((event) => event.type === 'token');
    expect(tokens.length).toBeGreaterThan(1);
    // The citation marker never reaches the visitor.
    expect(
      tokens
        .map((event) => event.text)
        .join('')
        .trim(),
    ).toBe('Trabajó en Canai.');
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

  it('POST /chat accepts only es or en as locale', async () => {
    await request(app.getHttpServer())
      .post('/chat')
      .send({ message: 'Hola', locale: 'en' })
      .expect(200);
    await request(app.getHttpServer())
      .post('/chat')
      .send({ message: 'Olá', locale: 'pt' })
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
