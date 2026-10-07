import { CitationStreamFilter, extractCitations } from './citations.js';

describe('extractCitations', () => {
  it('removes the marker and returns the cited ids', () => {
    expect(extractCitations('Trabajó en Canai.\n\n[fuentes: 2, 5, 2]')).toEqual(
      { answer: 'Trabajó en Canai.', ids: [2, 5] },
    );
  });

  it('returns no ids for "ninguna" or a missing marker', () => {
    expect(extractCitations('Hola.\n[fuentes: ninguna]')).toEqual({
      answer: 'Hola.',
      ids: [],
    });
    expect(extractCitations('Hola.')).toEqual({ answer: 'Hola.', ids: [] });
  });
});

describe('CitationStreamFilter', () => {
  const run = (pieces: string[]) => {
    const filter = new CitationStreamFilter();
    const shown = pieces.map((piece) => filter.push(piece)).join('');
    const { rest, ids } = filter.finish();
    return { shown: shown + rest, ids };
  };

  it('never shows the marker, even when it arrives one character at a time', () => {
    const text = 'Usó **NestJS** en Canai.\n\n[fuentes: 1, 3]';
    expect(run(text.split(''))).toEqual({
      shown: 'Usó **NestJS** en Canai.\n\n',
      ids: [1, 3],
    });
  });

  it('shows brackets that are not a marker', () => {
    expect(run(['Ver [nota] y ', '[fue', 'ra de tema]. '])).toEqual({
      shown: 'Ver [nota] y [fuera de tema]. ',
      ids: [],
    });
  });

  it('streams text before a possible marker without waiting for the end', () => {
    const filter = new CitationStreamFilter();
    expect(filter.push('Hola. [fu')).toBe('Hola. ');
    expect(filter.push('entes: 4]')).toBe('');
    expect(filter.finish()).toEqual({ rest: '', ids: [4] });
  });
});
