import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { PaymentRequiredError, UnauthenticatedError } from '../exceptions/app-error.js';
import type { IUserDao } from '../dao/interfaces/user-dao.interface.js';
import type { ITestDao } from '../dao/interfaces/test-dao.interface.js';
import type { IAttemptDao } from '../dao/interfaces/attempt-dao.interface.js';
import type { ILibraryDao } from '../dao/interfaces/library-dao.interface.js';
import type { IVideoDao } from '../dao/interfaces/video-dao.interface.js';

/**
 * Two guards routes attach with `{ onRequest: [app.requireAuth] }`.
 *
 * `requirePremium` is the single gate locking videos, notes and mock tests
 * behind payment — adding it to a route is the whole of "this needs payment".
 * It re-reads premium status from the database every time, so a student who
 * just paid gets in immediately without logging out and back in.
 */
async function authGuards(
  app: FastifyInstance,
  opts: {
    userDao: IUserDao;
    testDao: ITestDao;
    attemptDao: IAttemptDao;
    libraryDao: ILibraryDao;
    videoDao: IVideoDao;
  },
): Promise<void> {
  const { userDao, testDao, attemptDao, libraryDao, videoDao } = opts;

  app.decorate('requireAuth', async (request: FastifyRequest, _reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      throw new UnauthenticatedError('Your session is invalid or has expired. Please log in again.');
    }
    // A registration token proves a phone passed OTP — it is not a session.
    if (request.user.purpose) {
      throw new UnauthenticatedError('Finish creating your account first.');
    }
  });

  app.decorate('requirePremium', async (request: FastifyRequest, reply: FastifyReply) => {
    await app.requireAuth(request, reply);
    if (!(await userDao.isPremium(request.user.sub))) {
      throw new PaymentRequiredError('Unlock the full course to access this content.');
    }
  });

  /**
   * Same gate, with one hole: the test flagged as the free sample is open to
   * any signed-in student. Routes carrying a test id use this instead of
   * `requirePremium` so the taste-before-you-pay test actually opens.
   */
  app.decorate('requireTestAccess', async (request: FastifyRequest, reply: FastifyReply) => {
    await app.requireAuth(request, reply);
    if (await userDao.isPremium(request.user.sub)) return;

    const { id } = request.params as { id?: string };
    if (id && (await testDao.isFreeSample(id))) return;

    throw new PaymentRequiredError('Unlock the full course to access this content.');
  });

  /**
   * The same hole, one step further along: routes keyed by attempt id resolve
   * the attempt to its test first. Without this, a free attempt could be
   * started but never answered or submitted.
   */
  app.decorate('requireAttemptAccess', async (request: FastifyRequest, reply: FastifyReply) => {
    await app.requireAuth(request, reply);
    if (await userDao.isPremium(request.user.sub)) return;

    const { id } = request.params as { id?: string };
    if (id) {
      const attempt = await attemptDao.findByIdForUser(id, request.user.sub);
      if (attempt && (await testDao.isFreeSample(attempt.test_id))) return;
    }

    throw new PaymentRequiredError('Unlock the full course to access this content.');
  });

  /**
   * The same hole for the PDF library: one formula sheet and one NCERT
   * Highlights chapter open without paying.
   */
  app.decorate('requireDocumentAccess', async (request: FastifyRequest, reply: FastifyReply) => {
    await app.requireAuth(request, reply);
    if (await userDao.isPremium(request.user.sub)) return;

    const { id } = request.params as { id?: string };
    if (id && (await libraryDao.isFreeSample(id))) return;

    throw new PaymentRequiredError('Unlock the full course to access this content.');
  });

  /** The same hole for lectures: one one-shot plays without paying. */
  app.decorate('requireVideoAccess', async (request: FastifyRequest, reply: FastifyReply) => {
    await app.requireAuth(request, reply);
    if (await userDao.isPremium(request.user.sub)) return;

    const { id } = request.params as { id?: string };
    if (id && (await videoDao.isFreeSample(id))) return;

    throw new PaymentRequiredError('Unlock the full course to access this content.');
  });
}

export default fp(authGuards, { name: 'auth-guards' });
