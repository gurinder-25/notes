import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { getSubject } from '../../lib/library';
import { deleteChapter } from './api';
import { ROUTES } from '../../constants/routes';

/** /write/:subject — the chapter list, editable. */
const WriteSubject = () => {
  const navigate = useNavigate();
  const { subject: subjectSlug = '' } = useParams<{ subject: string }>();
  const subject = getSubject(subjectSlug);
  const [error, setError] = useState<string | null>(null);

  const remove = async (chapterSlug: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? The file is removed from src/data.`)) return;
    try {
      await deleteChapter(subjectSlug, chapterSlug);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  return (
    <div className="page-wrapper">
      <main className="page-main">
        <div className="nav-bar">
          <Link to={ROUTES.WRITE} className="nav-link">
            <span>←</span>
            <span>all subjects</span>
          </Link>
          <Link to={ROUTES.SUBJECT.TO(subjectSlug)} className="nav-link">
            reading view →
          </Link>
        </div>

        <header className="page-header">
          <h1 className="page-title">{subject?.name ?? subjectSlug}</h1>
          <p className="page-meta">
            {subject ? `${subject.chapters.length} chapters` : 'New subject — no chapters yet'}
          </p>
        </header>

        <h2 className="section-label">Chapters</h2>

        <div className="index-list mb-10">
          {!subject || subject.chapters.length === 0 ? (
            <p className="empty-note">Nothing here yet.</p>
          ) : (
            subject.chapters.map((chapter) => (
              <div key={chapter.slug} className="index-item">
                <Link
                  to={ROUTES.WRITE_CHAPTER.TO(subjectSlug, chapter.slug)}
                  className="index-item-link"
                >
                  {chapter.title}
                </Link>
                <span className="flex items-center gap-4">
                  <span className="index-item-meta">{chapter.updatedAt.slice(0, 10)}</span>
                  <button
                    type="button"
                    aria-label={`Delete ${chapter.title}`}
                    className="text-faint hover:text-ink transition-colors"
                    onClick={() => void remove(chapter.slug, chapter.title)}
                  >
                    <Trash2 size={15} />
                  </button>
                </span>
              </div>
            ))
          )}
        </div>

        {error && <p className="page-meta text-ink mb-6">{error}</p>}

        <button
          type="button"
          className="ghost-button"
          onClick={() =>
            navigate(ROUTES.WRITE_NEW_CHAPTER.TO(subjectSlug), {
              state: { subjectName: subject?.name },
            })
          }
        >
          <Plus size={15} />
          New chapter
        </button>
      </main>
    </div>
  );
};

export default WriteSubject;
