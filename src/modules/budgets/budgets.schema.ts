import { BudgetPeriod } from '@prisma/client';
import { z } from 'zod';

export const upsertBudgetSchema = z
  .object({
    name: z
      .string()
      .trim()
      .max(50, 'Nama anggaran maksimal 50 karakter')
      .optional()
      .nullable(),
    categoryId: z.string().trim().min(1, 'ID kategori tidak valid').optional(),
    category_id: z.string().trim().min(1, 'ID kategori tidak valid').optional(),
    categoryName: z.string().trim().min(1, 'Nama kategori wajib diisi').max(60).optional(),
    month: z.coerce.number().int().min(1).max(12),
    year: z.coerce.number().int().min(2000).max(2100),
    period: z.nativeEnum(BudgetPeriod).optional().default(BudgetPeriod.MONTHLY),
    limitAmount: z.number().positive('Batas anggaran harus lebih dari 0').optional(),
    limit_amount: z.number().positive('Batas anggaran harus lebih dari 0').optional(),
    alertThresholdPct: z.number().int().min(1).max(100).optional(),
    alert_threshold_pct: z.number().int().min(1).max(100).optional(),
  })
  .refine((d) => Boolean(d.categoryId || d.category_id || d.categoryName), {
    message: 'categoryId atau categoryName wajib diisi',
    path: ['categoryId'],
  })
  .refine((d) => Boolean(d.limitAmount ?? d.limit_amount), {
    message: 'limitAmount wajib lebih dari 0',
    path: ['limitAmount'],
  });

export const updateBudgetSchema = z.object({
  name: z
    .string()
    .trim()
    .max(50, 'Nama anggaran maksimal 50 karakter')
    .optional()
    .nullable(),
  period: z.nativeEnum(BudgetPeriod).optional(),
  limitAmount: z.number().positive('Batas anggaran harus lebih dari 0').optional(),
  limit_amount: z.number().positive('Batas anggaran harus lebih dari 0').optional(),
  alertThresholdPct: z.number().int().min(1).max(100).optional(),
  alert_threshold_pct: z.number().int().min(1).max(100).optional(),
});

export const budgetIdParamSchema = z.object({
  id: z.string().trim().min(1, 'ID anggaran tidak valid'),
});

export type UpsertBudgetInput = z.infer<typeof upsertBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
