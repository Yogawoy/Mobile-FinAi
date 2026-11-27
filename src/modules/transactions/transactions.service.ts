import {
  AnomalySeverity,
  AnomalyType,
  NotificationType,
  Prisma,
  TransactionType,
} from '@prisma/client';
import { prisma } from '../../config/prisma';
import { logAudit } from '../../utils/audit';
import { AppError } from '../../utils/errors';
import {
  getBudgetDateRange,
  getBudgetPeriodLabel,
  getMonthDateRangeWib as getMonthDateRange,
} from '../../utils/budgetWindow';
import type {
  CreateTransactionInput,
  UpdateTransactionInput,
} from './transactions.schema';

export interface ListTransactionsQuery {
  month?: number;
  year?: number;
  type?: TransactionType;
  walletId?: string;
  categoryId?: string;
  search?: string;
  page: number;
  limit: number;
}

function serializeTransaction(
  tx: Prisma.TransactionGetPayload<{
    include: { wallet: true; destinationWallet: true; category: true };
  }>
) {
  return {
    id: tx.id,
    userId: tx.userId,
    walletId: tx.walletId,
    destinationWalletId: tx.destinationWalletId,
    categoryId: tx.categoryId,
    recurringId: tx.recurringId,
    type: tx.type,
    amount: Number(tx.amount),
    note: tx.note,
    transactionDate: tx.transactionDate,
    createdAt: tx.createdAt,
    updatedAt: tx.updatedAt,
    wallet: {
      id: tx.wallet.id,
      name: tx.wallet.name,
      type: tx.wallet.type,
      color: tx.wallet.color,
    },
    destinationWallet: tx.destinationWallet
      ? {
        id: tx.destinationWallet.id,
        name: tx.destinationWallet.name,
        type: tx.destinationWallet.type,
        color: tx.destinationWallet.color,
      }
      : null,
    category: tx.category
      ? {
        id: tx.category.id,
        name: tx.category.name,
        type: tx.category.type,
        icon: tx.category.icon,
        color: tx.category.color,
      }
      : null,
  };
}

async function applyBalanceDelta(
  tx: Prisma.TransactionClient,
  params: {
    type: TransactionType;
    amount: number;
    walletId: string;
    destinationWalletId?: string | null;
    direction: 1 | -1;
  }
) {
  const { type, amount, walletId, destinationWalletId, direction } = params;
  const signed = amount * direction;

  if (type === TransactionType.INCOME) {
    await tx.wallet.update({
      where: { id: walletId },
      data: { currentBalance: { increment: signed } },
    });
    return;
  }

  if (type === TransactionType.EXPENSE) {
    await tx.wallet.update({
      where: { id: walletId },
      data: { currentBalance: { increment: -signed } },
    });
    return;
  }

  if (type === TransactionType.TRANSFER) {
    await tx.wallet.update({
      where: { id: walletId },
      data: { currentBalance: { increment: -signed } },
    });
    if (destinationWalletId) {
      await tx.wallet.update({
        where: { id: destinationWalletId },
        data: { currentBalance: { increment: signed } },
      });
    }
  }
}

async function checkAndCreateBudgetAlert(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    categoryId: string | null;
    transactionId: string;
    transactionDate: Date;
  }
) {
  const { userId, categoryId, transactionId, transactionDate } = params;
  if (!categoryId) return;

  const month = transactionDate.getMonth() + 1;
  const year = transactionDate.getFullYear();

  const budget = await tx.budget.findUnique({
    where: {
      userId_categoryId_month_year: {
        userId,
        categoryId,
        month,
        year,
      },
    },
    include: { category: true },
  });

  if (!budget) return;

  const { start, end } = getBudgetDateRange(budget.period, month, year, transactionDate);
  const effectiveStart =
    budget.resetAt && budget.resetAt > start ? budget.resetAt : start;
  const periodLabelLower = getBudgetPeriodLabel(budget.period).toLowerCase();
  const agg = await tx.transaction.aggregate({
    where: {
      userId,
      categoryId,
      type: TransactionType.EXPENSE,
      transactionDate: { gte: effectiveStart, lt: end },
    },
    _sum: { amount: true },
  });

  const spentAmount = Number(agg._sum.amount ?? 0);
  const limitAmount = Number(budget.limitAmount);
  if (limitAmount <= 0) return;

  const pct = (spentAmount / limitAmount) * 100;
  if (pct < budget.alertThresholdPct) return;

  const isOver = pct > 100;
  const roundedPct = Math.round(pct * 10) / 10;
  const deviationPct = Math.max(0, Math.round((pct - 100) * 10) / 10);

  const message = isOver
    ? `Pengeluaran kategori "${budget.category.name}" ${periodLabelLower} mencapai ${roundedPct}% (melebihi batas Rp ${limitAmount.toLocaleString('id-ID')}).`
    : `Pengeluaran kategori "${budget.category.name}" ${periodLabelLower} sudah mencapai ${roundedPct}% dari batas anggaran.`;

  await tx.spendingAnomaly.create({
    data: {
      userId,
      categoryId,
      transactionId,
      month,
      year,
      anomalyType: AnomalyType.OVER_BUDGET,
      severity: isOver ? AnomalySeverity.HIGH : AnomalySeverity.MEDIUM,
      deviationPct: isOver ? deviationPct : roundedPct,
      message,
    },
  });

  await tx.notification.create({
    data: {
      userId,
      type: NotificationType.BUDGET_ALERT,
      title: isOver
        ? `Anggaran ${budget.category.name} Terlampaui`
        : `Peringatan Anggaran ${budget.category.name}`,
      body: message,
    },
  });
}

