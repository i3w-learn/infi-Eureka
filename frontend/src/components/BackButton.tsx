import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Returns the student to wherever they came from — the catalogue, a dashboard
 * shelf — or to `fallback` when this page was the first one opened, e.g. from
 * a shared link.
 *
 * Leaves fullscreen first. A page navigation while an element is fullscreen
 * leaves the browser showing a blank fullscreen surface, so the exit has to
 * happen before the route changes.
 */
export function useGoBack(fallback: string): () => Promise<void> {
  const navigate = useNavigate();

  return useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
    }
    // React Router stores the position in history; 0 means "first page".
    const position = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (position > 0) navigate(-1);
    else navigate(fallback);
  }, [navigate, fallback]);
}

interface BackButtonProps {
  fallback: string;
  label?: string;
}

/**
 * The page-level back control: a sticker button above the content. The video
 * player also carries its own copy overlaid on the stage, because the page
 * chrome is out of reach once a lecture is playing fullscreen.
 */
export function BackButton({ fallback, label = 'Back' }: BackButtonProps) {
  const goBack = useGoBack(fallback);

  return (
    <button
      type="button"
      onClick={() => void goBack()}
      data-variant="ghost"
      data-size="sm"
      className="sticker-btn self-start font-sans"
    >
      <span aria-hidden="true">←</span>
      {label}
    </button>
  );
}
