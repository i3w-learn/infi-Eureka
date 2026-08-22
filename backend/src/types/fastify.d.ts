import type { JwtPayload } from './auth-types.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    /** Rejects the request unless a valid JWT is present. */
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** Rejects the request unless the user is logged in AND has paid. */
    requirePremium: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** Premium, or the one test flagged as the free sample. */
    requireTestAccess: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** Premium, or an attempt on the free sample test. */
    requireAttemptAccess: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** Premium, or the one free sample in each library kind. */
    requireDocumentAccess: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** Premium, or the one lecture flagged as the free sample. */
    requireVideoAccess: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    /** Unparsed body bytes — only set for the Razorpay webhook route. */
    rawBody?: Buffer;
  }
}

export {};
