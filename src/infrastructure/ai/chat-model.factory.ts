import type { ConfigService } from '@nestjs/config';
import { ChatGroq } from '@langchain/groq';
import type { ChatModel } from '../../application/ports/chat-model.port.js';
import { LangChainChatModel } from './langchain-chat-model.js';
import { UnconfiguredChatModel } from './unconfigured-chat-model.js';

export const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';

/** Factory: Groq when an API key is set, otherwise a model that reports the missing setup. */
export function createChatModel(config: ConfigService): ChatModel {
  const apiKey = config.get<string>('GROQ_API_KEY');
  if (!apiKey) return new UnconfiguredChatModel();
  return new LangChainChatModel(
    new ChatGroq({
      apiKey,
      model: config.get<string>('GROQ_MODEL') ?? DEFAULT_GROQ_MODEL,
      temperature: 0,
    }),
  );
}
