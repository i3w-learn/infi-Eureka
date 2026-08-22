import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ApiError } from '../api/client';
import { testsApi, type AttemptState, type LiveQuestion, type Option } from '../api/tests.api';
import { RichText } from '../components/RichText';

/**
 * The CBT exam screen: timer, subject tabs, question, OMR options,
 * mark-for-review, and the grouped question palette.
 *
 * The layout is ported from the InfiNotes mock-test player, which students
 * have already sat full papers on. Two things it got wrong are fixed here:
 *
 * 1. Auto-submit at time-up goes through a ref, so it submits the CURRENT
 *    answers (the original captured a stale empty state and scored 0).
 * 2. The clock counts down from the server's `secondsRemaining` and the
 *    server enforces `expiresAt` — reloading or editing the client cannot buy
 *    time. The original trusted localStorage.
 *
 * Deliberately animation-free where it matters: switching questions and
 * picking answers is instant. A student racing a timer needs response, not
 * choreography.
 */
const OPTIONS: Option[] = ['A', 'B', 'C', 'D'];

/** Under 10 minutes the clock turns red and pulses; under 30 it turns amber. */
const CRITICAL_SECONDS = 10 * 60;
const WARNING_SECONDS = 30 * 60;

function formatClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

/** How a question shows up in the palette. */
type CellStatus = 'unvisited' | 'seen' | 'answered' | 'review' | 'answered-review';

interface PaletteQuestion {
  question: LiveQuestion;
  /** Index into the flat, position-sorted question list. */
  index: number;
}

interface SubjectGroup {
  /** Null on papers with no subject breakdown — then there is only one group. */
  subject: string | null;
  sections: { section: 'A' | 'B' | null; questions: PaletteQuestion[] }[];
  /** Where the subject tab jumps to. */
  firstIndex: number;
  total: number;
}

/**
 * Buckets the paper into subject → section, keeping the order questions appear
 * in. NEET papers are contiguous blocks (Botany 1-45, Zoology 46-90, …), which
 * is why Next/Previous can stay simple index arithmetic and still walk from one
 * subject into the next the way the tabs suggest.
 */
function groupQuestions(questions: readonly LiveQuestion[]): SubjectGroup[] {
  const groups: SubjectGroup[] = [];

  questions.forEach((question, index) => {
    const subject = question.subject ?? null;
    let group = groups.find((g) => g.subject === subject);
    if (!group) {
      group = { subject, sections: [], firstIndex: index, total: 0 };
      groups.push(group);
    }

    const section = question.section ?? null;
    let bucket = group.sections.find((s) => s.section === section);
    if (!bucket) {
      bucket = { section, questions: [] };
      group.sections.push(bucket);
    }

    bucket.questions.push({ question, index });
    group.total += 1;
  });

  return groups;
}

