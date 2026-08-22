import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/** Not logged in → sent to login, remembering where they were headed. */
export function RequireAuth() {
  const { isLoggedIn, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p className="page-status">Loading…</p>;
  if (!isLoggedIn) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}

/** Logged in but hasn't paid → sent to the unlock page. */
export function RequirePremium() {
  const { isLoggedIn, isPremium, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p className="page-status">Loading…</p>;
  if (!isLoggedIn) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!isPremium) return <Navigate to="/unlock" replace />;
  return <Outlet />;
}
