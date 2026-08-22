import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { ChipGroup } from '../components/ChipGroup';
import { FormError } from '../components/FormError';
import { TextField } from '../components/TextField';
import { ApiError, tokenStore } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import {
  CLASS_OPTIONS,
  GOAL_OPTIONS,
  LEARNING_OPTIONS,
  SUBJECT_OPTIONS,
  otpAuthApi,
} from '../api/otp-auth.api';
import { track } from '../analytics/ga';
import { validateDateOfBirth, validateOtp, validatePhone } from '../lib/validation';

/**
 * Signup follows the backend's real flow (auth.schema.ts):
 *
 *   phone → OTP → about-you (register)
 *
 * The register call requires phone, dateOfBirth and accessToken; phone and
 * accessToken carry over from the first two steps, so the student only ever
 * types their date of birth. Everything else on the last step is optional
 * and skippable.
 */
type Step = 'phone' | 'otp' | 'details';

const STEPS: { key: Step; label: string }[] = [
  { key: 'phone', label: 'Phone' },
  { key: 'otp', label: 'Verify' },
  { key: 'details', label: 'About you' },
];

const stepMotion = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
  transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const },
};

/** Types digits, sees dd-mm-yyyy — hyphens appear on their own. */
function formatDob(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
  return parts.join('-');
}

function StepBubbles({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);
  return (
    <ol className="mb-7 flex items-center gap-0" aria-label="Signup progress">
      {STEPS.map(({ key, label }, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li key={key} className="flex items-center">
            {index > 0 ? (
              <span
                className={`mx-2 h-px w-8 transition-colors ${done || active ? 'bg-marigold' : 'bg-paper-edge'}`}
              />
            ) : null}
            <span className="flex items-center gap-1.5">
              <span
                className={`grid h-5 w-5 place-items-center rounded-bubble border text-[0.6rem] font-semibold transition-colors ${
                  done
                    ? 'border-marigold bg-marigold text-white'
                    : active
                      ? 'border-marigold text-marigold'
                      : 'border-paper-edge text-ink-faint'
                }`}
              >
                {done ? '✓' : index + 1}
              </span>
              <span className={`text-[0.75rem] ${active ? 'font-medium text-ink' : 'text-ink-faint'}`}>
                {label}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

const COPY: Record<Step, { title: string; subtitle: string }> = {
  phone: {
    title: 'Create your account',
    subtitle: 'We sign you in with your mobile number — no password to remember.',
  },
  otp: {
    title: 'Check your phone',
    subtitle: 'We sent a 4-digit code by SMS. Enter it here.',
  },
  details: {
    title: 'About you',
    subtitle: 'Your date of birth is all we need — the rest helps us set things up for you.',
  },
};

export function SignupPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const [step, setStep] = useState<Step>('phone');
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  // Step 1 → 2 carry-over
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string>();
  const [challengeToken, setChallengeToken] = useState('');

  // Step 2 → 3 carry-over
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string>();
  /** In development the backend returns the code, standing in for the SMS. */
  const [devOtp, setDevOtp] = useState<string>();
  const [accessToken, setAccessToken] = useState('');

  // Step 3 (register) fields
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [dobError, setDobError] = useState<string>();
  const [username, setUsername] = useState('');
  const [studentClass, setStudentClass] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [learningPreference, setLearningPreference] = useState<string[]>([]);

  const cleanedPhone = phone.replace(/[\s-]/g, '');

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

      if (!response.isNewUser && response.accessToken) {
        // Already registered — this is just a login.
        tokenStore.set(response.accessToken);
        await refresh();
        track.loginCompleted();
        navigate('/dashboard', { replace: true });
        return;
      }

      setAccessToken(response.accessToken ?? '');
      setStep('details');
    } catch (error) {
      fail(error);
    } finally {
      setSubmitting(false);
    }
  }

  async function register(event: FormEvent) {
    event.preventDefault();
    const error = validateDateOfBirth(dateOfBirth);
    setDobError(error);
    if (error) return;

    setFormError(undefined);
    setSubmitting(true);
    try {
      const response = await otpAuthApi.register({
        phone: cleanedPhone,
        dateOfBirth,
        accessToken,
        ...(username.trim() ? { username: username.trim() } : {}),
        ...(studentClass[0] ? { class: studentClass[0] } : {}),
        ...(subjects.length ? { subjects } : {}),
        ...(goals.length ? { goals } : {}),
        ...(learningPreference.length ? { learningPreference } : {}),
      });
      tokenStore.set(response.accessToken);
      // Tell the auth context about the new session before navigating, or the
      // dashboard guard still sees a logged-out user and bounces to /login.
      await refresh();
      track.signupCompleted();
      navigate('/dashboard', { replace: true });
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
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-plum underline underline-offset-4 hover:text-marigold">
            Log in
          </Link>
        </>
      }
    >
      <StepBubbles current={step} />
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
              hint="We'll text a code to this number"
            />
            <Button type="submit" loading={submitting} loadingLabel="Sending code">
              Send code
            </Button>
          </motion.form>
        ) : step === 'otp' ? (
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
            <Button type="submit" loading={submitting} loadingLabel="Verifying">
              Verify
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
        ) : (
          <motion.form key="details" onSubmit={register} noValidate className="space-y-5" {...stepMotion}>
            <TextField
              label="Date of birth"
              name="dateOfBirth"
              type="text"
              inputMode="numeric"
              placeholder="dd-mm-yyyy"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(formatDob(e.target.value))}
              error={dobError}
            />

            <TextField
              label="Name"
              tag="optional"
              name="username"
              autoComplete="name"
              placeholder="Asha Menon"
              maxLength={100}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <ChipGroup
              label="Class"
              tag="optional"
              options={CLASS_OPTIONS.map((c) => ({ value: c, label: `Class ${c}` }))}
              selected={studentClass}
              onChange={setStudentClass}
            />

            <ChipGroup
              label="Subjects"
              tag="optional"
              multi
              options={SUBJECT_OPTIONS}
              selected={subjects}
              onChange={setSubjects}
            />

            <ChipGroup
              label="What are you aiming for?"
              tag="optional"
              multi
              options={GOAL_OPTIONS}
              selected={goals}
              onChange={setGoals}
            />

            <ChipGroup
              label="How do you like to study?"
              tag="optional"
              multi
              options={LEARNING_OPTIONS}
              selected={learningPreference}
              onChange={setLearningPreference}
            />

            <Button type="submit" loading={submitting} loadingLabel="Creating account">
              Create account
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}
