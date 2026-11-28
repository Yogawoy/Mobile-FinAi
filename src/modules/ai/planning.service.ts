import { TransactionType } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { getMonthDateRangeWib } from '../../utils/budgetWindow';

export interface PlanningGoalInput {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string | null;
}

export interface FinancialPlanCalculation {
  targetName: string;
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  durationMonths: number;
  durationDays?: number;
  durationLabel?: string;
  requiredMonthlySaving: number;
  requiredDailySaving?: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyNetCashFlow: number;
  requiredPercentageOfNet: number;
  feasibility: 'realistic' | 'tight' | 'unlikely' | 'insufficient_data';
  assumptions: string[];
  relatedGoalId: string | null;
}

export interface ExtractedPlanningIntent {
  shouldPlan: boolean;
  targetName: string;
  targetAmount: number;
  currentAmount: number;
  durationMonths?: number;
  durationDays?: number;
  durationLabel?: string;
  relatedGoal: PlanningGoalInput | null;
}

function formatIDR(value: number): string {
  if (!Number.isFinite(value) || value < 0) return 'Rp 0';
  return `Rp ${Math.round(value).toLocaleString('id-ID')}`;
}

export function extractPlanningIntent(
  message: string,
  goals: PlanningGoalInput[]
): ExtractedPlanningIntent | null {
  const lower = message.toLowerCase();

  const planningKeywords = [
    'beli',
    'nabung',
    'target',
    'ingin',
    'mau',
    'capai',
    'realisasikan',
    'tabung',
    'menabung',
    'perencanaan',
    'plan',
    'rencana',
    'simulasi',
  ];

  // Hindari bentrok dengan transaksi harian ("beli kopi 25rb pakai bca")
  const hasWalletOrPastAction =
    /\b(pakai|pake|via|menggunakan|sudah|barusan|tadi|kemarin)\b/i.test(lower);
  const hasDurationOrPlanWord =
    /(?:\d+\s*(?:hari|hr|minggu|mgg|bulan|bln|tahun|thn)\b|\b(?:hari|minggu|bulan|tahun|rencana|plan|simulasi|target|capai|realisasikan)\b)/i.test(
      lower
    );

  if (!planningKeywords.some((k) => lower.includes(k))) return null;
  if (hasWalletOrPastAction && !hasDurationOrPlanWord) return null;
  if (!hasDurationOrPlanWord && !/\b(mau|ingin)\s+(beli|nabung|tabung)\b/i.test(lower)) {
    return null;
  }

  const amountPatterns: Array<{ regex: RegExp; multiplier: number }> = [
    { regex: /(\d+(?:[.,]\d+)?)\s*(?:miliar|milyar)\b/i, multiplier: 1_000_000_000 },
    { regex: /(\d+(?:[.,]\d+)?)\s*(?:juta|jt)\b/i, multiplier: 1_000_000 },
    { regex: /(\d+(?:[.,]\d+)?)\s*(?:ribu|rb|k)\b/i, multiplier: 1_000 },
    { regex: /rp\s*([\d.]+)/i, multiplier: 1 },
    { regex: /\b(\d{6,})\b/, multiplier: 1 },
  ];

  let targetAmount = 0;
  for (const { regex, multiplier } of amountPatterns) {
    const match = message.match(regex);
    if (match?.[1]) {
      const cleaned =
        multiplier === 1 ? match[1].replace(/\./g, '') : match[1].replace(',', '.');
      const num = Number(cleaned);
      if (Number.isFinite(num) && num > 0) {
        targetAmount = Math.round(num * multiplier);
        break;
      }
    }
  }

  const relatedGoal =
    goals.find(
      (g) =>
        lower.includes(g.name.toLowerCase()) ||
        g.name
          .toLowerCase()
          .split(/\s+/)
          .some((tok) => tok.length >= 4 && lower.includes(tok))
    ) ?? null;

  if (targetAmount <= 0 && !relatedGoal) return null;

  let durationMonths: number | undefined;
  let durationDays: number | undefined;
  let durationLabel: string | undefined;

  const monthMatch = message.match(/(\d+)\s*(?:bulan|bln)\b/i);
  const yearMatch = message.match(/(\d+)\s*(?:tahun|thn)\b/i);
  const weekMatch = message.match(/(\d+)\s*(?:minggu|mgg)\b/i);
  const dayMatch = message.match(/(\d+)\s*(?:hari|hr)\b/i);

  if (monthMatch?.[1]) {
    durationMonths = parseInt(monthMatch[1], 10);
    durationLabel = `${durationMonths} bulan`;
  } else if (yearMatch?.[1]) {
    const yrs = parseInt(yearMatch[1], 10);
    durationMonths = yrs * 12;
    durationLabel = `${yrs} tahun (${durationMonths} bulan)`;
  } else if (weekMatch?.[1]) {
    const wks = parseInt(weekMatch[1], 10);
    durationDays = wks * 7;
    durationMonths = Math.max(1, Math.ceil(wks / 4));
    durationLabel = `${wks} minggu`;
  } else if (dayMatch?.[1]) {
    durationDays = parseInt(dayMatch[1], 10);
    durationMonths = Math.max(1, Math.ceil(durationDays / 30));
    durationLabel = `${durationDays} hari`;
  }

  const targetName =
    relatedGoal?.name ||
    message
      .replace(/(\d+(?:[.,]\d+)?)\s*(juta|jt|miliar|milyar|ribu|rb|k|bulan|bln|tahun|thn|minggu|mgg|hari|hr|rp)\b/gi, '')
      .replace(
        /\b(aku|saya|gw|gua|buat|bikin|mau|ingin|beli|nabung|tabung|menabung|target|capai|realisasikan|untuk|dengan|dalam|dari|sampai|rencana|simulasi|plan)\b/gi,
        ''
      )
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 50) ||
    'Target Keuangan';

  return {
    shouldPlan: true,
    targetName,
    targetAmount: relatedGoal ? relatedGoal.targetAmount : targetAmount,
    currentAmount: relatedGoal?.currentAmount ?? 0,
    durationMonths,
    durationDays,
    durationLabel,
    relatedGoal,
  };
}

