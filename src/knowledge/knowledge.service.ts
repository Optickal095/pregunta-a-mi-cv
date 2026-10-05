import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface KnowledgeDocument {
  /** File name without extension, e.g. `experiencia`. */
  source: string;
  content: string;
}

export const KNOWLEDGE_DIR = Symbol('KNOWLEDGE_DIR');

/** Loads the Markdown files that describe Eduardo's CV. */
@Injectable()
export class KnowledgeService implements OnModuleInit {
  private readonly logger = new Logger(KnowledgeService.name);
  private documents: KnowledgeDocument[] = [];

  constructor(@Inject(KNOWLEDGE_DIR) private readonly dir: string) {}

  async onModuleInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    const files = (await readdir(this.dir))
      .filter((file) => file.endsWith('.md'))
      .sort();

    this.documents = await Promise.all(
      files.map(async (file) => ({
        source: file.replace(/\.md$/, ''),
        content: (await readFile(join(this.dir, file), 'utf-8')).trim(),
      })),
    );
    this.logger.log(`Loaded ${this.documents.length} knowledge documents`);
  }

  getDocuments(): readonly KnowledgeDocument[] {
    return this.documents;
  }

  /** Every document, tagged with its source, ready to go into a prompt. */
  toContext(): string {
    return this.documents
      .map(
        (doc) =>
          `<documento fuente="${doc.source}">\n${doc.content}\n</documento>`,
      )
      .join('\n\n');
  }
}
