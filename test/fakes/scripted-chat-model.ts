import type {
  ChatModel,
  PromptMessage,
} from '../../src/application/ports/chat-model.port.js';

/**
 * Test double for the `ChatModel` port: answers with scripted texts in order
 * (streaming them one character at a time), or fails with a given error.
 * Records every prompt it receives.
 */
export class ScriptedChatModel implements ChatModel {
  readonly prompts: PromptMessage[][] = [];
  private failure: Error | null = null;

  constructor(private readonly answers: string[] = ['Ok.']) {}

  failWith(error: Error): this {
    this.failure = error;
    return this;
  }

  complete(messages: PromptMessage[]): Promise<string> {
    this.prompts.push(messages);
    if (this.failure) return Promise.reject(this.failure);
    return Promise.resolve(this.nextAnswer());
  }

  async *stream(messages: PromptMessage[]): AsyncIterable<string> {
    this.prompts.push(messages);
    if (this.failure) throw this.failure;
    yield* this.nextAnswer().split('');
  }

  private nextAnswer(): string {
    return this.answers.length > 1
      ? (this.answers.shift() as string)
      : this.answers[0];
  }
}
