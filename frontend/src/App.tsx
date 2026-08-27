import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { AuthProvider } from './hooks/useAuth';
import { RequireAuth, RequirePremium } from './components/RouteGuards';
import { AppShell } from './components/AppShell';
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
import { FormulaSheetsPage } from './pages/FormulaSheetsPage';
import { NcertHighlightsPage } from './pages/NcertHighlightsPage';
import { LibraryBookPage } from './pages/LibraryBookPage';
import { DocumentReaderPage } from './pages/DocumentReaderPage';
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

            {/* Logged in — content is listed, locked items shown greyed out.
                AppShell wraps these: the left rail is the navigation, and the
                page below it gets the full width of the screen. */}
            <Route element={<RequireAuth />}>
              <Route element={<AppShell />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/unlock" element={<UnlockPage />} />
                <Route path="/videos" element={<VideosPage />} />
                <Route path="/notes" element={<NotesPage />} />
                <Route path="/formula-sheets" element={<FormulaSheetsPage />} />
                <Route path="/ncert-highlights" element={<NcertHighlightsPage />} />
                <Route path="/mock-tests" element={<MockTestsPage />} />
                {/*
                  The readers sit here, not under RequirePremium: the free sample
                  has to reach GET /library/:id for the server to allow it, and
                  only the server knows which document is the sample. A locked
                  student gets a 403 and the page shows the unlock prompt.
                */}
                <Route path="/formula-sheets/:documentId" element={<DocumentReaderPage />} />
                <Route path="/ncert-highlights/:documentId" element={<DocumentReaderPage />} />

                {/* Same reasoning as the readers above: the free one-shot has to
                    reach GET /videos/:id/watch for the server to allow it. */}
                <Route path="/videos/:videoId" element={<VideoPlayerPage />} />

                {/* One book's contents. Two segments, so it never collides with
                    the one-segment reader route above. */}
                <Route
                  path="/formula-sheets/:subject/:grade"
                  element={
                    <LibraryBookPage
                      kind="formula_sheet"
                      detailBase="/formula-sheets"
                      label="formula sheets"
                    />
                  }
                />
                <Route
                  path="/ncert-highlights/:subject/:grade"
                  element={
                    <LibraryBookPage
                      kind="ncert_highlight"
                      detailBase="/ncert-highlights"
                      label="NCERT highlights"
                    />
                  }
                />
              </Route>
            </Route>

            {/* Logged in AND paid — opening the actual content */}
            <Route element={<RequirePremium />}>
              <Route element={<AppShell />}>
                <Route path="/notes/:noteId" element={<NoteReaderPage />} />
                <Route path="/results/:attemptId" element={<ResultsPage />} />
              </Route>
            </Route>

            {/* No shell during a live paper: a rail of links away from the
                question is a way to lose an attempt by accident. The free
                sample paper runs here too, so the gate is RequireAuth and the
                server decides. */}
            <Route element={<RequireAuth />}>
              <Route path="/mock-tests/:testId/attempt" element={<TestAttemptPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </MotionConfig>
  );
}
