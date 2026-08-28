import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { FormError } from '../components/FormError';
import { FormNotice } from '../components/FormNotice';
import { TextField } from '../components/TextField';
import { ApiError, tokenStore } from '../api/client';
import { otpAuthApi } from '../api/otp-auth.api';
import { useAuth } from '../hooks/useAuth';
import { track } from '../analytics/ga';
import { validateOtp, validatePhone } from '../lib/validation';

/**
 * Login is the same phone + OTP handshake as signup, minus registration:
 * a number that verifies but has no account is sent to signup instead.
 *
 * Signup sends people here the other way — a number that already has an account
 * arrives with a `notice` to explain why, and the number already filled in.
 */
type Step = 'phone' | 'otp';

const stepMotion = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
  transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const },
};

const COPY: Record<Step, { title: string; subtitle: string }> = {
  phone: { title: 'Welcome back', subtitle: 'Log in with your mobile number — no password to remember.' },
  otp: { title: 'Check your phone', subtitle: 'We sent a 4-digit code on WhatsApp. Enter it here.' },
};

/** Shown on the signup page when login finds no account for a verified number. */
const NO_ACCOUNT_NOTICE =
  'No account with this number yet. Your number is verified — just tell us about yourself.';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh } = useAuth();

  /** Set by signup when it turns an existing number away; also carries the number. */
  const handoff = location.state as
    | { notice?: string; phone?: string; from?: { pathname: string } }
    | null;

  const [step, setStep] = useState<Step>('phone');
  const [formError, setFormError] = useState<string>();
  const [notice, setNotice] = useState(handoff?.notice);
  const [submitting, setSubmitting] = useState(false);

  const [phone, setPhone] = useState(handoff?.phone ?? '');
  const [phoneError, setPhoneError] = useState<string>();
  const [challengeToken, setChallengeToken] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string>();
  /** In development the backend returns the code, standing in for the WhatsApp message. */
  const [devOtp, setDevOtp] = useState<string>();

  const cleanedPhone = phone.replace(/[\s-]/g, '');

  /** Where the guard sent them from, so they land back where they were headed. */
  const from = handoff?.from?.pathname;

  function fail(error: unknown) {
    setFormError(
      error instanceof ApiError
        ? error.message
        : 'Could not reach the server. Check your connection and try again.',
    );
  }

  async function sendOtp(event?: FormEvent) {
    event?.preventDefault();
    const error = validatePhone(phone);
    setPhoneError(error);
    if (error) return;

    setFormError(undefined);
    // They have acted on the handoff — the explanation has done its job.
    setNotice(undefined);
    setSubmitting(true);
    try {
      const response = await otpAuthApi.requestOtp(cleanedPhone);
      setChallengeToken(response.challengeToken);
      setDevOtp(response.devOtp);
      setOtp('');
      setStep('otp');
    } catch (error) {
      fail(error);
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyOtp(event: FormEvent) {
    event.preventDefault();
    const error = validateOtp(otp);
    setOtpError(error);
    if (error) return;

    setFormError(undefined);
    setSubmitting(true);
    try {
      const response = await otpAuthApi.verifyOtp({
        phone: cleanedPhone,
        otp: otp.trim(),
        challengeToken,
      });

      if (response.isNewUser) {
        // The code they just entered verified this number, and the response
        // carries the registration token that proves it. Hand both to signup
        // so they finish there — sending them back to type the number again
        // would buy and burn a second WhatsApp message for nothing.
        navigate('/signup', {
          replace: true,
          state: {
            notice: NO_ACCOUNT_NOTICE,
            phone: cleanedPhone,
            accessToken: response.accessToken,
          },
        });
        return;
      }

      tokenStore.set(response.accessToken ?? '');
      await refresh();
      track.loginCompleted();
      navigate(from ?? '/dashboard', { replace: true });
    } catch (error) {
      fail(error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title={COPY[step].title}
      subtitle={COPY[step].subtitle}
      footer={
        <>
          New here?{' '}
          <Link to="/signup" className="font-medium text-plum underline underline-offset-4 hover:text-marigold">
            Create an account
          </Link>
        </>
      }
    >
      <FormNotice message={notice} />
      <FormError message={formError} />

      <AnimatePresence mode="wait">
        {step === 'phone' ? (
          <motion.form key="phone" onSubmit={sendOtp} noValidate className="space-y-5" {...stepMotion}>
            <TextField
              label="Mobile number"
              name="phone"
              type="tel"
              autoComplete="tel"
              inputMode="numeric"
              placeholder="9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={phoneError}
              hint="We'll send a code to this number on WhatsApp"
            />
            <Button type="submit" loading={submitting} loadingLabel="Sending code">
              Send code
            </Button>
          </motion.form>
        ) : (
          <motion.form key="otp" onSubmit={verifyOtp} noValidate className="space-y-5" {...stepMotion}>
            <TextField
              label={`Code sent to ${cleanedPhone}`}
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={4}
              placeholder="••••"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              error={otpError}
              hint={devOtp ? `Test mode — your code is ${devOtp}` : undefined}
            />
            <Button type="submit" loading={submitting} loadingLabel="Logging in">
              Log in
            </Button>
            <p className="text-center text-sm text-ink-soft">
              Nothing arrived?{' '}
              <button
                type="button"
                onClick={() => void sendOtp()}
                className="font-medium text-plum underline underline-offset-4 hover:text-marigold"
              >
                Send again
              </button>{' '}
              ·{' '}
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="font-medium text-plum underline underline-offset-4 hover:text-marigold"
              >
                Change number
              </button>
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}
