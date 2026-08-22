import { CatalogPage } from '../components/CatalogPage';
import { useVideos } from '../hooks/useVideos';

/**
 * The full lecture catalogue — every one-shot, where the dashboard shelf shows
 * only the first few.
 */
export function VideosPage() {
  const { items, error } = useVideos();

  return (
    <CatalogPage
      title="One-shot videos"
      subtitle={error ?? 'Full chapters in single sittings — watch, pause, rewatch.'}
      items={error ? [] : (items ?? [])}
      kind="video"
      detailBase="/videos"
    />
  );
}
