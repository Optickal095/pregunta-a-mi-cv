import { splitMarkdown } from './markdown-chunker.js';

describe('splitMarkdown', () => {
  const markdown = `# Experiencia
<!-- en: Experience -->

Resumen general.

## Canai (2025 – 2026)
<!-- en: Work at Canai -->

Agente de IA por WhatsApp.

## Vacía

## uMov

Gráficas de pacientes.
`;

  it('creates one chunk per section, plus the intro', () => {
    const chunks = splitMarkdown('experiencia', markdown);
    expect(chunks.map((chunk) => chunk.metadata.section)).toEqual([
      'Experiencia',
      'Canai (2025 – 2026)',
      'uMov',
    ]);
  });

  it('prefixes each chunk with "Title › Section" so it stands on its own', () => {
    const [, canai] = splitMarkdown('experiencia', markdown);
    expect(canai.pageContent).toBe(
      'Experiencia › Canai (2025 – 2026)\n\nAgente de IA por WhatsApp.',
    );
  });

  it('labels each chunk in Spanish and English, without the dates', () => {
    const labels = splitMarkdown('experiencia', markdown).map(
      (chunk) => chunk.metadata.label,
    );
    expect(labels).toEqual([
      { es: 'Experiencia', en: 'Experience' },
      { es: 'Experiencia › Canai', en: 'Experience › Work at Canai' },
      // No English name given: the Spanish heading is used.
      { es: 'Experiencia › uMov', en: 'Experience › uMov' },
    ]);
  });

  it('keeps the English-name comments out of the text', () => {
    const chunks = splitMarkdown('experiencia', markdown);
    expect(chunks.some((chunk) => chunk.pageContent.includes('<!--'))).toBe(
      false,
    );
  });

  it('handles Windows line endings', () => {
    const chunks = splitMarkdown('x', markdown.replaceAll('\n', '\r\n'));
    expect(chunks).toHaveLength(3);
  });
});
