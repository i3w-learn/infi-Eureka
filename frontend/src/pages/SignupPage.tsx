import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { ChipGroup } from '../components/ChipGroup';
import { FormError } from '../components/FormError';
import { FormNotice } from '../components/FormNotice';
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
import {
  validateChoice,
  validateDateOfBirth,
  validateName,
  validateOtp,
  validatePhone,
} from '../lib/validation';

/**
 * Signup follows the backend's real flow (auth.schema.ts):
 *
 *   phone → OTP → about-you (register)
 *
 * The register call requires phone, dateOfBirth and accessToken; phone and
 * accessToken carry over from the first two steps. The rest of the last step is
 * optional to the API but required here: an account is created once, and a
 * profile with no class or subjects gives us nothing to set the student up with.
 *
 * A number that already has an account never finishes this flow — it is sent to
 * the login page with a note saying so.
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
    subtitle: 'We sent a 4-digit code on WhatsApp. Enter it here.',
  },
  details: {
    title: 'About you',
    subtitle: 'A few answers so we can set the app up around what you are studying.',
  },
};

/** Shown on the login page after signup turns someone away for already having an account. */
const ALREADY_REGISTERED_NOTICE =
  'You already have an account with this number. Please log in here.';

export function SignupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh } = useAuth();

  /**
   * Set by login when the number turned out to have no account. The OTP is
   * already spent and verified there, so the token comes with it and this page
   * opens on the last step instead of asking for the number a second time.
   */
  const handoff = location.state as
    | { notice?: string; phone?: string; accessToken?: string }
    | null;
  const verified = Boolean(handoff?.accessToken && handoff.phone);

  const [step, setStep] = useState<Step>(verified ? 'details' : 'phone');
  const [formError, setFormError] = useState<string>();
  const [notice, setNotice] = useState(verified ? handoff?.notice : undefined);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 → 2 carry-over
  const [phone, setPhone] = useState(verified ? (handoff?.phone ?? '') : '');
  const [phoneError, setPhoneError] = useState<string>();
  const [challengeToken, setChallengeToken] = useState('');

  // Step 2 → 3 carry-over
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string>();
  /** In development the backend returns the code, standing in for the WhatsApp message. */
  const [devOtp, setDevOtp] = useState<string>();
  const [accessToken, setAccessToken] = useState(verified ? (handoff?.accessToken ?? '') : '');

  // Step 3 (register) fields
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [dobError, setDobError] = useState<string>();
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string>();
  const [studentClass, setStudentClass] = useState<string[]>([]);
  const [classError, setClassError] = useState<string>();
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subjectsError, setSubjectsError] = useState<string>();
  const [goals, setGoals] = useState<string[]>([]);
  const [goalsError, setGoalsError] = useState<string>();
  const [learningPreference, setLearningPreference] = useState<string[]>([]);
  const [learningError, setLearningError] = useState<string>();

  const cleanedPhone = phone.replace(/[\s-]/g, '');

  function fail(error: unknown) {
    setFormError(
      error instanceof ApiError
        ? error.message
        : 'Could not reach the server. Check your connection and try again.',
    );
  }

  /** An existing number belongs on the login page, with the number already filled in. */
  function sendToLogin() {
    navigate('/login', {
      replace: true,
      state: { notice: ALREADY_REGISTERED_NOTICE, phone: cleanedPhone },
    });
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

      if (!response.isNewUser) {
        // Already registered. The session token in the response is deliberately
        // dropped: signing them in from the signup form would hide the fact that
        // the account already existed.
        sendToLogin();
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

    // Every answer on this step is required. The account is created once, and
    // what the student picks here is what the app is arranged around.
    const errors = {
      dob: validateDateOfBirth(dateOfBirth),
      username: validateName(username),
      studentClass: validateChoice(studentClass, 'Pick your class'),
      subjects: validateChoice(subjects, 'Pick at least one subject'),
      goals: validateChoice(goals, 'Pick what you are aiming for'),
      learning: validateChoice(learningPreference, 'Pick at least one way you like to study'),
    };
    setDobError(errors.dob);
    setUsernameError(errors.username);
    setClassError(errors.studentClass);
    setSubjectsError(errors.subjects);
    setGoalsError(errors.goals);
    setLearningError(errors.learning);
    if (Object.values(errors).some(Boolean)) return;

    const [selectedClass] = studentClass;

    setFormError(undefined);
    // They have acted on the handoff — the explanation has done its job.
    setNotice(undefined);
    setSubmitting(true);
    try {
      const response = await otpAuthApi.register({
        phone: cleanedPhone,
        dateOfBirth,
        accessToken,
        username: username.trim(),
        class: selectedClass,
        subjects,
        goals,
        learningPreference,
      });
      tokenStore.set(response.accessToken);
      // Tell the auth context about the new session before navigating, or the
      // dashboard guard still sees a logged-out user and bounces to /login.
      await refresh();
      track.signupCompleted();
      navigate('/dashboard', { replace: true });
    } catch (error) {
      // The number was claimed between verifying the code and submitting this
      // form — same outcome as catching it at the OTP step.
      if (error instanceof ApiError && error.code === 'ALREADY_REGISTERED') {
        sendToLogin();
        return;
      }
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
              name="username"
              autoComplete="name"
              placeholder="Asha Menon"
              maxLength={100}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              error={usernameError}
            />

            <ChipGroup
              label="Class"
              options={CLASS_OPTIONS.map((c) => ({ value: c, label: `Class ${c}` }))}
              selected={studentClass}
              onChange={setStudentClass}
              error={classError}
            />

            <ChipGroup
              label="Subjects"
              multi
              options={SUBJECT_OPTIONS}
              selected={subjects}
              onChange={setSubjects}
              error={subjectsError}
            />

            <ChipGroup
              label="What are you aiming for?"
              multi
              options={GOAL_OPTIONS}
              selected={goals}
              onChange={setGoals}
              error={goalsError}
            />

            <ChipGroup
              label="How do you like to study?"
              multi
              options={LEARNING_OPTIONS}
              selected={learningPreference}
              onChange={setLearningPreference}
              error={learningError}
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
