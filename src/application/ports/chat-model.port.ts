/** A message of the conversation sent to the language model. */
export interface PromptMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Port to a language model. Adapters translate provider failures into the
 * domain errors (`AssistantRateLimitedError`, `AssistantUnavailableError`),
 * so the use cases never see provider-specific errors.
 */
export interface ChatModel {
  complete(messages: PromptMessage[]): Promise<string>;
  /** The answer in pieces, as the model writes it. */
  stream(messages: PromptMessage[]): AsyncIterable<string>;
}

export const CHAT_MODEL = Symbol('ChatModel');
