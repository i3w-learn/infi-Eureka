/**
 * Errors services throw. Routes never build HTTP error responses by hand —
 * they let these bubble up and `middleware/error-handler.ts` maps them.
 *
 * The status/code pairs below are fixed by the SRS error model (§8). Changing
 * one here changes the API contract, so don't.
 */
export class AppError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Invalid request') {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

/** No valid token at all. */
export class UnauthenticatedError extends AppError {
  constructor(message = 'You need to be logged in') {
    super(message, 401, 'UNAUTHENTICATED');
  }
}

/** Email or password did not match. Deliberately vague — never say which. */
export class InvalidCredentialsError extends AppError {
  constructor(message = 'Email or password is incorrect') {
    super(message, 401, 'INVALID_CREDENTIALS');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have access to this') {
    super(message, 403, 'FORBIDDEN');
  }
}

/** Logged in, but has not paid yet. */
export class PaymentRequiredError extends AppError {
  constructor(message = 'Unlock the course to access this') {
    super(message, 403, 'PAYMENT_REQUIRED');
  }
}

/** A Razorpay payload failed signature verification (SRS §8: 400). */
export class InvalidSignatureError extends AppError {
  constructor(message = 'Payment could not be verified') {
    super(message, 400, 'INVALID_SIGNATURE');
  }
}

/** Result requested for an attempt that has not been submitted (FR-T-17). */
export class AttemptInProgressError extends AppError {
  constructor(message = 'Submit the test to see your result') {
    super(message, 409, 'ATTEMPT_IN_PROGRESS');
  }
}

/** A byte range outside the file (streaming only). */
export class RangeNotSatisfiableError extends AppError {
  constructor(message = 'Requested range is outside the file') {
    super(message, 416, 'RANGE_NOT_SATISFIABLE');
  }
}

/** Payment endpoints called before the Razorpay keys are in .env. */
export class PaymentsNotConfiguredError extends AppError {
  constructor(message = 'Payments are not configured yet. Add the Razorpay keys to .env.') {
    super(message, 503, 'PAYMENTS_NOT_CONFIGURED');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class EmailTakenError extends AppError {
  constructor(message = 'An account with this email already exists') {
    super(message, 409, 'EMAIL_TAKEN');
  }
}

export class AlreadyPremiumError extends AppError {
  constructor(message = 'You have already unlocked the course') {
    super(message, 409, 'ALREADY_PREMIUM');
  }
}

export class AlreadySubmittedError extends AppError {
  constructor(message = 'This attempt has already been submitted') {
    super(message, 409, 'ALREADY_SUBMITTED');
  }
}

export class AttemptExpiredError extends AppError {
  constructor(message = 'Time is up for this attempt') {
    super(message, 409, 'ATTEMPT_EXPIRED');
  }
}

export class RateLimitedError extends AppError {
  constructor(message = 'Too many requests. Please wait a moment.') {
    super(message, 429, 'RATE_LIMITED');
  }
}
