/** Filesystem-safe slug. Also the URL segment for a subject or chapter, so the
 *  two can never drift apart — the path is always derivable from the name. */
export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
