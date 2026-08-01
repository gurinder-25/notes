// Formatting that document.execCommand does not cover. Everything here works
// on the live selection inside the contentEditable body, mirroring how the
// built-in commands behave so the toolbar can treat them the same way.

/** Nearest ancestor with `tag`, stopping at the editor body. */
export function closestTag(node: Node | null, tag: string, root: HTMLElement): HTMLElement | null {
  let current: Node | null = node;
  while (current && current !== root) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const el = current as HTMLElement;
      if (el.tagName.toLowerCase() === tag) return el;
    }
    current = current.parentNode;
  }
  return null;
}

function currentRange(root: HTMLElement): Range | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  return root.contains(range.commonAncestorContainer) ? range : null;
}

export function isInCode(root: HTMLElement): boolean {
  const range = currentRange(root);
  return !!range && !!closestTag(range.commonAncestorContainer, 'code', root);
}

export function isInCodeBlock(root: HTMLElement): boolean {
  const range = currentRange(root);
  return !!range && !!closestTag(range.commonAncestorContainer, 'pre', root);
}

function selectNodeContents(node: Node) {
  const range = document.createRange();
  range.selectNodeContents(node);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

/** Replaces an element with its own children, keeping them selected. */
function unwrap(el: HTMLElement) {
  const parent = el.parentNode;
  if (!parent) return;

  const moved = [...el.childNodes];
  const fragment = document.createDocumentFragment();
  moved.forEach((child) => fragment.appendChild(child));
  parent.replaceChild(fragment, el);

  if (moved.length > 0) {
    const range = document.createRange();
    range.setStartBefore(moved[0]);
    range.setEndAfter(moved[moved.length - 1]);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
}

/**
 * Wraps the selection in `<code>`, or unwraps it when it is already inside one.
 * Marked-up children are flattened — a snippet is plain text by definition.
 */
export function toggleInlineCode(root: HTMLElement): void {
  const range = currentRange(root);
  if (!range) return;

  const existing = closestTag(range.commonAncestorContainer, 'code', root);
  if (existing) {
    unwrap(existing);
    return;
  }

  if (range.collapsed) return;

  const text = range.toString();
  if (!text) return;

  const code = document.createElement('code');
  code.textContent = text;

  range.deleteContents();
  range.insertNode(code);
  selectNodeContents(code);
}

/**
 * Turns the current block into a `<pre>` snippet, or back into a paragraph.
 * formatBlock handles the conversion in both directions; the text of the block
 * survives either way.
 */
export function toggleCodeBlock(root: HTMLElement): void {
  const range = currentRange(root);
  if (!range) return;

  const pre = closestTag(range.commonAncestorContainer, 'pre', root);
  document.execCommand('formatBlock', false, pre ? '<p>' : '<pre>');
}

/** Places the caret at the very start of `node`. */
function collapseTo(node: Node, offset: number) {
  const range = document.createRange();
  range.setStart(node, offset);
  range.collapse(true);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

/**
 * Leaves a code block by inserting an empty paragraph after it. Called when the
 * user presses Enter on a blank trailing line — the way out that needs no
 * toolbar, since a collapsed caret never shows the selection bubble.
 */
export function exitCodeBlock(pre: HTMLElement): void {
  // Drop the blank line that triggered the exit, along with any indentation it
  // inherited.
  while (pre.lastChild && isBlankTail(pre.lastChild)) pre.removeChild(pre.lastChild);

  const paragraph = document.createElement('p');
  paragraph.appendChild(document.createElement('br'));
  pre.parentNode?.insertBefore(paragraph, pre.nextSibling);
  collapseTo(paragraph, 0);
}

function isBlankTail(node: Node): boolean {
  if (node.nodeType === Node.TEXT_NODE) return !stripSpace(node.textContent ?? '');
  return node.nodeName.toLowerCase() === 'br';
}

// ── Indentation ───────────────────────────────────────────────────────────────

/**
 * One indent level, written with non-breaking spaces. A run of ordinary spaces
 * typed into a contentEditable is at the browser's mercy — it collapses them on
 * the way in and drops them again on the way out, which is why indented pseudo
 * code would not survive. These are normalised back to plain spaces by the
 * parser, so what lands in src/data is ordinary text.
 */
export const NBSP = '\u00a0';
export const INDENT = NBSP + NBSP;

const INDENT_WIDTH = INDENT.length;

/** Space, tab, or non-breaking space — the three ways an indent can be spelled. */
const SPACE_RUN_AT_START = /^[ \t\u00a0]*/;
const SPACE_RUN_AT_END = /[ \t\u00a0]*$/;

function stripSpace(text: string): string {
  return text.replace(/[\s\u00a0]/g, '');
}

/** The text of a `<pre>`, with `<br>` read back as newlines. */
export function preText(pre: HTMLElement): string {
  let out = '';

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? '';
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    if (node.nodeName.toLowerCase() === 'br') {
      out += '\n';
      return;
    }
    node.childNodes.forEach(walk);
  };

  pre.childNodes.forEach(walk);
  return out;
}

/** True when the caret sits at the end of `pre`, on a line that is already blank. */
export function atBlankEndOfCodeBlock(pre: HTMLElement): boolean {
  const selection = window.getSelection();
  if (!selection || !selection.isCollapsed || selection.rangeCount === 0) return false;

  const caret = selection.getRangeAt(0);
  const rest = document.createRange();
  rest.selectNodeContents(pre);
  rest.setStart(caret.endContainer, caret.endOffset);
  if (stripSpace(rest.toString())) return false;

  // Browsers park a filler <br> at the end of an editable block; it reads as a
  // newline the user never typed, so drop one before judging. Auto-indent means
  // the blank line may still hold the whitespace it inherited.
  const text = preText(pre).replace(/\n[ \t\u00a0]*$/, '');
  return text.length > 0 && /\n[ \t\u00a0]*$/.test(text);
}

/** Everything in `pre` from its start up to the caret. */
function textBeforeCaret(pre: HTMLElement): string {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return '';

  const caret = selection.getRangeAt(0);
  const range = document.createRange();
  range.selectNodeContents(pre);
  range.setEnd(caret.startContainer, caret.startOffset);

  // preText walks a tree, and a Range is not one.
  const holder = document.createElement('div');
  holder.appendChild(range.cloneContents());
  return preText(holder);
}

/** The leading whitespace of the line the caret is on, as non-breaking spaces. */
export function currentIndent(pre: HTMLElement): string {
  const line = textBeforeCaret(pre).split('\n').pop() ?? '';
  const run = SPACE_RUN_AT_START.exec(line)?.[0] ?? '';
  return run.replace(/\t/g, INDENT).replace(/ /g, NBSP);
}

/** Inserts one indent level at the caret. */
export function indent(): void {
  document.execCommand('insertText', false, INDENT);
}

/**
 * True when a space typed at the caret would be thrown away — at the start of a
 * line, or straight after another space. Those are exactly the places where a
 * browser collapses whitespace, so they need a non-breaking space instead.
 */
export function needsHardSpace(pre: HTMLElement): boolean {
  const line = textBeforeCaret(pre).split('\n').pop() ?? '';
  return line === '' || /[ \t\u00a0]$/.test(line);
}

/** A space the browser will keep. */
export function insertHardSpace(): void {
  document.execCommand('insertText', false, NBSP);
}

/** Removes up to one indent level immediately before the caret. */
export function outdent(pre: HTMLElement): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const caret = selection.getRangeAt(0);
  if (caret.startContainer.nodeType !== Node.TEXT_NODE) return;

  const line = textBeforeCaret(pre).split('\n').pop() ?? '';
  const trailing = SPACE_RUN_AT_END.exec(line)?.[0] ?? '';
  const remove = Math.min(trailing.length, INDENT_WIDTH, caret.startOffset);
  if (remove === 0) return;

  const range = document.createRange();
  range.setEnd(caret.startContainer, caret.startOffset);
  range.setStart(caret.startContainer, caret.startOffset - remove);
  range.deleteContents();

  selection.removeAllRanges();
  selection.addRange(range);
}

/** Starts a new line in a snippet, carrying the current line's indentation —
 *  so the body of a loop stays put instead of snapping back to column zero. */
export function breakLineKeepingIndent(pre: HTMLElement): void {
  const indentation = currentIndent(pre);
  document.execCommand('insertLineBreak');
  if (indentation) document.execCommand('insertText', false, indentation);
}

/** Rewrites a line's leading whitespace so the browser cannot collapse it. For
 *  text arriving from outside the editor: a paste, or a reopened chapter. */
export function protectIndentation(line: string): string {
  return line.replace(SPACE_RUN_AT_START, (run) =>
    run.replace(/\t/g, INDENT).replace(/ /g, NBSP),
  );
}
