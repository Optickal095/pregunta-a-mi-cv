import { EldLanguageDetector } from './eld-language-detector.js';

describe('EldLanguageDetector', () => {
  const detector = new EldLanguageDetector();

  it.each([
    ['Has he led teams?', 'en'],
    ['What did he build at uMov?', 'en'],
    ['¿Ha liderado equipos?', 'es'],
    ['tiene experiencia con angular', 'es'],
    ['O que ele fez na Canai?', 'other'],
    ['Quelle est sa formation ?', 'other'],
    ['NestJS?', 'unknown'],
    ['hola', 'unknown'],
  ])('%s → %s', (text, expected) => {
    expect(detector.detect(text)).toBe(expected);
  });
});
