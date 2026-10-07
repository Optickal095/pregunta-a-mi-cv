import {
  buildSearchQueries,
  formatContext,
  languageReminder,
} from './prompt-builder.js';
import { chunk } from '../../test/fakes/fixtures.js';

describe('languageReminder', () => {
  it('states the language outright for clear Spanish or English questions', () => {
    expect(languageReminder('en', 'es')).toContain('is in English');
    expect(languageReminder('es', 'en')).toContain('is in Spanish');
  });

  it('lets the model decide, falling back to the portfolio language', () => {
    expect(languageReminder('unknown', 'en')).toContain('answer in English');
    expect(languageReminder('other', 'es')).toContain(
      'only answer questions in Spanish or English',
    );
  });
});

describe('formatContext', () => {
  it('numbers each document from 1 so the model can cite it', () => {
    const context = formatContext([
      chunk('A', 'Texto A'),
      chunk('B', 'Texto B'),
    ]);
    expect(context).toBe(
      '<documento id="1" fuente="experiencia">\nTexto A\n</documento>\n\n' +
        '<documento id="2" fuente="experiencia">\nTexto B\n</documento>',
    );
  });
});

describe('buildSearchQueries', () => {
  it('searches with the message alone when there is no history', () => {
    expect(buildSearchQueries('¿Qué hizo en uMov?', [])).toEqual([
      '¿Qué hizo en uMov?',
    ]);
  });

  it('also searches with the previous question so follow-ups keep their topic', () => {
    expect(
      buildSearchQueries('¿Y qué tecnologías usó ahí?', [
        { role: 'user', content: '¿Qué hizo en uMov?' },
        { role: 'assistant', content: 'Construyó gráficas.' },
      ]),
    ).toEqual([
      '¿Y qué tecnologías usó ahí?',
      '¿Qué hizo en uMov?\n¿Y qué tecnologías usó ahí?',
    ]);
  });
});
