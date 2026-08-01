// Editor-only state. The document format itself lives in src/types/note.ts,
// shared with the viewer.

export interface ActiveFormats {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  /** Caret sits inside an inline <code>. */
  code: boolean;
  /** Caret sits inside a <pre> — the whole block is a snippet. */
  codeBlock: boolean;
}
