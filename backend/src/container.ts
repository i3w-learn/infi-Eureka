import { env, isTest } from './config/env.js';
import { HealthDao } from './dao/postgres/health-dao.js';
import { UserDao } from './dao/postgres/user-dao.js';
import { OtpDao } from './dao/postgres/otp-dao.js';
import { VideoDao } from './dao/postgres/video-dao.js';
import { NoteDao } from './dao/postgres/note-dao.js';
import { HighlightDao } from './dao/postgres/highlight-dao.js';
import { TestDao } from './dao/postgres/test-dao.js';
import { QuestionDao } from './dao/postgres/question-dao.js';
import { AttemptDao } from './dao/postgres/attempt-dao.js';
import { AttemptAnswersDao } from './dao/postgres/attempt-answers-dao.js';
import { PlanDao } from './dao/postgres/plan-dao.js';
import { PaymentDao } from './dao/postgres/payment-dao.js';
import { LibraryDao } from './dao/postgres/library-dao.js';
import { LocalStorage } from './integrations/storage/local-storage.js';
import { RazorpayGateway } from './integrations/razorpay/razorpay-gateway.js';
import { GupshupOtpSender } from './integrations/whatsapp/gupshup-sender.js';
import { ConsoleOtpSender } from './integrations/whatsapp/console-sender.js';
import { HealthService } from './services/health-service.js';
import { AuthService } from './services/auth-service.js';
import { VideoService } from './services/video-service.js';
import { NoteService } from './services/note-service.js';
import { TestService } from './services/test-service.js';
import { AttemptService } from './services/attempt-service.js';
import { PaymentService } from './services/payment-service.js';
import { LibraryService } from './services/library-service.js';
import type { IStorage } from './integrations/storage/storage.interface.js';
import type { IOtpSender } from './integrations/whatsapp/otp-sender.interface.js';

/**
 * The composition root: the one and only place where interfaces are bound to
 * concrete implementations. Every other file depends on abstractions.
 *
 * Swapping the database, or handing a service a fake in tests, is a change
 * here and nowhere else.
 */
function buildStorage(): IStorage {
  if (env.storage.driver === 'local') return new LocalStorage(env.storage.localPath);
  // An S3/R2 class slots in here for production, behind the same interface.
  throw new Error(`Unsupported STORAGE_DRIVER "${env.storage.driver}" — only "local" is implemented.`);
}

/**
 * Real WhatsApp once the Gupshup keys are in .env, the console otherwise.
 * Missing keys are not an error here: the server has to boot for everything
 * that is not login, and `AuthService` refuses to pretend a code was sent.
 *
 * Tests never get the real sender even with keys present — they would spend
 * real money sending WhatsApp messages to whatever number a fixture invented.
 */
function buildOtpSender(): IOtpSender {
  if (isTest) return new ConsoleOtpSender();
  const gupshup = new GupshupOtpSender(env.gupshup);
  return gupshup.isConfigured() ? gupshup : new ConsoleOtpSender();
}

function buildContainer() {
  const healthDao = new HealthDao();
  const userDao = new UserDao();
  const otpDao = new OtpDao();
  const videoDao = new VideoDao();
  const noteDao = new NoteDao();
  const highlightDao = new HighlightDao();
  const testDao = new TestDao();
  const questionDao = new QuestionDao();
  const attemptDao = new AttemptDao();
  const attemptAnswersDao = new AttemptAnswersDao();
  const planDao = new PlanDao();
  const paymentDao = new PaymentDao();
  const libraryDao = new LibraryDao();

  const storage = buildStorage();
  const gateway = new RazorpayGateway(env.razorpay.keyId, env.razorpay.keySecret);
  const otpSender = buildOtpSender();

  return {
    // DAOs exposed only where middleware needs them directly.
    userDao,
    testDao,
    attemptDao,
    libraryDao,
    videoDao,

    healthService: new HealthService(healthDao),
    authService: new AuthService(userDao, otpDao, otpSender),
    videoService: new VideoService(videoDao, storage),
    noteService: new NoteService(noteDao, highlightDao),
    testService: new TestService(testDao),
    libraryService: new LibraryService(libraryDao),
    attemptService: new AttemptService(testDao, questionDao, attemptDao, attemptAnswersDao),
    paymentService: new PaymentService(planDao, paymentDao, userDao, gateway, {
      keySecret: env.razorpay.keySecret,
      webhookSecret: env.razorpay.webhookSecret,
    }),
  };
}

export type Container = ReturnType<typeof buildContainer>;

export const container: Container = buildContainer();
