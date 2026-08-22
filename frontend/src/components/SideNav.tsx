import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { BrandMark } from './BrandMark';

/**
 * The left rail: who you are, where you can go, and the way out.
 *
 * This replaces the old top bar outright rather than sitting alongside it.
 * Navigation lives in exactly one place, and the content area gets the whole
 * screen instead of a centred column with a header above it.
 */
interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

/* Icons are inline so the rail costs no extra request and inherits currentColor. */
const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const ITEMS: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Home',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" {...stroke} />
      </svg>
    ),
  },
  {
    to: '/videos',
    label: 'Videos',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="3" {...stroke} />
        <path d="M10.5 9.5v5l4-2.5z" {...stroke} />
      </svg>
    ),
  },
  {
    to: '/formula-sheets',
    label: 'Formula Sheets',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <rect x="4" y="3" width="16" height="18" rx="3" {...stroke} />
        <path d="M8 8h8M8 12h5M8 16h3" {...stroke} />
      </svg>
    ),
  },
  {
    to: '/ncert-highlights',
    label: 'NCERT Highlights',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path d="M5 4h11l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" {...stroke} />
        <path d="M15 4v5h5M8 14l2.5 2.5L16 11" {...stroke} />
      </svg>
    ),
  },
  {
    to: '/mock-tests',
    label: 'Mock Tests',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <rect x="4" y="3" width="16" height="18" rx="3" {...stroke} />
        <circle cx="9" cy="9" r="1.6" {...stroke} />
        <circle cx="9" cy="15" r="1.6" {...stroke} />
        <path d="M13.5 9h3.5M13.5 15h3.5" {...stroke} />
      </svg>
    ),
  },
];

/**
 * Detail routes whose section is not obvious from the path. Everything else
 * matches by prefix — /videos/:id already lights up Videos — but a score sits
 * at /results/:id, which shares no prefix with the tests it came from.
 */
const EXTRA_MATCHES: Record<string, string[]> = {
  '/mock-tests': ['/results'],
};

function isSectionActive(itemPath: string, pathname: string): boolean {
  if (pathname === itemPath || pathname.startsWith(`${itemPath}/`)) return true;
  return (EXTRA_MATCHES[itemPath] ?? []).some(
    (extra) => pathname === extra || pathname.startsWith(`${extra}/`),
  );
}

interface SideNavProps {
  onNavigate?: () => void;
  /** Icons only, no labels. The drawer never collapses; the desktop rail can. */
  collapsed?: boolean;
}

/** Labels slide their own width away, so the rail never jumps mid-animation. */
function Label({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {show ? (
        <motion.span
          className="overflow-hidden whitespace-nowrap"
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: 'auto' }}
          exit={{ opacity: 0, width: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
          {children}
        </motion.span>
      ) : null}
    </AnimatePresence>
  );
}

export function SideNav({ onNavigate, collapsed = false }: SideNavProps) {
  const { user, isPremium, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  function handleLogout() {
    onNavigate?.();
    logout();
    navigate('/', { replace: true });
  }

  const name = user?.name ?? 'Student';
  const initial = name.trim().charAt(0).toUpperCase() || 'S';

  return (
    <div className="shell-rail flex h-full w-full flex-col overflow-x-hidden overflow-y-auto">
      {/* ---- Brand ---- */}
      <div className={`pt-6 pb-5 ${collapsed ? 'flex justify-center px-3' : 'px-4'}`}>
        <Link
          to="/dashboard"
          onClick={onNavigate}
          className="inline-flex min-w-0 rounded-lg transition-opacity hover:opacity-70"
          title="infi-Eureka"
        >
          {collapsed ? (
            <img src="/i3w-mark.png" alt="infi-Eureka" className="h-8 w-auto" />
          ) : (
            <BrandMark />
          )}
        </Link>
      </div>

      {/* ---- Who you are ---- */}
      <div
        className={`flex items-center gap-3 border-b-[3px] border-[var(--brut-line)] pb-5 ${
          collapsed ? 'justify-center px-3' : 'justify-between px-4'
        }`}
      >
        {!collapsed ? (
          <div className="min-w-0">
            <p className="truncate font-display text-[1.05rem] font-bold">{name}</p>
            <p className="text-sm text-ink-soft">{isPremium ? 'Full access' : 'Free plan'}</p>
          </div>
        ) : null}
        <span className="shell-avatar" title={name} aria-hidden="true">
          {initial}
        </span>
      </div>

      {/* ---- Where you can go ---- */}
      <nav aria-label="Main" className="flex flex-1 flex-col gap-3 px-4 py-6">
        {ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className="shell-nav-item"
            data-collapsed={collapsed}
            // The only thing naming the destination once labels are gone.
            title={collapsed ? item.label : undefined}
            aria-label={collapsed ? item.label : undefined}
            aria-current={isSectionActive(item.to, pathname) ? 'page' : undefined}
          >
            <span className="shell-nav-icon">{item.icon}</span>
            <Label show={!collapsed}>{item.label}</Label>
          </Link>
        ))}
      </nav>

      {/* ---- The way out ---- */}
      <div className="px-4 pb-6">
        <button
          type="button"
          onClick={handleLogout}
          className="shell-nav-item"
          data-exit="true"
          data-collapsed={collapsed}
          title={collapsed ? 'Logout' : undefined}
          aria-label={collapsed ? 'Logout' : undefined}
        >
          <span className="shell-nav-icon">
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3" {...stroke} />
              <path d="M10 8l-4 4 4 4M6 12h9" {...stroke} />
            </svg>
          </span>
          <Label show={!collapsed}>Logout</Label>
        </button>
      </div>
    </div>
  );
}

