import { z } from 'zod';

const envSchema = z.object({
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  ADMIN_SECRET_TOKEN: z.string().min(10, 'ADMIN_SECRET_TOKEN must be at least 10 characters'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  NEXT_PUBLIC_BASE_URL: z.string().url().default('http://localhost:3000'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  CRYPTOMUS_MERCHANT_ID: z.string().optional(),
  CRYPTOMUS_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function getEnv(): Env {
  if (_env) return _env;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    throw new Error('Invalid environment variables. Check .env.example for required variables.');
  }
  _env = parsed.data;
  return _env;
}
