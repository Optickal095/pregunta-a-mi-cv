import { Logger } from '@nestjs/common';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  type BaseMessage,
} from '@langchain/core/messages';
import type {
  ChatModel,
  PromptMessage,
} from '../../application/ports/chat-model.port.js';
import {
  AssistantRateLimitedError,
  AssistantUnavailableError,
} from '../../domain/errors.js';

/**
 * Adapter: exposes any LangChain chat model (Groq in production) through the
 * `ChatModel` port, and turns provider errors into domain errors.
 */
export class LangChainChatModel implements ChatModel {
  private readonly logger = new Logger(LangChainChatModel.name);

  constructor(private readonly model: BaseChatModel) {}

  async complete(messages: PromptMessage[]): Promise<string> {
    try {
      const result = await this.model.invoke(toLangChain(messages));
      const tokens = result.usage_metadata?.input_tokens;
      if (tokens) this.logger.log(`Answered with ${tokens} input tokens`);
      return result.text;
    } catch (error) {
      throw this.toDomainError(error);
    }
  }

  async *stream(messages: PromptMessage[]): AsyncIterable<string> {
    try {
      for await (const chunk of await this.model.stream(
        toLangChain(messages),
      )) {
        if (chunk.text) yield chunk.text;
      }
    } catch (error) {
      throw this.toDomainError(error);
    }
  }

  private toDomainError(error: unknown): Error {
    if (isRateLimitError(error)) {
      this.logger.warn('Model provider rate limit reached');
      return new AssistantRateLimitedError();
    }
    this.logger.error('The model call failed', error);
    return new AssistantUnavailableError();
  }
}

function toLangChain(messages: PromptMessage[]): BaseMessage[] {
  return messages.map((message) => {
    switch (message.role) {
      case 'system':
        return new SystemMessage(message.content);
      case 'assistant':
        return new AIMessage(message.content);
      case 'user':
        return new HumanMessage(message.content);
    }
  });
}

/** The free Groq plan caps tokens per minute; its SDK reports that as HTTP 429. */
function isRateLimitError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    error.status === 429
  );
}
