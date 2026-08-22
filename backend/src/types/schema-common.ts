/** Shared pieces the per-feature schema files build from. */

// Fastify's Ajv has no format plugin, so UUIDs are checked by pattern.
export const UUID_PATTERN = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

export const uuidParam = {
  type: 'object',
  required: ['id'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', pattern: UUID_PATTERN },
  },
} as const;

export const subjectQuery = {
  type: 'object',
  additionalProperties: false,
  properties: {
    subject: { type: 'string', minLength: 1, maxLength: 100 },
  },
} as const;
