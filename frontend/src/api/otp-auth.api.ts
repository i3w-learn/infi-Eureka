import { apiRequest } from './client';

/**
 * The real auth flow, mirroring the backend's auth.schema.ts:
 *
 *   1. requestOtp(phone)            → challengeToken (OTP sent on WhatsApp)
 *   2. verifyOtp(phone, otp, token) → isNewUser + accessToken
 *   3. register(...)                → account created (new users only)
 *
 * `phone` and `accessToken` are required by the register schema but are never
 * typed by the student — they carry over from steps 1 and 2.
 */

export interface OtpRequestResponse {
  message: string;
  challengeToken: string;
  expiresIn: number;
  /** Present only in development — stands in for the WhatsApp message. */
  devOtp?: string;
}

export interface OtpVerifyResponse {
  isNewUser: boolean;
  accessToken?: string;
}

export interface RegisterInput {
  phone: string;
  /** dd-mm-yyyy */
  dateOfBirth: string;
  accessToken: string;
  username?: string;
  class?: string;
  subjects?: string[];
  goals?: string[];
  learningPreference?: string[];
}

export interface RegisterResponse {
  accessToken: string;
}

export const otpAuthApi = {
  requestOtp: (phone: string) =>
    apiRequest<OtpRequestResponse>('/auth/request-otp', { method: 'POST', body: { phone } }),

  verifyOtp: (input: { phone: string; otp: string; challengeToken: string }) =>
    apiRequest<OtpVerifyResponse>('/auth/verify-otp', { method: 'POST', body: input }),

  register: (input: RegisterInput) =>
    apiRequest<RegisterResponse>('/auth/register', { method: 'POST', body: input }),
};

/** Class options as the backend's classes.constants.ts defines them. */
export const CLASS_OPTIONS = ['6', '7', '8', '9', '10', '11', '12'] as const;

/** Subject values as the backend's subjects.constants.ts defines them. */
export const SUBJECT_OPTIONS = [
  { value: 'biology', label: 'Biology' },
  { value: 'physics', label: 'Physics' },
  { value: 'chemistry', label: 'Chemistry' },
] as const;

/** goals/learningPreference are free strings in the schema; these are our set. */
export const GOAL_OPTIONS = [
  { value: 'crack-neet', label: 'Crack NEET' },
  { value: 'board-exams', label: 'Score in boards' },
  { value: 'improve-rank', label: 'Improve my rank' },
  { value: 'build-foundation', label: 'Build my foundation' },
] as const;

export const LEARNING_OPTIONS = [
  { value: 'one-shot-videos', label: 'One-shot videos' },
  { value: 'notes-highlights', label: 'Notes & highlights' },
  { value: 'mock-tests', label: 'Mock tests' },
  { value: 'revision', label: 'Quick revision' },
] as const;
