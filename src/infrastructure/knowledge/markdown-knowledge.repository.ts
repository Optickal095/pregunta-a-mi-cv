import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { KnowledgeRepository } from '../../application/ports/knowledge-repository.port.js';
import type { KnowledgeChunk } from '../../domain/knowledge-chunk.js';
import { splitMarkdown } from './markdown-chunker.js';

/**
 * Repository adapter: the CV lives in Markdown files (one per topic) in a
 * folder. They are read once and kept in memory.
 */
export class MarkdownKnowledgeRepository implements KnowledgeRepository {
  private chunks: Promise<KnowledgeChunk[]> | null = null;

  constructor(private readonly directory: string) {}

  getAll(): Promise<KnowledgeChunk[]> {
    this.chunks ??= this.load();
    return this.chunks;
  }

  private async load(): Promise<KnowledgeChunk[]> {
    const files = (await readdir(this.directory))
      .filter((file) => file.endsWith('.md'))
      .sort();
    const documents = await Promise.all(
      files.map(async (file) => ({
        source: file.replace(/\.md$/, ''),
        content: await readFile(join(this.directory, file), 'utf-8'),
      })),
    );
    return documents.flatMap((doc) => splitMarkdown(doc.source, doc.content));
  }
}