export function calculateFinancialPlan(args: {
  targetName: string;
  targetAmount: number;
  currentAmount?: number;
  durationMonths?: number | null;
  durationDays?: number | null;
  durationLabel?: string | null;
  deadline?: string | null;
  monthlyIncome: number;
  monthlyExpense: number;
  incomeSource?: 'actual' | 'target' | 'none';
  relatedGoal?: PlanningGoalInput | null;
}): FinancialPlanCalculation {
  const targetAmount = Math.max(0, Math.round(args.targetAmount));
  const currentAmount = Math.max(0, Math.round(args.currentAmount ?? 0));
  const monthlyIncome = Math.max(0, Math.round(args.monthlyIncome));
  const monthlyExpense = Math.max(0, Math.round(args.monthlyExpense));
  const monthlyNetCashFlow = Math.max(0, monthlyIncome - monthlyExpense);
  const remaining = Math.max(0, targetAmount - currentAmount);

  let durationMonths = args.durationMonths && args.durationMonths > 0
    ? Math.ceil(args.durationMonths)
    : 0;
  let durationSource = 'durasi pilihan Anda';

  if (!durationMonths && args.deadline) {
    const deadlineDate = new Date(args.deadline);
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    if (Number.isFinite(deadlineDate.getTime()) && deadlineDate > start) {
      durationMonths = Math.max(
        1,
        Math.ceil(
          (deadlineDate.getFullYear() - start.getFullYear()) * 12 +
            deadlineDate.getMonth() -
            start.getMonth()
        )
      );
      durationSource = 'tenggat waktu target';
    }
  }

  if (targetAmount <= 0 || !durationMonths) {
    return {
      targetName: args.targetName,
      targetAmount,
      currentAmount,
      remainingAmount: remaining,
      durationMonths,
      requiredMonthlySaving: 0,
      monthlyIncome,
      monthlyExpense,
      monthlyNetCashFlow,
      requiredPercentageOfNet: 0,
      feasibility: 'insufficient_data',
      assumptions: ['Durasi atau nominal target belum lengkap. Sebutkan nominal dan durasi bulan/tahun.'],
      relatedGoalId: args.relatedGoal?.id ?? null,
    };
  }

  const requiredMonthlySaving = Math.ceil(remaining / durationMonths);
  const requiredDailySaving =
    args.durationDays && args.durationDays > 0
      ? Math.ceil(remaining / args.durationDays)
      : undefined;

  if (monthlyNetCashFlow <= 0) {
    const perPeriodText = requiredDailySaving
      ? `${formatIDR(requiredDailySaving)}/hari selama ${args.durationDays} hari`
      : `${formatIDR(requiredMonthlySaving)}/bulan selama ${durationMonths} bulan`;
    const reason =
      args.incomeSource === 'none' || monthlyIncome <= 0
        ? `Pemasukan bulanan belum tercatat; kamu perlu menyisihkan ${perPeriodText}.`
        : `Pengeluaran bulan ini (${formatIDR(monthlyExpense)}) menyamai/melebihi pemasukan (${formatIDR(monthlyIncome)}); perlu menekan pengeluaran agar bisa menabung ${perPeriodText}.`;

    return {
      targetName: args.targetName,
      targetAmount,
      currentAmount,
      remainingAmount: remaining,
      durationMonths,
      durationDays: args.durationDays ?? undefined,
      durationLabel: args.durationLabel ?? `${durationMonths} bulan`,
      requiredMonthlySaving,
      requiredDailySaving,
      monthlyIncome,
      monthlyExpense,
      monthlyNetCashFlow: 0,
      requiredPercentageOfNet: 0,
      feasibility: 'insufficient_data',
      assumptions: [reason],
      relatedGoalId: args.relatedGoal?.id ?? null,
    };
  }

  const requiredPercentageOfNet =
    Math.round((requiredMonthlySaving / monthlyNetCashFlow) * 1000) / 10;

  let feasibility: FinancialPlanCalculation['feasibility'] = 'insufficient_data';
  if (requiredPercentageOfNet <= 60) {
    feasibility = 'realistic';
  } else if (requiredPercentageOfNet <= 90) {
    feasibility = 'tight';
  } else {
    feasibility = 'unlikely';
  }

  const assumptions: string[] = [
    args.incomeSource === 'target'
      ? `Menggunakan target pemasukan profil (${formatIDR(monthlyIncome)}) dengan estimasi surplus ${formatIDR(monthlyNetCashFlow)}/bulan.`
      : `Surplus bulanan diperkirakan tetap sekitar ${formatIDR(monthlyNetCashFlow)}.`,
    `Perhitungan menggunakan ${durationSource} (${durationMonths} bulan).`,
  ];

  if (feasibility === 'tight' || feasibility === 'unlikely') {
    assumptions.push(
      'Jika pola pengeluaran naik, target ini menjadi lebih berat dicapai sesuai jadwal.'
    );
  }

  return {
    targetName: args.targetName,
    targetAmount,
    currentAmount,
    remainingAmount: remaining,
    durationMonths,
    durationDays: args.durationDays ?? undefined,
    durationLabel: args.durationLabel ?? `${durationMonths} bulan`,
    requiredMonthlySaving,
    requiredDailySaving,
    monthlyIncome,
    monthlyExpense,
    monthlyNetCashFlow,
    requiredPercentageOfNet,
    feasibility,
    assumptions,
    relatedGoalId: args.relatedGoal?.id ?? null,
  };
}

export async function buildSpendingBreakdown(
  userId: string,
  month: number,
  year: number
) {
  const { start, end } = getMonthDateRangeWib(month, year);

  const expenses = await prisma.transaction.findMany({
    where: {
      userId,
      type: TransactionType.EXPENSE,
      transactionDate: { gte: start, lt: end },
    },
    select: {
      amount: true,
      category: { select: { name: true } },
    },
  });

  const totals = new Map<string, { total: number; count: number }>();
  let totalExpense = 0;

  for (const tx of expenses) {
    const amt = Number(tx.amount);
    totalExpense += amt;
    const catName = tx.category?.name ?? 'Lainnya';
    const prev = totals.get(catName) ?? { total: 0, count: 0 };
    totals.set(catName, { total: prev.total + amt, count: prev.count + 1 });
  }

  const items = Array.from(totals.entries())
    .map(([category, agg]) => ({
      category,
      total: Math.round(agg.total),
      count: agg.count,
      percentage:
        totalExpense > 0 ? Math.round((agg.total / totalExpense) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  return {
    period: `${monthNames[month - 1] ?? month} ${year}`,
    totalExpense: Math.round(totalExpense),
    items,
  };
}
