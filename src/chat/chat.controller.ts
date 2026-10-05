import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { ChatService } from './chat.service.js';
import { ChatRequestDto, type ChatResponse } from './dto/chat-request.dto.js';

@Controller('chat')
export class ChatController {
  constructor(@Inject(ChatService) private readonly chat: ChatService) {}

  @Post()
  @HttpCode(200)
  answer(@Body() body: ChatRequestDto): Promise<ChatResponse> {
    return this.chat.answer(body);
  }
}
