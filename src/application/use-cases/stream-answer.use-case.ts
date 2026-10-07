import { CitationStreamFilter, citedSources } from '../../domain/citations.js';
import type { AnswerEvent, Question } from '../../domain/conversation.js';
import type { ChatModel } from '../ports/chat-model.port.js';
import type { PrepareConversation } from './prepare-conversation.js';

/** Answers a question about Eduardo as the model writes it, then sends the CV sections it cites. */
export class StreamAnswerUseCase {
  constructor(
    private readonly prepare: PrepareConversation,
    private readonly model: ChatModel,
  ) {}

  /**
   * Nothing is yielded until the model sends its first piece, so a failed
   * call (no model, rate limit) rejects the first `next()` and the caller can
   * still report it before it starts streaming.
   */
  async *execute(question: Question): AsyncGenerator<AnswerEvent> {
    const { messages, chunks } = await this.prepare.execute(question);
    const pieces = this.model.stream(messages)[Symbol.asyncIterator]();
    let next = await pieces.next();

    const filter = new CitationStreamFilter();
    while (!next.done) {
      const text = filter.push(next.value);
      if (text) yield { type: 'token', text };
      next = await pieces.next();
    }

    const { rest, ids } = filter.finish();
    if (rest) yield { type: 'token', text: rest };
    yield { type: 'sources', sources: citedSources(chunks, ids) };
  }
}
