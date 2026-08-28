import { randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { env, isProduction } from '../config/env.js';
import type { IOtpDao } from '../dao/interfaces/otp-dao.interface.js';
import type { IUserDao } from '../dao/interfaces/user-dao.interface.js';
import type { IOtpSender } from '../integrations/whatsapp/otp-sender.interface.js';
import type { UserRow } from '../models/user.js';
import type {
  OtpRequestResult,
  OtpVerifyResult,
  PublicUser,
  RegisterResult,
} from '../types/auth-types.js';
import {
  InvalidCredentialsError,
  NotFoundError,
  OtpDeliveryError,
  UnauthenticatedError,
  ValidationError,
} from '../exceptions/app-error.js';
import { AppError } from '../exceptions/app-error.js';
import {
  createRegistrationToken,
  createSessionToken,
  readRegistrationToken,
} from '../utils/token.js';

const OTP_TTL_SECONDS = 5 * 60;
const MAX_OTP_ATTEMPTS = 5;

/**
 * A fixed account for manual testing:
 * phone 9999999999 always accepts code 1234, no WhatsApp message, no random code. The
 * account is created on first login and unlocked without payment, so testing
 * never stops at the paywall.
 *
 * Off on a real deployment — without that guard this is a fixed-code way into
 * one always-premium account, so anyone who knows the number and the code gets
 * the paid course for free.
 *
 * DEMO_LOGIN=true is the one deliberate exception: a deployment with no real
 * students on it, shown to someone who needs to click through the product.
 * It must never be set on a deployment taking real signups.
 */
const TEST_PHONE = '9999999999';
const TEST_OTP = '1234';
const TEST_CHALLENGE = 'test-account-challenge';

/** The test account is open outside production, or where a demo asks for it. */
const testAccountOpen = !isProduction || env.demoLogin;

/** Signing up with a phone that already has an account. */
export class AlreadyRegisteredError extends AppError {
  constructor() {
    super('An account with this number already exists. Just log in.', 409, 'ALREADY_REGISTERED');
  }
}

export interface RegisterInput {
  phone: string;
  /** dd-mm-yyyy, as the API contract specifies. */
  dateOfBirth: string;
  accessToken: string;
  username?: string | undefined;
  class?: string | undefined;
  subjects?: string[] | undefined;
  goals?: string[] | undefined;
  learningPreference?: string[] | undefined;
}

function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    name: user.name ?? 'Student',
    phone: user.phone ?? '',
    email: user.email ?? '',
    isPremium: user.is_premium,
    createdAt: user.created_at,
  };
}

/** dd-mm-yyyy → yyyy-mm-dd, rejecting impossible dates like 31-02-2008. */
function toIsoDate(ddmmyyyy: string): string {
  const [day, month, year] = ddmmyyyy.split('-').map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month! - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new ValidationError('That date of birth does not exist. Use dd-mm-yyyy.');
  }
  return date.toISOString().slice(0, 10);
}

/**
 * The phone + OTP flow: request a code, verify it, register if new.
 *
 * The code goes out through `IOtpSender` — Gupshup's WhatsApp API once its keys
 * are in .env, the server log otherwise. When it only reached the log, the code
 * also comes back in the response as `devOtp` so the flow can be walked through
 * without a real phone; with a provider connected that field is never sent.
 */
export class AuthService {
  constructor(
    private readonly userDao: IUserDao,
    private readonly otpDao: IOtpDao,
    private readonly otpSender: IOtpSender,
  ) {}

  async requestOtp(phone: string): Promise<OtpRequestResult> {
    if (testAccountOpen && phone === TEST_PHONE) {
      return {
        message: 'Test account — use code 1234.',
        challengeToken: TEST_CHALLENGE,
        expiresIn: OTP_TTL_SECONDS,
        devOtp: TEST_OTP,
      };
    }

    // Whether the code will actually reach the student's phone, or only the log.
    const delivered = this.otpSender.isConfigured();
    // On a real deployment a code nobody receives is a failure, not something
    // to paper over with a cheerful "we sent it".
    if (isProduction && !delivered) throw new OtpDeliveryError();

    const otp = String(randomInt(1000, 10000));

    // Sent before the challenge is stored, so a provider failure leaves no row
    // behind — the student just asks for a new code.
    await this.otpSender.sendOtp(phone, otp);

    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);
    const challengeToken = await this.otpDao.createChallenge(phone, otpHash, expiresAt);

