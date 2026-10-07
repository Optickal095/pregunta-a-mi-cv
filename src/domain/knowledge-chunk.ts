/** A name to show the visitor, in both languages of the portfolio. */
export interface Label {
  es: string;
  en: string;
}

/**
 * One section of Eduardo's CV: the unit the assistant retrieves, puts in the
 * prompt and cites as a source.
 */
export interface KnowledgeChunk {
  /** Knowledge document it comes from, e.g. `experiencia`. */
  source: string;
  /** Its heading, or the document title for the document's intro. */
  section: string;
  /** "Document › Section" for showing it as a source of an answer. */
  label: Label;
  /** Self-contained text: starts with "Title › Section". */
  text: string;
}
