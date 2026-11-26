import { WalletType } from '@prisma/client';
import { z } from 'zod';

export const createWalletSchema = z.object({
  name: z.string().trim().min(1, 'Nama dompet wajib diisi').max(80),
  type: z.nativeEnum(WalletType),
  initialBalance: z.number().min(0).optional(),
  initial_balance: z.number().min(0).optional(),
  color: z.string().trim().min(3).max(20).optional().default('#3B7AF5'),
  accountNumber: z.string().trim().max(40).nullable().optional(),
  account_number: z.string().trim().max(40).nullable().optional(),
});

export const updateWalletSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  type: z.nativeEnum(WalletType).optional(),
  color: z.string().trim().min(3).max(20).optional(),
  accountNumber: z.string().trim().max(40).nullable().optional(),
  account_number: z.string().trim().max(40).nullable().optional(),
  isArchived: z.boolean().optional(),
  is_archived: z.boolean().optional(),
});

export const walletIdParamSchema = z.object({
  id: z.string().trim().min(1, 'ID dompet tidak valid'),
});

export type CreateWalletInput = z.infer<typeof createWalletSchema>;
export type UpdateWalletInput = z.infer<typeof updateWalletSchema>;
