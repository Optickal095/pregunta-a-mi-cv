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
import { KnowledgeService } from '../knowledge/knowledge.service.js';
import { CHAT_MODEL } from './chat.constants.js';
import { buildSystemPrompt } from './chat.prompt.js';
import type { ChatRequestDto, ChatResponse } from './dto/chat-request.dto.js';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @Inject(CHAT_MODEL) private readonly model: BaseChatModel | null,
    @Inject(KnowledgeService) private readonly knowledge: KnowledgeService,
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

    const messages: BaseMessage[] = [
      new SystemMessage(buildSystemPrompt(this.knowledge.toContext())),
      ...history.map((turn) =>
        turn.role === 'user'
          ? new HumanMessage(turn.content)
          : new AIMessage(turn.content),
      ),
      new HumanMessage(message),
    ];

    try {
      const result = await this.model.invoke(messages);
      return { answer: result.text.trim() };
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

/** The free Groq plan caps tokens per minute; its SDK reports that as HTTP 429. */
function isRateLimitError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    error.status === 429
  );
}
