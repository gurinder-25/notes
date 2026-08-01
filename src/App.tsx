import { lazy, Suspense, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom';
import { ROUTES } from './constants/routes';
import Home from './features/viewer/Home';
import Subject from './features/viewer/Subject';
import Chapter from './features/viewer/Chapter';

// React Router keeps the window scroll position across navigations, so a
// chapter opened from the bottom of a list would start mid-page.
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Writing is a local-only tool: it saves by talking to the Vite dev server, so
// it has nothing to do in a built bundle. import.meta.env.DEV is substituted
// with a literal at build time, dropping this branch — and lucide-react with
// it — from production.
const WriteHome = import.meta.env.DEV ? lazy(() => import('./features/editor/WriteHome')) : null;
const WriteSubject = import.meta.env.DEV
  ? lazy(() => import('./features/editor/WriteSubject'))
  : null;
const WriteChapter = import.meta.env.DEV
  ? lazy(() => import('./features/editor/WriteChapter'))
  : null;

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path={ROUTES.HOME} element={<Home />} />
        <Route path={ROUTES.SUBJECT.PATH} element={<Subject />} />
        <Route path={ROUTES.CHAPTER.PATH} element={<Chapter />} />

        {WriteHome && WriteSubject && WriteChapter && (
          <Route
            element={
              <Suspense fallback={null}>
                <Outlet />
              </Suspense>
            }
          >
            <Route path={ROUTES.WRITE} element={<WriteHome />} />
            <Route path={ROUTES.WRITE_SUBJECT.PATH} element={<WriteSubject />} />
            <Route path={ROUTES.WRITE_CHAPTER.PATH} element={<WriteChapter />} />
          </Route>
        )}

        <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
      </Routes>
    </Router>
  );
}

export default App;
