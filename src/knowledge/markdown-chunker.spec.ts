import { splitMarkdown } from './markdown-chunker.js';

describe('splitMarkdown', () => {
  const markdown = `# Experiencia

Resumen general.

## Canai

Agente de IA por WhatsApp.

## Vacía

## uMov

Gráficas de pacientes.
`;

  it('creates one chunk per section, plus the intro', () => {
    const chunks = splitMarkdown('experiencia', markdown);
    expect(chunks.map((chunk) => chunk.metadata)).toEqual([
      { source: 'experiencia', section: 'Experiencia' },
      { source: 'experiencia', section: 'Canai' },
      { source: 'experiencia', section: 'uMov' },
    ]);
  });

  it('prefixes each chunk with "Title › Section" so it stands on its own', () => {
    const [, canai] = splitMarkdown('experiencia', markdown);
    expect(canai.pageContent).toBe(
      'Experiencia › Canai\n\nAgente de IA por WhatsApp.',
    );
  });

  it('handles Windows line endings', () => {
    const chunks = splitMarkdown('x', markdown.replaceAll('\n', '\r\n'));
    expect(chunks).toHaveLength(3);
  });
});
