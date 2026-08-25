import { motion } from 'motion/react';
import type { AttemptResult } from '../api/tests.api';
import type { ResultAnalysis, SubjectBreakdown } from '../lib/resultAnalysis';

/**
 * The at-a-glance layer of the results page: where the marks went, and which
 * subject needs work. Everything here is drawn as plain SVG — a donut for the
 * outcome split and a ring meter per subject — so there is no chart library
 * to ship and it uses the same tokens as the rest of the product.
 *
 * Colour is never the only carrier. Each donut segment and each ring has its
 * number and label beside it, and the subject cards say "Weak" / "Needs work"
 * / "Strong" in words. Red and green never sit next to each other in the
 * donut (the gray "skipped" segment separates them).
 */
const EASE = [0.16, 1, 0.3, 1] as const;

/** Accuracy bands. Thresholds are in whole percent of attempted questions. */
function band(accuracy: number): { label: string; color: string; textClass: string } {
  if (accuracy >= 70) return { label: 'Strong', color: '#1e7a4d', textClass: 'text-success' };
  if (accuracy >= 40) return { label: 'Needs work', color: '#b8760a', textClass: 'text-caution' };
  return { label: 'Weak', color: '#b3261e', textClass: 'text-danger' };
}

interface PerformanceChartsProps {
  result: AttemptResult;
  analysis: ResultAnalysis;
}

