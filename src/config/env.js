// Load .env before reading configuration and import Zod's validation helpers.
import 'dotenv/config';
import { z } from 'zod';

// Define allowed configuration values, defaults, and validation boundaries.
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  DATABASE_URL: z.string().regex(/^mongodb(?:\+srv)?:\/\//),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.literal('1h').default('1h'),
  UPLOAD_DIR: z.string().min(1).default('./storage/resumes'),
  MAX_RESUME_BYTES: z.coerce.number().int().positive().max(5242880).default(5242880),
  CORS_ORIGIN: z.url(),
});

// Validate configuration at startup and return only the supported settings.
export function parseEnv(input) {
  const result = schema.safeParse(input);
  if (!result.success) {
    // Report variable names, never their potentially secret values.
    throw new Error(`Invalid environment variables: ${[...new Set(result.error.issues.map(issue => issue.path[0]))].join(', ')}`);
  }
  return result.data;
}
