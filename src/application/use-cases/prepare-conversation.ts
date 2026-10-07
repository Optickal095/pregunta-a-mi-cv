import type { Question } from '../../domain/conversation.js';
import type { KnowledgeChunk } from '../../domain/knowledge-chunk.js';
import type { PromptMessage } from '../ports/chat-model.port.js';
import type { LanguageDetector } from '../ports/language-detector.port.js';
import type { Retriever } from '../ports/retriever.port.js';
import { buildPrompt, buildSearchQueries } from '../prompt-builder.js';

export interface PreparedConversation {
  messages: PromptMessage[];
  /** The documents in the prompt, in order: citation `n` is `chunks[n - 1]`. */
  chunks: KnowledgeChunk[];
}

/** Shared first step of both use cases: find the relevant CV sections and build the prompt. */
export class PrepareConversation {
  constructor(
    private readonly retriever: Retriever,
    private readonly languageDetector: LanguageDetector,
  ) {}

  async execute(question: Question): Promise<PreparedConversation> {
    const chunks = await this.retriever.search(
      buildSearchQueries(question.message, question.history),
    );
    const messages = buildPrompt({
      chunks,
      history: question.history,
      message: question.message,
      language: this.languageDetector.detect(question.message),
      locale: question.locale,
    });
    return { messages, chunks };
  }
}