export function TestAttemptPage() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState<AttemptState | null>(null);
  const [title, setTitle] = useState('Mock test');
  const [loadError, setLoadError] = useState<string>();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Option | null>>({});
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveWarning, setSaveWarning] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // ---- Load / resume ----
  useEffect(() => {
    if (!testId) return;
    let cancelled = false;
    testsApi
      .startAttempt(testId)
      .then((state) => {
        if (cancelled) return;
        if (state.status === 'submitted') {
          navigate(`/results/${state.attemptId}`, { replace: true });
          return;
        }
        setAttempt(state);
        setSecondsLeft(state.secondsRemaining);
        const restoredAnswers: Record<string, Option | null> = {};
        const restoredMarks = new Set<string>();
        for (const answer of state.answers) {
          restoredAnswers[answer.questionId] = answer.chosenOption;
          if (answer.markedForReview) restoredMarks.add(answer.questionId);
        }
        setAnswers(restoredAnswers);
        setMarked(restoredMarks);
        const first = [...state.questions].sort((a, b) => a.position - b.position)[0];
        if (first) setVisited(new Set([first.id]));
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(
          error instanceof ApiError ? error.message : 'Could not load the test. Check your connection.',
        );
      });
    return () => {
      cancelled = true;
    };
  }, [testId, navigate]);

  // The title is cosmetic, so a failure here must not block the exam.
  useEffect(() => {
    if (!testId) return;
    let cancelled = false;
    testsApi
      .get(testId)
      .then((test) => {
        if (!cancelled) setTitle(test.title);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [testId]);

  const questions = useMemo(
    () => (attempt ? [...attempt.questions].sort((a, b) => a.position - b.position) : []),
    [attempt],
  );
  const question = questions[current];
  const groups = useMemo(() => groupQuestions(questions), [questions]);

  /** Navigate to a question, recording it as seen for the palette. */
  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.min(Math.max(index, 0), questions.length - 1);
      setCurrent(clamped);
      setPaletteOpen(false);
      const target = questions[clamped];
      if (target) {
        setVisited((prev) => (prev.has(target.id) ? prev : new Set(prev).add(target.id)));
      }
    },
    [questions],
  );

  // ---- Submit (via ref, so the timer never captures stale state) ----
  const doSubmit = useCallback(async () => {
    if (!attempt || submitting) return;
    setSubmitting(true);
    try {
      const summary = await testsApi.submit(attempt.attemptId);
      navigate(`/results/${summary.attemptId}`, { replace: true });
    } catch (error) {
      // Time already up server-side still yields a scored attempt to show.
      if (error instanceof ApiError && attempt) {
        navigate(`/results/${attempt.attemptId}`, { replace: true });
      } else {
        setSubmitting(false);
        setConfirming(false);
        setSaveWarning(true);
      }
    }
  }, [attempt, submitting, navigate]);

  const submitRef = useRef(doSubmit);
  useEffect(() => {
    submitRef.current = doSubmit;
  }, [doSubmit]);

  // ---- Countdown; auto-submit at zero through the ref ----
  useEffect(() => {
    if (!attempt) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [attempt]);

  useEffect(() => {
    if (attempt && secondsLeft === 0) void submitRef.current();
  }, [attempt, secondsLeft]);

  // ---- Answering ----
  const persist = useCallback(
    (questionId: string, chosenOption: Option | null, markedForReview: boolean) => {
      if (!attempt) return;
      setSaveWarning(false);
      testsApi
        .saveAnswer(attempt.attemptId, { questionId, chosenOption, markedForReview })
        .catch(() => setSaveWarning(true));
    },
    [attempt],
  );

  function choose(option: Option) {
    if (!question) return;
    const next = answers[question.id] === option ? null : option;
    setAnswers((prev) => ({ ...prev, [question.id]: next }));
    persist(question.id, next, marked.has(question.id));
  }

  function toggleMarked() {
    if (!question) return;
    const next = new Set(marked);
    const nowMarked = !next.has(question.id);
    if (nowMarked) next.add(question.id);
    else next.delete(question.id);
    setMarked(next);
    persist(question.id, answers[question.id] ?? null, nowMarked);
  }

  const answeredCount = Object.values(answers).filter(Boolean).length;

  function statusOf(q: LiveQuestion): CellStatus {
    const answered = Boolean(answers[q.id]);
    const isMarked = marked.has(q.id);
    if (answered && isMarked) return 'answered-review';
    if (answered) return 'answered';
    if (isMarked) return 'review';
    return visited.has(q.id) ? 'seen' : 'unvisited';
  }

  function answeredIn(group: SubjectGroup): number {
    return group.sections.reduce(
      (sum, s) => sum + s.questions.filter(({ question: q }) => answers[q.id]).length,
      0,
    );
  }

  // ---- Render states ----
  if (loadError) {
    return (
      <div className="cbt grid min-h-screen place-items-center bg-paper px-6 text-center">
        <div>
          <p className="text-ink-soft">{loadError}</p>
          <button type="button" onClick={() => navigate('/mock-tests')} className="cbt-btn mt-5">
            Back to tests
          </button>
        </div>
      </div>
    );
  }

  if (!attempt || !question) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper">
        <p className="text-ink-faint">Setting up your test…</p>
      </div>
    );
  }

  const timerTone =
    secondsLeft <= CRITICAL_SECONDS ? 'critical' : secondsLeft <= WARNING_SECONDS ? 'warning' : 'normal';
  const currentSubject = question.subject ?? null;

  return (
    <div className="cbt flex min-h-screen flex-col bg-paper lg:h-screen lg:overflow-hidden">
      {/* ---- Header: paper, clock, submit — then the subject tabs ---- */}
      <header className="cbt-header z-30 shrink-0">
        <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-3 py-3 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <div className="flex min-w-0 items-center gap-2.5">
            <img
              src="/i3w-mark.png"
              alt=""
              aria-hidden="true"
              className="hidden h-8 w-auto shrink-0 sm:block"
            />
            <span className="truncate font-display text-sm font-bold sm:text-base">{title}</span>
          </div>

          <div
            data-testid="test-timer"
            data-tone={timerTone}
            className="cbt-timer order-last col-span-2 flex items-center justify-center gap-2 text-xl font-bold md:order-none md:col-span-1 sm:text-2xl"
            role="timer"
            aria-live="off"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 opacity-60" aria-hidden="true">
              <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M12 7v5l3 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {formatClock(secondsLeft)}
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="cbt-btn px-3 lg:hidden"
              aria-label="Open question navigator"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path
                  d="M5 3v18M5 4h11l-2 3 2 3H5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              data-testid="open-submit"
              data-variant="primary"
              onClick={() => setConfirming(true)}
              className="cbt-btn"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path d="M3 11l18-8-8 18-2-8-8-2z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
              Submit
            </button>
          </div>
        </div>

        {/* Subject tabs. Hidden on a paper with no subject breakdown, where a
            single "All questions" tab would say nothing. */}
        {groups.length > 1 ? (
          <div className="flex gap-3 overflow-x-auto px-3 pb-3 sm:px-6">
            {groups.map((group) => (
              <button
                key={group.subject ?? 'all'}
                type="button"
                data-testid={`subject-tab-${(group.subject ?? 'all').toLowerCase()}`}
                data-current={group.subject === currentSubject}
                onClick={() => goTo(group.firstIndex)}
                className="cbt-btn cbt-tab text-xs sm:text-sm"
              >
                {group.subject ?? 'All questions'}
                <span className="opacity-70">
                  {answeredIn(group)}/{group.total}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </header>

      <div className="flex flex-1 flex-col lg:flex-row lg:overflow-hidden">
        {/* ---- Question area ---- */}
        <main className="flex-1 p-4 sm:p-6 lg:overflow-y-auto lg:p-8">
          <div className="mx-auto max-w-3xl">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              {question.section ? (
                <span className="text-sm font-semibold text-ink-soft">
                  Section {question.section}
                  {question.section === 'B' ? ' (attempt any 10)' : ''}
                </span>
              ) : null}
              <span className="text-sm font-semibold text-marigold">
                +{question.marks} / −{question.negativeMarks}
              </span>
            </div>

            <div className="mb-3 flex items-center gap-3">
              <span className="rounded-bubble border border-marigold/25 bg-marigold-wash px-2.5 py-1 text-sm font-semibold text-marigold">
                Q{question.position}
              </span>
              {question.subject ? (
                <span className="text-xs text-ink-faint">{question.subject}</span>
              ) : null}
            </div>

            <div className="mb-7 text-base leading-relaxed sm:text-lg">
              <RichText>{question.questionText}</RichText>
            </div>

            <div className="mb-8 space-y-5">
              {OPTIONS.map((option) => {
                const selected = answers[question.id] === option;
                return (
                  <button
                    // Keyed by question too, so React mounts fresh buttons per
                    // question. Sharing them lets the selected -> unselected
                    // colour transition run on the NEXT question, flashing an
                    // answer the student never gave.
                    key={`${question.id}-${option}`}
                    type="button"
                    data-testid={`option-${option.toLowerCase()}`}
                    data-selected={selected}
                    onClick={() => choose(option)}
                    aria-pressed={selected}
                    className="cbt-option"
                  >
                    <span className="cbt-option-key">{option}</span>
                    <span className="flex-1 self-center text-sm leading-7 sm:text-base">
                      <RichText>{question.options[option]}</RichText>
                    </span>
                  </button>
                );
              })}
            </div>

            {saveWarning ? (
              <p role="alert" className="mb-5 text-sm text-danger">
                Could not reach the server — your last action may not be saved. Check your connection.
              </p>
            ) : null}

            {/* ---- Previous · Mark for review · Next ---- */}
            <div className="flex flex-col items-stretch justify-between gap-3 pb-8 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => goTo(current - 1)}
                disabled={current === 0}
                className="cbt-btn"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Previous
              </button>

              <button
                type="button"
                data-testid="mark-review"
                data-variant="ghost"
                data-active={marked.has(question.id)}
                onClick={toggleMarked}
                aria-pressed={marked.has(question.id)}
                className="cbt-btn"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path d="M5 21V4h13l-2.5 4.5L18 13H5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                </svg>
                {marked.has(question.id) ? 'Unmark' : 'Mark for Review'}
              </button>

              <button
                type="button"
                data-variant="primary"
                onClick={() => goTo(current + 1)}
                disabled={current === questions.length - 1}
                className="cbt-btn"
              >
                Next
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </main>

        {/* ---- Question palette: a column on desktop, a sheet on mobile ---- */}
        <aside
          className={`cbt-palette w-full shrink-0 lg:block lg:w-[19rem] lg:overflow-y-auto ${
            // lg:static undoes the sheet if the viewport widens while it is
            // open — otherwise a rotate turns the desktop column into a
            // full-screen overlay covering the paper.
            paletteOpen ? 'fixed inset-0 z-40 overflow-y-auto lg:static lg:z-auto' : 'hidden'
          }`}
        >
          {paletteOpen ? (
            <div className="sticky top-0 flex items-center justify-between border-b border-[#1d2433] bg-[var(--color-paper-warm)] p-3 lg:hidden">
              <span className="text-sm font-semibold">Question navigator</span>
              <button type="button" onClick={() => setPaletteOpen(false)} className="cbt-btn px-4 text-sm">
                Close
              </button>
            </div>
          ) : null}

          <div className="p-4">
            <div className="mb-5 grid grid-cols-2 gap-2 text-xs text-ink-soft">
              <span className="flex items-center gap-1.5">
                <span className="cbt-swatch" style={{ background: 'var(--cbt-unvisited)' }} /> Not visited
              </span>
              <span className="flex items-center gap-1.5">
                <span className="cbt-swatch" style={{ background: 'color-mix(in srgb, var(--cbt-answered) 40%, white)' }} />{' '}
                Answered ({answeredCount})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="cbt-swatch" style={{ background: 'color-mix(in srgb, var(--cbt-review) 40%, white)' }} />{' '}
                Review ({marked.size})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="cbt-swatch" style={{ background: 'color-mix(in srgb, var(--cbt-both) 40%, white)' }} /> Ans+Review
              </span>
            </div>

            {groups.map((group) => (
              <div key={group.subject ?? 'all'} className="mb-6">
                {group.subject ? (
                  <p className="mb-3 text-base font-semibold">{group.subject}</p>
                ) : null}

                {group.sections.map((bucket) => (
                  <div key={bucket.section ?? 'none'} className="mb-3">
                    {bucket.section ? (
                      <p className="mb-2 text-sm text-ink-faint">
                        Section {bucket.section}
                        {bucket.section === 'B' ? ' (any 10)' : ''}
                      </p>
                    ) : null}
                    <div className="grid grid-cols-7 gap-2">
                      {bucket.questions.map(({ question: q, index }) => (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => goTo(index)}
                          data-status={statusOf(q)}
                          data-current={index === current}
                          aria-label={`Question ${q.position}`}
                          aria-current={index === current || undefined}
                          className="cbt-cell"
                        >
                          {q.position}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* ---- Submit confirmation ---- */}
      <AnimatePresence>
        {confirming ? (
          <>
            <motion.button
              type="button"
              aria-label="Cancel submit"
              className="fixed inset-0 z-40 bg-plum-deep/50 backdrop-blur-[2px]"
              onClick={() => setConfirming(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Submit test"
              className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-[#1d2433] bg-[#fffdf8] p-7 shadow-[6px_6px_0_#1d2433]"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="font-display text-[1.3rem] font-bold">Submit the test?</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Once submitted, answers are final and you'll see your score immediately.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Answered', value: answeredCount, tone: 'var(--cbt-answered)' },
                  { label: 'Unanswered', value: questions.length - answeredCount, tone: 'var(--color-danger)' },
                  { label: 'Marked for review', value: marked.size, tone: 'var(--cbt-review)' },
                  { label: 'Time left', value: formatClock(secondsLeft), tone: 'var(--cbt-ink)' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-[#1d2433] bg-white p-3">
                    <p className="text-xs text-ink-faint">{stat.label}</p>
                    <p className="text-lg font-bold tabular-nums" style={{ color: stat.tone }}>
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={() => setConfirming(false)} className="cbt-btn flex-1">
                  Keep going
                </button>
                <button
                  type="button"
                  data-testid="confirm-submit"
                  data-variant="primary"
                  onClick={() => void doSubmit()}
                  disabled={submitting}
                  className="cbt-btn flex-1"
                >
                  {submitting ? 'Submitting…' : 'Submit test'}
                </button>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
