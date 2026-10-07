import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AnswerQuestionUseCase } from '../../application/use-cases/answer-question.use-case.js';
import { StreamAnswerUseCase } from '../../application/use-cases/stream-answer.use-case.js';
import { AssistantError } from '../../domain/errors.js';
import { ClientIpThrottlerGuard } from './client-ip-throttler.guard.js';
import { ChatRequestDto } from './dto/chat-request.dto.js';
import {
  toChatResponse,
  type ChatResponse,
  type ChatStreamEvent,
} from './dto/chat-response.js';
import { openEventStream } from './event-stream.js';

/** HTTP entry point: validates input, calls a use case and writes its result. No business rules here. */
@Controller('chat')
@UseGuards(ClientIpThrottlerGuard)
export class ChatController {
  constructor(
    @Inject(AnswerQuestionUseCase)
    private readonly answerQuestion: AnswerQuestionUseCase,
    @Inject(StreamAnswerUseCase)
    private readonly streamAnswer: StreamAnswerUseCase,
  ) {}

  @Post()
  @HttpCode(200)
  async answer(@Body() body: ChatRequestDto): Promise<ChatResponse> {
    return toChatResponse(await this.answerQuestion.execute(body.toQuestion()));
  }

  /**
   * Same as `POST /chat`, but streams the answer as Server-Sent Events.
   *
   * It is a POST (the question and history go in the body), so the browser
   * reads it with `fetch` instead of `EventSource`.
   */
  @Post('stream')
  async stream(
    @Body() body: ChatRequestDto,
    @Res() res: Response,
  ): Promise<void> {
    const events = this.streamAnswer.execute(body.toQuestion());

    // Wait for the first event before sending headers, so setup errors
    // (no API key, rate limit) still reach the client as normal HTTP errors
    // through AssistantErrorFilter.
    const first = await events.next();

    const stream = openEventStream<ChatStreamEvent>(res);
    try {
      if (!first.done) stream.send(first.value);
      for await (const event of events) {
        if (stream.closed) break;
        stream.send(event);
      }
      stream.send({ type: 'done' });
    } catch (error) {
      stream.send({
        type: 'error',
        message:
          error instanceof AssistantError
            ? error.message
            : 'El asistente no está disponible en este momento.',
      });
    } finally {
      stream.end();
    }
  }
}
