import { join } from 'node:path';
import { KnowledgeService } from './knowledge.service.js';

describe('KnowledgeService', () => {
  let service: KnowledgeService;

  beforeAll(async () => {
    service = new KnowledgeService(join(process.cwd(), 'knowledge'));
    await service.load();
  });

  it('loads every Markdown file in the knowledge folder', () => {
    const sources = new Set(
      service.getChunks().map((chunk) => chunk.metadata.source),
    );
    expect([...sources]).toEqual([
      'experiencia',
      'formacion',
      'perfil',
      'proyectos',
      'tecnologias',
    ]);
  });

  it('splits the CV into one chunk per section', () => {
    const canai = service
      .getChunks()
      .find((chunk) => chunk.metadata.section.includes('Canai'));
    expect(canai?.metadata.source).toBe('experiencia');
    expect(canai?.pageContent).toContain('Google Vision');
    expect(canai?.pageContent).not.toContain('uMov');
  });
});
