import type { Block, TextNode } from '../../types/note';

export function renderText(node: TextNode, index: number) {
  let el: React.ReactNode = node.text;
  if (node.marks?.includes('code')) el = <code className="inline-code">{el}</code>;
  if (node.marks?.includes('bold')) el = <strong>{el}</strong>;
  if (node.marks?.includes('italic')) el = <em>{el}</em>;
  if (node.marks?.includes('underline')) el = <u>{el}</u>;
  return <span key={index}>{el}</span>;
}

export function renderBlock(block: Block, index: number) {
  switch (block.type) {
    case 'heading': {
      const sizes: Record<1 | 2 | 3, string> = {
        1: 'text-3xl',
        2: 'text-2xl',
        3: 'text-xl',
      };
      const Tag = `h${block.level}` as 'h1' | 'h2' | 'h3';
      return (
        <Tag key={index} className={`block-heading ${sizes[block.level]}`}>
          {block.content.map(renderText)}
        </Tag>
      );
    }

    case 'paragraph':
      return (
        <p key={index} className="note-text mb-5">
          {block.content.map(renderText)}
        </p>
      );

    case 'list': {
      const ListTag = block.ordered ? 'ol' : 'ul';
      return (
        <ListTag
          key={index}
          className={`${block.ordered ? 'list-decimal' : 'list-disc'} pl-5 mb-5 marker:text-faint`}
        >
          {block.items.map((item, i) => (
            <li key={i} className="note-text mb-2">
              {item.content.map(renderText)}
            </li>
          ))}
        </ListTag>
      );
    }

    case 'code':
      return (
        <pre key={index} className="code-block">
          <code>{block.code}</code>
        </pre>
      );

    default:
      return null;
  }
}
