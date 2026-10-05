import { Module } from '@nestjs/common';
import { join } from 'node:path';
import { KNOWLEDGE_DIR, KnowledgeService } from './knowledge.service.js';

@Module({
  providers: [
    { provide: KNOWLEDGE_DIR, useValue: join(process.cwd(), 'knowledge') },
    KnowledgeService,
  ],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
