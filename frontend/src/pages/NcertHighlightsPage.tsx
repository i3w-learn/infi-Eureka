import { CatalogPage } from '../components/CatalogPage';
import { useLibrary } from '../hooks/useLibrary';

/**
 * The NCERT Highlights catalogue — the important lines of each NCERT chapter,
 * from GET /library?kind=ncert_highlight.
 */
export function NcertHighlightsPage() {
  const { items, error } = useLibrary('ncert_highlight');

  return (
    <CatalogPage
      title="NCERT highlights"
      subtitle={error ?? 'The lines that actually get asked, chapter by chapter.'}
      items={error ? [] : (items ?? [])}
      kind="note"
      detailBase="/ncert-highlights"
    />
  );
}
