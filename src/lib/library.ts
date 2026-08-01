import type { Chapter, ChapterEntry, SubjectEntry } from '../types/note';

// Every chapter is a plain JSON file the editor wrote to src/data. Globbing
// them is what makes "save creates a new file" enough on its own: there is no
// index to keep in sync, and Vite hot-reloads this module the moment a file
// lands on disk.
const files = import.meta.glob<Chapter>('../data/*/*.json', { eager: true, import: 'default' });

const PATH_PATTERN = /^\.\.\/data\/([^/]+)\/([^/]+)\.json$/;

function readEntries(): ChapterEntry[] {
  const entries: ChapterEntry[] = [];

  for (const [path, chapter] of Object.entries(files)) {
    const match = PATH_PATTERN.exec(path);
    if (!match) continue;
    entries.push({ ...chapter, subjectSlug: match[1], slug: match[2] });
  }

  return entries;
}

/** Subjects with their chapters, both in creation order. */
export function getSubjects(): SubjectEntry[] {
  const bySlug = new Map<string, SubjectEntry>();

  for (const entry of readEntries()) {
    let subject = bySlug.get(entry.subjectSlug);
    if (!subject) {
      subject = { slug: entry.subjectSlug, name: entry.subject, chapters: [] };
      bySlug.set(entry.subjectSlug, subject);
    }
    subject.chapters.push(entry);
  }

  const subjects = [...bySlug.values()];
  for (const subject of subjects) {
    subject.chapters.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  // A subject is only as old as its first chapter — that keeps the home list
  // in the order the subjects were actually started.
  return subjects.sort((a, b) =>
    (a.chapters[0]?.createdAt ?? '').localeCompare(b.chapters[0]?.createdAt ?? ''),
  );
}

export function getSubject(slug: string): SubjectEntry | undefined {
  return getSubjects().find((s) => s.slug === slug);
}

export function getChapter(subjectSlug: string, chapterSlug: string): ChapterEntry | undefined {
  return getSubject(subjectSlug)?.chapters.find((c) => c.slug === chapterSlug);
}
