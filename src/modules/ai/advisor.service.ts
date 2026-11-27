import { Prisma, TransactionType } from '@prisma/client';
import { callGemini } from '../../config/gemini';
import { prisma } from '../../config/prisma';
import { logAudit } from '../../utils/audit';
import { AppError } from '../../utils/errors';
import { getMonthDateRange, listBudgets } from '../budgets/budgets.service';
import { buildAdvisorSystemInstruction } from './ai.prompts';
import { computeAndSaveForecast } from './forecast.service';
import { computeSawHealth } from './saw.service';

export interface AdvisorRecommendation {
  title: string;
  detail: string;
  estimated_saving: string;
}

export interface AdvisorPayload {
  health_score: number;
  status_label: string;
  executive_summary: string;
  waste_highlights: string[];
  actionable_recommendations: AdvisorRecommendation[];
}

export async function getCachedAdvisor(
  userId: string,
  month: number,
  year: number
) {
  const cached = await prisma.aiInsight.findUnique({
    where: {
      userId_month_year: { userId, month, year },
    },
  });

  if (!cached) {
    return null;
  }

  return {
    id: cached.id,
    month: cached.month,
    year: cached.year,
    healthScore: cached.healthScore,
    statusLabel: cached.statusLabel,
    advice: cached.adviceJson,
    modelUsed: cached.modelUsed,
    promptTokens: cached.promptTokens,
    completionTokens: cached.completionTokens,
    generatedAt: cached.generatedAt,
  };
}

export async function generateAdvisorInsight(
  userId: string,
  month: number,
  year: number,
  ipAddress?: string | null
) {
  const { start, end } = getMonthDateRange(month, year);

  const [forecastData, budgets, expenseByCategory, sawHealth] = await Promise.all([
    computeAndSaveForecast(userId, month, year),
    listBudgets(userId, month, year),
    prisma.transaction.findMany({
      where: {
        userId,
        type: TransactionType.EXPENSE,
        transactionDate: { gte: start, lt: end },
      },
      include: { category: true },
    }),
    computeSawHealth(userId, month, year),
  ]);

  const catTotals = new Map<string, number>();
  for (const tx of expenseByCategory) {
    const name = tx.category?.name ?? 'Lainnya';
    catTotals.set(name, (catTotals.get(name) ?? 0) + Number(tx.amount));
  }
  const topCategories = Array.from(catTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, amount]) => ({ name, amount }));

  // Zero PII: hanya angka & nama kategori
  const inputSnapshot = {
    period: { month, year },
    forecast: {
      totalIncomeMtd: forecastData.forecast.totalIncomeMtd,
      totalExpenseMtd: forecastData.forecast.totalExpenseMtd,
      dailyBurnRate: forecastData.forecast.dailyBurnRate,
      projectedExpense: forecastData.forecast.projectedExpense,
      projectedBalance: forecastData.forecast.projectedBalance,
      riskLevel: forecastData.forecast.riskLevel,
    },
    pacing: forecastData.pacing,
    sawHealth,
    topExpenseCategories: topCategories,
    budgets: budgets.map((b) => ({
      category: b.category.name,
      limitAmount: b.limitAmount,
      spentAmount: b.spentAmount,
      percentage: b.percentage,
      status: b.status,
    })),
    anomalies: forecastData.anomalies.map((a) => ({
      type: a.anomalyType,
      severity: a.severity,
      deviationPct: a.deviationPct,
      categoryName: a.categoryName,
      message: a.message,
    })),
  };

  const systemInstruction = buildAdvisorSystemInstruction({
    healthScore: sawHealth.healthScore ?? 0,
    statusLabel: sawHealth.statusLabel,
  });

  const prompt = `Analisis data keuangan bulan ${month}/${year} berikut:\n${JSON.stringify(inputSnapshot)}`;

  const geminiRes = await callGemini({
    prompt,
    systemInstruction,
    responseMimeType: 'application/json',
    temperature: 0.4,
  });

  let parsed: AdvisorPayload;
  try {
    const cleaned = geminiRes.text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    parsed = JSON.parse(cleaned) as AdvisorPayload;
  } catch {
    throw new AppError('Format respons AI tidak valid, silakan coba lagi.', 503);
  }

  // Kunci health_score & status_label ke hasil deterministik SAW agar 0% halusinasi
  const healthScore = sawHealth.healthScore ?? 0;
  const statusLabel = sawHealth.statusLabel;
  parsed.health_score = healthScore;
  parsed.status_label = statusLabel;

  const saved = await prisma.aiInsight.upsert({
    where: {
      userId_month_year: { userId, month, year },
    },
    update: {
      healthScore,
      statusLabel,
      inputSnapshotJson: inputSnapshot as unknown as Prisma.InputJsonValue,
      adviceJson: parsed as unknown as Prisma.InputJsonValue,
      modelUsed: geminiRes.modelUsed,
      promptTokens: geminiRes.promptTokens,
      completionTokens: geminiRes.completionTokens,
      generatedAt: new Date(),
    },
    create: {
      userId,
      month,
      year,
      healthScore,
      statusLabel,
      inputSnapshotJson: inputSnapshot as unknown as Prisma.InputJsonValue,
      adviceJson: parsed as unknown as Prisma.InputJsonValue,
      modelUsed: geminiRes.modelUsed,
      promptTokens: geminiRes.promptTokens,
      completionTokens: geminiRes.completionTokens,
    },
  });

  await logAudit({
    userId,
    action: 'AI_GENERATE',
    entityType: 'AI_INSIGHT',
    entityId: saved.id,
    metadata: {
      month,
      year,
      modelUsed: geminiRes.modelUsed,
      promptTokens: geminiRes.promptTokens,
      completionTokens: geminiRes.completionTokens,
    },
    ipAddress,
  });

  return {
    id: saved.id,
    month: saved.month,
    year: saved.year,
    healthScore: saved.healthScore,
    statusLabel: saved.statusLabel,
    advice: saved.adviceJson,
    modelUsed: saved.modelUsed,
    promptTokens: saved.promptTokens,
    completionTokens: saved.completionTokens,
    generatedAt: saved.generatedAt,
  };
}
