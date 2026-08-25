import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../exceptions/app-error.js';
import { isProduction } from '../config/env.js';

export interface ErrorHandlerOptions {
  /** Route prefix the API owns. Anything outside it may belong to the app. */
  apiPrefix: string;
  /**
   * The built index.html, set only when this process also serves the React app.
   * Undefined in development and tests, where a 404 stays a JSON 404.
   */
  spaIndexHtml?: string;
}

/**
 * One place that turns any thrown error into a JSON response.
 * Every error the client sees looks the same: { error: { code, message } }.
 */
export function registerErrorHandler(app: FastifyInstance, options: ErrorHandlerOptions): void {
  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: { code: error.code, message: error.message },
      });
    }

    // Fastify's own schema validation failures.
    if (error.validation) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: error.message },
      });
    }

    if (error.statusCode && error.statusCode < 500) {
      return reply.status(error.statusCode).send({
        error: { code: error.code ?? 'REQUEST_ERROR', message: error.message },
      });
    }

    request.log.error({ err: error }, 'Unhandled error');
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: isProduction ? 'Something went wrong' : error.message,
      },
    });
  });

  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    // A GET for a path the API does not own is a client-side route like
    // /library or /tests/123, so the app is sent and React renders it. Without
    // this, opening or refreshing one of those URLs would return a JSON 404 —
    // navigating to them inside the app works either way, which is exactly what
    // makes the bug easy to miss until someone hits refresh.
    if (options.spaIndexHtml && request.method === 'GET' && !request.url.startsWith(options.apiPrefix)) {
      return reply.type('text/html').send(options.spaIndexHtml);
    }

    return reply.status(404).send({
      error: { code: 'NOT_FOUND', message: `Route ${request.method} ${request.url} does not exist` },
    });
  });
}
