import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { getSubjects } from '../../lib/library';
import { slugify } from '../../lib/slug';
import { ROUTES } from '../../constants/routes';

/** /write — the same list as /home, plus a way to start a new subject. */
const WriteHome = () => {
  const navigate = useNavigate();
  const subjects = getSubjects();
  const [newSubject, setNewSubject] = useState('');

  const slug = slugify(newSubject);
  const canCreate = slug.length > 0;

  // A subject has no file of its own — it exists once one of its chapters does,
  // so starting one just means opening a blank chapter under its slug.
  const createSubject = () => {
    if (!canCreate) return;
    navigate(ROUTES.WRITE_NEW_CHAPTER.TO(slug), { state: { subjectName: newSubject.trim() } });
  };

  return (
    <div className="page-wrapper">
      <main className="page-main">
        <div className="nav-bar">
          <Link to={ROUTES.HOME} className="nav-link">
            <span>←</span>
            <span>reading view</span>
          </Link>
          <span className="page-meta">writing · local only</span>
        </div>

        <header className="page-header">
          <h1 className="page-title">Write</h1>
          <p className="page-meta">Saves straight into src/data as JSON files.</p>
        </header>

        <h2 className="section-label">Subjects</h2>

        <div className="index-list mb-10">
          {subjects.length === 0 ? (
            <p className="empty-note">No subjects yet — start one below.</p>
          ) : (
            subjects.map((subject) => (
              <div key={subject.slug} className="index-item">
                <Link to={ROUTES.WRITE_SUBJECT.TO(subject.slug)} className="index-item-link">
                  {subject.name}
                </Link>
                <span className="index-item-meta">
                  {subject.chapters.length}{' '}
                  {subject.chapters.length === 1 ? 'chapter' : 'chapters'}
                </span>
              </div>
            ))
          )}
        </div>

        <h2 className="section-label">New subject</h2>

        <div className="flex items-center gap-3">
          <input
            className="text-input"
            placeholder="Java, DSA, System Design…"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createSubject()}
          />
          <button
            type="button"
            className="ghost-button whitespace-nowrap"
            disabled={!canCreate}
            onClick={createSubject}
          >
            <Plus size={15} />
            Start
          </button>
        </div>
      </main>
    </div>
  );
};

export default WriteHome;
