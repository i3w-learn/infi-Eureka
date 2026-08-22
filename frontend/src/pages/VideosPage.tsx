import { CatalogPage } from '../components/CatalogPage';
import { SAMPLE_VIDEOS } from '../lib/sample-content';

export function VideosPage() {
  return (
    <CatalogPage
      title="One-shot videos"
      subtitle="Full chapters in single sittings — watch, pause, rewatch."
      items={SAMPLE_VIDEOS}
      kind="video"
      detailBase="/videos"
    />
  );
}