export async function listTransactions(
  userId: string,
  query: ListTransactionsQuery
) {
  const where: Prisma.TransactionWhereInput = { userId };

  if (query.month && query.year) {
    const { start, end } = getMonthDateRange(query.month, query.year);
    where.transactionDate = { gte: start, lt: end };
  } else if (query.year) {
    where.transactionDate = {
      gte: new Date(query.year, 0, 1),
      lt: new Date(query.year + 1, 0, 1),
    };
  }

  if (query.type) {
    where.type = query.type;
  }

  if (query.walletId) {
    where.OR = [
      { walletId: query.walletId },
      { destinationWalletId: query.walletId },
    ];
  }

  if (query.categoryId) {
    where.categoryId = query.categoryId;
  }

  if (query.search && query.search.trim().length > 0) {
    const q = query.search.trim();
    where.AND = [
      {
        OR: [
          { note: { contains: q, mode: 'insensitive' } },
          { category: { name: { contains: q, mode: 'insensitive' } } },
          { wallet: { name: { contains: q, mode: 'insensitive' } } },
        ],
      },
    ];
  }

  const skip = (query.page - 1) * query.limit;

  const [total, items, incomeAgg, expenseAgg] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      include: {
        wallet: true,
        destinationWallet: true,
        category: true,
      },
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: query.limit,
    }),
    prisma.transaction.aggregate({
      where: { ...where, type: TransactionType.INCOME },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { ...where, type: TransactionType.EXPENSE },
      _sum: { amount: true },
    }),
  ]);

  const totalIncome = Number(incomeAgg._sum.amount ?? 0);
  const totalExpense = Number(expenseAgg._sum.amount ?? 0);

  return {
    items: items.map(serializeTransaction),
    summary: {
      totalIncome,
      totalExpense,
      netCashflow: totalIncome - totalExpense,
    },
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function createTransaction(
  userId: string,
  input: CreateTransactionInput,
  ipAddress?: string | null
) {
  const walletId = (input.walletId ?? input.wallet_id)!;
  const destinationWalletId =
    input.type === TransactionType.TRANSFER
      ? (input.destinationWalletId ?? input.destination_wallet_id ?? null)
      : null;
  const categoryId =
    input.type === TransactionType.TRANSFER
      ? null
      : (input.categoryId ?? input.category_id ?? null);
  const transactionDate =
    input.transactionDate ?? input.transaction_date ?? new Date();

  const sourceWallet = await prisma.wallet.findFirst({
    where: { id: walletId, userId },
  });
  if (!sourceWallet) {
    throw new AppError('Dompet asal tidak ditemukan', 404);
  }

  if (destinationWalletId) {
    const destWallet = await prisma.wallet.findFirst({
      where: { id: destinationWalletId, userId },
    });
    if (!destWallet) {
      throw new AppError('Dompet tujuan tidak ditemukan', 404);
    }
  }

  if (categoryId) {
    const cat = await prisma.category.findFirst({
      where: { id: categoryId, userId },
    });
    if (!cat) {
      throw new AppError('Kategori tidak ditemukan', 404);
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    if (
      input.type === TransactionType.EXPENSE ||
      input.type === TransactionType.TRANSFER
    ) {
      const freshSource = await tx.wallet.findUnique({
        where: { id: walletId },
        select: { name: true, currentBalance: true },
      });
      const available = Number(freshSource?.currentBalance ?? 0);
      if (available < input.amount) {
        throw new AppError(
          `Saldo dompet "${freshSource?.name ?? sourceWallet.name}" tidak mencukupi (tersedia Rp ${available.toLocaleString('id-ID')}, dibutuhkan Rp ${input.amount.toLocaleString('id-ID')}).`,
          400
        );
      }
    }

    const record = await tx.transaction.create({
      data: {
        userId,
        walletId,
        destinationWalletId,
        categoryId,
        type: input.type,
        amount: input.amount,
        note: input.note ?? null,
        transactionDate,
      },
      include: {
        wallet: true,
        destinationWallet: true,
        category: true,
      },
    });

    await applyBalanceDelta(tx, {
      type: input.type,
      amount: input.amount,
      walletId,
      destinationWalletId,
      direction: 1,
    });

    if (input.type === TransactionType.EXPENSE) {
      await checkAndCreateBudgetAlert(tx, {
        userId,
        categoryId,
        transactionId: record.id,
        transactionDate,
      });
    }

    return record;
  });

  await logAudit({
    userId,
    action: 'TRANSACTION_CREATE',
    entityType: 'TRANSACTION',
    entityId: created.id,
    metadata: { type: created.type, amount: Number(created.amount) },
    ipAddress,
  });

  return serializeTransaction(created);
}

export async function updateTransaction(
  userId: string,
  transactionId: string,
  input: UpdateTransactionInput,
  ipAddress?: string | null
) {
  const existing = await prisma.transaction.findFirst({
    where: { id: transactionId, userId },
  });
  if (!existing) {
    throw new AppError('Transaksi tidak ditemukan', 404);
  }

  const nextType = input.type ?? existing.type;
  const nextAmount = input.amount ?? Number(existing.amount);
  const nextWalletId =
    input.walletId ?? input.wallet_id ?? existing.walletId;
  const nextDestWalletId =
    nextType === TransactionType.TRANSFER
      ? (input.destinationWalletId !== undefined
        ? input.destinationWalletId
        : input.destination_wallet_id !== undefined
          ? input.destination_wallet_id
          : existing.destinationWalletId)
      : null;

  if (nextType === TransactionType.TRANSFER) {
    if (!nextDestWalletId || nextDestWalletId === nextWalletId) {
      throw new AppError(
        'Transaksi TRANSFER wajib memiliki dompet tujuan yang berbeda',
        400
      );
    }
  }

  const nextCategoryId =
    nextType === TransactionType.TRANSFER
      ? null
      : input.categoryId !== undefined
        ? input.categoryId
        : input.category_id !== undefined
          ? input.category_id
          : existing.categoryId;
  const nextDate =
    input.transactionDate ?? input.transaction_date ?? existing.transactionDate;
  const nextNote = input.note !== undefined ? input.note : existing.note;

  const updated = await prisma.$transaction(async (tx) => {
    // 1. Revert efek saldo transaksi lama
    await applyBalanceDelta(tx, {
      type: existing.type,
      amount: Number(existing.amount),
      walletId: existing.walletId,
      destinationWalletId: existing.destinationWalletId,
      direction: -1,
    });

    // 2. Update record
    const record = await tx.transaction.update({
      where: { id: transactionId },
      data: {
        type: nextType,
        amount: nextAmount,
        walletId: nextWalletId,
        destinationWalletId: nextDestWalletId,
        categoryId: nextCategoryId,
        note: nextNote,
        transactionDate: nextDate,
      },
      include: {
        wallet: true,
        destinationWallet: true,
        category: true,
      },
    });

    // 3. Terapkan efek saldo transaksi baru
    await applyBalanceDelta(tx, {
      type: nextType,
      amount: nextAmount,
      walletId: nextWalletId,
      destinationWalletId: nextDestWalletId,
      direction: 1,
    });

    if (nextType === TransactionType.EXPENSE) {
      await checkAndCreateBudgetAlert(tx, {
        userId,
        categoryId: nextCategoryId,
        transactionId: record.id,
        transactionDate: nextDate,
      });
    }

    return record;
  });

  await logAudit({
    userId,
    action: 'TRANSACTION_UPDATE',
    entityType: 'TRANSACTION',
    entityId: updated.id,
    ipAddress,
  });

  return serializeTransaction(updated);
}

export async function deleteTransaction(
  userId: string,
  transactionId: string,
  ipAddress?: string | null
) {
  const existing = await prisma.transaction.findFirst({
    where: { id: transactionId, userId },
  });
  if (!existing) {
    throw new AppError('Transaksi tidak ditemukan', 404);
  }

  await prisma.$transaction(async (tx) => {
    await applyBalanceDelta(tx, {
      type: existing.type,
      amount: Number(existing.amount),
      walletId: existing.walletId,
      destinationWalletId: existing.destinationWalletId,
      direction: -1,
    });

    await tx.transaction.delete({
      where: { id: transactionId },
    });
  });

  await logAudit({
    userId,
    action: 'TRANSACTION_DELETE',
    entityType: 'TRANSACTION',
    entityId: transactionId,
    ipAddress,
  });

  return { deleted: true, transactionId };
}
