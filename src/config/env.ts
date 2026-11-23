import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGO_URI: z.string().min(1).default('mongodb://localhost:27017/movie-reviews'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('1d'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment variables:\n${issues}`);
}

export const env = parsed.data;
export type Env = typeof env;
