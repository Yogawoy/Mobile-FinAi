import { TransactionType } from '@prisma/client';
import { prisma } from '../../config/prisma';
import {
  getDaysInMonth,
  getMonthDateRangeWib,
  toMonthlyEquivalent,
} from '../../utils/budgetWindow';

export type SawClassification =
  | 'INSUFFICIENT_DATA'
  | 'Strong'
  | 'Stable'
  | 'Warning'
  | 'Critical';

export interface SawCriterionResult {
  key: 'C1' | 'C2' | 'C3' | 'C4';
  label: string;
  type: 'BENEFIT' | 'COST';
  weight: number;
  rawValue: number;
  normalizedScore: number;
  weightedScore: number;
}

export interface SawHealthResult {
  hasEnoughData: boolean;
  txCount: number;
  minTransactionsNeeded: number;
  healthScore: number | null;
  classification: SawClassification;
  statusLabel: string;
  criteria: {
    c1SavingsRate: SawCriterionResult;
    c2ExpenseControl: SawCriterionResult;
    c3BudgetAdherence: SawCriterionResult;
    c4LiquidityBuffer: SawCriterionResult;
  } | null;
}

const MIN_TRANSACTIONS_REQUIRED = 3;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export async function computeSawHealth(
  userId: string,
  month: number,
  year: number
): Promise<SawHealthResult> {
  const { start, end } = getMonthDateRangeWib(month, year);
  const daysInMonth = getDaysInMonth(month, year);

  const [user, monthTransactions, activeWallets, budgets] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { monthlyIncomeTarget: true },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        type: { in: [TransactionType.INCOME, TransactionType.EXPENSE] },
        transactionDate: { gte: start, lt: end },
      },
      select: { type: true, amount: true },
    }),
    prisma.wallet.findMany({
      where: { userId, isArchived: false },
      select: { currentBalance: true },
    }),
    prisma.budget.findMany({
      where: { userId, month, year },
      select: { limitAmount: true, period: true },
    }),
  ]);

  const txCount = monthTransactions.length;
  let monthlyIncome = 0;
  let monthlyExpense = 0;
  let expenseCount = 0;

  for (const tx of monthTransactions) {
    const amt = Number(tx.amount);
    if (tx.type === TransactionType.INCOME) {
      monthlyIncome += amt;
    } else if (tx.type === TransactionType.EXPENSE) {
      monthlyExpense += amt;
      expenseCount += 1;
    }
  }

  // Cold-start guard: wajib minimal 3 transaksi dan minimal 1 pengeluaran
  if (txCount < MIN_TRANSACTIONS_REQUIRED || expenseCount === 0) {
    return {
      hasEnoughData: false,
      txCount,
      minTransactionsNeeded: MIN_TRANSACTIONS_REQUIRED,
      healthScore: null,
      classification: 'INSUFFICIENT_DATA',
      statusLabel: 'Belum Cukup Data',
      criteria: null,
    };
  }

  const totalActiveWalletBalance = activeWallets.reduce(
    (sum, w) => sum + Number(w.currentBalance),
    0
  );
  const totalBudgetLimit = budgets.reduce(
    (sum, b) =>
      sum + toMonthlyEquivalent(Number(b.limitAmount), b.period, daysInMonth),
    0
  );

  const effectiveIncome =
    monthlyIncome > 0
      ? monthlyIncome
      : Number(user?.monthlyIncomeTarget ?? 0);

  // C1: Savings Rate (Benefit, bobot 0.30, target >= 20%)
  const savingsRate =
    effectiveIncome > 0
      ? (effectiveIncome - monthlyExpense) / effectiveIncome
      : 0;
  const r1 =
    savingsRate <= 0
      ? 0
      : savingsRate >= 0.2
        ? 1
        : savingsRate / 0.2;

  // C2: Expense Control (Cost, bobot 0.30, target <= 70%)
  const expenseRatio =
    effectiveIncome > 0 ? monthlyExpense / effectiveIncome : 1.5;
  const r2 =
    expenseRatio <= 0.7
      ? 1
      : expenseRatio >= 1.2
        ? 0
        : (1.2 - expenseRatio) / 0.5;

  // C3: Budget Adherence (Cost, bobot 0.20, target <= 85%)
  const budgetRatio =
    totalBudgetLimit > 0 ? monthlyExpense / totalBudgetLimit : expenseRatio;
  const r3 =
    budgetRatio <= 0.85
      ? 1
      : budgetRatio >= 1.25
        ? 0
        : (1.25 - budgetRatio) / 0.4;

  // C4: Liquidity Buffer (Benefit, bobot 0.20, target >= 3 bulan)
  const monthlyBaseline = Math.max(monthlyExpense, effectiveIncome * 0.5, 1);
  const bufferMonths = totalActiveWalletBalance / monthlyBaseline;
  const r4 =
    bufferMonths <= 0
      ? 0
      : bufferMonths >= 3
        ? 1
        : bufferMonths / 3;

  const rawScore = (0.3 * r1 + 0.3 * r2 + 0.2 * r3 + 0.2 * r4) * 100;
  const healthScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  let classification: SawClassification = 'Critical';
  let statusLabel = 'Kritis';
  if (healthScore >= 80) {
    classification = 'Strong';
    statusLabel = 'Sangat Sehat';
  } else if (healthScore >= 60) {
    classification = 'Stable';
    statusLabel = 'Stabil';
  } else if (healthScore >= 40) {
    classification = 'Warning';
    statusLabel = 'Waspada';
  }

  return {
    hasEnoughData: true,
    txCount,
    minTransactionsNeeded: MIN_TRANSACTIONS_REQUIRED,
    healthScore,
    classification,
    statusLabel,
    criteria: {
      c1SavingsRate: {
        key: 'C1',
        label: 'Rasio Tabungan',
        type: 'BENEFIT',
        weight: 0.3,
        rawValue: round4(savingsRate),
        normalizedScore: round4(r1),
        weightedScore: round2(r1 * 30),
      },
      c2ExpenseControl: {
        key: 'C2',
        label: 'Kontrol Pengeluaran',
        type: 'COST',
        weight: 0.3,
        rawValue: round4(expenseRatio),
        normalizedScore: round4(r2),
        weightedScore: round2(r2 * 30),
      },
      c3BudgetAdherence: {
        key: 'C3',
        label: 'Kepatuhan Anggaran',
        type: 'COST',
        weight: 0.2,
        rawValue: round4(budgetRatio),
        normalizedScore: round4(r3),
        weightedScore: round2(r3 * 20),
      },
      c4LiquidityBuffer: {
        key: 'C4',
        label: 'Dana Darurat',
        type: 'BENEFIT',
        weight: 0.2,
        rawValue: round2(bufferMonths),
        normalizedScore: round4(r4),
        weightedScore: round2(r4 * 20),
      },
    },
  };
}
