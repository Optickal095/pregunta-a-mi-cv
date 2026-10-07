import type {
  ChatModel,
  PromptMessage,
} from '../../application/ports/chat-model.port.js';
import { AssistantNotConfiguredError } from '../../domain/errors.js';

/**
 * Null Object: stands in for the model when no API key is configured, so the
 * use cases never need an `if (!model)`. Every call reports the missing setup.
 */
export class UnconfiguredChatModel implements ChatModel {
  complete(_messages: PromptMessage[]): Promise<string> {
    return Promise.reject(new AssistantNotConfiguredError());
  }

  // eslint-disable-next-line require-yield
  async *stream(_messages: PromptMessage[]): AsyncIterable<string> {
    throw new AssistantNotConfiguredError();
  }
}
