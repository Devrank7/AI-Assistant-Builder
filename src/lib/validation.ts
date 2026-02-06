import { z } from 'zod';

export const chatMessageSchema = z.object({
  clientId: z.string().min(1).max(100),
  message: z.string().min(1).max(10000),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .max(50)
    .optional(),
  sessionId: z.string().max(200).optional(),
  metadata: z
    .object({
      page: z.string().max(2000).optional(),
      userAgent: z.string().max(500).optional(),
    })
    .optional(),
});

export const clientUpdateSchema = z
  .object({
    username: z.string().min(1).max(100).optional(),
    email: z.string().email().optional(),
    website: z.string().url().optional(),
    phone: z.string().max(20).optional(),
    instagram: z.string().max(100).optional(),
    telegram: z.string().max(100).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const aiSettingsSchema = z.object({
  systemPrompt: z.string().min(1).max(5000).optional(),
  greeting: z.string().min(1).max(500).optional(),
  temperature: z.number().min(0).max(1).optional(),
  maxTokens: z.number().int().min(64).max(4096).optional(),
  topK: z.number().int().min(1).max(20).optional(),
});

export const authTokenSchema = z.object({
  token: z.string().min(1).max(200),
});

export const feedbackSchema = z.object({
  clientId: z.string().min(1).max(100),
  sessionId: z.string().max(200),
  messageIndex: z.number().int().min(0),
  rating: z.union([z.enum(['up', 'down']), z.number().int().min(1).max(5)]),
  comment: z.string().max(1000).optional(),
  messageContent: z.string().max(5000).optional(),
});

export const leadSchema = z.object({
  clientId: z.string().min(1).max(100),
  sessionId: z.string().max(200).optional(),
  name: z.string().min(1).max(100),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  customFields: z.record(z.string(), z.string()).optional(),
  page: z.string().max(2000).optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().max(50).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export function validateBody<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    return { success: false, error: `Validation failed: ${errors}` };
  }
  return { success: true, data: result.data };
}
