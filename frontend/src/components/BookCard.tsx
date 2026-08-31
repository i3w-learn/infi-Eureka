import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SUBJECT_STYLE } from './ContentCard';
import { SUBJECT_LABELS } from '../lib/sample-content';
import { bookMeta, type LibraryBook } from '../lib/libraryBooks';

/**
 * One book on a library shelf: the cover of the real book, portrait, with the
 * class pill on it and the contents count underneath.
 *
 * Unlike a ContentCard this never shows the big cover padlock. A book always
 * opens — what it opens onto is a chapter list where the locks actually live,
 * and a padlock across a cover that opens fine would be a lie.
 *
 * The corner badge still has to say where the reader stands, though: "Free
 * inside" when there is something to read for nothing, "Locked" when every
 * chapter is paid. A book with neither badge just looked free.
 */
interface BookCardProps {
  book: LibraryBook;
  to: string;
  isPremium: boolean;
  /**
   * 'grid' — the catalogue's shelf of books: the cover stands portrait, whole,
   * the way a book does. 'row' — a dashboard row shared with videos and tests,
   * where matching their card beats showing the cover off, so it takes the same
   * width and the same short cover, cropped to the book's title band.
   */
  variant?: 'grid' | 'row';
}

export function BookCard({ book, to, isPremium, variant = 'grid' }: BookCardProps) {
  const style = SUBJECT_STYLE[book.subject];
  // A cover that 404s must not leave a blank card, so a failed load falls back
  // to the subject colour — same rule as ContentCard.
  const [coverFailed, setCoverFailed] = useState(false);
  const cover = coverFailed ? null : book.coverUrl;

  // One expression, all three cases, so no state can fall through the gap
  // again. Same badge shapes ContentCard uses, so a shelf mixing books with
  // videos and tests reads as one thing.
  const badge = isPremium ? null : book.freeCount > 0 ? (
    <span className="absolute top-2.5 right-2.5 rounded-bubble bg-marigold px-2 py-0.5 text-[0.65rem] font-bold text-white">
      Free inside
    </span>
  ) : (
    <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-bubble bg-plum-deep/70 px-2 py-0.5 text-[0.65rem] font-semibold text-white backdrop-blur-sm">
      <span className="h-1.5 w-1.5 rounded-bubble bg-marigold" />
      Locked
    </span>
  );

  return (
    <Link
      to={to}
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-paper-edge bg-white shadow-[0_10px_26px_-18px_rgba(44,21,64,0.25)] transition-shadow hover:shadow-[0_18px_38px_-18px_rgba(44,21,64,0.35)] ${
        variant === 'row' ? 'w-56 shrink-0' : 'w-full'
      }`}
    >
      {/* Portrait in a grid, because the covers are all near 3:4 and nothing
          gets cropped away. Short in a row, cropped to the top — where a book
          puts its title — so the card sits level with its neighbours. */}
      <div
        className={`relative w-full overflow-hidden rounded-t-[15px] ${
          variant === 'row' ? 'h-32' : 'aspect-[3/4]'
        }`}
        style={{ background: style.cover }}
      >
        {cover ? (
          <img
            src={cover}
            alt={`${book.title} cover`}
            loading="lazy"
            onError={() => setCoverFailed(true)}
            className={`absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] ${
              variant === 'row' ? 'object-top' : ''
            }`}
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center px-4 text-center font-display text-[1.05rem] leading-snug font-bold text-white/90">
            {book.title}
          </span>
        )}
        {/* No class pill here: the artwork says "12th BIOLOGY" itself, and the
            title under the card repeats it for a book whose cover is missing.

            One badge slot, every case answered. It used to hold a single `if`
            with no else, so a free user looking at a book with nothing free in
            it got no badge at all — no pitch, and no hint that the chapters
            inside are paid. */}
        {badge}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <span className={`w-fit rounded-bubble px-2 py-0.5 text-[0.65rem] font-semibold ${style.chip}`}>
          {SUBJECT_LABELS[book.subject]}
        </span>
        <h3 className="mt-2 text-[0.92rem] leading-snug font-semibold text-ink">{book.title}</h3>
        <p className="mt-auto pt-2 text-[0.78rem] text-ink-faint">{bookMeta(book, isPremium)}</p>
      </div>
    </Link>
  );
}
