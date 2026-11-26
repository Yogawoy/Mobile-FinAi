import { z } from 'zod';

export const anomalyIdParamSchema = z.object({
  id: z.string().trim().min(1, 'ID anomali tidak valid'),
});

export const generateAdvisorSchema = z
  .object({
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
  })
  .optional()
  .default({});

export const aiChatSchema = z.object({
  message: z.string().trim().min(1, 'Pesan tidak boleh kosong').max(2000),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  executeImmediately: z.boolean().optional().default(false),
  history: z
    .array(
      z
        .object({
          role: z.enum(['user', 'assistant', 'model']),
          content: z.string().trim().min(1).max(2000).optional(),
          text: z.string().trim().min(1).max(2000).optional(),
        })
        .refine((h) => Boolean(h.content || h.text), {
          message: 'Riwayat chat wajib memiliki content atau text',
        })
    )
    .max(20)
    .optional()
    .default([]),
});

export type GenerateAdvisorInput = z.infer<typeof generateAdvisorSchema>;
export type AiChatInput = z.infer<typeof aiChatSchema>;
