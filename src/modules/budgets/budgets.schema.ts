import { z } from 'zod';

export const upsertBudgetSchema = z
  .object({
    categoryId: z.string().trim().min(1, 'ID kategori tidak valid').optional(),
    category_id: z.string().trim().min(1, 'ID kategori tidak valid').optional(),
    month: z.coerce.number().int().min(1).max(12),
    year: z.coerce.number().int().min(2000).max(2100),
    limitAmount: z.number().positive('Batas anggaran harus lebih dari 0').optional(),
    limit_amount: z.number().positive('Batas anggaran harus lebih dari 0').optional(),
    alertThresholdPct: z.number().int().min(1).max(100).optional(),
    alert_threshold_pct: z.number().int().min(1).max(100).optional(),
  })
  .refine((d) => Boolean(d.categoryId || d.category_id), {
    message: 'categoryId wajib diisi',
    path: ['categoryId'],
  })
  .refine((d) => Boolean(d.limitAmount ?? d.limit_amount), {
    message: 'limitAmount wajib lebih dari 0',
    path: ['limitAmount'],
  });

export const budgetIdParamSchema = z.object({
  id: z.string().trim().min(1, 'ID anggaran tidak valid'),
});

export type UpsertBudgetInput = z.infer<typeof upsertBudgetSchema>;
