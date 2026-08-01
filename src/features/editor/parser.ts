import { BlockType } from '../../types/note';
import type { Block, TextNode, TextMark, ListItem, HeadingBlock } from '../../types/note';

// ── Inline node parser ────────────────────────────────────────────────────────

function parseInlineNode(node: Node, marks: TextMark[]): TextNode[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? '';
    if (!text) return [];
    return marks.length > 0 ? [{ text, marks }] : [{ text }];
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const next: TextMark[] = [...marks];

    if (tag === 'strong' || tag === 'b') next.push('bold');
    if (tag === 'em' || tag === 'i') next.push('italic');
    if (tag === 'u') next.push('underline');
    if (tag === 'code') next.push('code');

    const result: TextNode[] = [];
    el.childNodes.forEach((child) => result.push(...parseInlineNode(child, next)));
    return result;
  }

  return [];
}

function parseInline(el: HTMLElement): TextNode[] {
  const nodes: TextNode[] = [];
  el.childNodes.forEach((child) => nodes.push(...parseInlineNode(child, [])));
  return nodes.filter((n) => n.text);
}

/** Reads a `<pre>` back as raw text: `<br>` and block children become newlines. */
function parseCode(el: HTMLElement): string {
  let out = '';

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? '';
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tag = (node as HTMLElement).tagName.toLowerCase();
    if (tag === 'br') {
      out += '\n';
      return;
    }
    // Browsers sometimes split lines inside a <pre> into <div>s.
    if (tag === 'div' || tag === 'p') {
      if (out && !out.endsWith('\n')) out += '\n';
      node.childNodes.forEach(walk);
      return;
    }
    node.childNodes.forEach(walk);
  };

  el.childNodes.forEach(walk);

  // Indentation is typed as non-breaking spaces so the browser can't collapse
  // it; what gets stored is ordinary text.
  return out.replace(/\u00a0/g, ' ').replace(/[ \t]+$/gm, '').replace(/\n+$/, '');
}

// ── HTML → Block[] ────────────────────────────────────────────────────────────

export function parseHtmlToBlocks(html: string): Block[] {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const blocks: Block[] = [];

  doc.body.childNodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
        const level = parseInt(tag[1], 10) as HeadingBlock['level'];
        const content = parseInline(el);
        if (content.length) {
          blocks.push({ type: BlockType.Heading, level, content });
        }
      } else if (tag === 'pre') {
        const code = parseCode(el);
        if (code.trim()) {
          blocks.push({
            type: BlockType.Code,
            language: el.dataset.language || 'java',
            code,
          });
        }
      } else if (tag === 'ul' || tag === 'ol') {
        const items: ListItem[] = [];
        el.querySelectorAll('li').forEach((li) => {
          const content = parseInline(li);
          if (content.length) items.push({ content });
        });
        if (items.length) {
          blocks.push({ type: BlockType.List, ordered: tag === 'ol', items });
        }
      } else {
        const content = parseInline(el);
        if (content.some((n) => n.text.trim())) {
          blocks.push({ type: BlockType.Paragraph, content });
        }
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        blocks.push({ type: BlockType.Paragraph, content: [{ text }] });
      }
    }
  });

  return blocks;
}
