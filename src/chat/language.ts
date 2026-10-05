import { eld } from 'eld/small';

/**
 * Language of a question: `es` or `en` when the detector is confident,
 * `other` for any other language, `unknown` when the text is too short to tell
 * (e.g. "NestJS?" or "hola").
 */
export type QuestionLanguage = 'es' | 'en' | 'other' | 'unknown';

export function detectLanguage(text: string): QuestionLanguage {
  const result = eld.detect(text);
  if (!result.language || !result.isReliable()) return 'unknown';
  if (result.language === 'es' || result.language === 'en') {
    return result.language;
  }
  return 'other';
}
