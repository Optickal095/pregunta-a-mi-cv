import { Document } from '@langchain/core/documents';

export interface ChunkMetadata {
  /** File name without extension, e.g. `experiencia`. */
  source: string;
  /** The `##` heading of the chunk, or the document title for its intro. */
  section: string;
}

/**
 * Splits a Markdown document into one chunk per `##` section.
 *
 * The knowledge files are short and organised by topic, so a section is the
 * natural unit to retrieve. Each chunk starts with "Title › Section" so it
 * still makes sense on its own inside a prompt.
 */
export function splitMarkdown(
  source: string,
  markdown: string,
): Document<ChunkMetadata>[] {
  let title = source;
  const sections: { heading?: string; lines: string[] }[] = [{ lines: [] }];

  for (const line of markdown.split(/\r?\n/)) {
    if (line.startsWith('# ')) {
      title = line.slice(2).trim();
    } else if (line.startsWith('## ')) {
      sections.push({ heading: line.slice(3).trim(), lines: [] });
    } else {
      sections[sections.length - 1].lines.push(line);
    }
  }

  return sections.flatMap(({ heading, lines }) => {
    const body = lines.join('\n').trim();
    if (!body) return [];
    const header = heading ? `${title} › ${heading}` : title;
    return [
      new Document<ChunkMetadata>({
        pageContent: `${header}\n\n${body}`,
        metadata: { source, section: heading ?? title },
      }),
    ];
  });
}
