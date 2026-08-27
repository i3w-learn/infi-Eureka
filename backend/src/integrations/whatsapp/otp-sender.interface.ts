/**
 * The contract for delivering a login code to a phone.
 *
 * `AuthService` depends on this and never on Gupshup, so tests hand it a fake
 * and swapping providers is a change in the container and nowhere else — the
 * same shape as `IPaymentGateway`.
 */
export interface IOtpSender {
  /** False until the provider's keys are present in .env. */
  isConfigured(): boolean;
  /**
   * Delivers the code, or throws. It must throw on failure: a student who
   * never receives the message must not be told that we sent it.
   */
  sendOtp(phone: string, otp: string): Promise<void>;
}
