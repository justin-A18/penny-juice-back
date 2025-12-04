import { z } from 'zod';

export const envs = z.object({
  DB_NAME: z.string(),
  DB_USER: z.string(),
  DB_PASS: z.string(),
  DB_HOST: z.string(),
  DB_PORT: z.string().transform((v) => Number(v)),
  PORT: z.string().transform((v) => Number(v)),
  MAIL_USER: z.string(),
  MAIL_PASS: z.string(),
  MAIL_HOST: z.string(),
  APP_URL: z.string().default('http://localhost:3001'),
  JWT_SECRET: z.string(),
});
