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
import type { DocumentInterface } from '@langchain/core/documents';
import type { ChunkMetadata, Label } from '../knowledge/markdown-chunker.js';
import { RetrievalService } from '../retrieval/retrieval.service.js';
import { CHAT_MODEL } from './chat.constants.js';
import {
  buildLanguageReminder,
  buildSystemPrompt,
  formatContext,
} from './chat.prompt.js';
import {
  CITATION_INSTRUCTION,
  CitationStreamFilter,
  extractCitations,
} from './citations.js';
import type {
  ChatRequestDto,
  ChatResponse,
  ChatStreamEvent,
  ChatTurnDto,
} from './dto/chat-request.dto.js';
import { detectLanguage } from './language.js';

type Chunk = DocumentInterface<ChunkMetadata>;

interface PreparedChat {
  model: BaseChatModel;
  messages: BaseMessage[];
  /** The documents in the prompt; a citation `n` is `chunks[n - 1]`. */
  chunks: Chunk[];
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @Inject(CHAT_MODEL) private readonly model: BaseChatModel | null,
    @Inject(RetrievalService) private readonly retrieval: RetrievalService,
  ) {}

  async answer(request: ChatRequestDto): Promise<ChatResponse> {
    const { model, messages, chunks } = await this.prepare(request);

    try {
      const result = await model.invoke(messages);
      const { answer, ids } = extractCitations(result.text);
      const sources = citedSources(chunks, ids);
      const inputTokens = result.usage_metadata?.input_tokens;
      this.logger.log(
        `Answered citing ${sources.length} of ${chunks.length} documents` +
          (inputTokens ? ` (${inputTokens} input tokens)` : ''),
      );
      return { answer, sources };
    } catch (error) {
      throw this.toHttpError(error);
    }
  }

  /**
   * Yields the answer text as the model writes it, then the sources it cited.
   *
   * Nothing is yielded until the model sends its first chunk, so a failed
   * call (rate limit, no API key) rejects the first `next()` and the
   * controller can still answer with a normal HTTP error.
   */
  async *streamAnswer(
    request: ChatRequestDto,
  ): AsyncGenerator<ChatStreamEvent> {
    const { model, messages, chunks } = await this.prepare(request);

    let pieces: AsyncIterator<BaseMessage>;
    let next: IteratorResult<BaseMessage>;
    try {
      pieces = (await model.stream(messages))[Symbol.asyncIterator]();
      next = await pieces.next();
    } catch (error) {
      throw this.toHttpError(error);
    }

    const filter = new CitationStreamFilter();
    try {
      while (!next.done) {
        const text = filter.push(next.value.text);
        if (text) yield { type: 'token', text };
        next = await pieces.next();
      }
    } catch (error) {
      throw this.toHttpError(error);
    }

    const { rest, ids } = filter.finish();
    if (rest) yield { type: 'token', text: rest };
    yield { type: 'sources', sources: citedSources(chunks, ids) };
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

    const messages: BaseMessage[] = [
      new SystemMessage(buildSystemPrompt(formatContext(chunks))),
      ...history.map((turn) =>
        turn.role === 'user'
          ? new HumanMessage(turn.content)
          : new AIMessage(turn.content),
      ),
      new SystemMessage(
        `${buildLanguageReminder(detectLanguage(message), locale)}\n\n${CITATION_INSTRUCTION}`,
      ),
      new HumanMessage(message),
    ];

    return { model: this.model, messages, chunks };
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

/** Labels of the cited documents, in citation order; unknown ids are ignored. */
function citedSources(chunks: Chunk[], ids: number[]): Label[] {
  return ids
    .map((id) => chunks[id - 1]?.metadata.label)
    .filter((label): label is Label => label !== undefined);
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
