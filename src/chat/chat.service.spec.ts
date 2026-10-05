import { ServiceUnavailableException } from '@nestjs/common';
import { Document } from '@langchain/core/documents';
import { FakeListChatModel } from '@langchain/core/utils/testing';
import type { BaseMessage } from '@langchain/core/messages';
import type { RetrievalService } from '../retrieval/retrieval.service.js';
import { buildSearchQueries, ChatService } from './chat.service.js';

const search = vi.fn().mockResolvedValue([
  new Document({
    pageContent: 'Experiencia › Canai\n\nUsó NestJS.',
    metadata: { source: 'experiencia', section: 'Canai' },
  }),
  new Document({
    pageContent: 'Tecnologías\n\nNestJS, Angular.',
    metadata: { source: 'tecnologias', section: 'Tecnologías' },
  }),
]);
const retrieval = { search } as unknown as RetrievalService;

describe('ChatService', () => {
  beforeEach(() => search.mockClear());

  it('answers with the retrieved chunks, the history and the question', async () => {
    const model = new FakeListChatModel({ responses: ['  Sí, usó NestJS.  '] });
    const invoke = vi.spyOn(model, 'invoke');
    const service = new ChatService(model, retrieval);

    const result = await service.answer({
      message: '¿Usó NestJS?',
      history: [
        { role: 'user', content: 'Hola' },
        { role: 'assistant', content: '¡Hola! ¿Qué quieres saber?' },
      ],
    });

    expect(result).toEqual({
      answer: 'Sí, usó NestJS.',
      sources: ['experiencia › Canai', 'tecnologias › Tecnologías'],
    });
    const messages = invoke.mock.calls[0][0] as BaseMessage[];
    expect(messages.map((m) => m.type)).toEqual([
      'system',
      'human',
      'ai',
      'system',
      'human',
    ]);
    expect(messages[0].text).toContain('<documento fuente="experiencia">');
    expect(messages[0].text).toContain('Usó NestJS.');
    expect(messages[3].text).toMatch(/^Language:/);
    expect(messages[4].text).toBe('¿Usó NestJS?');
  });

  it('falls back to the portfolio language for unclear or unsupported questions', async () => {
    const model = new FakeListChatModel({ responses: ['ok'] });
    const invoke = vi.spyOn(model, 'invoke');
    const service = new ChatService(model, retrieval);

    await service.answer({ message: 'NestJS?', locale: 'en' });
    await service.answer({ message: 'NestJS?' });

    const reminder = (call: number) =>
      (invoke.mock.calls[call][0] as BaseMessage[]).at(-2)?.text;
    expect(reminder(0)).toContain('reply in English');
    expect(reminder(1)).toContain('reply in Spanish');
  });

  it('fails with 503 when no model is configured', async () => {
    const service = new ChatService(null, retrieval);
    await expect(service.answer({ message: 'Hola' })).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(search).not.toHaveBeenCalled();
  });

  it('fails with 503 when the model call fails', async () => {
    const model = new FakeListChatModel({ responses: ['x'] });
    vi.spyOn(model, 'invoke').mockRejectedValue(new Error('Network error'));
    const service = new ChatService(model, retrieval);
    await expect(service.answer({ message: 'Hola' })).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('fails with 429 when the model provider rate-limits the request', async () => {
    const model = new FakeListChatModel({ responses: ['x'] });
    vi.spyOn(model, 'invoke').mockRejectedValue(
      Object.assign(new Error('Rate limit reached'), { status: 429 }),
    );
    const service = new ChatService(model, retrieval);
    await expect(service.answer({ message: 'Hola' })).rejects.toMatchObject({
      status: 429,
    });
  });
});

describe('ChatService.streamAnswer', () => {
  const collect = async (events: AsyncGenerator<unknown>) => {
    const all: unknown[] = [];
    for await (const event of events) all.push(event);
    return all;
  };

  it('yields the sources, the answer in pieces and a final event', async () => {
    const model = new FakeListChatModel({ responses: ['Sí'] });
    const service = new ChatService(model, retrieval);

    const events = await collect(service.streamAnswer({ message: 'Hola' }));

    expect(events).toEqual([
      {
        type: 'sources',
        sources: ['experiencia › Canai', 'tecnologias › Tecnologías'],
      },
      { type: 'token', text: 'S' },
      { type: 'token', text: 'í' },
      { type: 'done' },
    ]);
  });

  it('rejects before yielding anything when the provider rate-limits', async () => {
    const model = new FakeListChatModel({ responses: ['x'] });
    vi.spyOn(model, 'stream').mockRejectedValue(
      Object.assign(new Error('Rate limit reached'), { status: 429 }),
    );
    const service = new ChatService(model, retrieval);

    await expect(
      service.streamAnswer({ message: 'Hola' }).next(),
    ).rejects.toMatchObject({ status: 429 });
  });
});

describe('buildSearchQueries', () => {
  it('searches with the message alone when there is no history', () => {
    expect(buildSearchQueries('¿Qué hizo en uMov?', [])).toEqual([
      '¿Qué hizo en uMov?',
    ]);
  });

  it('also searches with the previous question so follow-ups keep their topic', () => {
    expect(
      buildSearchQueries('¿Y qué tecnologías usó ahí?', [
        { role: 'user', content: '¿Qué hizo en uMov?' },
        { role: 'assistant', content: 'Construyó gráficas.' },
      ]),
    ).toEqual([
      '¿Y qué tecnologías usó ahí?',
      '¿Qué hizo en uMov?\n¿Y qué tecnologías usó ahí?',
    ]);
  });
});
