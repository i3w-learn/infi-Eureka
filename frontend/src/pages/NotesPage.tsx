import { CatalogPage } from '../components/CatalogPage';
import { SAMPLE_NOTES } from '../lib/sample-content';

export function NotesPage() {
  return (
    <CatalogPage
      title="Notes & highlights"
      subtitle="Read the notes and mark what matters — your highlights stay yours."
      items={SAMPLE_NOTES}
      kind="note"
      detailBase="/notes"
    />
  );
}
