import type { Block, TextNode } from '../../types/note';
import { protectIndentation } from './commands';

// The inverse of parser.ts: turns a saved chapter back into the HTML the
// contentEditable body understands, so editing an existing chapter starts from
// exactly what was published.

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function serializeText(node: TextNode): string {
  let html = escapeHtml(node.text);
  if (node.marks?.includes('code')) html = `<code>${html}</code>`;
  if (node.marks?.includes('underline')) html = `<u>${html}</u>`;
  if (node.marks?.includes('italic')) html = `<em>${html}</em>`;
  if (node.marks?.includes('bold')) html = `<strong>${html}</strong>`;
  return html;
}

function serializeInline(content: TextNode[]): string {
  return content.map(serializeText).join('') || '<br>';
}

export function serializeBlocksToHtml(blocks: Block[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'heading':
          return `<h${block.level}>${serializeInline(block.content)}</h${block.level}>`;

        case 'paragraph':
          return `<p>${serializeInline(block.content)}</p>`;

        case 'list': {
          const tag = block.ordered ? 'ol' : 'ul';
          const items = block.items
            .map((item) => `<li>${serializeInline(item.content)}</li>`)
            .join('');
          return `<${tag}>${items}</${tag}>`;
        }

        case 'code': {
          // <br> rather than raw newlines: that is what the editor produces
          // while typing, so a round trip does not change the markup. Leading
          // whitespace goes back in non-breaking, or reopening a chapter would
          // flatten every indented line against the left edge.
          const lines = block.code
            .split('\n')
            .map((line) => escapeHtml(protectIndentation(line)))
            .join('<br>');
          return `<pre data-language="${escapeHtml(block.language)}">${lines}</pre>`;
        }

        default:
          return '';
      }
    })
    .join('');
}
