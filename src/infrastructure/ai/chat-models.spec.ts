import { FakeListChatModel } from '@langchain/core/utils/testing';
import type { BaseMessage } from '@langchain/core/messages';
import {
  AssistantNotConfiguredError,
  AssistantRateLimitedError,
  AssistantUnavailableError,
} from '../../domain/errors.js';
import { LangChainChatModel } from './langchain-chat-model.js';
import { UnconfiguredChatModel } from './unconfigured-chat-model.js';

const prompt = [
  { role: 'system' as const, content: 'Reglas' },
  { role: 'user' as const, content: 'Hola' },
  { role: 'assistant' as const, content: '¡Hola!' },
  { role: 'user' as const, content: '¿Qué hizo?' },
];

describe('LangChainChatModel', () => {
  it('maps the prompt to LangChain messages and returns the text', async () => {
    const fake = new FakeListChatModel({ responses: ['Trabajó en Canai.'] });
    const invoke = vi.spyOn(fake, 'invoke');

    expect(await new LangChainChatModel(fake).complete(prompt)).toBe(
      'Trabajó en Canai.',
    );
    const messages = invoke.mock.calls[0][0] as BaseMessage[];
    expect(messages.map((m) => m.type)).toEqual([
      'system',
      'human',
      'ai',
      'human',
    ]);
  });

  it('streams the answer in pieces', async () => {
    const pieces: string[] = [];
    const model = new LangChainChatModel(
      new FakeListChatModel({ responses: ['Sí'] }),
    );
    for await (const piece of model.stream(prompt)) pieces.push(piece);
    expect(pieces).toEqual(['S', 'í']);
  });

  it('turns a provider 429 into AssistantRateLimitedError', async () => {
    const fake = new FakeListChatModel({ responses: ['x'] });
    vi.spyOn(fake, 'invoke').mockRejectedValue(
      Object.assign(new Error('Rate limit'), { status: 429 }),
    );
    await expect(
      new LangChainChatModel(fake).complete(prompt),
    ).rejects.toBeInstanceOf(AssistantRateLimitedError);
  });

  it('turns any other failure into AssistantUnavailableError, also when streaming', async () => {
    const fake = new FakeListChatModel({ responses: ['x'] });
    vi.spyOn(fake, 'stream').mockRejectedValue(new Error('Network error'));
    const stream = new LangChainChatModel(fake)
      .stream(prompt)
      [Symbol.asyncIterator]();
    await expect(stream.next()).rejects.toBeInstanceOf(
      AssistantUnavailableError,
    );
  });
});

describe('UnconfiguredChatModel', () => {
  it('reports the missing configuration on every call', async () => {
    const model = new UnconfiguredChatModel();
    await expect(model.complete(prompt)).rejects.toBeInstanceOf(
      AssistantNotConfiguredError,
    );
    await expect(
      model.stream(prompt)[Symbol.asyncIterator]().next(),
    ).rejects.toBeInstanceOf(AssistantNotConfiguredError);
  });
});
