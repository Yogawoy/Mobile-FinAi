import { WalletType } from '@prisma/client';
import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(100),
  email: z.string().trim().email('Format email tidak valid').toLowerCase(),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .max(100, 'Password maksimal 100 karakter'),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Format email tidak valid').toLowerCase(),
  password: z.string().min(1, 'Password wajib diisi'),
});

export const googleLoginSchema = z.object({
  idToken: z.string().min(1, 'idToken wajib diisi'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token wajib diisi'),
});

export const logoutSchema = z
  .object({
    refreshToken: z.string().min(1).optional(),
  })
  .optional()
  .default({});

export const updateMeSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(100).optional(),
  monthlyIncomeTarget: z.number().min(0).nullable().optional(),
  monthly_income_target: z.number().min(0).nullable().optional(),
  financialChallenge: z.string().trim().max(255).nullable().optional(),
  financial_challenge: z.string().trim().max(255).nullable().optional(),
  budgetRule: z.string().trim().max(50).nullable().optional(),
  budget_rule: z.string().trim().max(50).nullable().optional(),
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(8, 'Password baru minimal 8 karakter').max(100).optional(),
});

const setupWalletSchema = z.object({
  name: z.string().trim().min(1, 'Nama dompet wajib diisi').max(80),
  type: z.nativeEnum(WalletType),
  initialBalance: z.number().min(0).optional(),
  initial_balance: z.number().min(0).optional(),
  color: z.string().trim().min(3).max(20).optional().default('#3B7AF5'),
  accountNumber: z.string().trim().max(40).nullable().optional(),
  account_number: z.string().trim().max(40).nullable().optional(),
});

const setupBudgetSchema = z.object({
  categoryId: z.string().uuid().optional(),
  category_id: z.string().uuid().optional(),
  categoryName: z.string().trim().min(1).optional(),
  category_name: z.string().trim().min(1).optional(),
  limitAmount: z.number().positive().optional(),
  limit_amount: z.number().positive().optional(),
  alertThresholdPct: z.number().int().min(1).max(100).optional(),
  alert_threshold_pct: z.number().int().min(1).max(100).optional(),
});

export const setupSchema = z.object({
  monthlyIncomeTarget: z.number().min(0).nullable().optional(),
  monthly_income_target: z.number().min(0).nullable().optional(),
  financialChallenge: z.string().trim().max(255).nullable().optional(),
  financial_challenge: z.string().trim().max(255).nullable().optional(),
  budgetRule: z.string().trim().max(50).nullable().optional(),
  budget_rule: z.string().trim().max(50).nullable().optional(),
  wallets: z.array(setupWalletSchema).optional().default([]),
  budgets: z.array(setupBudgetSchema).optional().default([]),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
export type SetupInput = z.infer<typeof setupSchema>;
