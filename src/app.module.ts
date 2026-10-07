import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ChatModule } from './chat.module.js';
import { HealthController } from './presentation/http/health.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Per-IP limits for the chat endpoints. They keep one visitor from using
    // up the free Groq quota (about 8-10 questions per minute in total).
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'minute', ttl: 60_000, limit: 5 },
        { name: 'hour', ttl: 3_600_000, limit: 30 },
      ],
      errorMessage:
        'Hiciste muchas preguntas seguidas. Espera un momento antes de volver a preguntar.',
    }),
    ChatModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
