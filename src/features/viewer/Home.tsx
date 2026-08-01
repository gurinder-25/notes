import { Link } from 'react-router-dom';
import { getSubjects } from '../../lib/library';
import { ROUTES } from '../../constants/routes';

const Home = () => {
  const subjects = getSubjects();

  return (
    <div className="page-wrapper">
      <main className="page-main">
        <header className="page-header">
          <h1 className="page-title">Notes</h1>
          <p className="page-meta">
            {subjects.length} {subjects.length === 1 ? 'subject' : 'subjects'}
          </p>
        </header>

        <h2 className="section-label">Subjects</h2>

        {subjects.length === 0 ? (
          <p className="empty-note">Nothing written yet.</p>
        ) : (
          <div className="index-list">
            {subjects.map((subject) => (
              <div key={subject.slug} className="index-item">
                <Link to={ROUTES.SUBJECT.TO(subject.slug)} className="index-item-link">
                  {subject.name}
                </Link>
                <span className="index-item-meta">
                  {subject.chapters.length}{' '}
                  {subject.chapters.length === 1 ? 'chapter' : 'chapters'}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
