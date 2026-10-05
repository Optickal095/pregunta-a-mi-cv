import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KnowledgeModule } from '../knowledge/knowledge.module.js';
import { DEFAULT_EMBEDDINGS_MODEL, E5Embeddings } from './e5-embeddings.js';
import { EMBEDDINGS } from './retrieval.constants.js';
import { RetrievalService } from './retrieval.service.js';

@Module({
  imports: [KnowledgeModule],
  providers: [
    RetrievalService,
    {
      provide: EMBEDDINGS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new E5Embeddings(
          config.get<string>('EMBEDDINGS_MODEL') ?? DEFAULT_EMBEDDINGS_MODEL,
        ),
    },
  ],
  exports: [RetrievalService],
})
export class RetrievalModule {}
