import { join } from 'node:path';
import { MarkdownKnowledgeRepository } from './markdown-knowledge.repository.js';

describe('MarkdownKnowledgeRepository', () => {
  const repository = new MarkdownKnowledgeRepository(
    join(process.cwd(), 'knowledge'),
  );

  it('loads every Markdown file in the knowledge folder', async () => {
    const sources = new Set(
      (await repository.getAll()).map((chunk) => chunk.source),
    );
    expect([...sources]).toEqual([
      'experiencia',
      'formacion',
      'perfil',
      'proyectos',
      'tecnologias',
    ]);
  });

  it('splits the CV into one chunk per section', async () => {
    const canai = (await repository.getAll()).find((chunk) =>
      chunk.section.includes('Canai'),
    );
    expect(canai?.source).toBe('experiencia');
    expect(canai?.text).toContain('Google Vision');
    expect(canai?.text).not.toContain('uMov');
  });

  it('reads the files only once', async () => {
    expect(await repository.getAll()).toBe(await repository.getAll());
  });
});
