import { CatalogPage } from '../components/CatalogPage';
import { useNotes } from '../hooks/useNotes';

export function NotesPage() {
  const { items } = useNotes();

  return (
    <CatalogPage
      title="Notes & highlights"
      subtitle="Read the notes and mark what matters — your highlights stay yours."
      items={items}
      kind="note"
      detailBase="/notes"
    />
  );
}
