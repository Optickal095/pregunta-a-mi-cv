import type { KnowledgeChunk, Label } from '../../domain/knowledge-chunk.js';

interface Section {
  heading?: string;
  en?: string;
  lines: string[];
}

/** `<!-- en: Leadership -->` right below a heading gives its English name. */
const ENGLISH_LABEL = /^<!--\s*en:\s*(.+?)\s*-->$/;

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
): KnowledgeChunk[] {
  const title = { text: source, en: source };
  const sections: Section[] = [{ lines: [] }];
  let lastHeading: { en?: string } | null = null;

  for (const line of markdown.split(/\r?\n/)) {
    const english = ENGLISH_LABEL.exec(line.trim());
    if (english) {
      if (lastHeading) lastHeading.en = english[1];
      continue;
    }
    if (line.startsWith('# ')) {
      title.text = line.slice(2).trim();
      title.en = title.text;
      lastHeading = title;
    } else if (line.startsWith('## ')) {
      const section: Section = { heading: line.slice(3).trim(), lines: [] };
      sections.push(section);
      lastHeading = section;
    } else {
      sections[sections.length - 1].lines.push(line);
      if (line.trim()) lastHeading = null;
    }
  }

  return sections.flatMap(({ heading, en, lines }) => {
    const body = lines.join('\n').trim();
    if (!body) return [];
    const header = heading ? `${title.text} › ${heading}` : title.text;
    const label: Label = heading
      ? {
          es: `${title.text} › ${withoutParenthetical(heading)}`,
          en: `${title.en} › ${en ?? withoutParenthetical(heading)}`,
        }
      : { es: title.text, en: title.en };
    return [
      {
        source,
        section: heading ?? title.text,
        label,
        text: `${header}\n\n${body}`,
      },
    ];
  });
}

/** "Software Engineer en Canai (noviembre 2025 – agosto 2026)" → "Software Engineer en Canai". */
function withoutParenthetical(heading: string): string {
  return heading.replace(/\s*\([^)]*\)\s*$/, '');
}
