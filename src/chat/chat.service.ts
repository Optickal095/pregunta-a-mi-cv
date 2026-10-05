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
import { buildSystemPrompt, formatContext } from './chat.prompt.js';
import type {
  ChatRequestDto,
  ChatResponse,
  ChatTurnDto,
} from './dto/chat-request.dto.js';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @Inject(CHAT_MODEL) private readonly model: BaseChatModel | null,
    @Inject(RetrievalService) private readonly retrieval: RetrievalService,
  ) {}

  async answer({
    message,
    history = [],
  }: ChatRequestDto): Promise<ChatResponse> {
    if (!this.model) {
      throw new ServiceUnavailableException(
        'El chat no está configurado: falta GROQ_API_KEY.',
      );
    }

    const chunks = await this.retrieval.search(
      buildSearchQuery(message, history),
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
      new HumanMessage(message),
    ];

    try {
      const result = await this.model.invoke(messages);
      const inputTokens = result.usage_metadata?.input_tokens;
      this.logger.log(
        `Answered with ${chunks.length} chunks` +
          (inputTokens ? ` (${inputTokens} input tokens)` : ''),
      );
      return { answer: result.text.trim(), sources };
    } catch (error) {
      if (isRateLimitError(error)) {
        this.logger.warn('Groq rate limit reached');
        throw new HttpException(
          'Hay muchas preguntas en este momento. Inténtalo de nuevo en unos segundos.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      this.logger.error('The model call failed', error);
      throw new ServiceUnavailableException(
        'El asistente no está disponible en este momento. Inténtalo de nuevo en unos minutos.',
      );
    }
  }
}

/**
 * A follow-up like "¿y qué tecnologías usó ahí?" does not say where "ahí" is,
 * so the previous question joins the search to keep the topic.
 */
export function buildSearchQuery(
  message: string,
  history: ChatTurnDto[],
): string {
  const previousQuestion = history.findLast((turn) => turn.role === 'user');
  return previousQuestion ? `${previousQuestion.content}\n${message}` : message;
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
