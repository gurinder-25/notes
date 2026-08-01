import type { Chapter } from '../../types/note';

// Talks to the dev-server middleware in vite/notesApi.ts. Saving is a real
// file write into src/data — the chapter list on /home is just those files.

interface SaveRequest {
  subjectSlug: string;
  chapterSlug: string;
  previousSubjectSlug?: string;
  previousChapterSlug?: string;
  chapter: Chapter;
}

async function post(path: string, body: unknown): Promise<void> {
  const response = await fetch(`/__notes/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(detail?.error ?? `Save failed (${response.status})`);
  }
}

export function saveChapter(request: SaveRequest): Promise<void> {
  return post('save', request);
}

export function deleteChapter(subjectSlug: string, chapterSlug: string): Promise<void> {
  return post('delete', { subjectSlug, chapterSlug });
}