    return {
      message: delivered
        ? 'We sent a 4-digit code on WhatsApp.'
        : 'WhatsApp is not connected yet — the code is in the response and the server log.',
      challengeToken,
      expiresIn: OTP_TTL_SECONDS,
      // Handed back only when it went nowhere a student could read it.
      ...(delivered ? {} : { devOtp: otp }),
    };
  }

  async verifyOtp(phone: string, otp: string, challengeToken: string): Promise<OtpVerifyResult> {
    if (testAccountOpen && phone === TEST_PHONE) {
      if (otp !== TEST_OTP) {
        throw new InvalidCredentialsError('The test account code is 1234.');
      }
      // Self-healing: recreate the account if the database was reset.
      const testUser =
        (await this.userDao.findByPhone(TEST_PHONE)) ??
        (await this.userDao.create({
          phone: TEST_PHONE,
          dateOfBirth: '2008-01-01',
          username: 'Test Student',
          studentClass: '12',
          subjects: ['biology', 'physics', 'chemistry'],
        }));
      // Unlocked on every login so testing never stops at the paywall. Re-applied
      // each time rather than once at creation, so it survives a database reset
      // or the flag being cleared by hand.
      await this.userDao.grantPremium(testUser.id);
      return { isNewUser: false, accessToken: createSessionToken(testUser.id) };
    }

    const challenge = await this.otpDao.findChallenge(challengeToken, phone);
    if (!challenge) {
      throw new UnauthenticatedError('This code has expired. Request a new one.');
    }

    if (new Date(challenge.expires_at).getTime() < Date.now()) {
      await this.otpDao.deleteChallenge(challenge.id);
      throw new UnauthenticatedError('This code has expired. Request a new one.');
    }

    if (challenge.attempts >= MAX_OTP_ATTEMPTS) {
      await this.otpDao.deleteChallenge(challenge.id);
      throw new UnauthenticatedError('Too many wrong guesses. Request a new code.');
    }

    const matches = await bcrypt.compare(otp, challenge.otp_hash);
    if (!matches) {
      const attempts = await this.otpDao.recordFailedAttempt(challenge.id);
      if (attempts >= MAX_OTP_ATTEMPTS) {
        await this.otpDao.deleteChallenge(challenge.id);
        throw new UnauthenticatedError('Too many wrong guesses. Request a new code.');
      }
      throw new InvalidCredentialsError('That code is not right. Check WhatsApp and try again.');
    }

    // A code is single-use whether or not an account exists.
    await this.otpDao.deleteChallenge(challenge.id);

    const user = await this.userDao.findByPhone(phone);
    if (user) {
      return { isNewUser: false, accessToken: createSessionToken(user.id) };
    }
    return { isNewUser: true, accessToken: createRegistrationToken(phone) };
  }

  async register(input: RegisterInput): Promise<RegisterResult> {
    const verifiedPhone = readRegistrationToken(input.accessToken);
    if (!verifiedPhone || verifiedPhone !== input.phone) {
      throw new UnauthenticatedError('Your verification has expired. Start again from your phone number.');
    }

    if (await this.userDao.findByPhone(input.phone)) {
      throw new AlreadyRegisteredError();
    }

    const user = await this.userDao.create({
      phone: input.phone,
      dateOfBirth: toIsoDate(input.dateOfBirth),
      username: input.username,
      studentClass: input.class,
      subjects: input.subjects,
      goals: input.goals,
      learningPreference: input.learningPreference,
    });

    return { accessToken: createSessionToken(user.id), user: toPublicUser(user) };
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.userDao.findById(userId);
    if (!user) throw new NotFoundError('This account no longer exists.');
    return toPublicUser(user);
  }

  /**
   * Erases an account and its history. Admin-only, and there is no undo: the
   * student's highlights, attempts and payment records all go with it.
   *
   * The number has to match what was stored exactly, the same way login looks
   * it up — nothing normalises phone numbers on the way in, so `9876543210`
   * and `+919876543210` are two different accounts as far as this is concerned.
   */
  async deleteAccount(phone: string): Promise<void> {
    const deleted = await this.userDao.deleteByPhone(phone);
    if (!deleted) throw new NotFoundError('No account is registered with that number.');
  }
}
