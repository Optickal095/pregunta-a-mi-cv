import {
  chunk,
  FixedLanguageDetector,
  FixedRetriever,
} from '../../../test/fakes/fixtures.js';
import { ScriptedChatModel } from '../../../test/fakes/scripted-chat-model.js';
import type { Question } from '../../domain/conversation.js';
import { AssistantRateLimitedError } from '../../domain/errors.js';
import { AnswerQuestionUseCase } from './answer-question.use-case.js';
import { PrepareConversation } from './prepare-conversation.js';
import { StreamAnswerUseCase } from './stream-answer.use-case.js';

const canai = chunk('Canai', 'Experiencia › Canai\n\nUsó NestJS.');
const umov = chunk('uMov', 'Experiencia › uMov\n\nUsó React.');

const question: Question = {
  message: '¿Usó NestJS?',
  history: [
    { role: 'user', content: 'Hola' },
    { role: 'assistant', content: '¡Hola! ¿Qué quieres saber?' },
  ],
  locale: 'es',
};

function setUp(answers: string[]) {
  const retriever = new FixedRetriever([canai, umov]);
  const model = new ScriptedChatModel(answers);
  const prepare = new PrepareConversation(
    retriever,
    new FixedLanguageDetector('es'),
  );
  return {
    retriever,
    model,
    answer: new AnswerQuestionUseCase(prepare, model),
    stream: new StreamAnswerUseCase(prepare, model),
  };
}

async function collect<T>(events: AsyncIterable<T>): Promise<T[]> {
  const all: T[] = [];
  for await (const event of events) all.push(event);
  return all;
}

describe('PrepareConversation', () => {
  it('searches with the question and with the previous question, then builds the prompt', async () => {
    const { retriever, model, answer } = setUp(['Sí.']);
    await answer.execute(question);

    expect(retriever.queries).toEqual([['¿Usó NestJS?', 'Hola\n¿Usó NestJS?']]);
    const prompt = model.prompts[0];
    expect(prompt.map((m) => m.role)).toEqual([
      'system',
      'user',
      'assistant',
      'system',
      'user',
    ]);
    expect(prompt[0].content).toContain(
      '<documento id="1" fuente="experiencia">',
    );
    expect(prompt[3].content).toContain('is in Spanish');
    expect(prompt[4].content).toBe('¿Usó NestJS?');
  });
});

describe('AnswerQuestionUseCase', () => {
  it('returns the answer without the citation marker, and only the cited sources', async () => {
    const { answer } = setUp(['  Sí, usó NestJS.\n\n[fuentes: 1]  ']);
    expect(await answer.execute(question)).toEqual({
      text: 'Sí, usó NestJS.',
      sources: [canai.label],
    });
  });

  it('lets domain errors from the model through', async () => {
    const { model, answer } = setUp(['x']);
    model.failWith(new AssistantRateLimitedError());
    await expect(answer.execute(question)).rejects.toBeInstanceOf(
      AssistantRateLimitedError,
    );
  });
});

describe('StreamAnswerUseCase', () => {
  it('streams the text, hides the marker and ends with the cited sources', async () => {
    const { stream } = setUp(['Sí [fuentes: 2, 9]']);
    expect(await collect(stream.execute(question))).toEqual([
      { type: 'token', text: 'S' },
      { type: 'token', text: 'í' },
      { type: 'token', text: ' ' },
      // Id 9 does not exist and is ignored.
      { type: 'sources', sources: [umov.label] },
    ]);
  });

  it('sends no sources when the model cites none', async () => {
    const { stream } = setUp(['Hola. [fuentes: ninguna]']);
    const events = await collect(stream.execute(question));
    expect(events.at(-1)).toEqual({ type: 'sources', sources: [] });
  });

  it('fails on the first next() when the model fails, before yielding anything', async () => {
    const { model, stream } = setUp(['x']);
    model.failWith(new AssistantRateLimitedError());
    await expect(stream.execute(question).next()).rejects.toBeInstanceOf(
      AssistantRateLimitedError,
    );
  });
});
