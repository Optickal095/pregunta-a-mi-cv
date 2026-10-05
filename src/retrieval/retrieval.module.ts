import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KnowledgeModule } from '../knowledge/knowledge.module.js';
import {
  DEFAULT_EMBEDDINGS_MODEL,
  GeminiEmbeddings,
} from './gemini-embeddings.js';
import { EMBEDDINGS } from './retrieval.constants.js';
import { RetrievalService } from './retrieval.service.js';

@Module({
  imports: [KnowledgeModule],
  providers: [
    RetrievalService,
    {
      provide: EMBEDDINGS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const apiKey = config.get<string>('GEMINI_API_KEY');
        if (!apiKey) return null;
        return new GeminiEmbeddings(
          apiKey,
          config.get<string>('EMBEDDINGS_MODEL') ?? DEFAULT_EMBEDDINGS_MODEL,
        );
      },
    },
  ],
  exports: [RetrievalService],
})
export class RetrievalModule {}
