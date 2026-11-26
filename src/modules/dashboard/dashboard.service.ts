import { TransactionType } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { computeSawHealth } from '../ai/saw.service';
import { getMonthDateRange } from '../budgets/budgets.service';

const MONTH_SHORT_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

export async function getDashboardSummary(
  userId: string,
  month: number,
  year: number
) {
  const { start, end } = getMonthDateRange(month, year);
  const sixMonthsStart = new Date(year, month - 6, 1, 0, 0, 0, 0);

  const [
    activeWallets,
    monthTransactions,
    sixMonthTransactions,
    budgets,
    recentTransactions,
    health,
  ] = await Promise.all([
    prisma.wallet.findMany({
      where: { userId, isArchived: false },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        transactionDate: { gte: start, lt: end },
      },
      include: { category: true },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        type: { in: [TransactionType.INCOME, TransactionType.EXPENSE] },
        transactionDate: { gte: sixMonthsStart, lt: end },
      },
      select: {
        type: true,
        amount: true,
        transactionDate: true,
      },
    }),
    prisma.budget.findMany({
      where: { userId, month, year },
    }),
    prisma.transaction.findMany({
      where: { userId },
      include: {
        wallet: true,
        destinationWallet: true,
        category: true,
      },
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
      take: 5,
    }),
    computeSawHealth(userId, month, year),
  ]);

  const totalBalance = activeWallets.reduce(
    (sum, w) => sum + Number(w.currentBalance),
    0
  );

  let monthlyIncome = 0;
  let monthlyExpense = 0;

  const categoryTotals = new Map<
    string,
    {
      categoryId: string | null;
      name: string;
      icon: string;
      color: string;
      amount: number;
    }
  >();

  const dailyTotals = new Map<number, { income: number; expense: number }>();

  for (const tx of monthTransactions) {
    const amount = Number(tx.amount);
    const day = tx.transactionDate.getDate();

    if (tx.type === TransactionType.INCOME) {
      monthlyIncome += amount;
      const d = dailyTotals.get(day) ?? { income: 0, expense: 0 };
      d.income += amount;
      dailyTotals.set(day, d);
    } else if (tx.type === TransactionType.EXPENSE) {
      monthlyExpense += amount;
      const d = dailyTotals.get(day) ?? { income: 0, expense: 0 };
      d.expense += amount;
      dailyTotals.set(day, d);

      const catKey = tx.categoryId ?? 'uncategorized';
      const existing = categoryTotals.get(catKey) ?? {
        categoryId: tx.categoryId,
        name: tx.category?.name ?? 'Lainnya',
        icon: tx.category?.icon ?? 'tag',
        color: tx.category?.color ?? '#64748B',
        amount: 0,
      };
      existing.amount += amount;
      categoryTotals.set(catKey, existing);
    }
    // TRANSFER sengaja tidak dihitung ke monthlyIncome maupun monthlyExpense
  }

  const netCashflow = monthlyIncome - monthlyExpense;
  const savingsRate =
    monthlyIncome === 0
      ? 0
      : Math.round(((monthlyIncome - monthlyExpense) / monthlyIncome) * 1000) / 10;

  // 6-month trend series
  const monthlySeriesMap = new Map<string, { income: number; expense: number }>();
  const monthlySeries: Array<{
    month: number;
    year: number;
    label: string;
    income: number;
    expense: number;
    net: number;
  }> = [];

  for (let offset = 5; offset >= 0; offset--) {
    const d = new Date(year, month - 1 - offset, 1);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const key = `${y}-${m}`;
    monthlySeriesMap.set(key, { income: 0, expense: 0 });
    monthlySeries.push({
      month: m,
      year: y,
      label: MONTH_SHORT_ID[m - 1],
      income: 0,
      expense: 0,
      net: 0,
    });
  }

  for (const tx of sixMonthTransactions) {
    const m = tx.transactionDate.getMonth() + 1;
    const y = tx.transactionDate.getFullYear();
    const bucket = monthlySeriesMap.get(`${y}-${m}`);
    if (!bucket) continue;
    const amt = Number(tx.amount);
    if (tx.type === TransactionType.INCOME) bucket.income += amt;
    else if (tx.type === TransactionType.EXPENSE) bucket.expense += amt;
  }

  for (const item of monthlySeries) {
    const bucket = monthlySeriesMap.get(`${item.year}-${item.month}`);
    if (bucket) {
      item.income = bucket.income;
      item.expense = bucket.expense;
      item.net = bucket.income - bucket.expense;
    }
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const dailySeries = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const d = dailyTotals.get(day) ?? { income: 0, expense: 0 };
    return { day, income: d.income, expense: d.expense };
  });

  const categoryBreakdown = Array.from(categoryTotals.values())
    .sort((a, b) => b.amount - a.amount)
    .map((c) => ({
      ...c,
      percentage:
        monthlyExpense > 0
          ? Math.round((c.amount / monthlyExpense) * 1000) / 10
          : 0,
    }));

  const budgetedCategoryIds = new Set(budgets.map((b) => b.categoryId));
  const totalBudgetLimit = budgets.reduce(
    (sum, b) => sum + Number(b.limitAmount),
    0
  );
  const totalBudgetSpent = monthTransactions.reduce((sum, tx) => {
    if (
      tx.type === TransactionType.EXPENSE &&
      tx.categoryId &&
      budgetedCategoryIds.has(tx.categoryId)
    ) {
      return sum + Number(tx.amount);
    }
    return sum;
  }, 0);

  const budgetOverview = {
    totalLimit: totalBudgetLimit,
    totalSpent: totalBudgetSpent,
    remaining: totalBudgetLimit - totalBudgetSpent,
    percentage:
      totalBudgetLimit > 0
        ? Math.round((totalBudgetSpent / totalBudgetLimit) * 1000) / 10
        : 0,
    budgetCount: budgets.length,
  };

  return {
    period: { month, year },
    totalBalance,
    monthlyIncome,
    monthlyExpense,
    netCashflow,
    savingsRate,
    cashflowSeries: {
      monthly: monthlySeries,
      daily: dailySeries,
    },
    categoryBreakdown,
    budgetOverview,
    health,
    recentTransactions: recentTransactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: Number(tx.amount),
      note: tx.note,
      transactionDate: tx.transactionDate,
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
    })),
  };
}
