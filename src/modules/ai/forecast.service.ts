import { RiskLevel, TransactionType } from '@prisma/client';
import { prisma } from '../../config/prisma';
import {
  getDaysInMonth,
  getMonthDateRangeWib,
  toMonthlyEquivalent,
} from '../../utils/budgetWindow';
import { detectAndPersistAnomalies } from './anomaly.service';
import { computeSawHealth } from './saw.service';

export async function computeAndSaveForecast(
  userId: string,
  month: number,
  year: number
) {
  const { start, end } = getMonthDateRangeWib(month, year);
  const totalDaysInMonth = getDaysInMonth(month, year);
  const today = new Date();
  const isCurrentPeriod =
    month === today.getMonth() + 1 && year === today.getFullYear();
  const elapsedDays = isCurrentPeriod
    ? Math.max(1, today.getDate())
    : totalDaysInMonth;

  const [monthTransactions, budgets, health] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        type: { in: [TransactionType.INCOME, TransactionType.EXPENSE] },
        transactionDate: { gte: start, lt: end },
      },
      orderBy: { transactionDate: 'asc' },
    }),
    prisma.budget.findMany({
      where: { userId, month, year },
    }),
    computeSawHealth(userId, month, year),
  ]);

  let totalIncomeMtd = 0;
  let totalExpenseMtd = 0;
  const dailyExpenseMap = new Map<number, number>();

  for (const tx of monthTransactions) {
    const amt = Number(tx.amount);
    if (tx.type === TransactionType.INCOME) {
      totalIncomeMtd += amt;
    } else if (tx.type === TransactionType.EXPENSE) {
      totalExpenseMtd += amt;
      const day = tx.transactionDate.getDate();
      dailyExpenseMap.set(day, (dailyExpenseMap.get(day) ?? 0) + amt);
    }
  }

  const dailyBurnRate = Math.round(totalExpenseMtd / elapsedDays);
  const projectedExpense = Math.round((totalExpenseMtd / elapsedDays) * totalDaysInMonth);
  const projectedBalance = Math.round(totalIncomeMtd - projectedExpense);

  let riskLevel: RiskLevel = RiskLevel.SAFE;
  if (monthTransactions.length === 0) {
    riskLevel = RiskLevel.INSUFFICIENT_DATA;
  } else if (
    projectedExpense > totalIncomeMtd ||
    (totalIncomeMtd === 0 && totalExpenseMtd > 0)
  ) {
    riskLevel = RiskLevel.DANGER;
  } else if (projectedExpense > 0.8 * totalIncomeMtd) {
    riskLevel = RiskLevel.CAUTION;
  }

  const savedForecast = await prisma.cashflowForecast.upsert({
    where: {
      userId_month_year: { userId, month, year },
    },
    update: {
      totalIncomeMtd,
      totalExpenseMtd,
      dailyBurnRate,
      projectedExpense,
      projectedBalance,
      riskLevel,
      calculatedAt: new Date(),
    },
    create: {
      userId,
      month,
      year,
      totalIncomeMtd,
      totalExpenseMtd,
      dailyBurnRate,
      projectedExpense,
      projectedBalance,
      riskLevel,
    },
  });

  const anomalies = await detectAndPersistAnomalies(userId, month, year);

  // Budget pacing
  const budgetedCatIds = new Set(budgets.map((b) => b.categoryId));
  const totalBudgetLimit = budgets.reduce(
    (s, b) =>
      s + toMonthlyEquivalent(Number(b.limitAmount), b.period, totalDaysInMonth),
    0
  );
  const totalBudgetSpent = monthTransactions.reduce((s, tx) => {
    if (
      tx.type === TransactionType.EXPENSE &&
      tx.categoryId &&
      budgetedCatIds.has(tx.categoryId)
    ) {
      return s + Number(tx.amount);
    }
    return s;
  }, 0);
  const budgetUsedPct =
    totalBudgetLimit > 0
      ? Math.round((totalBudgetSpent / totalBudgetLimit) * 1000) / 10
      : 0;

  // Trend points (cumulative actual up to elapsedDays + projected linear burn rate)
  let cumulativeActual = 0;
  const trendPoints: Array<{
    day: number;
    actualExpense: number | null;
    projectedExpense: number;
    incomeLine: number;
  }> = [];

  for (let day = 1; day <= totalDaysInMonth; day++) {
    if (day <= elapsedDays) {
      cumulativeActual += dailyExpenseMap.get(day) ?? 0;
      trendPoints.push({
        day,
        actualExpense: Math.round(cumulativeActual),
        projectedExpense: Math.round(dailyBurnRate * day),
        incomeLine: totalIncomeMtd,
      });
    } else {
      trendPoints.push({
        day,
        actualExpense: null,
        projectedExpense: Math.round(
          cumulativeActual + dailyBurnRate * (day - elapsedDays)
        ),
        incomeLine: totalIncomeMtd,
      });
    }
  }

  return {
    forecast: {
      id: savedForecast.id,
      month: savedForecast.month,
      year: savedForecast.year,
      totalIncomeMtd: Number(savedForecast.totalIncomeMtd),
      totalExpenseMtd: Number(savedForecast.totalExpenseMtd),
      dailyBurnRate: Number(savedForecast.dailyBurnRate),
      projectedExpense: Number(savedForecast.projectedExpense),
      projectedBalance: Number(savedForecast.projectedBalance),
      riskLevel: savedForecast.riskLevel,
      calculatedAt: savedForecast.calculatedAt,
    },
    anomalies,
    pacing: {
      elapsedDays,
      totalDaysInMonth,
      budgetUsedPct,
    },
    health,
    trendPoints,
  };
}
