import { createSigner, createVerifier } from 'fast-jwt';
import { env } from '../config/env.js';

/**
 * Two kinds of token, same secret, told apart by `purpose`:
 *
 * - session token — `{ sub: userId }`, lives 7 days, proves who you are.
 * - registration token — `{ sub: phone, purpose: 'register' }`, lives 15
 *   minutes, proves only that this phone just passed OTP verification. It
 *   cannot be used as a session (the auth guard rejects any `purpose`).
 *
 * fast-jwt is the same engine @fastify/jwt uses, so tokens signed here verify
 * there and vice versa.
 */
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const REGISTRATION_TTL_MS = 15 * 60 * 1000;
const STREAM_TTL_MS = 5 * 60 * 1000;

const signSession = createSigner({ key: env.jwtSecret, expiresIn: SESSION_TTL_MS });
const signRegistration = createSigner({ key: env.jwtSecret, expiresIn: REGISTRATION_TTL_MS });
const signStream = createSigner({ key: env.jwtSecret, expiresIn: STREAM_TTL_MS });
const verify = createVerifier({ key: env.jwtSecret });

export function createSessionToken(userId: string): string {
  return signSession({ sub: userId });
}

export function createRegistrationToken(phone: string): string {
  return signRegistration({ sub: phone, purpose: 'register' });
}

/** The phone inside a valid registration token, or null for anything else. */
export function readRegistrationToken(token: string): string | null {
  try {
    const payload = verify(token) as { sub?: string; purpose?: string };
    return payload.purpose === 'register' && payload.sub ? payload.sub : null;
  } catch {
    return null;
  }
}

/**
 * Stream tokens (FR-V-06): a `<video>` tag cannot send an Authorization
 * header, so playback is authorised by a 5-minute token in the query string,
 * bound to one user AND one video. The auth guard rejects it as a session
 * (it carries a `purpose`), and `readStreamToken` rejects everything else.
 */
export function createStreamToken(userId: string, videoId: string): string {
  return signStream({ sub: userId, vid: videoId, purpose: 'stream' });
}

/** The user and video inside a valid stream token, or null for anything else. */
export function readStreamToken(token: string): { userId: string; videoId: string } | null {
  try {
    const payload = verify(token) as { sub?: string; vid?: string; purpose?: string };
    return payload.purpose === 'stream' && payload.sub && payload.vid
      ? { userId: payload.sub, videoId: payload.vid }
      : null;
  } catch {
    return null;
  }
}
