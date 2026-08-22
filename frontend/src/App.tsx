import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { AuthProvider } from './hooks/useAuth';
import { RequireAuth, RequirePremium } from './components/RouteGuards';
import { trackPageView } from './analytics/ga';

import { LandingPage } from './pages/LandingPage';
import { SignupPage } from './pages/SignupPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { UnlockPage } from './pages/UnlockPage';
import { VideosPage } from './pages/VideosPage';
import { VideoPlayerPage } from './pages/VideoPlayerPage';
import { NotesPage } from './pages/NotesPage';
import { NoteReaderPage } from './pages/NoteReaderPage';
import { MockTestsPage } from './pages/MockTestsPage';
import { TestAttemptPage } from './pages/TestAttemptPage';
import { ResultsPage } from './pages/ResultsPage';
import { NotFoundPage } from './pages/NotFoundPage';

/** Reports every route change to Google Analytics. */
function PageViewTracker() {
  const { pathname } = useLocation();
  useEffect(() => trackPageView(pathname), [pathname]);
  return null;
}

/**
 * The whole route map in one place, grouped by who is allowed in.
 *
 * Note the deliberate split inside the logged-in group: the *catalogues*
 * (/videos, /notes, /mock-tests) are open to anyone logged in, because a
 * student who has not paid must be able to browse the locked content — that
 * is the sales pitch. Only actually opening an item requires payment.
 */
export function App() {
  return (
    // reducedMotion="user" makes every Motion animation in the app respect the
    // student's operating-system setting, so this is handled once, not per page.
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AuthProvider>
          <PageViewTracker />
          <Routes>
            {/* Anyone, logged in or not */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Logged in — content is listed, locked items shown greyed out */}
            <Route element={<RequireAuth />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/unlock" element={<UnlockPage />} />
              <Route path="/videos" element={<VideosPage />} />
              <Route path="/notes" element={<NotesPage />} />
              <Route path="/mock-tests" element={<MockTestsPage />} />
            </Route>

            {/* Logged in AND paid — opening the actual content */}
            <Route element={<RequirePremium />}>
              <Route path="/videos/:videoId" element={<VideoPlayerPage />} />
              <Route path="/notes/:noteId" element={<NoteReaderPage />} />
              <Route path="/mock-tests/:testId/attempt" element={<TestAttemptPage />} />
              <Route path="/results/:attemptId" element={<ResultsPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </MotionConfig>
  );
}
