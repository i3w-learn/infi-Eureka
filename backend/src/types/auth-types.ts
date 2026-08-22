/**
 * What we put inside the session JWT — the user id and nothing else.
 *
 * Deliberately no `isPremium` here. If premium lived in the token, a student
 * who paid would still be locked out until their old token expired, and
 * revoking access would be impossible without invalidating every session.
 * Premium is read from the database on each gated request instead.
 *
 * `purpose` appears only on registration tokens (a phone that passed OTP but
 * has no account yet); the auth guard rejects those as sessions.
 */
export interface JwtPayload {
  sub: string;
  purpose?: 'register' | 'stream';
}

/** The user object routes hand back to the client. */
export interface PublicUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  isPremium: boolean;
  createdAt: string;
}

export interface OtpRequestResult {
  message: string;
  challengeToken: string;
  expiresIn: number;
  /** The code itself — present only outside production, standing in for SMS. */
  devOtp?: string;
}

export interface OtpVerifyResult {
  isNewUser: boolean;
  accessToken: string;
}

export interface RegisterResult {
  accessToken: string;
  user: PublicUser;
}
