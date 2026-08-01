// The storage format shared by the editor (which writes it) and the viewer
// (which renders it). This file is the single source of truth for both —
// adding a block type here surfaces as a compile error in whichever side
// doesn't handle it yet.

// ── Primitive marks ──────────────────────────────────────────────────────────

export type TextMark = 'bold' | 'italic' | 'underline' | 'code';

export interface TextNode {
  text: string;
  marks?: TextMark[];
}

// ── Block types ───────────────────────────────────────────────────────────────

export interface ParagraphBlock {
  type: 'paragraph';
  content: TextNode[];
}

export interface HeadingBlock {
  type: 'heading';
  level: 1 | 2 | 3;
  content: TextNode[];
}

export interface ListItem {
  content: TextNode[];
}

export interface ListBlock {
  type: 'list';
  ordered: boolean;
  items: ListItem[];
}

/** A fenced snippet. Stored as raw text — never as marked-up nodes, so code
 *  survives a round trip through the editor byte for byte. */
export interface CodeBlock {
  type: 'code';
  language: string;
  code: string;
}

export type Block = ParagraphBlock | HeadingBlock | ListBlock | CodeBlock;

// ── Stored chapter ────────────────────────────────────────────────────────────

/** One file under src/data/<subjectSlug>/<chapterSlug>.json. */
export interface Chapter {
  /** Display name of the subject this chapter belongs to, e.g. "Java". */
  subject: string;
  /** Display name of the chapter, e.g. "Collections Framework". */
  title: string;
  /** ISO date the file was first written. Chapters list in this order. */
  createdAt: string;
  /** ISO date of the last save. */
  updatedAt: string;
  blocks: Block[];
}

/** A chapter plus the slugs derived from its file path. */
export interface ChapterEntry extends Chapter {
  subjectSlug: string;
  slug: string;
}

export interface SubjectEntry {
  slug: string;
  name: string;
  chapters: ChapterEntry[];
}

// ── Runtime constants (as const replaces enum, compatible with erasableSyntaxOnly) ──

export const BlockType = {
  Paragraph: 'paragraph',
  Heading: 'heading',
  List: 'list',
  Code: 'code',
} as const satisfies Record<string, Block['type']>;
