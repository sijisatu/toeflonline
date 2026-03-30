import { z } from 'zod';

export const appConfigSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  APP_ORIGIN: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  POSTGRES_HOST: z.string().min(1),
  POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
  POSTGRES_DB: z.string().min(1),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string(),
  REDIS_HOST: z.string().min(1),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),
  PROCTORING_SNAPSHOT_PATH: z.string().min(1).default('storage/proctoring'),
});

export type AppConfig = z.infer<typeof appConfigSchema>;
