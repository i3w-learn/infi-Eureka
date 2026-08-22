import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ApiError } from '../api/client';
import { testsApi, type AttemptState, type Option } from '../api/tests.api';

/**
 * The CBT exam screen: timer, question, OMR options, mark-for-review, and the
 * question palette. UX ported from the proven InfiNotes mock-test flow, with
 * its two known bugs fixed here:
 *
 * 1. Auto-submit at time-up goes through a ref, so it submits the CURRENT
 *    answers (the original captured a stale empty state and scored 0).
 * 2. The clock counts down from the server's `secondsRemaining` and the
 *    server enforces `expiresAt` — reloading or editing the client cannot buy
 *    time.
 *
 * Deliberately animation-free where it matters: switching questions and
 * picking answers is instant. A student racing a timer needs response, not
 * choreography.
 */
const OPTIONS: Option[] = ['A', 'B', 'C', 'D'];

function formatClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export function TestAttemptPage() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState<AttemptState | null>(null);
  const [loadError, setLoadError] = useState<string>();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Option | null>>({});
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveWarning, setSaveWarning] = useState(false);

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

  const questions = useMemo(
    () => (attempt ? [...attempt.questions].sort((a, b) => a.position - b.position) : []),
    [attempt],
  );
  const question = questions[current];

  /** Navigate to a question, recording it as seen for the palette. */
  const goTo = useCallback(
    (index: number) => {
      setCurrent(index);
      const target = questions[index];
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

  // ---- Render states ----
  if (loadError) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper px-6 text-center">
        <div>
          <p className="text-ink-soft">{loadError}</p>
          <button
            type="button"
            onClick={() => navigate('/mock-tests')}
            className="mt-4 rounded-xl bg-plum px-5 py-2.5 font-medium text-white"
          >
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
    secondsLeft <= 120 ? 'bg-danger text-white' : secondsLeft <= 600 ? 'bg-marigold text-white' : 'bg-plum text-white';

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      {/* ---- Exam header: title left, clock right. Nothing else. ---- */}
      <header className="sticky top-0 z-10 border-b border-paper-edge bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <p className="truncate font-display text-[1.05rem] font-bold">Mock test in progress</p>
          <p
            data-testid="test-timer"
            className={`rounded-xl px-4 py-1.5 font-sans text-[1.05rem] font-semibold tabular-nums ${timerTone}`}
          >
            {formatClock(secondsLeft)}
          </p>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-6 sm:px-8 lg:grid-cols-[1fr_16rem]">
        {/* ---- Question area ---- */}
        <main>
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-semibold text-ink-soft">
              Question {question.position} <span className="text-ink-faint">of {questions.length}</span>
            </p>
            <p className="text-[0.78rem] text-ink-faint">
              +{question.marks} · −{question.negativeMarks}
            </p>
          </div>

          <p className="mt-3 text-[1.05rem] leading-relaxed font-medium">{question.questionText}</p>

          <div className="mt-6 space-y-3">
            {OPTIONS.map((option) => {
              const selected = answers[question.id] === option;
              return (
                <button
                  key={option}
                  type="button"
                  data-testid={`option-${option.toLowerCase()}`}
                  onClick={() => choose(option)}
                  aria-pressed={selected}
                  className={`flex w-full items-center gap-4 rounded-2xl border-2 bg-white px-4 py-3.5 text-left transition-colors ${
                    selected ? 'border-marigold bg-marigold-wash' : 'border-paper-edge hover:border-ink-faint'
                  }`}
                >
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-bubble border-2 text-[0.8rem] font-bold ${
                      selected ? 'border-marigold bg-marigold text-white' : 'border-ink-faint/50 text-ink-soft'
                    }`}
                  >
                    {option}
                  </span>
                  <span className="text-[0.98rem]">{question.options[option]}</span>
                </button>
              );
            })}
          </div>

          {saveWarning ? (
            <p role="alert" className="mt-4 text-sm text-danger">
              Could not reach the server — your last action may not be saved. Check your connection.
            </p>
          ) : null}

          {/* ---- Question actions ---- */}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => goTo(Math.max(0, current - 1))}
              disabled={current === 0}
              className="rounded-xl border border-paper-edge bg-white px-4 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:border-ink-faint disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Previous
            </button>
            <button
              type="button"
              data-testid="mark-review"
              onClick={toggleMarked}
              aria-pressed={marked.has(question.id)}
              className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                marked.has(question.id)
                  ? 'border-plum bg-plum text-white'
                  : 'border-paper-edge bg-white text-ink-soft hover:border-plum'
              }`}
            >
              {marked.has(question.id) ? 'Marked for review ✓' : 'Mark for review'}
            </button>
            <button
              type="button"
              onClick={() => goTo(Math.min(questions.length - 1, current + 1))}
              disabled={current === questions.length - 1}
              className="rounded-xl bg-plum px-5 py-2.5 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next →
            </button>
            <button
              type="button"
              data-testid="open-submit"
              onClick={() => setConfirming(true)}
              className="ml-auto rounded-xl bg-gradient-to-b from-[#f8823c] to-marigold px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(239,113,38,0.7)]"
            >
              Submit test
            </button>
          </div>
        </main>

        {/* ---- Question palette ---- */}
        <aside className="rounded-2xl border border-paper-edge bg-white p-4 self-start lg:sticky lg:top-20">
          <p className="text-sm font-semibold">Questions</p>
          <div className="mt-3 grid grid-cols-6 gap-1.5 sm:grid-cols-8 lg:grid-cols-5">
            {questions.map((q, index) => {
              const answered = Boolean(answers[q.id]);
              const isMarked = marked.has(q.id);
              const isCurrent = index === current;
              const seen = visited.has(q.id);
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => goTo(index)}
                  aria-label={`Question ${q.position}`}
                  aria-current={isCurrent || undefined}
                  className={`relative grid h-9 w-9 place-items-center rounded-bubble border text-[0.75rem] font-semibold transition-colors ${
                    isCurrent
                      ? 'border-ink bg-ink text-white'
                      : answered
                        ? 'border-marigold bg-marigold text-white'
                        : seen
                          ? 'border-ink-faint/60 bg-paper-warm text-ink-soft'
                          : 'border-paper-edge bg-white text-ink-faint'
                  }`}
                >
                  {q.position}
                  {isMarked ? (
                    <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-bubble border border-white bg-plum" />
                  ) : null}
                </button>
              );
            })}
          </div>

          <ul className="mt-4 space-y-1.5 border-t border-paper-edge pt-3 text-[0.72rem] text-ink-soft">
            <li className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-bubble bg-marigold" /> Answered ({answeredCount})
            </li>
            <li className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-bubble border border-ink-faint/60 bg-paper-warm" /> Seen, not answered
            </li>
            <li className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-bubble border border-paper-edge bg-white" /> Not seen yet
            </li>
            <li className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-bubble bg-plum" /> Marked for review ({marked.size})
            </li>
          </ul>
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
              className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-7 shadow-2xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="font-display text-[1.3rem] font-bold">Submit the test?</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Once submitted, answers are final and you'll see your score immediately.
              </p>
              <ul className="mt-4 space-y-1 rounded-2xl bg-paper p-4 text-sm text-ink-soft">
                <li>
                  Answered: <strong className="text-ink">{answeredCount}</strong> of {questions.length}
                </li>
                <li>
                  Unanswered: <strong className="text-ink">{questions.length - answeredCount}</strong>
                </li>
                <li>
                  Marked for review: <strong className="text-ink">{marked.size}</strong>
                </li>
              </ul>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="flex-1 rounded-xl border border-paper-edge px-4 py-3 font-medium text-ink-soft transition-colors hover:border-ink-faint"
                >
                  Keep going
                </button>
                <button
                  type="button"
                  data-testid="confirm-submit"
                  onClick={() => void doSubmit()}
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-gradient-to-b from-[#f8823c] to-marigold px-4 py-3 font-semibold text-white disabled:opacity-60"
                >
                  {submitting ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
