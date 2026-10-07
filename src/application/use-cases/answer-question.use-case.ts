import { citedSources, extractCitations } from '../../domain/citations.js';
import type { Answer, Question } from '../../domain/conversation.js';
import type { ChatModel } from '../ports/chat-model.port.js';
import type { PrepareConversation } from './prepare-conversation.js';

/** Answers a question about Eduardo in one piece, with the CV sections it cites. */
export class AnswerQuestionUseCase {
  constructor(
    private readonly prepare: PrepareConversation,
    private readonly model: ChatModel,
  ) {}

  async execute(question: Question): Promise<Answer> {
    const { messages, chunks } = await this.prepare.execute(question);
    const { answer, ids } = extractCitations(
      await this.model.complete(messages),
    );
    return { text: answer, sources: citedSources(chunks, ids) };
  }
}
