import type { Label } from './knowledge-chunk.js';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/** Languages the assistant works in; also the languages of the portfolio. */
export type ChatLocale = 'es' | 'en';

/**
 * Language of a question: `es` or `en` when clear, `other` for any other
 * language, `unknown` when the text is too short to tell (e.g. "NestJS?").
 */
export type QuestionLanguage = ChatLocale | 'other' | 'unknown';

export interface Question {
  message: string;
  /** Previous turns, oldest first. */
  history: ChatTurn[];
  /** Language of the page it comes from: the fallback when the question's own language is unclear. */
  locale: ChatLocale;
}

export interface Answer {
  text: string;
  /** The CV sections the answer cites. */
  sources: Label[];
}

/** A streamed answer: its text in pieces, then the sources it cited. */
export type AnswerEvent =
  { type: 'token'; text: string } | { type: 'sources'; sources: Label[] };
