import { Link, Navigate, useParams } from 'react-router-dom';
import { getSubject } from '../../lib/library';
import { ROUTES } from '../../constants/routes';

const Subject = () => {
  const { subject: subjectSlug } = useParams<{ subject: string }>();
  const subject = subjectSlug ? getSubject(subjectSlug) : undefined;

  if (!subject) return <Navigate to={ROUTES.HOME} replace />;

  return (
    <div className="page-wrapper">
      <main className="page-main">
        <Link to={ROUTES.HOME} className="nav-link">
          <span>←</span>
          <span>all subjects</span>
        </Link>

        <header className="page-header">
          <h1 className="page-title">{subject.name}</h1>
          <p className="page-meta">
            {subject.chapters.length} {subject.chapters.length === 1 ? 'chapter' : 'chapters'}
          </p>
        </header>

        <h2 className="section-label">Chapters</h2>

        <div className="index-list">
          {subject.chapters.map((chapter) => (
            <div key={chapter.slug} className="index-item">
              <Link
                to={ROUTES.CHAPTER.TO(subject.slug, chapter.slug)}
                className="index-item-link"
              >
                {chapter.title}
              </Link>
              <span className="index-item-meta">{chapter.blocks.length} blocks</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Subject;
