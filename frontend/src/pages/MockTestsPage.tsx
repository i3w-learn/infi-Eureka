import { CatalogPage } from '../components/CatalogPage';
import { useMockTests } from '../hooks/useMockTests';

/**
 * The full mock-test catalogue — every test, where the dashboard shelf shows
 * only the first few. Tests come from GET /tests; starting one creates a
 * server-timed attempt.
 */
export function MockTestsPage() {
  const { items, error } = useMockTests();

  return (
    <CatalogPage
      title="CBT mock tests"
      subtitle={
        error ??
        'The real exam interface: timed by the server, question palette, mark for review.'
      }
      items={error ? [] : items}
      kind="test"
      detailBase="/mock-tests"
      detailSuffix="/attempt"
    />
  );
}
