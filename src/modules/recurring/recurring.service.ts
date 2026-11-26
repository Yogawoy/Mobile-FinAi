import { Prisma, RecurringFrequency, TransactionType } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { logAudit } from '../../utils/audit';
import { AppError } from '../../utils/errors';
import type { CreateRecurringInput, UpdateRecurringInput } from './recurring.schema';

function advanceNextRunDate(current: Date, frequency: RecurringFrequency): Date {
  const next = new Date(current);
  switch (frequency) {
    case RecurringFrequency.DAILY:
      next.setDate(next.getDate() + 1);
      break;
    case RecurringFrequency.WEEKLY:
      next.setDate(next.getDate() + 7);
      break;
    case RecurringFrequency.MONTHLY:
      next.setMonth(next.getMonth() + 1);
      break;
    case RecurringFrequency.YEARLY:
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

function serializeRecurring(
  rec: Prisma.RecurringTransactionGetPayload<{
    include: { wallet: true; category: true };
  }>
) {
  return {
    id: rec.id,
    userId: rec.userId,
    walletId: rec.walletId,
    categoryId: rec.categoryId,
    title: rec.title,
    type: rec.type,
    amount: Number(rec.amount),
    frequency: rec.frequency,
    nextRunDate: rec.nextRunDate,
    isActive: rec.isActive,
    createdAt: rec.createdAt,
    wallet: {
      id: rec.wallet.id,
      name: rec.wallet.name,
      type: rec.wallet.type,
      color: rec.wallet.color,
    },
    category: rec.category
      ? {
          id: rec.category.id,
          name: rec.category.name,
          type: rec.category.type,
          icon: rec.category.icon,
          color: rec.category.color,
        }
      : null,
  };
}

export async function listRecurring(userId: string) {
  const items = await prisma.recurringTransaction.findMany({
    where: { userId },
    include: { wallet: true, category: true },
    orderBy: [{ isActive: 'desc' }, { nextRunDate: 'asc' }],
  });
  return items.map(serializeRecurring);
}

export async function createRecurring(
  userId: string,
  input: CreateRecurringInput,
  ipAddress?: string | null
) {
  const walletId = (input.walletId ?? input.wallet_id)!;
  const categoryId = input.categoryId ?? input.category_id ?? null;
  const nextRunDate = input.nextRunDate ?? input.next_run_date ?? new Date();
  const isActive = input.isActive ?? input.is_active ?? true;

  const wallet = await prisma.wallet.findFirst({ where: { id: walletId, userId } });
  if (!wallet) throw new AppError('Dompet tidak ditemukan', 404);

  if (categoryId) {
    const cat = await prisma.category.findFirst({ where: { id: categoryId, userId } });
    if (!cat) throw new AppError('Kategori tidak ditemukan', 404);
  }

  const created = await prisma.recurringTransaction.create({
    data: {
      userId,
      walletId,
      categoryId,
      title: input.title,
      type: input.type,
      amount: input.amount,
      frequency: input.frequency,
      nextRunDate,
      isActive,
    },
    include: { wallet: true, category: true },
  });

  await logAudit({
    userId,
    action: 'RECURRING_CREATE',
    entityType: 'RECURRING_TRANSACTION',
    entityId: created.id,
    ipAddress,
  });

  return serializeRecurring(created);
}

export async function updateRecurring(
  userId: string,
  recurringId: string,
  input: UpdateRecurringInput,
  ipAddress?: string | null
) {
  const existing = await prisma.recurringTransaction.findFirst({
    where: { id: recurringId, userId },
  });
  if (!existing) throw new AppError('Jadwal rutin tidak ditemukan', 404);

  const walletId = input.walletId ?? input.wallet_id;
  const categoryId =
    input.categoryId !== undefined ? input.categoryId : input.category_id;
  const nextRunDate = input.nextRunDate ?? input.next_run_date;
  const isActive = input.isActive ?? input.is_active;

  const updated = await prisma.recurringTransaction.update({
    where: { id: recurringId },
    data: {
      ...(walletId !== undefined ? { walletId } : {}),
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.frequency !== undefined ? { frequency: input.frequency } : {}),
      ...(nextRunDate !== undefined ? { nextRunDate } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
    include: { wallet: true, category: true },
  });

  await logAudit({
    userId,
    action: 'RECURRING_UPDATE',
    entityType: 'RECURRING_TRANSACTION',
    entityId: updated.id,
    ipAddress,
  });

  return serializeRecurring(updated);
}

export async function deleteRecurring(
  userId: string,
  recurringId: string,
  ipAddress?: string | null
) {
  const existing = await prisma.recurringTransaction.findFirst({
    where: { id: recurringId, userId },
  });
  if (!existing) throw new AppError('Jadwal rutin tidak ditemukan', 404);

  await prisma.recurringTransaction.delete({ where: { id: recurringId } });

  await logAudit({
    userId,
    action: 'RECURRING_DELETE',
    entityType: 'RECURRING_TRANSACTION',
    entityId: recurringId,
    ipAddress,
  });

  return { deleted: true, recurringId };
}

export async function executeRecurring(
  userId: string,
  recurringId: string,
  ipAddress?: string | null
) {
  const existing = await prisma.recurringTransaction.findFirst({
    where: { id: recurringId, userId },
  });
  if (!existing) throw new AppError('Jadwal rutin tidak ditemukan', 404);

  const amount = Number(existing.amount);
  const delta = existing.type === TransactionType.INCOME ? amount : -amount;
  const nextRunDate = advanceNextRunDate(existing.nextRunDate, existing.frequency);

  const result = await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({
      data: {
        userId,
        walletId: existing.walletId,
        categoryId: existing.categoryId,
        recurringId: existing.id,
        type: existing.type,
        amount,
        note: existing.title,
        transactionDate: new Date(),
      },
    });

    await tx.wallet.update({
      where: { id: existing.walletId },
      data: { currentBalance: { increment: delta } },
    });

    const recurring = await tx.recurringTransaction.update({
      where: { id: existing.id },
      data: { nextRunDate },
      include: { wallet: true, category: true },
    });

    return { transaction, recurring };
  });

  await logAudit({
    userId,
    action: 'RECURRING_EXECUTE',
    entityType: 'RECURRING_TRANSACTION',
    entityId: recurringId,
    metadata: { transactionId: result.transaction.id, amount },
    ipAddress,
  });

  return {
    transaction: {
      ...result.transaction,
      amount: Number(result.transaction.amount),
    },
    recurring: serializeRecurring(result.recurring),
  };
}
