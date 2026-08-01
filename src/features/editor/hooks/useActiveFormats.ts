import { useState, useCallback } from 'react';
import type { RefObject } from 'react';
import type { ActiveFormats } from '../types';
import { isInCode, isInCodeBlock } from '../commands';

const DEFAULT_FORMATS: ActiveFormats = {
  bold: false,
  italic: false,
  underline: false,
  code: false,
  codeBlock: false,
};

interface UseActiveFormatsResult {
  activeFormats: ActiveFormats;
  updateActiveFormats: () => void;
}

export function useActiveFormats(
  editorRef: RefObject<HTMLElement | null>,
): UseActiveFormatsResult {
  const [activeFormats, setActiveFormats] = useState<ActiveFormats>(DEFAULT_FORMATS);

  const updateActiveFormats = useCallback(() => {
    const root = editorRef.current;
    try {
      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        code: !!root && isInCode(root),
        codeBlock: !!root && isInCodeBlock(root),
      });
    } catch {
      // ignore — queryCommandState can throw in some browsers
    }
  }, [editorRef]);

  return { activeFormats, updateActiveFormats };
}
