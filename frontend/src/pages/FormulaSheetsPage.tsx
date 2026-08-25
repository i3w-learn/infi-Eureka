import { BookShelfPage } from '../components/BookShelfPage';
import { useLibrary } from '../hooks/useLibrary';

/**
 * The formula-sheet shelf — one book cover per subject and class, from
 * GET /library?kind=formula_sheet. Its sheets are a click inside.
 */
export function FormulaSheetsPage() {
  const { items, error } = useLibrary('formula_sheet');

  return (
    <BookShelfPage
      title="Formula sheets"
      subtitle={error ?? 'Every formula for a chapter on one sheet — for the night before.'}
      items={error ? [] : items}
      kind="formula_sheet"
      detailBase="/formula-sheets"
    />
  );
}
