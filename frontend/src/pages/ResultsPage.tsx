import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ApiError } from '../api/client';
import { testsApi, type AttemptResult, type Option } from '../api/tests.api';
import { track } from '../analytics/ga';
import { RichText } from '../components/RichText';
import { PerformanceCharts } from '../components/PerformanceCharts';
import { analyseResult } from '../lib/resultAnalysis';
import { downloadResultPdf } from '../lib/resultPdf';

/**
 * The scorecard: headline score, the three outcome tiles, then the charts
 * that say where the marks went and which subject is weakest. The full
 * question-by-question review is still here but folded away behind a button,
 * because a 180-question list is something to consult, not scroll past — and
 * the PDF download carries the whole thing off-screen for later.
 *
 * Review only exists after submission; the backend never exposes correct
 * answers before that.
 */
const EASE = [0.16, 1, 0.3, 1] as const;

const rise = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

const OPTIONS: Option[] = ['A', 'B', 'C', 'D'];

export function ResultsPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [testTitle, setTestTitle] = useState<string>();
  const [error, setError] = useState<string>();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string>();

  const analysis = useMemo(() => (result ? analyseResult(result) : null), [result]);

  useEffect(() => {
    if (!attemptId) return;
    let cancelled = false;
    testsApi
      .result(attemptId)
      .then((data) => {
        if (cancelled) return;
        setResult(data);
        track.testSubmitted(data.testId, data.score);
        // The title is only for the PDF header; the page works without it.
        testsApi
          .get(data.testId)
          .then((test) => {
            if (!cancelled) setTestTitle(test.title);
          })
          .catch(() => {});
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Could not load the result.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  if (error) {
    return (
      <div className="w-full px-5 sm:px-8 lg:px-10">
        <p className="mt-16 text-center text-ink-soft">{error}</p>
        <p className="mt-4 text-center">
          <Link to="/mock-tests" className="font-medium text-plum underline underline-offset-4">
            Back to tests
          </Link>
        </p>
      </div>
    );
  }

  if (!result || !analysis) {
    return (
      <div className="w-full px-5 sm:px-8 lg:px-10">
        <p className="mt-16 text-center text-ink-faint">Scoring your test…</p>
      </div>
    );
  }

  const percentage = result.totalMarks > 0 ? Math.round((result.score / result.totalMarks) * 100) : 0;

  async function handleDownload() {
    if (!result || !analysis) return;
    setDownloading(true);
    setDownloadError(undefined);
    try {
      await downloadResultPdf({ result, analysis, testTitle: testTitle ?? 'Mock test' });
    } catch {
      setDownloadError('Could not build the PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  const TILES = [
    { label: 'Correct', value: result.correctCount, tone: 'text-success' },
    { label: 'Wrong', value: result.wrongCount, tone: 'text-danger' },
    { label: 'Skipped', value: result.unattemptedCount, tone: 'text-ink-faint' },
  ];

  return (
    <div className="w-full">
      <motion.div
        className="mx-auto w-full max-w-[80rem] px-5 pt-6 pb-16 sm:px-8 lg:px-10"
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.09 } } }}
      >
        {/* ---- Scorecard ---- */}
        <motion.div
          variants={rise}
          className="relative mt-6 overflow-hidden rounded-3xl bg-plum p-8 text-center sm:p-10"
        >
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(120% 100% at 50% -20%, #74498d 0%, #4c2a5e 50%, #2a1340 100%)',
            }}
          />
          <div className="relative">
            <p className="text-[0.8rem] font-medium tracking-[0.18em] text-white/50 uppercase">Your score</p>
            <p className="mt-3 font-display text-[3.4rem] leading-none font-extrabold text-white">
              {result.score}
              <span className="text-[1.6rem] font-bold text-white/50"> / {result.totalMarks}</span>
            </p>
            <div className="mx-auto mt-6 h-2 w-full max-w-sm overflow-hidden rounded-bubble bg-white/10">
              <motion.div
                className="h-full rounded-bubble bg-marigold"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(0, percentage)}%` }}
                transition={{ delay: 0.4, duration: 0.9, ease: EASE }}
              />
            </div>
            <p className="mt-2 text-sm text-white/60">{percentage}%</p>

            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              aria-busy={downloading || undefined}
              data-size="sm"
              className="sticker-btn mt-7 font-sans"
            >
              {downloading ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-bubble border-2 border-[var(--brut-line)]/30 border-t-[var(--brut-line)]" />
                  Building your report…
                </>
              ) : (
                <>
                  <span aria-hidden="true">⤓</span>
                  Download full report (PDF)
                </>
              )}
            </button>
            <p className="mt-2 text-[0.75rem] text-white/50">
              Saves to your device. Includes every question with the correct answer.
            </p>
            {downloadError ? (
              <p role="alert" className="mt-2 text-[0.8rem] text-marigold-soft">
                {downloadError}
              </p>
            ) : null}
          </div>
        </motion.div>

        {/* ---- Outcome tiles ---- */}
        <motion.div variants={rise} className="mt-5 grid grid-cols-3 gap-4">
          {TILES.map((tile) => (
            <div
              key={tile.label}
              className="rounded-2xl border border-paper-edge bg-white p-5 text-center shadow-[0_10px_26px_-18px_rgba(44,21,64,0.25)]"
            >
              <p className={`font-display text-[1.9rem] leading-none font-extrabold ${tile.tone}`}>
                {tile.value}
              </p>
              <p className="mt-1.5 text-[0.8rem] text-ink-soft">{tile.label}</p>
            </div>
          ))}
        </motion.div>

        {/* ---- Performance charts ---- */}
        <motion.div variants={rise} className="mt-10">
          <PerformanceCharts result={result} analysis={analysis} />
        </motion.div>

        {/* ---- Question review, folded by default ---- */}
        <motion.div variants={rise} className="mt-10 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-[1.4rem] font-bold">Review your answers</h2>
          <button
            type="button"
            onClick={() => setReviewOpen((open) => !open)}
            aria-expanded={reviewOpen}
            aria-controls="question-review"
            data-variant="ghost"
            data-size="sm"
            className="sticker-btn font-sans"
          >
            {reviewOpen ? 'Hide answers' : `Show all ${result.questions.length} questions`}
            <span
              aria-hidden="true"
              className={`transition-transform duration-200 ${reviewOpen ? 'rotate-180' : ''}`}
            >
              ↓
            </span>
          </button>
        </motion.div>

        <AnimatePresence initial={false}>
          {reviewOpen ? (
            <motion.div
              id="question-review"
              key="review"
              className="overflow-hidden"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <div className="mt-4 space-y-4">
                {result.questions
                  .slice()
                  .sort((a, b) => a.position - b.position)
                  .map((q, index) => (
                    <motion.article
                      key={q.id}
                      className="rounded-2xl border border-paper-edge bg-white p-5"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-40px' }}
                      transition={{ delay: (index % 6) * 0.04, duration: 0.4, ease: EASE }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-[0.95rem] leading-relaxed font-medium">
                          <span className="text-ink-faint">{q.position}.</span>{' '}
                          <RichText>{q.questionText}</RichText>
                        </p>
                        <span
                          className={`shrink-0 rounded-bubble px-2.5 py-1 text-[0.7rem] font-semibold ${
                            q.outcome === 'correct'
                              ? 'bg-[#e5f3ec] text-success'
                              : q.outcome === 'wrong'
                                ? 'bg-danger/10 text-danger'
                                : 'bg-paper-warm text-ink-faint'
                          }`}
                        >
                          {q.outcome === 'correct'
                            ? `+${q.marks}`
                            : q.outcome === 'wrong'
                              ? `−${q.negativeMarks}`
                              : 'Skipped'}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                        {OPTIONS.map((option) => {
                          const isCorrect = q.correctOption === option;
                          const isChosen = q.chosenOption === option;
                          return (
                            <p
                              key={option}
                              className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-[0.85rem] ${
                                isCorrect
                                  ? 'border-success/40 bg-[#e5f3ec] text-ink'
                                  : isChosen
                                    ? 'border-danger/40 bg-danger/5 text-ink'
                                    : 'border-transparent text-ink-soft'
                              }`}
                            >
                              <span
                                className={`grid h-5 w-5 shrink-0 place-items-center rounded-bubble border text-[0.65rem] font-bold ${
                                  isCorrect
                                    ? 'border-success bg-success text-white'
                                    : isChosen
                                      ? 'border-danger bg-danger text-white'
                                      : 'border-ink-faint/40 text-ink-faint'
                                }`}
                              >
                                {option}
                              </span>
                              <RichText>{q.options[option]}</RichText>
                              {isChosen && !isCorrect ? (
                                <span className="ml-auto text-[0.7rem] text-danger">your answer</span>
                              ) : null}
                              {isCorrect ? (
                                <span className="ml-auto text-[0.7rem] text-success">correct</span>
                              ) : null}
                            </p>
                          );
                        })}
                      </div>
                    </motion.article>
                  ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <motion.div variants={rise} className="mt-10 text-center">
          <Link
            to="/mock-tests"
            className="inline-flex items-center gap-2 rounded-xl bg-plum px-6 py-3 font-semibold text-white transition-transform hover:-translate-y-0.5"
          >
            Back to tests
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
