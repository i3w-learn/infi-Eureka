const TOKEN_KEY = 'infi_eureka_token';

/**
 * Where the API lives. Empty in development because the Vite proxy forwards
 * /api/v1 to the backend; a production build sets the real origin.
 */
export const API_BASE = (import.meta.env['VITE_API_URL'] as string | undefined) ?? '/api/v1';

export const tokenStore = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  clear: (): void => localStorage.removeItem(TOKEN_KEY),
};

/** Mirrors the backend's `{ error: { code, message } }` shape. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** True when the user is logged in but has not paid yet. */
  get needsPayment(): boolean {
    return this.status === 403 && this.code === 'PAYMENT_REQUIRED';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

/**
 * The single place the frontend talks to the backend. Every feature module in
 * this folder builds on it, so auth headers and error shape are handled once.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options;
  const token = tokenStore.get();

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    ...(signal ? { signal } : {}),
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (payload as { error?: { code?: string; message?: string } } | null)?.error;
    // Domain errors (wrong password, email taken, payment required) carry
    // messages written for the user — show those as-is. A missing route or a
    // server crash carries a developer message; a person reading "Route POST
    // /api/v1/... does not exist" can do nothing with it, so translate.
    const isUserFacing = response.status < 500 && error?.code !== 'NOT_FOUND';
    throw new ApiError(
      isUserFacing && error?.message
        ? error.message
        : 'Something went wrong on our side. Please try again in a moment.',
      response.status,
      error?.code ?? 'UNKNOWN',
    );
  }

  return payload as T;
}
