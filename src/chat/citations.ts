/**
 * The model ends each answer with a line like `[fuentes: 2, 5]`: the ids of
 * the documents it used (`[fuentes: ninguna]` when it used none). That marker
 * becomes the answer's sources and is never shown to the visitor.
 */
const MARKER = /\[\s*fuentes\s*:([^\]]*)\]/gi;
const MARKER_START = '[fuentes:';

export const CITATION_INSTRUCTION =
  'Sources: after your answer, add one last line exactly like `[fuentes: 2, 5]` with the ids of the documents you used to answer, or `[fuentes: ninguna]` if you used none (greetings, refusals, questions not about Eduardo). Always write it with the Spanish word "fuentes", whatever the language of your answer.';

/** Removes every marker from a full answer and returns the cited ids. */
export function extractCitations(text: string): {
  answer: string;
  ids: number[];
} {
  const ids: number[] = [];
  const answer = text.replace(MARKER, (_, list: string) => {
    for (const id of list.match(/\d+/g) ?? []) ids.push(Number(id));
    return '';
  });
  return { answer: answer.trim(), ids: [...new Set(ids)] };
}

/**
 * Filters a streamed answer: text goes out as it arrives, except anything that
 * could still turn into a marker, which is held back until it can tell.
 */
export class CitationStreamFilter {
  private pending = '';
  private readonly ids: number[] = [];

  /** Adds a piece of the answer and returns the text that is safe to show. */
  push(text: string): string {
    this.pending += text;

    // Complete markers can be removed straight away.
    this.pending = this.pending.replace(MARKER, (_, list: string) => {
      for (const id of list.match(/\d+/g) ?? []) this.ids.push(Number(id));
      return '';
    });

    const start = this.pending.lastIndexOf('[');
    if (start !== -1 && couldBecomeMarker(this.pending.slice(start))) {
      const ready = this.pending.slice(0, start);
      this.pending = this.pending.slice(start);
      return ready;
    }
    const ready = this.pending;
    this.pending = '';
    return ready;
  }

  /** Ends the stream: returns any held-back text that was not a marker, and the cited ids. */
  finish(): { rest: string; ids: number[] } {
    const { answer, ids } = extractCitations(this.pending);
    this.pending = '';
    return { rest: answer, ids: [...new Set([...this.ids, ...ids])] };
  }
}

/** "[fue", "[fuentes: 1, " → true; "[link]" or "[nota" → false. */
function couldBecomeMarker(tail: string): boolean {
  const lower = tail.toLowerCase().replace(/\s+/g, ' ');
  return (
    MARKER_START.startsWith(lower) ||
    (lower.startsWith(MARKER_START) && !lower.includes(']'))
  );
}
