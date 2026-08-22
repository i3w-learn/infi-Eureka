import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import type { ContentItem, Subject } from '../lib/sample-content';

/**
 * One content card: CSS-drawn cover in the subject's colour, class badge,
 * lock state, title and meta. Used by the dashboard shelves and the catalogue
 * grids so the two can never drift apart.
 */
export const SUBJECT_STYLE: Record<Subject, { label: string; cover: string; chip: string }> = {
  biology: {
    label: 'Biology',
    cover: 'linear-gradient(135deg, #1e7a4d 0%, #14532d 100%)',
    chip: 'bg-[#e5f3ec] text-[#1e7a4d]',
  },
  physics: {
    label: 'Physics',
    cover: 'linear-gradient(135deg, #6d4585 0%, #2c1540 100%)',
    chip: 'bg-plum/10 text-plum',
  },
  chemistry: {
    label: 'Chemistry',
    cover: 'linear-gradient(135deg, #f8823c 0%, #c2570f 100%)',
    chip: 'bg-marigold-wash text-[#c2570f]',
  },
  mixed: {
    label: 'All subjects',
    cover: 'linear-gradient(135deg, #4c2a5e 0%, #ef7126 130%)',
    chip: 'bg-paper-warm text-ink-soft',
  },
};

export type ContentKind = 'video' | 'note' | 'test';

/**
 * The padlock on locked covers. It breathes slowly, and shakes — the
 * universal "locked" gesture — when the card is hovered. Both animations
 * live in global.css and switch off for reduced-motion users.
 */
function LockMark() {
  return (
    <span className="lock-mark grid h-12 w-12 place-items-center rounded-bubble bg-plum-deep/60 backdrop-blur-sm">
      <svg width="20" height="24" viewBox="0 0 20 24" fill="none" aria-hidden="true">
        <rect x="1" y="10" width="18" height="13" rx="3" fill="#fff" />
        <path d="M5 10V7a5 5 0 0 1 10 0v3" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <circle cx="10" cy="16" r="2" fill="#ef7126" />
      </svg>
    </span>
  );
}

/** The mark on the cover says what kind of thing this is at a glance. */
function CoverMark({ kind }: { kind: ContentKind }) {
  if (kind === 'video') {
    return (
      <span className="grid h-12 w-12 place-items-center rounded-bubble bg-white/15 backdrop-blur-sm transition-transform duration-200 group-hover:scale-110">
        <span className="ml-1 block h-0 w-0 border-y-8 border-l-[13px] border-y-transparent border-l-white" />
      </span>
    );
  }
  if (kind === 'note') {
    return (
      <span className="flex h-12 w-12 flex-col items-center justify-center gap-1.5 rounded-xl bg-white/15 backdrop-blur-sm transition-transform duration-200 group-hover:scale-110">
        <span className="h-[3px] w-6 rounded-bubble bg-white/90" />
        <span className="h-[3px] w-6 rounded-bubble bg-marigold-soft" />
        <span className="h-[3px] w-4 rounded-bubble bg-white/60" />
      </span>
    );
  }
  return (
    <span className="grid h-12 w-12 grid-cols-2 place-items-center gap-1 rounded-xl bg-white/15 p-2 backdrop-blur-sm transition-transform duration-200 group-hover:scale-110">
      <span className="h-3 w-3 rounded-bubble border-2 border-white/70" />
      <span className="h-3 w-3 rounded-bubble bg-marigold" />
      <span className="h-3 w-3 rounded-bubble border-2 border-white/70" />
      <span className="h-3 w-3 rounded-bubble border-2 border-white/70" />
    </span>
  );
}

interface ContentCardProps {
  item: ContentItem;
  kind: ContentKind;
  isPremium: boolean;
  /** Where the card goes. Locked cards are usually sent to /unlock. */
  to: string;
  /** Fixed width for shelf rows; grids leave it off and let cards fill. */
  fixedWidth?: boolean;
}

export function ContentCard({ item, kind, isPremium, to, fixedWidth = false }: ContentCardProps) {
  const style = SUBJECT_STYLE[item.subject];
  const locked = !isPremium && !item.free;

  return (
    <Link
      to={to}
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-paper-edge bg-white shadow-[0_10px_26px_-18px_rgba(44,21,64,0.25)] transition-shadow hover:shadow-[0_18px_38px_-18px_rgba(44,21,64,0.35)] ${
        fixedWidth ? 'w-56 shrink-0' : 'w-full'
      }`}
    >
      {/* Cover — locked ones dim slightly and carry the padlock. */}
      <div className="relative grid h-32 place-items-center" style={{ background: style.cover }}>
        {locked ? <div className="absolute inset-0 bg-plum-deep/30" /> : null}
        <span className="absolute top-2.5 left-2.5 rounded-bubble bg-white/90 px-2 py-0.5 text-[0.65rem] font-bold text-ink">
          {item.classLabel}
        </span>
        {locked ? (
          <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-bubble bg-plum-deep/70 px-2 py-0.5 text-[0.65rem] font-semibold text-white backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-bubble bg-marigold" />
            Locked
          </span>
        ) : item.free && !isPremium ? (
          <span className="absolute top-2.5 right-2.5 rounded-bubble bg-marigold px-2 py-0.5 text-[0.65rem] font-bold text-white">
            Free
          </span>
        ) : null}
        {locked ? <LockMark /> : <CoverMark kind={kind} />}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <span className={`w-fit rounded-bubble px-2 py-0.5 text-[0.65rem] font-semibold ${style.chip}`}>
          {style.label}
        </span>
        <h3 className="mt-2 line-clamp-2 text-[0.92rem] leading-snug font-semibold text-ink">{item.title}</h3>
        <p className="mt-auto pt-2 text-[0.78rem] text-ink-faint">{item.meta}</p>
      </div>
    </Link>
  );
}

/** Motion wrapper shared by shelf and grid entrances. */
export const cardEntrance = (index: number) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { delay: (index % 8) * 0.05, duration: 0.45, ease: [0.16, 1, 0.3, 1] as const },
  whileHover: { y: -4 },
});

export { motion as cardMotion };
