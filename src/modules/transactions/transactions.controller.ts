import { TransactionType } from '@prisma/client';
import type { Request, Response } from 'express';
import { AppError } from '../../utils/errors';
import { sendSuccess } from '../../utils/response';
import type {
  CreateTransactionInput,
  UpdateTransactionInput,
} from './transactions.schema';
import * as transactionsService from './transactions.service';

export async function listTransactionsHandler(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const month = req.query.month ? Number(req.query.month) : undefined;
  const year = req.query.year ? Number(req.query.year) : undefined;
  const walletId = req.query.walletId ? String(req.query.walletId) : undefined;
  const categoryId = req.query.categoryId ? String(req.query.categoryId) : undefined;
  const search = req.query.search ? String(req.query.search) : undefined;

  let type: TransactionType | undefined;
  if (req.query.type) {
    const raw = String(req.query.type).toUpperCase();
    if (
      raw !== TransactionType.INCOME &&
      raw !== TransactionType.EXPENSE &&
      raw !== TransactionType.TRANSFER
    ) {
      throw new AppError('Parameter type harus INCOME, EXPENSE, atau TRANSFER', 400);
    }
    type = raw;
  }

  const result = await transactionsService.listTransactions(req.user!.userId, {
    month,
    year,
    type,
    walletId,
    categoryId,
    search,
    page,
    limit,
  });

  return sendSuccess(
    res,
    'Daftar transaksi berhasil diambil',
    {
      items: result.items,
      summary: result.summary,
    },
    200,
    result.meta
  );
}

export async function createTransactionHandler(req: Request, res: Response) {
  const created = await transactionsService.createTransaction(
    req.user!.userId,
    req.body as CreateTransactionInput,
    req.ip ?? null
  );
  return sendSuccess(res, 'Transaksi berhasil dicatat', created, 201);
}

export async function updateTransactionHandler(req: Request, res: Response) {
  const updated = await transactionsService.updateTransaction(
    req.user!.userId,
    String(req.params.id),
    req.body as UpdateTransactionInput,
    req.ip ?? null
  );
  return sendSuccess(res, 'Transaksi berhasil diperbarui', updated);
}

export async function deleteTransactionHandler(req: Request, res: Response) {
  const result = await transactionsService.deleteTransaction(
    req.user!.userId,
    String(req.params.id),
    req.ip ?? null
  );
  return sendSuccess(res, 'Transaksi berhasil dihapus', result);
}
