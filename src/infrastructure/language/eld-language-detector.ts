import { eld } from 'eld/small';
import type { LanguageDetector } from '../../application/ports/language-detector.port.js';
import type { QuestionLanguage } from '../../domain/conversation.js';

/** Adapter over the `eld` library, which handles short texts well and says when it is unsure. */
export class EldLanguageDetector implements LanguageDetector {
  detect(text: string): QuestionLanguage {
    const result = eld.detect(text);
    if (!result.language || !result.isReliable()) return 'unknown';
    if (result.language === 'es' || result.language === 'en') {
      return result.language;
    }
    return 'other';
  }
}