export function PerformanceCharts({ result, analysis }: PerformanceChartsProps) {
  const total = result.correctCount + result.wrongCount + result.unattemptedCount;
  const segments = [
    { label: 'Correct', value: result.correctCount, color: '#1e7a4d' },
    { label: 'Skipped', value: result.unattemptedCount, color: '#8d7f97' },
    { label: 'Wrong', value: result.wrongCount, color: '#b3261e' },
  ];

  return (
    <section aria-labelledby="performance-heading">
      <h2 id="performance-heading" className="font-display text-[1.4rem] font-bold">
        Where your marks went
      </h2>

      {analysis.weakest && analysis.strongest ? (
        <p className="mt-1 text-[0.95rem] text-ink-soft">
          Weakest: <span className="font-semibold text-danger">{analysis.weakest.subject}</span> (
          {analysis.weakest.accuracy}% accuracy) · Strongest:{' '}
          <span className="font-semibold text-success">{analysis.strongest.subject}</span> (
          {analysis.strongest.accuracy}%)
        </p>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        {/* ---- Outcome donut ---- */}
        <div className="flex items-center gap-6 rounded-2xl border border-paper-edge bg-white p-5">
          <Donut segments={segments} total={total} />
          <ul className="flex-1 space-y-2.5" aria-label="Question outcomes">
            {segments.map((s) => (
              <li key={s.label} className="flex items-center gap-2.5 text-[0.9rem]">
                <span
                  aria-hidden="true"
                  className="h-3 w-3 shrink-0 rounded-bubble"
                  style={{ background: s.color }}
                />
                <span className="text-ink-soft">{s.label}</span>
                <span className="ml-auto pl-4 font-semibold tabular-nums">{s.value}</span>
              </li>
            ))}
            <li className="flex items-center gap-2.5 border-t border-paper-edge pt-2.5 text-[0.9rem]">
              <span className="text-ink-soft">Total</span>
              <span className="ml-auto pl-4 font-semibold tabular-nums">{total}</span>
            </li>
          </ul>
        </div>

        {/* ---- Subject rings ---- */}
        <div className="grid gap-3 sm:grid-cols-2">
          {analysis.subjects.map((s, i) => (
            <SubjectCard key={s.subject} subject={s} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------- */

interface Segment {
  label: string;
  value: number;
  color: string;
}

/**
 * Three stroked circles on top of each other, each showing one slice via
 * stroke-dasharray. `pathLength={100}` makes the dash units percentages, so a
 * 1-unit gap is ~2.5px at this radius — the surface gap between fills.
 */
function Donut({ segments, total }: { segments: Segment[]; total: number }) {
  const gap = segments.filter((s) => s.value > 0).length > 1 ? 1 : 0;
  const correct = segments[0]?.value ?? 0;

  // Each slice starts where the previous one ended, so the offsets are a
  // running sum computed up front rather than mutated while rendering.
  const slices = segments.reduce<Array<Segment & { pct: number; start: number }>>((acc, s) => {
    if (s.value <= 0) return acc;
    const pct = total > 0 ? (s.value / total) * 100 : 0;
    const prev = acc[acc.length - 1];
    acc.push({ ...s, pct, start: prev ? prev.start + prev.pct : 0 });
    return acc;
  }, []);

  return (
    <svg
      viewBox="0 0 100 100"
      className="h-32 w-32 shrink-0"
      role="img"
      aria-label={`${correct} of ${total} questions correct`}
    >
      <circle cx="50" cy="50" r="40" fill="none" stroke="#f4e9d5" strokeWidth="12" />
      <g transform="rotate(-90 50 50)">
        {slices.map((s) => {
          const dash = Math.max(s.pct - gap, 0);
          return (
            <motion.circle
              key={s.label}
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={s.color}
              strokeWidth="12"
              pathLength={100}
              strokeDasharray={`${dash} ${100 - dash}`}
              initial={{ strokeDashoffset: 100 }}
              animate={{ strokeDashoffset: -s.start }}
              transition={{ delay: 0.3, duration: 0.9, ease: EASE }}
            >
              <title>
                {s.label}: {s.value} of {total}
              </title>
            </motion.circle>
          );
        })}
      </g>
      <text x="50" y="47" textAnchor="middle" className="fill-ink font-display text-[1.3rem] font-extrabold">
        {correct}
      </text>
      <text x="50" y="62" textAnchor="middle" className="fill-ink-faint text-[0.55rem]">
        of {total} correct
      </text>
    </svg>
  );
}

/**
 * One subject: a ring meter for accuracy, the band in words, and the raw
 * counts underneath so nothing depends on reading the ring.
 */
function SubjectCard({ subject, index }: { subject: SubjectBreakdown; index: number }) {
  const tone = band(subject.accuracy);
  const attempted = subject.correct + subject.wrong;

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-paper-edge bg-white p-4">
      <svg
        viewBox="0 0 100 100"
        className="h-20 w-20 shrink-0"
        role="img"
        aria-label={`${subject.subject}: ${subject.accuracy}% accuracy`}
      >
        <circle cx="50" cy="50" r="42" fill="none" stroke="#f4e9d5" strokeWidth="10" />
        <motion.circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke={tone.color}
          strokeWidth="10"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="100 100"
          transform="rotate(-90 50 50)"
          initial={{ strokeDashoffset: 100 }}
          animate={{ strokeDashoffset: 100 - subject.accuracy }}
          transition={{ delay: 0.35 + index * 0.08, duration: 0.8, ease: EASE }}
        />
        <text
          x="50"
          y="56"
          textAnchor="middle"
          className="fill-ink font-display text-[1.35rem] font-extrabold"
        >
          {subject.accuracy}%
        </text>
      </svg>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-semibold">{subject.subject}</p>
          <span className={`shrink-0 text-[0.75rem] font-semibold ${tone.textClass}`}>{tone.label}</span>
        </div>
        <dl className="mt-1.5 grid grid-cols-3 gap-x-2 text-[0.8rem]">
          <div>
            <dt className="text-ink-faint">Correct</dt>
            <dd className="font-semibold tabular-nums">
              {subject.correct}
              <span className="font-normal text-ink-faint">/{attempted}</span>
            </dd>
          </div>
          <div>
            <dt className="text-ink-faint">Skipped</dt>
            <dd className="font-semibold tabular-nums">{subject.skipped}</dd>
          </div>
          <div>
            <dt className="text-ink-faint">Marks</dt>
            <dd className="font-semibold tabular-nums">
              {subject.scored}
              <span className="font-normal text-ink-faint">/{subject.possible}</span>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
