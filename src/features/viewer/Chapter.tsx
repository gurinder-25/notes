import { Link, Navigate, useParams } from 'react-router-dom';
import { getChapter } from '../../lib/library';
import { renderBlock } from './noteRenderer';
import { ROUTES } from '../../constants/routes';

const Chapter = () => {
  const { subject: subjectSlug, chapter: chapterSlug } = useParams<{
    subject: string;
    chapter: string;
  }>();

  const chapter =
    subjectSlug && chapterSlug ? getChapter(subjectSlug, chapterSlug) : undefined;

  if (!chapter) return <Navigate to={ROUTES.HOME} replace />;

  return (
    <div className="page-wrapper">
      <main className="page-main">
        <Link to={ROUTES.SUBJECT.TO(chapter.subjectSlug)} className="nav-link">
          <span>←</span>
          <span>{chapter.subject}</span>
        </Link>

        <header className="page-header">
          <h1 className="page-title">{chapter.title}</h1>
          <p className="page-meta">{chapter.subject}</p>
        </header>

        <article>{chapter.blocks.map((block, index) => renderBlock(block, index))}</article>
      </main>
    </div>
  );
};

export default Chapter;
