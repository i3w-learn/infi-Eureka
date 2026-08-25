import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { BookCard } from './BookCard';
import { bookPath, type LibraryBook } from '../lib/libraryBooks';

/**
 * A dashboard shelf of books — the library counterpart of ContentRow, which
 * shelves individual items. Kept separate because a book has no lock of its
 * own, but its cards are cut to ContentRow's size so the shelves below the
 * videos line up with them.
 */
interface BookRowProps {
  title: string;
  viewAllTo: string;
  books: LibraryBook[];
  isPremium: boolean;
}

export function BookRow({ title, viewAllTo, books, isPremium }: BookRowProps) {
  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-[1.35rem] font-bold tracking-tight">{title}</h2>
        <Link
          to={viewAllTo}
          className="text-sm font-medium text-plum underline underline-offset-4 transition-colors hover:text-marigold"
        >
          View all
        </Link>
      </div>

      {/* Padding on every side of the scroller: overflow-x clips vertically
          too, and the cards' hover lift and shadow need the room. */}
      <div className="-mx-1 mt-1 flex snap-x gap-4 overflow-x-auto px-1 py-3">
        {books.map((book, index) => (
          <motion.div
            key={book.key}
            className="snap-start self-stretch"
            whileHover={{ y: -4 }}
            initial={{ opacity: 0, x: 32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ delay: index * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <BookCard book={book} isPremium={isPremium} to={bookPath(viewAllTo, book)} variant="row" />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
