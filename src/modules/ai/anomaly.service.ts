import {
  AnomalySeverity,
  AnomalyType,
  TransactionType,
} from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/errors';
import { getMonthDateRange } from '../budgets/budgets.service';

function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

function makeAnomalyKey(
  type: AnomalyType,
  categoryId: string | null,
  transactionId: string | null
) {
  return `${type}:${categoryId ?? 'none'}:${transactionId ?? 'none'}`;
}

export async function detectAndPersistAnomalies(
  userId: string,
  month: number,
  year: number
) {
  const { start, end } = getMonthDateRange(month, year);
  const threeMonthsAgoStart = new Date(year, month - 4, 1, 0, 0, 0, 0);

  const [
    currentExpenses,
    historicalExpenses,
    budgets,
    existingAnomalies,
  ] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        type: TransactionType.EXPENSE,
        transactionDate: { gte: start, lt: end },
      },
      include: { category: true },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        type: TransactionType.EXPENSE,
        transactionDate: { gte: threeMonthsAgoStart, lt: start },
      },
      include: { category: true },
    }),
    prisma.budget.findMany({
      where: { userId, month, year },
      include: { category: true },
    }),
    prisma.spendingAnomaly.findMany({
      where: { userId, month, year },
    }),
  ]);

  const existingKeys = new Set(
    existingAnomalies.map((a) =>
      makeAnomalyKey(a.anomalyType, a.categoryId, a.transactionId)
    )
  );

  const toCreate: Array<{
    userId: string;
    categoryId: string | null;
    transactionId: string | null;
    month: number;
    year: number;
    anomalyType: AnomalyType;
    severity: AnomalySeverity;
    deviationPct: number;
    message: string;
  }> = [];

  // Aggregate current month spend per category
  const currentCatSpend = new Map<string, { name: string; total: number }>();
  for (const tx of currentExpenses) {
    if (!tx.categoryId) continue;
    const amt = Number(tx.amount);
    const cur = currentCatSpend.get(tx.categoryId) ?? {
      name: tx.category?.name ?? 'Kategori',
      total: 0,
    };
    cur.total += amt;
    currentCatSpend.set(tx.categoryId, cur);
  }

  // LAPIS 1: OVER_BUDGET
  for (const b of budgets) {
    const limit = Number(b.limitAmount);
    if (limit <= 0) continue;
    const spent = currentCatSpend.get(b.categoryId)?.total ?? 0;
    const pct = (spent / limit) * 100;
    if (pct < b.alertThresholdPct) continue;

    const key = makeAnomalyKey(AnomalyType.OVER_BUDGET, b.categoryId, null);
    if (existingKeys.has(key)) continue;

    const isOver = pct > 100;
    const deviationPct = isOver ? round1(pct - 100) : round1(pct);
    const message = isOver
      ? `Pengeluaran "${b.category.name}" mencapai ${round1(pct)}% (melebihi batas Rp ${limit.toLocaleString('id-ID')}).`
      : `Pengeluaran "${b.category.name}" sudah mencapai ${round1(pct)}% dari batas anggaran.`;

    toCreate.push({
      userId,
      categoryId: b.categoryId,
      transactionId: null,
      month,
      year,
      anomalyType: AnomalyType.OVER_BUDGET,
      severity: isOver ? AnomalySeverity.HIGH : AnomalySeverity.MEDIUM,
      deviationPct,
      message,
    });
    existingKeys.add(key);
  }

  // LAPIS 2: CATEGORY_SPIKE (>25% vs rata-rata 1-3 bulan sebelumnya)
  const histByCatMonth = new Map<string, Map<string, number>>();
  for (const tx of historicalExpenses) {
    if (!tx.categoryId) continue;
    const monthKey = `${tx.transactionDate.getFullYear()}-${tx.transactionDate.getMonth() + 1}`;
    const catMonths = histByCatMonth.get(tx.categoryId) ?? new Map<string, number>();
    catMonths.set(monthKey, (catMonths.get(monthKey) ?? 0) + Number(tx.amount));
    histByCatMonth.set(tx.categoryId, catMonths);
  }

  for (const [categoryId, current] of currentCatSpend.entries()) {
    const catMonths = histByCatMonth.get(categoryId);
    if (!catMonths || catMonths.size === 0) continue;

    let histSum = 0;
    for (const v of catMonths.values()) histSum += v;
    const prevAvg = histSum / catMonths.size;
    if (prevAvg <= 0) continue;

    const spikePct = ((current.total - prevAvg) / prevAvg) * 100;
    if (spikePct <= 25) continue;

    const key = makeAnomalyKey(AnomalyType.CATEGORY_SPIKE, categoryId, null);
    if (existingKeys.has(key)) continue;

    toCreate.push({
      userId,
      categoryId,
      transactionId: null,
      month,
      year,
      anomalyType: AnomalyType.CATEGORY_SPIKE,
      severity: spikePct > 50 ? AnomalySeverity.HIGH : AnomalySeverity.MEDIUM,
      deviationPct: round1(spikePct),
      message: `Pengeluaran "${current.name}" melonjak ${round1(spikePct)}% dibanding rata-rata ${catMonths.size} bulan sebelumnya.`,
    });
    existingKeys.add(key);
  }

  // LAPIS 3: OUTLIER_TX (>= 2x rata-rata nominal transaksi kategori, min 3 transaksi historis)
  const allTxByCat = new Map<string, number[]>();
  for (const tx of [...historicalExpenses, ...currentExpenses]) {
    if (!tx.categoryId) continue;
    const list = allTxByCat.get(tx.categoryId) ?? [];
    list.push(Number(tx.amount));
    allTxByCat.set(tx.categoryId, list);
  }

  for (const tx of currentExpenses) {
    if (!tx.categoryId) continue;
    const list = allTxByCat.get(tx.categoryId);
    if (!list || list.length < 3) continue;

    const avgTx = list.reduce((s, v) => s + v, 0) / list.length;
    if (avgTx <= 0) continue;

    const amt = Number(tx.amount);
    if (amt < 2 * avgTx) continue;

    const key = makeAnomalyKey(AnomalyType.OUTLIER_TX, tx.categoryId, tx.id);
    if (existingKeys.has(key)) continue;

    const ratio = (amt / avgTx).toFixed(1);
    const deviationPct = round1(((amt - avgTx) / avgTx) * 100);
    const catName = tx.category?.name ?? 'Kategori';
    const label = tx.note ? `"${tx.note}"` : catName;

    toCreate.push({
      userId,
      categoryId: tx.categoryId,
      transactionId: tx.id,
      month,
      year,
      anomalyType: AnomalyType.OUTLIER_TX,
      severity: amt >= 3 * avgTx ? AnomalySeverity.HIGH : AnomalySeverity.MEDIUM,
      deviationPct,
      message: `Transaksi ${label} (Rp ${amt.toLocaleString('id-ID')}) tercatat ${ratio}x lebih besar dari rata-rata kategori ${catName}.`,
    });
    existingKeys.add(key);
  }

  if (toCreate.length > 0) {
    await prisma.spendingAnomaly.createMany({ data: toCreate });
  }

  const activeAnomalies = await prisma.spendingAnomaly.findMany({
    where: { userId, month, year, isDismissed: false },
    include: { category: true },
    orderBy: [{ detectedAt: 'desc' }],
  });

  return activeAnomalies.map((a) => ({
    id: a.id,
    anomalyType: a.anomalyType,
    severity: a.severity,
    deviationPct: Number(a.deviationPct),
    message: a.message,
    categoryId: a.categoryId,
    categoryName: a.category?.name ?? null,
    transactionId: a.transactionId,
    isDismissed: a.isDismissed,
    detectedAt: a.detectedAt,
  }));
}

export async function dismissAnomaly(userId: string, anomalyId: string) {
  const existing = await prisma.spendingAnomaly.findFirst({
    where: { id: anomalyId, userId },
  });
  if (!existing) {
    throw new AppError('Data anomali tidak ditemukan', 404);
  }

  const updated = await prisma.spendingAnomaly.update({
    where: { id: anomalyId },
    data: { isDismissed: true },
  });

  return {
    id: updated.id,
    isDismissed: updated.isDismissed,
  };
}
