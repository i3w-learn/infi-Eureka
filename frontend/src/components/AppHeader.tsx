import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/** The bar on every logged-in page: logo, who you are, and the way out. */
export function AppHeader() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 sm:px-10">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-3 rounded-lg text-ink transition-opacity hover:opacity-70"
      >
        <span className="grid h-10 w-10 place-items-center rounded-bubble bg-plum shadow-[0_6px_18px_rgba(76,42,94,0.4)]">
          <span className="grid h-5 w-5 place-items-center rounded-bubble border-2 border-white/30">
            <span className="h-2.5 w-2.5 rounded-bubble bg-marigold" />
          </span>
        </span>
        <span className="font-display text-[1.4rem] font-extrabold tracking-tight">
          infi<span className="text-marigold">-</span>Eureka
        </span>
      </Link>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-xl border border-paper-edge bg-white px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-marigold hover:text-ink"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
