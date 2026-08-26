import type { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { API_PREFIX } from './routes/index.js';

/** Where the browsable docs live. The raw spec is at `${DOCS_ROUTE}/json`. */
export const DOCS_ROUTE = '/docs';

/**
 * Groups endpoints in the UI by the first path segment after the API prefix,
 * so `/api/v1/tests/:id/start` lands under "tests". Deriving the tag from the
 * URL rather than writing one on every route means a new endpoint shows up in
 * the right group without anyone remembering to tag it.
 */
function tagFor(url: string): string | undefined {
  if (!url.startsWith(`${API_PREFIX}/`)) return undefined;
  const segment = url.slice(API_PREFIX.length + 1).split('/')[0];
  return segment ? segment.replace(/^:.*/, '') || undefined : undefined;
}

/**
 * Registers the OpenAPI spec and Swagger UI. Must run before `registerRoutes`:
 * the `onRoute` hook below only sees routes added after it.
 *
 * The route schemas the app already validates against are the spec — there is
 * no second document to keep in sync, so the docs cannot drift from behaviour.
 */
export async function registerDocs(app: FastifyInstance): Promise<void> {
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'infi-Eureka API',
        description: [
          'NEET exam-prep platform. Everything is under `/api/v1`.',
          '',
          '### Getting a token',
          '',
          '1. `POST /auth/request-otp` with a phone number. Outside production the code comes',
          '   back in the response as `devOtp`, so no WhatsApp message is needed.',
          '2. `POST /auth/verify-otp` with that code and the `challengeToken`.',
          '3. If it answers `isNewUser: true`, finish with `POST /auth/register` — the token from',
          '   step 2 is a registration token and works on nothing else.',
          '4. Click **Authorize** above and paste the `accessToken`. It then rides on every',
          '   request in this page.',
          '',
          '### What needs paying for',
          '',
          'Catalogues (lecture list, note titles, test list, PDF library) open to any signed-in',
          'student — seeing a title is not getting the content. The content itself (a note body,',
          'a playable video, taking a test, a PDF link) needs premium, which `POST /payments/verify`',
          'switches on. One item of each kind is flagged `isFreeSample` and opens without paying.',
          'Payment status is re-read from the database on every request, so it takes effect at once.',
          '',
          '### When something goes wrong',
          '',
          'Every error has the same shape: `{ "error": { "code": "...", "message": "..." } }`.',
          '`401` means the token is missing or expired, `402` means this needs premium, and',
          '`400` with `VALIDATION_ERROR` means the request did not match the schema shown here.',
        ].join('\n'),
        version: '0.1.0',
      },
      servers: [{ url: '/', description: 'This server' }],
      // Declared up front so the UI groups them in this order rather than in
      // whatever order the routes happen to register.
      tags: [
        { name: 'health', description: 'Is the service up.' },
        { name: 'auth', description: 'Phone + OTP login, in three steps. Start here.' },
        { name: 'me', description: 'Who the current token belongs to, and whether they have paid.' },
        { name: 'plans', description: 'What premium costs.' },
        { name: 'payments', description: 'Razorpay checkout: open an order, verify it, unlock premium.' },
        { name: 'videos', description: 'Lecture catalogue, and how to actually play one.' },
        { name: 'notes', description: 'Study notes. Titles are free to browse; bodies are not.' },
        { name: 'highlights', description: 'Text a student has highlighted inside a note.' },
        { name: 'tests', description: 'The mock-test catalogue, and starting an attempt.' },
        {
          name: 'attempts',
          description:
            'Taking a test: read the state, save answers one at a time, submit, then read the result.',
        },
        { name: 'library', description: 'Formula sheets and NCERT highlight PDFs.' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'The `accessToken` returned by /auth/verify-otp or /auth/register.',
          },
          // Content ingestion until there is an admin panel. Routes opt into
          // this one in their own schema — nothing in the route options marks
          // them, because the check happens inside the handler.
          adminKey: {
            type: 'apiKey',
            in: 'header',
            name: 'x-admin-key',
            description: 'ADMIN_API_KEY from the server environment. These routes 404 when it is unset.',
          },
        },
      },
    },
  });

  // The guards from middleware/auth.ts. Every one of them starts by verifying
  // the JWT, so a route carrying any of them needs the Authorize button.
  // Matched by identity rather than by "has an onRequest hook", because
  // @fastify/rate-limit also attaches one — to the OTP routes, which are open.
  const authGuards = new Set<unknown>([
    app.requireAuth,
    app.requirePremium,
    app.requireTestAccess,
    app.requireAttemptAccess,
    app.requireDocumentAccess,
    app.requireVideoAccess,
  ]);

  // Fills in what the route files do not spell out: which group an endpoint
  // belongs to, and whether it needs a token.
  app.addHook('onRoute', (route) => {
    if (route.url.startsWith(DOCS_ROUTE)) return;

    const tag = tagFor(route.url);
    if (!tag) return;

    const schema = (route.schema ??= {});
    schema.tags ??= [tag];

    const hooks = Array.isArray(route.onRequest) ? route.onRequest : route.onRequest ? [route.onRequest] : [];
    if (hooks.some((hook) => authGuards.has(hook))) {
      schema.security ??= [{ bearerAuth: [] }];
    }
  });

  await app.register(swaggerUi, {
    routePrefix: DOCS_ROUTE,
    uiConfig: { docExpansion: 'list', deepLinking: true, persistAuthorization: true },
  });

  app.log.info(`API docs at ${DOCS_ROUTE} (spec: ${DOCS_ROUTE}/json)`);
}
