import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { PaymentRequiredError, UnauthenticatedError } from '../exceptions/app-error.js';
import type { IUserDao } from '../dao/interfaces/user-dao.interface.js';

/**
 * Two guards routes attach with `{ onRequest: [app.requireAuth] }`.
 *
 * `requirePremium` is the single gate locking videos, notes and mock tests
 * behind payment — adding it to a route is the whole of "this needs payment".
 * It re-reads premium status from the database every time, so a student who
 * just paid gets in immediately without logging out and back in.
 */
async function authGuards(app: FastifyInstance, opts: { userDao: IUserDao }): Promise<void> {
  const { userDao } = opts;

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
}

export default fp(authGuards, { name: 'auth-guards' });
