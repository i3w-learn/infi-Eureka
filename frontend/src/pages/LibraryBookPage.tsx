import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { BackButton } from '../components/BackButton';
import { ContentCard, cardEntrance, cardMotion, SUBJECT_STYLE } from '../components/ContentCard';
import { useAuth } from '../hooks/useAuth';
import { useLibrary } from '../hooks/useLibrary';
import { findBook, groupIntoBooks } from '../lib/libraryBooks';
import { SUBJECT_LABELS } from '../lib/sample-content';
import type { LibraryKind } from '../api/library.api';

/**
 * What is inside one book: its cover, and every chapter it holds.
 *
 * The shelf shows books because that is how a student reaches for them; this
 * is where the chapters live, and where the padlocks are — opening any of them
 * still goes through GET /library/:id, which is the actual paywall.
 */
interface LibraryBookPageProps {
  kind: LibraryKind;
  /** The section root, e.g. `/formula-sheets` — where Back and the chapters point. */
  detailBase: string;
  /** What this section calls the book, for the heading. */
  label: string;
}

export function LibraryBookPage({ kind, detailBase, label }: LibraryBookPageProps) {
  const { subject = '', grade = '' } = useParams();
  const { isPremium } = useAuth();
  const { items, error } = useLibrary(kind);
  // Which cover URL failed to load — not a bare "it failed" flag. This page
  // stays mounted when the URL moves from one book to the next, and a flag
  // would carry the first book's failure onto the second book's cover.
  const [failedCover, setFailedCover] = useState<string | null>(null);

  const book = useMemo(
    () => (items === null ? null : findBook(groupIntoBooks(items, kind), subject, grade)),
    [items, kind, subject, grade],
  );

  if (error) {
    return <Message text={error} detailBase={detailBase} />;
  }
  if (items === null) {
    return <Message text="Loading…" detailBase={detailBase} />;
  }
  if (!book) {
    return <Message text="This book is not in the library." detailBase={detailBase} />;
  }

  const style = SUBJECT_STYLE[book.subject];
  const cover = book.coverUrl === failedCover ? null : book.coverUrl;

  return (
    <div className="w-full px-5 pt-6 pb-16 sm:px-8 lg:px-10">
      <BackButton fallback={detailBase} />

      <motion.div
        className="mt-5 flex flex-wrap items-end gap-5"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          className="h-40 w-[7.5rem] shrink-0 overflow-hidden rounded-xl border border-paper-edge"
          style={{ background: style.cover }}
        >
          {cover ? (
            <img
              src={cover}
              alt={`${book.title} cover`}
              onError={() => setFailedCover(book.coverUrl)}
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
        <div>
          <p className="text-[0.8rem] font-medium tracking-wide text-ink-faint uppercase">
            {SUBJECT_LABELS[book.subject]} · {book.classLabel}
          </p>
          <h1 className="mt-1 font-display text-[1.9rem] leading-tight font-extrabold tracking-tight sm:text-[2.3rem]">
            {book.title} {label}
          </h1>
          <p className="mt-1 text-[1.02rem] text-ink-soft">{book.meta}</p>
        </div>
      </motion.div>

      <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {book.chapters.map((chapter, index) => {
          const locked = !isPremium && !chapter.free;
          return (
            <cardMotion.div key={chapter.id} {...cardEntrance(index)} className="self-stretch">
              {/* Chapters have no art of their own, and a wall of flat gradient
                  reads as missing. They wear the book's cover instead — cropped
                  to its title band, so every card still says which book. */}
              <ContentCard
                item={{ ...chapter, thumbnailUrl: book.coverUrl }}
                kind="note"
                isPremium={isPremium}
                to={locked ? '/unlock' : `${detailBase}/${chapter.id}`}
                coverIsBookArt
              />
            </cardMotion.div>
          );
        })}
      </div>
    </div>
  );
}

/** Loading, failure and "no such book" all read the same: a line and a way back. */
function Message({ text, detailBase }: { text: string; detailBase: string }) {
  return (
    <div className="w-full px-5 pt-6 pb-16 sm:px-8 lg:px-10">
      <BackButton fallback={detailBase} />
      <p className="mt-20 text-center text-ink-faint">{text}</p>
    </div>
  );
}
