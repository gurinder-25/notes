import { useState, useEffect, useCallback } from 'react';
import type { RefObject } from 'react';

export interface SelectionRect {
  top: number;
  left: number;
}

/**
 * Tracks the on-screen position of the current selection, but only while that
 * selection lives inside `editorRef`. Returns null whenever there is nothing
 * to anchor to — an empty selection, or one made elsewhere on the page.
 */
export function useSelectionRect(editorRef: RefObject<HTMLElement | null>): SelectionRect | null {
  const [rect, setRect] = useState<SelectionRect | null>(null);

  const update = useCallback(() => {
    const selection = window.getSelection();
    const editor = editorRef.current;

    if (!selection || !editor || selection.isCollapsed || selection.rangeCount === 0) {
      setRect(null);
      return;
    }

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) {
      setRect(null);
      return;
    }

    const bounds = range.getBoundingClientRect();
    if (bounds.width === 0 && bounds.height === 0) {
      setRect(null);
      return;
    }

    setRect({ top: bounds.top, left: bounds.left + bounds.width / 2 });
  }, [editorRef]);

  useEffect(() => {
    document.addEventListener('selectionchange', update);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);

    return () => {
      document.removeEventListener('selectionchange', update);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [update]);

  return rect;
}
