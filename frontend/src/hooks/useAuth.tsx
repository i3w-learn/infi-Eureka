import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi } from '../api/auth.api';
import { tokenStore } from '../api/client';
import type { User } from '../api/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  isLoggedIn: boolean;
  isPremium: boolean;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * Holds "who is logged in" for the whole app.
 *
 * `isPremium` comes from the server on every refresh — the UI uses it only to
 * decide what to show. The real lock is enforced by the backend, so editing
 * this value in the browser unlocks nothing.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // With no stored token there is no session to restore, so we start settled
  // rather than flashing a loading state on every anonymous page view.
  const [loading, setLoading] = useState(() => tokenStore.get() !== null);

  /** Re-reads the current user from the server. Call after payment succeeds. */
  const refresh = useCallback(async () => {
    if (!tokenStore.get()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      setUser(await authApi.me());
    } catch {
      tokenStore.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Restore the session once on mount. The state updates happen after the
  // request resolves, never synchronously, so this cannot cascade renders.
  useEffect(() => {
    if (!tokenStore.get()) return;

    let cancelled = false;
    void (async () => {
      try {
        const me = await authApi.me();
        if (!cancelled) setUser(me);
      } catch {
        tokenStore.clear();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      isLoggedIn: user !== null,
      isPremium: user?.isPremium ?? false,
      logout,
      refresh,
    }),
    [user, loading, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return context;
}
