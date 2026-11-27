import { BudgetPeriod, CategoryType, TransactionType } from '@prisma/client';
import { prisma } from '../../config/prisma';
import {
  getBudgetDateRange,
  getBudgetPeriodLabel,
  getDaysInMonth,
  getMonthDateRangeWib,
  toMonthlyEquivalent,
} from '../../utils/budgetWindow';
import { logAudit } from '../../utils/audit';
import { AppError } from '../../utils/errors';
import type { UpdateBudgetInput, UpsertBudgetInput } from './budgets.schema';

export function getMonthDateRange(month: number, year: number) {
  return getMonthDateRangeWib(month, year);
}

export { getBudgetDateRange, getBudgetPeriodLabel };

export async function listBudgets(
  userId: string,
  month: number,
  year: number,
  periodFilter?: BudgetPeriod
) {
  const daysInMonth = getDaysInMonth(month, year);
  const budgets = await prisma.budget.findMany({
    where: {
      userId,
      month,
      year,
      ...(periodFilter ? { period: periodFilter } : {}),
    },
    include: { category: true },
    orderBy: { createdAt: 'asc' },
  });

  const distinctPeriods = Array.from(new Set(budgets.map((b) => b.period)));
  const spentByPeriod = new Map<BudgetPeriod, Map<string, number>>();
  const archivedByPeriod = new Map<BudgetPeriod, boolean>();

  await Promise.all(
    distinctPeriods.map(async (p) => {
      const { start, end, isArchivedMonth } = getBudgetDateRange(p, month, year);
      archivedByPeriod.set(p, isArchivedMonth);
      const agg = await prisma.transaction.groupBy({
        by: ['categoryId'],
        where: {
          userId,
          type: TransactionType.EXPENSE,
          categoryId: { not: null },
          transactionDate: { gte: start, lt: end },
        },
        _sum: { amount: true },
      });
      const map = new Map<string, number>();
      for (const row of agg) {
        if (row.categoryId) {
          map.set(row.categoryId, Number(row._sum.amount ?? 0));
        }
      }
      spentByPeriod.set(p, map);
    })
  );

  const resetOverrides = new Map<string, number>();
  const budgetsWithReset = budgets.filter((b) => {
    if (!b.resetAt) return false;
    const { start } = getBudgetDateRange(b.period, month, year);
    return b.resetAt > start;
  });

  await Promise.all(
    budgetsWithReset.map(async (b) => {
      const { end } = getBudgetDateRange(b.period, month, year);
      const agg = await prisma.transaction.aggregate({
        where: {
          userId,
          categoryId: b.categoryId,
          type: TransactionType.EXPENSE,
          transactionDate: { gte: b.resetAt!, lt: end },
        },
        _sum: { amount: true },
      });
      resetOverrides.set(b.id, Number(agg._sum.amount ?? 0));
    })
  );

  return budgets.map((b) => {
    const rawLimit = Number(b.limitAmount);
    const monthlyEquivalentLimit = toMonthlyEquivalent(
      rawLimit,
      b.period,
      daysInMonth
    );
    const isArchived = archivedByPeriod.get(b.period) ?? false;
    const limitAmount = isArchived ? monthlyEquivalentLimit : rawLimit;
    const spentAmount = resetOverrides.has(b.id)
      ? resetOverrides.get(b.id)!
      : spentByPeriod.get(b.period)?.get(b.categoryId) ?? 0;
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
      name: b.name ?? null,
      categoryId: b.categoryId,
      category: b.category,
      month: b.month,
      year: b.year,
      period: b.period,
      periodLabel: isArchived ? 'Bulan Ini' : getBudgetPeriodLabel(b.period),
      limitAmount,
      monthlyEquivalentLimit,
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

export async function getBudgetsWithSummary(
  userId: string,
  month: number,
  year: number,
  periodFilter?: BudgetPeriod
) {
  const daysInMonth = getDaysInMonth(month, year);
  const items = await listBudgets(userId, month, year, periodFilter);

  const { start: monthStart, end: monthEnd } = getMonthDateRangeWib(month, year);
  const allMonthBudgets = await prisma.budget.findMany({
    where: { userId, month, year },
    select: { categoryId: true, period: true, limitAmount: true, resetAt: true },
  });

  let totalMonthlySpent = 0;
  if (allMonthBudgets.length > 0) {
    const anyReset = allMonthBudgets.some((b) => b.resetAt && b.resetAt > monthStart);
    if (!anyReset) {
      const monthlySpentAgg = await prisma.transaction.aggregate({
        where: {
          userId,
          type: TransactionType.EXPENSE,
          categoryId: { in: allMonthBudgets.map((b) => b.categoryId) },
          transactionDate: { gte: monthStart, lt: monthEnd },
        },
        _sum: { amount: true },
      });
      totalMonthlySpent = Number(monthlySpentAgg._sum.amount ?? 0);
    } else {
      const perBudgetSums = await Promise.all(
        allMonthBudgets.map(async (b) => {
          const effectiveStart =
            b.resetAt && b.resetAt > monthStart ? b.resetAt : monthStart;
          const agg = await prisma.transaction.aggregate({
            where: {
              userId,
              type: TransactionType.EXPENSE,
              categoryId: b.categoryId,
              transactionDate: { gte: effectiveStart, lt: monthEnd },
            },
            _sum: { amount: true },
          });
          return Number(agg._sum.amount ?? 0);
        })
      );
      totalMonthlySpent = perBudgetSums.reduce((a, c) => a + c, 0);
    }
  }

  const totalMonthlyEquivalentLimit = allMonthBudgets.reduce(
    (sum, b) =>
      sum +
      toMonthlyEquivalent(Number(b.limitAmount), b.period, daysInMonth),
    0
  );
  const monthlyPercentage =
    totalMonthlyEquivalentLimit > 0
      ? Math.round((totalMonthlySpent / totalMonthlyEquivalentLimit) * 1000) / 10
      : 0;

  return {
    items,
    summary: {
      totalMonthlyEquivalentLimit,
      totalMonthlySpent,
      percentage: monthlyPercentage,
    },
  };
}

export async function upsertBudget(
  userId: string,
  input: UpsertBudgetInput,
  ipAddress?: string | null
) {
  let categoryId = input.categoryId ?? input.category_id;
  const limitAmount = (input.limitAmount ?? input.limit_amount)!;
  const alertThresholdPct =
    input.alertThresholdPct ?? input.alert_threshold_pct ?? 80;

  let category = categoryId
    ? await prisma.category.findFirst({
        where: { id: categoryId, userId },
      })
    : null;

  if (!category && input.categoryName) {
    const cleanName = input.categoryName.trim();
    category = await prisma.category.findFirst({
      where: {
        userId,
        type: CategoryType.EXPENSE,
        name: { equals: cleanName, mode: 'insensitive' },
      },
    });
    if (!category) {
      category = await prisma.category.create({
        data: {
          userId,
          name: cleanName,
          type: CategoryType.EXPENSE,
          icon: 'tag',
          color: '#7C7CE6',
          isDefault: false,
        },
      });
    }
  }

  if (!category) {
    throw new AppError('Kategori tidak ditemukan', 404);
  }
  categoryId = category.id;
  if (category.type === CategoryType.INCOME) {
    throw new AppError(
      'Anggaran hanya dapat dibuat untuk kategori pengeluaran (EXPENSE)',
      400
    );
  }

  const period = input.period ?? BudgetPeriod.MONTHLY;
  const cleanName = input.name?.trim() ? input.name.trim() : null;

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
      ...(input.name !== undefined ? { name: cleanName } : {}),
      limitAmount,
      alertThresholdPct,
      period,
    },
    create: {
      userId,
      categoryId,
      name: cleanName,
      month: input.month,
      year: input.year,
      period,
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
    metadata: {
      name: cleanName,
      categoryId,
      month: input.month,
      year: input.year,
      period,
      limitAmount,
    },
    ipAddress,
  });

  return {
    ...budget,
    name: budget.name ?? null,
    periodLabel: getBudgetPeriodLabel(budget.period),
    limitAmount: Number(budget.limitAmount),
  };
}

export async function getBudgetById(userId: string, budgetId: string) {
  const b = await prisma.budget.findFirst({
    where: { id: budgetId, userId },
    include: { category: true },
  });
  if (!b) {
    throw new AppError('Anggaran tidak ditemukan', 404);
  }

  const daysInMonth = getDaysInMonth(b.month, b.year);
  const { start, end, isArchivedMonth } = getBudgetDateRange(b.period, b.month, b.year);
  const effectiveStart = b.resetAt && b.resetAt > start ? b.resetAt : start;
  const agg = await prisma.transaction.aggregate({
    where: {
      userId,
      categoryId: b.categoryId,
      type: TransactionType.EXPENSE,
      transactionDate: { gte: effectiveStart, lt: end },
    },
    _sum: { amount: true },
  });

  const rawLimit = Number(b.limitAmount);
  const monthlyEquivalentLimit = toMonthlyEquivalent(rawLimit, b.period, daysInMonth);
  const limitAmount = isArchivedMonth ? monthlyEquivalentLimit : rawLimit;
  const spentAmount = Number(agg._sum.amount ?? 0);
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
    name: b.name ?? null,
    categoryId: b.categoryId,
    category: b.category,
    month: b.month,
    year: b.year,
    period: b.period,
    periodLabel: isArchivedMonth ? 'Bulan Ini' : getBudgetPeriodLabel(b.period),
    limitAmount,
    monthlyEquivalentLimit,
    spentAmount,
    remainingAmount,
    percentage,
    alertThresholdPct: b.alertThresholdPct,
    status,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

export async function updateBudget(
  userId: string,
  budgetId: string,
  input: UpdateBudgetInput,
  ipAddress?: string | null
) {
  const existing = await prisma.budget.findFirst({
    where: { id: budgetId, userId },
  });
  if (!existing) {
    throw new AppError('Anggaran tidak ditemukan', 404);
  }

  const limitAmount = input.limitAmount ?? input.limit_amount;
  const alertThresholdPct =
    input.alertThresholdPct ?? input.alert_threshold_pct;
  const cleanName =
    input.name !== undefined
      ? input.name?.trim()
        ? input.name.trim()
        : null
      : undefined;

  const updated = await prisma.budget.update({
    where: { id: budgetId },
    data: {
      ...(cleanName !== undefined ? { name: cleanName } : {}),
      ...(input.period !== undefined ? { period: input.period } : {}),
      ...(limitAmount !== undefined ? { limitAmount } : {}),
      ...(alertThresholdPct !== undefined ? { alertThresholdPct } : {}),
    },
    include: { category: true },
  });

  await logAudit({
    userId,
    action: 'BUDGET_UPDATE',
    entityType: 'BUDGET',
    entityId: budgetId,
    metadata: {
      name: updated.name ?? null,
      period: updated.period,
      limitAmount: Number(updated.limitAmount),
    },
    ipAddress,
  });

  return {
    ...updated,
    name: updated.name ?? null,
    periodLabel: getBudgetPeriodLabel(updated.period),
    limitAmount: Number(updated.limitAmount),
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

export async function resetBudget(
  userId: string,
  budgetId: string,
  ipAddress?: string | null
) {
  const existing = await prisma.budget.findFirst({
    where: { id: budgetId, userId },
    include: { category: true },
  });
  if (!existing) {
    throw new AppError('Anggaran tidak ditemukan', 404);
  }

  const now = new Date();
  const updated = await prisma.budget.update({
    where: { id: budgetId },
    data: { resetAt: now },
    include: { category: true },
  });

  await logAudit({
    userId,
    action: 'BUDGET_RESET',
    entityType: 'BUDGET',
    entityId: budgetId,
    metadata: { categoryId: existing.categoryId, resetAt: now.toISOString() },
    ipAddress,
  });

  return {
    ...updated,
    periodLabel: getBudgetPeriodLabel(updated.period),
    limitAmount: Number(updated.limitAmount),
    spentAmount: 0,
  };
}
