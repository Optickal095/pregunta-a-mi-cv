import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  Inject,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ChatService } from './chat.service.js';
import { ClientIpThrottlerGuard } from './client-ip-throttler.guard.js';
import {
  ChatRequestDto,
  type ChatResponse,
  type ChatStreamEvent,
} from './dto/chat-request.dto.js';

@Controller('chat')
@UseGuards(ClientIpThrottlerGuard)
export class ChatController {
  constructor(@Inject(ChatService) private readonly chat: ChatService) {}

  @Post()
  @HttpCode(200)
  answer(@Body() body: ChatRequestDto): Promise<ChatResponse> {
    return this.chat.answer(body);
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
    const events = this.chat.streamAnswer(body);

    // Wait for the first event before sending headers, so setup errors
    // (no API key, rate limit) still reach the client as normal HTTP errors.
    const first = await events.next();

    res.status(200).set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();

    let closed = false;
    res.on('close', () => {
      closed = true;
    });
    const send = (event: ChatStreamEvent) =>
      res.write(`data: ${JSON.stringify(event)}\n\n`);

    try {
      if (!first.done) send(first.value);
      for await (const event of events) {
        if (closed) break;
        send(event);
      }
    } catch (error) {
      send({
        type: 'error',
        message:
          error instanceof HttpException
            ? error.message
            : 'El asistente no está disponible en este momento.',
      });
    } finally {
      res.end();
    }
  }
}
