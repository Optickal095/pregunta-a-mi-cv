import type { Answer, AnswerEvent } from '../../../domain/conversation.js';
import type { Label } from '../../../domain/knowledge-chunk.js';

/** Response of `POST /chat`. */
export interface ChatResponse {
  answer: string;
  /** The CV sections the answer cites, named in Spanish and English. */
  sources: Label[];
}

/** One Server-Sent Event of `POST /chat/stream`, sent as JSON in `data:`. */
export type ChatStreamEvent =
  AnswerEvent | { type: 'done' } | { type: 'error'; message: string };

export function toChatResponse(answer: Answer): ChatResponse {
  return { answer: answer.text, sources: answer.sources };
}
