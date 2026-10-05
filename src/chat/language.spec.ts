import { buildLanguageReminder } from './chat.prompt.js';
import { detectLanguage } from './language.js';

describe('detectLanguage', () => {
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
    expect(detectLanguage(text)).toBe(expected);
  });
});

describe('buildLanguageReminder', () => {
  it('states the language outright for clear Spanish or English questions', () => {
    expect(buildLanguageReminder('en')).toContain('is in English');
    expect(buildLanguageReminder('es', 'en')).toContain('is in Spanish');
  });

  it('lets the model decide, falling back to the portfolio language', () => {
    expect(buildLanguageReminder('unknown', 'en')).toContain(
      'answer in English',
    );
    expect(buildLanguageReminder('other', 'es')).toContain(
      'only answer questions in Spanish or English',
    );
  });
});
