import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL wajib diisi'),
  JWT_ACCESS_SECRET: z
    .string()
    .min(16, 'JWT_ACCESS_SECRET minimal 16 karakter'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16, 'JWT_REFRESH_SECRET minimal 16 karakter'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  GEMINI_API_KEY: z.string().optional().default(''),
  GROQ_API_KEY: z.string().optional().default(''),
  GROQ_MODEL: z.string().optional().default('openai/gpt-oss-120b'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    'Konfigurasi environment (.env) tidak valid:',
    parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
  );
  process.exit(1);
}

export const env = parsed.data;
