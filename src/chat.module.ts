import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'node:path';
import {
  CHAT_MODEL,
  type ChatModel,
} from './application/ports/chat-model.port.js';
import { KNOWLEDGE_REPOSITORY } from './application/ports/knowledge-repository.port.js';
import {
  LANGUAGE_DETECTOR,
  type LanguageDetector,
} from './application/ports/language-detector.port.js';
import {
  RETRIEVER,
  type Retriever,
} from './application/ports/retriever.port.js';
import { AnswerQuestionUseCase } from './application/use-cases/answer-question.use-case.js';
import { PrepareConversation } from './application/use-cases/prepare-conversation.js';
import { StreamAnswerUseCase } from './application/use-cases/stream-answer.use-case.js';
import { createChatModel } from './infrastructure/ai/chat-model.factory.js';
import { MarkdownKnowledgeRepository } from './infrastructure/knowledge/markdown-knowledge.repository.js';
import { EldLanguageDetector } from './infrastructure/language/eld-language-detector.js';
import {
  createEmbeddings,
  createRetriever,
  EMBEDDINGS,
} from './infrastructure/retrieval/retriever.factory.js';
import { ChatController } from './presentation/http/chat.controller.js';

/**
 * Composition root: the only place that knows which adapter implements each
 * port. Use cases and domain are plain classes, wired here with factories.
 */
@Module({
  controllers: [ChatController],
  providers: [
    {
      provide: KNOWLEDGE_REPOSITORY,
      useFactory: () =>
        new MarkdownKnowledgeRepository(join(process.cwd(), 'knowledge')),
    },
    {
      provide: EMBEDDINGS,
      inject: [ConfigService],
      useFactory: createEmbeddings,
    },
    {
      provide: RETRIEVER,
      inject: [EMBEDDINGS, KNOWLEDGE_REPOSITORY, ConfigService],
      useFactory: createRetriever,
    },
    {
      provide: LANGUAGE_DETECTOR,
      useFactory: () => new EldLanguageDetector(),
    },
    {
      provide: CHAT_MODEL,
      inject: [ConfigService],
      useFactory: createChatModel,
    },
    {
      provide: PrepareConversation,
      inject: [RETRIEVER, LANGUAGE_DETECTOR],
      useFactory: (retriever: Retriever, detector: LanguageDetector) =>
        new PrepareConversation(retriever, detector),
    },
    {
      provide: AnswerQuestionUseCase,
      inject: [PrepareConversation, CHAT_MODEL],
      useFactory: (prepare: PrepareConversation, model: ChatModel) =>
        new AnswerQuestionUseCase(prepare, model),
    },
    {
      provide: StreamAnswerUseCase,
      inject: [PrepareConversation, CHAT_MODEL],
      useFactory: (prepare: PrepareConversation, model: ChatModel) =>
        new StreamAnswerUseCase(prepare, model),
    },
  ],
})
export class ChatModule {}
