import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Document } from '@langchain/core/documents';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type ChunkMetadata, splitMarkdown } from './markdown-chunker.js';

export const KNOWLEDGE_DIR = Symbol('KNOWLEDGE_DIR');

/** Loads the Markdown files that describe Eduardo's CV and splits them into chunks. */
@Injectable()
export class KnowledgeService implements OnModuleInit {
  private readonly logger = new Logger(KnowledgeService.name);
  private chunks: Document<ChunkMetadata>[] = [];

  constructor(@Inject(KNOWLEDGE_DIR) private readonly dir: string) {}

  async onModuleInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    const files = (await readdir(this.dir))
      .filter((file) => file.endsWith('.md'))
      .sort();

    const documents = await Promise.all(
      files.map(async (file) => ({
        source: file.replace(/\.md$/, ''),
        content: await readFile(join(this.dir, file), 'utf-8'),
      })),
    );

    this.chunks = documents.flatMap((doc) =>
      splitMarkdown(doc.source, doc.content),
    );
    this.logger.log(
      `Loaded ${documents.length} knowledge documents (${this.chunks.length} chunks)`,
    );
  }

  getChunks(): readonly Document<ChunkMetadata>[] {
    return this.chunks;
  }
}
