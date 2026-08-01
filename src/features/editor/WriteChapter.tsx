import { useCallback, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Check, Loader2, Save } from 'lucide-react';
import Editor from './Editor';
import { parseHtmlToBlocks } from './parser';
import { serializeBlocksToHtml } from './serializer';
import { saveChapter } from './api';
import { getChapter, getSubject } from '../../lib/library';
import { slugify } from '../../lib/slug';
import { ROUTES } from '../../constants/routes';
import type { Chapter } from '../../types/note';

const NEW = 'new';

type Status = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

interface ChapterEditorProps {
  subjectSlug: string;
  chapterSlug: string;
}

const ChapterEditor = ({ subjectSlug, chapterSlug }: ChapterEditorProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const existing = chapterSlug === NEW ? undefined : getChapter(subjectSlug, chapterSlug);

  // A brand-new subject has no file yet, so its display name arrives as router
  // state from /write. Falling back to the slug keeps a hard refresh usable.
  const suggestedSubject =
    (location.state as { subjectName?: string } | null)?.subjectName ??
    getSubject(subjectSlug)?.name ??
    subjectSlug;

  const [subjectName, setSubjectName] = useState(existing?.subject ?? suggestedSubject);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const htmlRef = useRef(existing ? serializeBlocksToHtml(existing.blocks) : '');
  const initialHtml = useMemo(() => htmlRef.current, []);

  const nextSubjectSlug = slugify(subjectName);
  const nextChapterSlug = slugify(title);
  const canSave = !!nextSubjectSlug && !!nextChapterSlug && status !== 'saving';

  const markDirty = useCallback((html: string) => {
    htmlRef.current = html;
    setStatus('dirty');
  }, []);

  const save = useCallback(async () => {
    if (!nextSubjectSlug || !nextChapterSlug) {
      setError('A chapter needs both a subject and a title before it can be saved.');
      setStatus('error');
      return;
    }

    setStatus('saving');
    setError(null);

    const now = new Date().toISOString();
    const chapter: Chapter = {
      subject: subjectName.trim(),
      title: title.trim(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      blocks: parseHtmlToBlocks(htmlRef.current),
    };

    try {
      await saveChapter({
        subjectSlug: nextSubjectSlug,
        chapterSlug: nextChapterSlug,
        previousSubjectSlug: existing?.subjectSlug,
        previousChapterSlug: existing?.slug,
        chapter,
      });

      setStatus('saved');

      // The file now owns the URL: a new chapter stops being /new, and a
      // renamed one follows its new slug.
      if (nextSubjectSlug !== subjectSlug || nextChapterSlug !== chapterSlug) {
        navigate(ROUTES.WRITE_CHAPTER.TO(nextSubjectSlug, nextChapterSlug), { replace: true });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
      setStatus('error');
    }
  }, [
    chapterSlug,
    existing,
    navigate,
    nextChapterSlug,
    nextSubjectSlug,
    subjectName,
    subjectSlug,
    title,
  ]);

  const handleSave = useCallback(() => void save(), [save]);

  return (
    <div className="page-wrapper">
      <div className="max-w-2xl mx-auto px-6 pt-16">
        <div className="nav-bar !mb-8">
          <Link to={ROUTES.WRITE_SUBJECT.TO(subjectSlug)} className="nav-link">
            <span>←</span>
            <span>{subjectName || 'subject'}</span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="page-meta">
              {status === 'saving' && (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 size={13} className="animate-spin" /> saving
                </span>
              )}
              {status === 'saved' && (
                <span className="inline-flex items-center gap-1.5">
                  <Check size={13} /> saved to src/data/{nextSubjectSlug}/{nextChapterSlug}.json
                </span>
              )}
              {status === 'dirty' && 'unsaved changes'}
            </span>
            <button
              type="button"
              className="ghost-button"
              disabled={!canSave}
              onClick={handleSave}
            >
              <Save size={15} />
              Save
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 mb-8 pb-6 border-b border-line">
          <input
            className="text-input"
            placeholder="Subject — e.g. Java"
            value={subjectName}
            onChange={(e) => {
              setSubjectName(e.target.value);
              setStatus('dirty');
            }}
          />
          <input
            className="text-input text-2xl font-semibold tracking-tight"
            placeholder="Chapter title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setStatus('dirty');
            }}
          />
        </div>

        {error && <p className="page-meta text-ink mb-4">{error}</p>}
      </div>

      <Editor
        initialHtml={initialHtml}
        onChange={markDirty}
        onSave={handleSave}
        placeholder="Write the chapter — ``` starts a code snippet."
      />
    </div>
  );
};

/** /write/:subject/:chapter — the chapter itself, editable.
 *
 *  Keyed on the path so that moving between chapters rebuilds the editor from
 *  the file being opened; the inner component reads its file exactly once. */
const WriteChapter = () => {
  const { subject = '', chapter = NEW } = useParams<{ subject: string; chapter: string }>();
  return <ChapterEditor key={`${subject}/${chapter}`} subjectSlug={subject} chapterSlug={chapter} />;
};

export default WriteChapter;
