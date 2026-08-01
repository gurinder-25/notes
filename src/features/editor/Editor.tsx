import { useState, useRef, useEffect, useCallback } from 'react';
import './editor.css';
import { useActiveFormats } from './hooks/useActiveFormats';
import { useSelectionRect } from './hooks/useSelectionRect';
import { SelectionToolbar } from './SelectionToolbar';
import {
  atBlankEndOfCodeBlock,
  breakLineKeepingIndent,
  closestTag,
  exitCodeBlock,
  indent,
  insertHardSpace,
  needsHardSpace,
  outdent,
  protectIndentation,
  toggleCodeBlock,
  toggleInlineCode,
} from './commands';

const CODE_FENCE = '```';

interface EditorProps {
  /** Written into the body once, on mount. The body is uncontrolled after
   *  that — React must never re-render over a live contentEditable. */
  initialHtml: string;
  /** Fires on every edit with the body's current HTML. */
  onChange: (html: string) => void;
  /** ⌘S inside the editor. */
  onSave: () => void;
  placeholder?: string;
}

export default function Editor({
  initialHtml,
  onChange,
  onSave,
  placeholder = 'Start writing…',
}: EditorProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(!initialHtml);

  const { activeFormats, updateActiveFormats } = useActiveFormats(bodyRef);
  const selectionRect = useSelectionRect(bodyRef);

  // execCommand leaves stray nodes behind, so :empty::before can't be trusted
  // to hide the placeholder — track emptiness ourselves.
  const syncEmptiness = useCallback(() => {
    const el = bodyRef.current;
    setIsEmpty(!el || (!el.textContent?.trim() && !el.querySelector('li')));
  }, []);

  const emit = useCallback(() => {
    onChange(bodyRef.current?.innerHTML ?? '');
    syncEmptiness();
    updateActiveFormats();
  }, [onChange, syncEmptiness, updateActiveFormats]);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.innerHTML = initialHtml;
    el.focus();

    // Land at the end of what is already written, so reopening a chapter (or
    // remounting after the first save) picks up where the writing stopped.
    if (initialHtml) {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }

    syncEmptiness();
    // Deliberately mount-only: initialHtml is a seed, not a binding.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', updateActiveFormats);
    return () => document.removeEventListener('selectionchange', updateActiveFormats);
  }, [updateActiveFormats]);

  const exec = useCallback(
    (command: string, value?: string) => {
      document.execCommand(command, false, value);
      emit();
    },
    [emit],
  );

  const handleToggleInlineCode = useCallback(() => {
    if (bodyRef.current) toggleInlineCode(bodyRef.current);
    emit();
  }, [emit]);

  const handleToggleCodeBlock = useCallback(() => {
    if (bodyRef.current) toggleCodeBlock(bodyRef.current);
    emit();
  }, [emit]);

  /** The <pre> the caret is currently inside, if any. */
  const currentPre = useCallback(() => {
    const root = bodyRef.current;
    const node = window.getSelection()?.anchorNode;
    return root && node ? closestTag(node, 'pre', root) : null;
  }, []);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      if (!text) return;

      if (currentPre()) {
        // Inside a snippet, newlines and leading whitespace are the point —
        // insertText alone would flatten the code onto one line and eat its
        // indentation.
        text.split('\n').forEach((line, i) => {
          if (i > 0) document.execCommand('insertLineBreak');
          const protectedLine = protectIndentation(line.replace(/\r$/, ''));
          if (protectedLine) document.execCommand('insertText', false, protectedLine);
        });
      } else {
        document.execCommand('insertText', false, text);
      }

      emit();
    },
    [currentPre, emit],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (mod && key === 's') {
        e.preventDefault();
        onSave();
        return;
      }

      if (mod && e.shiftKey && key === 'c') {
        e.preventDefault();
        handleToggleCodeBlock();
        return;
      }

      if (mod && key === 'e') {
        e.preventDefault();
        handleToggleInlineCode();
        return;
      }

      const pre = currentPre();
      if (!pre) return;

      // ── Inside a code snippet ───────────────────────────────────────────

      // Space at the start of a line, or after another space, is normally
      // dropped — so indenting by hand never took. Keep it.
      if (e.key === ' ' && !mod && !e.altKey && needsHardSpace(pre)) {
        e.preventDefault();
        insertHardSpace();
        emit();
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) outdent(pre);
        else indent();
        emit();
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        // A collapsed caret shows no selection bubble, so Enter on a blank
        // trailing line is the way out of a snippet.
        if (atBlankEndOfCodeBlock(pre)) exitCodeBlock(pre);
        else breakLineKeepingIndent(pre);
        emit();
      }
    },
    [currentPre, emit, handleToggleCodeBlock, handleToggleInlineCode, onSave],
  );

  // Markdown-style shortcut: ``` on its own line becomes a snippet. Without it
  // a snippet could only be started from a selection.
  const handleBeforeInput = useCallback(
    (e: React.FormEvent<HTMLDivElement>) => {
      const event = e.nativeEvent as InputEvent;
      if (event.data !== ' ' && event.inputType !== 'insertParagraph') return;

      const node = window.getSelection()?.anchorNode;
      if (node?.textContent?.trim() !== CODE_FENCE) return;
      if (currentPre()) return;

      e.preventDefault();
      node.textContent = '';
      handleToggleCodeBlock();
    },
    [currentPre, handleToggleCodeBlock],
  );

  // Clicking the margins should feel like clicking the page, not leaving it.
  const refocus = useCallback(() => {
    if (window.getSelection()?.isCollapsed !== false) bodyRef.current?.focus();
  }, []);

  return (
    <div className="editor-surface" onMouseUp={refocus} onKeyDown={handleKeyDown}>
      <div className="editor-sheet">
        {isEmpty && <div className="editor-placeholder">{placeholder}</div>}
        <div
          ref={bodyRef}
          className="editor-body"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Chapter body"
          onInput={emit}
          onBeforeInput={handleBeforeInput}
          onPaste={handlePaste}
        />
      </div>

      {selectionRect && (
        <SelectionToolbar
          rect={selectionRect}
          activeFormats={activeFormats}
          onExec={exec}
          onToggleInlineCode={handleToggleInlineCode}
          onToggleCodeBlock={handleToggleCodeBlock}
        />
      )}
    </div>
  );
}
