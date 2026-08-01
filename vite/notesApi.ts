import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Connect, Plugin } from 'vite';

/** The editor only ever runs against the dev server, so writing chapters is a
 *  dev-server middleware rather than a real backend. `apply: 'serve'` keeps the
 *  whole thing out of production builds. */

const DATA_DIR = 'src/data';
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const MAX_BODY_BYTES = 2 * 1024 * 1024;

interface SavePayload {
  subjectSlug: string;
  chapterSlug: string;
  /** Set when a rename moved the chapter; the old file is removed after the
   *  new one is written, so a crash mid-save can duplicate but never lose. */
  previousSubjectSlug?: string;
  previousChapterSlug?: string;
  chapter: unknown;
}

interface DeletePayload {
  subjectSlug: string;
  chapterSlug: string;
}

function isSafeSlug(value: unknown): value is string {
  return typeof value === 'string' && SLUG_PATTERN.test(value);
}

function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk;
      if (body.length > MAX_BODY_BYTES) reject(new Error('Chapter is too large to save'));
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

export function notesApi(): Plugin {
  return {
    name: 'notes-api',
    apply: 'serve',

    configureServer(server) {
      const fileFor = (subjectSlug: string, chapterSlug: string) =>
        join(server.config.root, DATA_DIR, subjectSlug, `${chapterSlug}.json`);

      server.middlewares.use('/__notes', (req, res, next) => {
        if (req.method !== 'POST') return next();

        const respond = (status: number, payload: Record<string, unknown>) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(payload));
        };

        void (async () => {
          try {
            const body = JSON.parse(await readBody(req)) as SavePayload & DeletePayload;

            if (!isSafeSlug(body.subjectSlug) || !isSafeSlug(body.chapterSlug)) {
              return respond(400, { error: 'Subject and chapter names must not be empty.' });
            }

            const target = fileFor(body.subjectSlug, body.chapterSlug);

            if (req.url === '/delete') {
              await rm(target, { force: true });
              return respond(200, { ok: true });
            }

            if (req.url !== '/save') return next();

            await mkdir(dirname(target), { recursive: true });
            await writeFile(target, `${JSON.stringify(body.chapter, null, 2)}\n`, 'utf8');

            const from = body.previousSubjectSlug;
            const fromChapter = body.previousChapterSlug;
            if (isSafeSlug(from) && isSafeSlug(fromChapter)) {
              const previous = fileFor(from, fromChapter);
              if (previous !== target) await rm(previous, { force: true });
            }

            respond(200, { ok: true, path: `${DATA_DIR}/${body.subjectSlug}/${body.chapterSlug}.json` });
          } catch (error) {
            respond(500, { error: error instanceof Error ? error.message : 'Save failed' });
          }
        })();
      });
    },
  };
}
