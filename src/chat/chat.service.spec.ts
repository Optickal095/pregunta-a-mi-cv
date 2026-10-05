import { ServiceUnavailableException } from '@nestjs/common';
import { FakeListChatModel } from '@langchain/core/utils/testing';
import type { BaseMessage } from '@langchain/core/messages';
import type { KnowledgeService } from '../knowledge/knowledge.service.js';
import { ChatService } from './chat.service.js';

const knowledge = {
  toContext: () => '<documento fuente="perfil">Ingeniero fullstack</documento>',
} as KnowledgeService;

describe('ChatService', () => {
  it('sends the system prompt, the history and the question, in order', async () => {
    const model = new FakeListChatModel({ responses: ['  Sí, usó NestJS.  '] });
    const invoke = vi.spyOn(model, 'invoke');
    const service = new ChatService(model, knowledge);

    const result = await service.answer({
      message: '¿Usó NestJS?',
      history: [
        { role: 'user', content: 'Hola' },
        { role: 'assistant', content: '¡Hola! ¿Qué quieres saber?' },
      ],
    });

    expect(result).toEqual({ answer: 'Sí, usó NestJS.' });
    const messages = invoke.mock.calls[0][0] as BaseMessage[];
    expect(messages.map((m) => m.type)).toEqual([
      'system',
      'human',
      'ai',
      'human',
    ]);
    expect(messages[0].text).toContain('Ingeniero fullstack');
    expect(messages[3].text).toBe('¿Usó NestJS?');
  });

  it('fails with 503 when no model is configured', async () => {
    const service = new ChatService(null, knowledge);
    await expect(service.answer({ message: 'Hola' })).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('fails with 503 when the model call fails', async () => {
    const model = new FakeListChatModel({ responses: ['x'] });
    vi.spyOn(model, 'invoke').mockRejectedValue(new Error('Network error'));
    const service = new ChatService(model, knowledge);
    await expect(service.answer({ message: 'Hola' })).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('fails with 429 when the model provider rate-limits the request', async () => {
    const model = new FakeListChatModel({ responses: ['x'] });
    vi.spyOn(model, 'invoke').mockRejectedValue(
      Object.assign(new Error('Rate limit reached'), { status: 429 }),
    );
    const service = new ChatService(model, knowledge);
    await expect(service.answer({ message: 'Hola' })).rejects.toMatchObject({
      status: 429,
    });
  });
});
