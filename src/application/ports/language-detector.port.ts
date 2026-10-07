import type { QuestionLanguage } from '../../domain/conversation.js';

/** Port that tells which language a question is written in. */
export interface LanguageDetector {
  detect(text: string): QuestionLanguage;
}

export const LANGUAGE_DETECTOR = Symbol('LanguageDetector');
