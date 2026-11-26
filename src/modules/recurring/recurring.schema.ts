import { RecurringFrequency, TransactionType } from '@prisma/client';
import { z } from 'zod';

export const createRecurringSchema = z
  .object({
    walletId: z.string().trim().min(1, 'ID dompet tidak valid').optional(),
    wallet_id: z.string().trim().min(1, 'ID dompet tidak valid').optional(),
    categoryId: z.string().trim().min(1, 'ID kategori tidak valid').nullable().optional(),
    category_id: z.string().trim().min(1, 'ID kategori tidak valid').nullable().optional(),
    title: z.string().trim().min(1, 'Judul jadwal wajib diisi').max(100),
    type: z.enum([TransactionType.INCOME, TransactionType.EXPENSE]),
    amount: z.number().positive('Nominal harus lebih dari 0'),
    frequency: z.nativeEnum(RecurringFrequency),
    nextRunDate: z.coerce.date().optional(),
    next_run_date: z.coerce.date().optional(),
    isActive: z.boolean().optional(),
    is_active: z.boolean().optional(),
  })
  .refine((d) => Boolean(d.walletId ?? d.wallet_id), {
    message: 'walletId wajib diisi',
    path: ['walletId'],
  });

export const updateRecurringSchema = z.object({
  walletId: z.string().trim().min(1).optional(),
  wallet_id: z.string().trim().min(1).optional(),
  categoryId: z.string().trim().min(1).nullable().optional(),
  category_id: z.string().trim().min(1).nullable().optional(),
  title: z.string().trim().min(1).max(100).optional(),
  type: z.enum([TransactionType.INCOME, TransactionType.EXPENSE]).optional(),
  amount: z.number().positive().optional(),
  frequency: z.nativeEnum(RecurringFrequency).optional(),
  nextRunDate: z.coerce.date().optional(),
  next_run_date: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export const recurringIdParamSchema = z.object({
  id: z.string().trim().min(1, 'ID jadwal rutin tidak valid'),
});

export type CreateRecurringInput = z.infer<typeof createRecurringSchema>;
export type UpdateRecurringInput = z.infer<typeof updateRecurringSchema>;
