import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { libraryApi, type LibraryDocumentDetail } from '../api/library.api';
import { ApiError } from '../api/client';
import { BackButton } from '../components/BackButton';

/**
 * Opens one library PDF — a formula sheet or an NCERT Highlights chapter.
 *
 * The link is fetched, never guessed: GET /library/:id is the payment gate,
 * so a locked student gets a 403 here and sees the unlock prompt instead of
 * the file. That is why this page sits behind RequireAuth rather than
 * RequirePremium — the free sample must reach the server to be allowed
 * through, and only the server knows which document that is.
 */
interface OpenedDocument {
  /** Which id this result belongs to, so a stale one reads as "loading". */
  id: string;
  document?: LibraryDocumentDetail;
  error?: { message: string; needsPayment: boolean };
}

export function DocumentReaderPage() {
  const { documentId = '' } = useParams();
  const [opened, setOpened] = useState<OpenedDocument | null>(null);

  useEffect(() => {
    let cancelled = false;

    libraryApi
      .open(documentId)
      .then((detail) => {
        if (!cancelled) setOpened({ id: documentId, document: detail });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setOpened({
          id: documentId,
          error: {
            message: err instanceof ApiError ? err.message : 'Could not open this document.',
            needsPayment: err instanceof ApiError && err.needsPayment,
          },
        });
      });

    return () => {
      cancelled = true;
    };
  }, [documentId]);

  // A result for a different id is last render's answer — keep showing the
  // loading state rather than the previous document.
  const current = opened?.id === documentId ? opened : null;
  const document = current?.document ?? null;
  const error = current?.error ?? null;
  // /formula-sheets/:id goes back to /formula-sheets, /ncert-highlights/:id to its list.
  const catalogue = '/' + (useLocation().pathname.split('/')[1] ?? '');

  return (
    <div className="flex min-h-full w-full flex-col">
      <div className="flex w-full flex-1 flex-col px-5 pt-6 pb-10 sm:px-8 lg:px-10">
        {error ? (
          <div className="mx-auto mt-20 max-w-md rounded-2xl border border-paper-edge bg-white p-8 text-center">
            <h1 className="font-display text-[1.4rem] font-bold">
              {error.needsPayment ? 'This one is locked' : 'Could not open this'}
            </h1>
            <p className="mt-2 text-ink-soft">{error.message}</p>
            <Link
              to={error.needsPayment ? '/unlock' : '/dashboard'}
              className="mt-6 inline-block rounded-xl bg-gradient-to-b from-[#f8823c] to-marigold px-6 py-3 font-semibold text-white transition-transform hover:-translate-y-0.5"
            >
              {error.needsPayment ? 'Unlock everything' : 'Back to dashboard'}
            </Link>
          </div>
        ) : !document ? (
          <p className="mt-20 text-center text-ink-faint">Opening…</p>
        ) : (
          <>
            <BackButton fallback={catalogue} />
            <div className="mt-5 flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <h1 className="font-display text-[1.5rem] leading-tight font-extrabold tracking-tight sm:text-[1.9rem]">
                  {document.title}
                </h1>
                <p className="mt-1 text-sm text-ink-soft capitalize">
                  {document.subject} · Class {document.grade}
                  {document.chapterNumber === null ? '' : ` · Chapter ${document.chapterNumber}`}
                </p>
              </div>
              <a
                href={document.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-paper-edge bg-white px-4 py-2 text-sm font-semibold text-plum transition-colors hover:border-marigold"
              >
                Open in new tab ↗
              </a>
            </div>

            {/*
              The browser's own PDF viewer. It gives paging, zoom and search for
              free; the trade-off is that we cannot reach the text layer, so
              in-page highlighting would need pdf.js instead.
            */}
            <iframe
              src={document.url}
              title={document.title}
              className="mt-5 min-h-[70vh] w-full flex-1 rounded-2xl border border-paper-edge bg-white"
            />
          </>
        )}
      </div>
    </div>
  );
}
