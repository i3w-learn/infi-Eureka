/**
 * The public GCS bucket holding everything the app shows but does not serve:
 * the library PDFs, the book covers, the banners.
 *
 * Object names carry spaces, so paths are written here unescaped — readable
 * against the bucket listing — and escaped on the way out.
 */
const MEDIA_BASE = 'https://storage.googleapis.com/neetflix-pdf-media';

/** Absolute URL for one object, e.g. `mediaUrl('banners/x y.png')`. */
export function mediaUrl(path: string): string {
  // encodeURI leaves the separators alone and escapes the spaces in the names.
  return encodeURI(`${MEDIA_BASE}/${path}`);
}

/** Every mock test wears the same NTA-pattern banner — the paper is the same. */
export const MOCK_TEST_BANNER = mediaUrl(
  'banners/mocktestOnline/Mock_Test_common_banner_NTA Mock test.png',
);
