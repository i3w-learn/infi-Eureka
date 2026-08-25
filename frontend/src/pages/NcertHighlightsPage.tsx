import { BookShelfPage } from '../components/BookShelfPage';
import { useLibrary } from '../hooks/useLibrary';

/**
 * The NCERT Highlights shelf — one book cover per subject and class, from
 * GET /library?kind=ncert_highlight. Its chapters are a click inside.
 */
export function NcertHighlightsPage() {
  const { items, error } = useLibrary('ncert_highlight');

  return (
    <BookShelfPage
      title="NCERT highlights"
      subtitle={error ?? 'The lines that actually get asked, chapter by chapter.'}
      items={error ? [] : items}
      kind="ncert_highlight"
      detailBase="/ncert-highlights"
    />
  );
}
