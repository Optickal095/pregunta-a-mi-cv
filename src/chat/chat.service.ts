import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  type BaseMessage,
} from '@langchain/core/messages';
import { RetrievalService } from '../retrieval/retrieval.service.js';
import { CHAT_MODEL } from './chat.constants.js';
import { detectLanguage } from './language.js';
import {
  buildLanguageReminder,
  buildSystemPrompt,
  formatContext,
} from './chat.prompt.js';
import type {
  ChatRequestDto,
  ChatResponse,
  ChatStreamEvent,
  ChatTurnDto,
} from './dto/chat-request.dto.js';

interface PreparedChat {
  model: BaseChatModel;
  messages: BaseMessage[];
  sources: string[];
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @Inject(CHAT_MODEL) private readonly model: BaseChatModel | null,
    @Inject(RetrievalService) private readonly retrieval: RetrievalService,
  ) {}

  async answer(request: ChatRequestDto): Promise<ChatResponse> {
    const { model, messages, sources } = await this.prepare(request);

    try {
      const result = await model.invoke(messages);
      const inputTokens = result.usage_metadata?.input_tokens;
      this.logger.log(
        `Answered with ${sources.length} sources` +
          (inputTokens ? ` (${inputTokens} input tokens)` : ''),
      );
      return { answer: result.text.trim(), sources };
    } catch (error) {
      throw this.toHttpError(error);
    }
  }

  /**
   * Yields the sources, then the answer text as the model writes it.
   *
   * Nothing is yielded until the model sends its first chunk, so a failed
   * call (rate limit, no API key) rejects the first `next()` and the
   * controller can still answer with a normal HTTP error.
   */
  async *streamAnswer(
    request: ChatRequestDto,
  ): AsyncGenerator<ChatStreamEvent> {
    const { model, messages, sources } = await this.prepare(request);

    let chunks: AsyncIterator<BaseMessage>;
    let next: IteratorResult<BaseMessage>;
    try {
      chunks = (await model.stream(messages))[Symbol.asyncIterator]();
      next = await chunks.next();
    } catch (error) {
      throw this.toHttpError(error);
    }

    yield { type: 'sources', sources };
    try {
      while (!next.done) {
        if (next.value.text) yield { type: 'token', text: next.value.text };
        next = await chunks.next();
      }
    } catch (error) {
      throw this.toHttpError(error);
    }
    yield { type: 'done' };
  }

  private async prepare({
    message,
    history = [],
    locale,
  }: ChatRequestDto): Promise<PreparedChat> {
    if (!this.model) {
      throw new ServiceUnavailableException(
        'El chat no está configurado: falta GROQ_API_KEY.',
      );
    }

    const chunks = await this.retrieval.search(
      ...buildSearchQueries(message, history),
    );
    const sources = [
      ...new Set(
        chunks.map(
          ({ metadata }) => `${metadata.source} › ${metadata.section}`,
        ),
      ),
    ];

    const messages: BaseMessage[] = [
      new SystemMessage(buildSystemPrompt(formatContext(chunks))),
      ...history.map((turn) =>
        turn.role === 'user'
          ? new HumanMessage(turn.content)
          : new AIMessage(turn.content),
      ),
      new SystemMessage(buildLanguageReminder(detectLanguage(message), locale)),
      new HumanMessage(message),
    ];

    return { model: this.model, messages, sources };
  }

  private toHttpError(error: unknown): HttpException {
    if (isRateLimitError(error)) {
      this.logger.warn('Groq rate limit reached');
      return new HttpException(
        'Hay muchas preguntas en este momento. Inténtalo de nuevo en unos segundos.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    this.logger.error('The model call failed', error);
    return new ServiceUnavailableException(
      'El asistente no está disponible en este momento. Inténtalo de nuevo en unos minutos.',
    );
  }
}

/**
 * A follow-up like "¿y qué tecnologías usó ahí?" does not say where "ahí" is,
 * so a second search adds the previous question to keep the topic. The
 * question alone is always searched too: when the visitor changes topic
 * ("¿qué estudió?" after asking about Canai), the old topic must not crowd
 * out the new one.
 */
export function buildSearchQueries(
  message: string,
  history: ChatTurnDto[],
): string[] {
  const previousQuestion = history.findLast((turn) => turn.role === 'user');
  return previousQuestion
    ? [message, `${previousQuestion.content}\n${message}`]
    : [message];
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
