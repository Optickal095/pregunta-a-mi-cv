import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatGroq } from '@langchain/groq';
import { RetrievalModule } from '../retrieval/retrieval.module.js';
import { CHAT_MODEL, DEFAULT_GROQ_MODEL } from './chat.constants.js';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.service.js';

@Module({
  imports: [RetrievalModule],
  controllers: [ChatController],
  providers: [
    ChatService,
    {
      provide: CHAT_MODEL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const apiKey = config.get<string>('GROQ_API_KEY');
        if (!apiKey) return null;
        return new ChatGroq({
          apiKey,
          model: config.get<string>('GROQ_MODEL') ?? DEFAULT_GROQ_MODEL,
          temperature: 0,
        });
      },
    },
  ],
})
export class ChatModule {}
