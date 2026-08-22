import { CatalogPage } from '../components/CatalogPage';
import { useLibrary } from '../hooks/useLibrary';

/**
 * The formula-sheet catalogue — one condensed PDF per chapter, from
 * GET /library?kind=formula_sheet.
 */
export function FormulaSheetsPage() {
  const { items, error } = useLibrary('formula_sheet');

  return (
    <CatalogPage
      title="Formula sheets"
      subtitle={error ?? 'Every formula for a chapter on one sheet — for the night before.'}
      items={error ? [] : (items ?? [])}
      kind="note"
      detailBase="/formula-sheets"
    />
  );
}
