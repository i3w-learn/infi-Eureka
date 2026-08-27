import type { IOtpSender } from './otp-sender.interface.js';
import { OtpDeliveryError } from '../../exceptions/app-error.js';

const TEMPLATE_MESSAGE_URL = 'https://api.gupshup.io/wa/api/v1/template/msg';

/** Students type a 10-digit number; Gupshup wants it with the country code. */
const INDIA_COUNTRY_CODE = '91';

/** Gupshup is in the login path, so a hung call must not hold the request open. */
const REQUEST_TIMEOUT_MS = 10_000;

export interface GupshupConfig {
  apiKey: string;
  /** The WhatsApp number the message is sent from, with country code. */
  sourceNumber: string;
  /** Gupshup's name for the app that owns the source number. */
  appName: string;
  /** The Meta-approved authentication template that carries the code. */
  templateId: string;
}

/** 9876543210 → 919876543210, and +91 98765-43210 → the same. Already-prefixed numbers are left alone. */
function toDestination(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 ? `${INDIA_COUNTRY_CODE}${digits}` : digits;
}

/**
 * Sends the login code over WhatsApp through Gupshup.
 *
 * The template is an *authentication* template, which is why the code goes
 * into `params` twice: once for the sentence in the message body and once for
 * the "copy code" button. One value, two slots — Gupshup rejects the message
 * if the second is missing.
 *
 * Nothing here ever logs the code itself. Gupshup's own error text is logged
 * because it names the real problem ("Invalid Destination", "Template not
 * found"), and the student only ever sees the generic failure message.
 */
export class GupshupOtpSender implements IOtpSender {
  constructor(private readonly config: GupshupConfig) {}

  isConfigured(): boolean {
    const { apiKey, sourceNumber, appName, templateId } = this.config;
    return apiKey !== '' && sourceNumber !== '' && appName !== '' && templateId !== '';
  }

  async sendOtp(phone: string, otp: string): Promise<void> {
    const body = new URLSearchParams({
      channel: 'whatsapp',
      source: this.config.sourceNumber,
      destination: toDestination(phone),
      'src.name': this.config.appName,
      template: JSON.stringify({ id: this.config.templateId, params: [otp, otp] }),
    });

    let response: Response;
    try {
      response = await fetch(TEMPLATE_MESSAGE_URL, {
        method: 'POST',
        headers: {
          apikey: this.config.apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (cause) {
      // Gupshup never answered at all — network down, DNS, or our timeout.
      console.error(`[gupshup] request failed: ${String(cause)}`);
      throw new OtpDeliveryError();
    }

    const text = await response.text();

    // Success is 202. Gupshup also answers 200 with {"status":"error"} for some
    // rejections, so the body is checked too rather than the status alone.
    if (!response.ok || text.includes('"status":"error"')) {
      console.error(`[gupshup] ${response.status} ${text}`);
      throw new OtpDeliveryError();
    }
  }
}
