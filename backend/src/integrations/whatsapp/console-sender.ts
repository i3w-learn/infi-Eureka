import type { IOtpSender } from './otp-sender.interface.js';

/**
 * The stand-in used until the Gupshup keys are in .env: the code goes to the
 * server log instead of WhatsApp. Outside production `AuthService` also hands
 * it back in the response as `devOtp`, so the whole flow can be walked through
 * with no provider and no real phone.
 *
 * `isConfigured()` is false on purpose — that is how `AuthService` knows the
 * code was not actually delivered anywhere a student can read it.
 */
export class ConsoleOtpSender implements IOtpSender {
  isConfigured(): boolean {
    return false;
  }

  sendOtp(phone: string, otp: string): Promise<void> {
    console.error(`[dev] OTP for ${phone}: ${otp}`);
    return Promise.resolve();
  }
}
