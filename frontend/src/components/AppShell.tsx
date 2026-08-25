import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { BrandMark } from './BrandMark';
import { SideNav } from './SideNav';

/**
 * The frame every logged-in page sits in: a left rail, and a content area that
 * gets everything else — full width, no centred column.
 *
 * The rail collapses to icons and back, and the choice is remembered. It
 * collapses rather than disappearing: a student who hides it still needs a way
 * to bring it back, and a rail of icons is that way. There is no state where
 * navigation is unreachable.
 *
 * On phones the rail would eat the screen, so it becomes a drawer behind a
 * hamburger in a slim top bar. That bar exists ONLY below `lg`; on a desktop
 * the rail is the whole navigation and nothing is duplicated above the content.
 *
 * The exam screen deliberately does not use this shell. Mid-test, a rail of
 * links away from the paper is a way to lose an attempt by accident.
 */
const RAIL_EXPANDED = '15rem';
const RAIL_COLLAPSED = '6rem';
const COLLAPSE_KEY = 'infi-eureka:rail-collapsed';

/** Reading storage can throw in a locked-down browser; the rail still works. */
function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

export function AppShell() {
  // Every link inside the drawer closes it through `onNavigate`, so there is
  // no effect watching the route — the click that navigates is the same click
  // that dismisses.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);

  function toggleRail() {
    setCollapsed((previous) => {
      const next = !previous;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        // A preference that cannot be saved is not worth failing over.
      }
      return next;
    });
  }

  // Escape closes the drawer, and the page behind must not scroll while it is open.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setDrawerOpen(false);
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  return (
    <div className="relative flex min-h-screen bg-paper text-ink">
      {/* The same ambient washes the login page sits on. Pure decoration. */}
      <div aria-hidden="true" className="shell-wash shell-wash-marigold" />
      <div aria-hidden="true" className="shell-wash shell-wash-plum" />

      {/* ---- The rail, desktop. Sticky so it stays put as content scrolls. ---- */}
      <motion.aside
        className="sticky top-0 z-20 hidden h-screen shrink-0 lg:block"
        initial={false}
        animate={{ width: collapsed ? RAIL_COLLAPSED : RAIL_EXPANDED }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      >
        <SideNav collapsed={collapsed} />

        {/* Astride the rail's edge, so it does not move when the rail resizes.
            The rail outranks the content column so this half-overhang stays
            clickable rather than sitting under the page. */}
        <button
          type="button"
          onClick={toggleRail}
          className="shell-collapse-toggle absolute top-7 right-0 translate-x-1/2"
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          aria-expanded={!collapsed}
          title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          <motion.svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            aria-hidden="true"
            initial={false}
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <path
              d="M14 6l-6 6 6 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        </button>
      </motion.aside>

      <div className="relative z-[1] flex min-w-0 flex-1 flex-col">
        {/* ---- Slim bar, phones only ---- */}
        <div className="flex items-center gap-3 border-b-[3px] border-[var(--brut-line)] px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
            className="shell-nav-item w-auto px-2.5"
          >
            <span className="flex w-5 flex-col gap-[5px]" aria-hidden="true">
              <span className="h-[2px] rounded-bubble bg-ink" />
              <span className="h-[2px] w-3.5 rounded-bubble bg-marigold" />
              <span className="h-[2px] rounded-bubble bg-ink" />
            </span>
          </button>
          <BrandMark size="sm" />
        </div>

        <main className="flex min-w-0 flex-1 flex-col">
          <Outlet />
        </main>
      </div>

      {/* ---- The rail, phones: a drawer over the page ---- */}
      <AnimatePresence>
        {drawerOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Close navigation"
              className="fixed inset-0 z-40 bg-plum-deep/50 backdrop-blur-[2px] lg:hidden"
              onClick={() => setDrawerOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="fixed inset-y-0 left-0 z-50 w-[18.5rem] max-w-[85vw] lg:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* The drawer is already a deliberate act — it never collapses. */}
              <SideNav onNavigate={() => setDrawerOpen(false)} />
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
