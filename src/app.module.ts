import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { ChatModule } from './chat/chat.module.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ChatModule],
  controllers: [AppController],
})
export class AppModule {}
