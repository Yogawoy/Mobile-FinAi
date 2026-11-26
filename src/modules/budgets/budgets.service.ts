import { CategoryType, TransactionType } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { logAudit } from '../../utils/audit';
import { AppError } from '../../utils/errors';
import type { UpsertBudgetInput } from './budgets.schema';

export function getMonthDateRange(month: number, year: number) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 1, 0, 0, 0, 0);
  return { start, end };
}

export async function listBudgets(userId: string, month: number, year: number) {
  const { start, end } = getMonthDateRange(month, year);

  const [budgets, expenseAgg] = await Promise.all([
    prisma.budget.findMany({
      where: { userId, month, year },
      include: { category: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: TransactionType.EXPENSE,
        categoryId: { not: null },
        transactionDate: { gte: start, lt: end },
      },
      _sum: { amount: true },
    }),
  ]);

  const spentMap = new Map<string, number>();
  for (const row of expenseAgg) {
    if (row.categoryId) {
      spentMap.set(row.categoryId, Number(row._sum.amount ?? 0));
    }
  }

  return budgets.map((b) => {
    const limitAmount = Number(b.limitAmount);
    const spentAmount = spentMap.get(b.categoryId) ?? 0;
    const remainingAmount = limitAmount - spentAmount;
    const percentage =
      limitAmount > 0 ? Math.round((spentAmount / limitAmount) * 1000) / 10 : 0;

    let status: 'SAFE' | 'WARNING' | 'OVER_BUDGET' = 'SAFE';
    if (percentage > 100) {
      status = 'OVER_BUDGET';
    } else if (percentage >= b.alertThresholdPct) {
      status = 'WARNING';
    }

    return {
      id: b.id,
      userId: b.userId,
      categoryId: b.categoryId,
      category: b.category,
      month: b.month,
      year: b.year,
      limitAmount,
      spentAmount,
      remainingAmount,
      percentage,
      alertThresholdPct: b.alertThresholdPct,
      status,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    };
  });
}

export async function upsertBudget(
  userId: string,
  input: UpsertBudgetInput,
  ipAddress?: string | null
) {
  const categoryId = (input.categoryId ?? input.category_id)!;
  const limitAmount = (input.limitAmount ?? input.limit_amount)!;
  const alertThresholdPct =
    input.alertThresholdPct ?? input.alert_threshold_pct ?? 80;

  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
  });
  if (!category) {
    throw new AppError('Kategori tidak ditemukan', 404);
  }
  if (category.type === CategoryType.INCOME) {
    throw new AppError(
      'Anggaran hanya dapat dibuat untuk kategori pengeluaran (EXPENSE)',
      400
    );
  }

  const budget = await prisma.budget.upsert({
    where: {
      userId_categoryId_month_year: {
        userId,
        categoryId,
        month: input.month,
        year: input.year,
      },
    },
    update: {
      limitAmount,
      alertThresholdPct,
    },
    create: {
      userId,
      categoryId,
      month: input.month,
      year: input.year,
      limitAmount,
      alertThresholdPct,
    },
    include: { category: true },
  });

  await logAudit({
    userId,
    action: 'BUDGET_UPSERT',
    entityType: 'BUDGET',
    entityId: budget.id,
    metadata: { categoryId, month: input.month, year: input.year, limitAmount },
    ipAddress,
  });

  return {
    ...budget,
    limitAmount: Number(budget.limitAmount),
  };
}

export async function deleteBudget(
  userId: string,
  budgetId: string,
  ipAddress?: string | null
) {
  const existing = await prisma.budget.findFirst({
    where: { id: budgetId, userId },
  });
  if (!existing) {
    throw new AppError('Anggaran tidak ditemukan', 404);
  }

  await prisma.budget.delete({ where: { id: budgetId } });

  await logAudit({
    userId,
    action: 'BUDGET_DELETE',
    entityType: 'BUDGET',
    entityId: budgetId,
    ipAddress,
  });

  return { deleted: true, budgetId };
}
