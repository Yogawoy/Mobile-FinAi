import { TransactionType } from '@prisma/client';
import { z } from 'zod';

const baseTransactionSchema = z.object({
  walletId: z.string().trim().min(1, 'ID dompet asal tidak valid').optional(),
  wallet_id: z.string().trim().min(1, 'ID dompet asal tidak valid').optional(),
  destinationWalletId: z
    .string()
    .trim()
    .min(1, 'ID dompet tujuan tidak valid')
    .nullable()
    .optional(),
  destination_wallet_id: z
    .string()
    .trim()
    .min(1, 'ID dompet tujuan tidak valid')
    .nullable()
    .optional(),
  categoryId: z.string().trim().min(1, 'ID kategori tidak valid').nullable().optional(),
  category_id: z.string().trim().min(1, 'ID kategori tidak valid').nullable().optional(),
  type: z.nativeEnum(TransactionType),
  amount: z.number().positive('Nominal transaksi harus lebih dari 0'),
  note: z.string().trim().max(500).nullable().optional(),
  transactionDate: z.coerce.date().optional(),
  transaction_date: z.coerce.date().optional(),
});

export const createTransactionSchema = baseTransactionSchema
  .refine((d) => Boolean(d.walletId ?? d.wallet_id), {
    message: 'walletId wajib diisi',
    path: ['walletId'],
  })
  .refine(
    (d) => {
      if (d.type === TransactionType.TRANSFER) {
        const dest = d.destinationWalletId ?? d.destination_wallet_id;
        const src = d.walletId ?? d.wallet_id;
        return Boolean(dest) && dest !== src;
      }
      return true;
    },
    {
      message:
        'Transaksi TRANSFER wajib menyertakan destinationWalletId yang berbeda dari walletId',
      path: ['destinationWalletId'],
    }
  );

export const updateTransactionSchema = baseTransactionSchema.partial().refine(
  (d) => {
    if (d.type === TransactionType.TRANSFER) {
      const dest = d.destinationWalletId ?? d.destination_wallet_id;
      const src = d.walletId ?? d.wallet_id;
      if (dest && src && dest === src) return false;
    }
    return true;
  },
  {
    message: 'Dompet tujuan tidak boleh sama dengan dompet asal',
    path: ['destinationWalletId'],
  }
);

export const transactionIdParamSchema = z.object({
  id: z.string().trim().min(1, 'ID transaksi tidak valid'),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
