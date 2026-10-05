import { join } from 'node:path';
import { KnowledgeService } from './knowledge.service.js';

describe('KnowledgeService', () => {
  let service: KnowledgeService;

  beforeAll(async () => {
    service = new KnowledgeService(join(process.cwd(), 'knowledge'));
    await service.load();
  });

  it('loads every Markdown file in the knowledge folder', () => {
    const sources = service.getDocuments().map((doc) => doc.source);
    expect(sources).toEqual([
      'experiencia',
      'formacion',
      'perfil',
      'proyectos',
      'tecnologias',
    ]);
  });

  it('tags each document with its source in the prompt context', () => {
    const context = service.toContext();
    expect(context).toContain('<documento fuente="experiencia">');
    expect(context).toContain('Software Engineer en Canai');
  });
});
