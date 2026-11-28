import { CategoryType, GoalStatus, TransactionType, WalletType } from '@prisma/client';
import { z } from 'zod';
import { callGemini } from '../../config/gemini';
import { prisma } from '../../config/prisma';
import { logAudit } from '../../utils/audit';
import { getMonthDateRangeWib } from '../../utils/budgetWindow';
import { formatWibShortDate, parseWibDateRangeQuery } from '../../utils/dateRange';
import {
  buildDraftCard,
  clearPendingDraft,
  detectIncompleteDraftIntent,
  evaluateDraftMissingSlots,
  getGenericItemPrompt,
  getPendingDraft,
  isCancelDraftCommand,
  isFreshCheckQuery,
  mergePendingDraft,
  setPendingDraft,
  type ChatDraftCard,
  type DraftContextData,
  type PendingDraft,
} from '../../services/pendingDraft.service';
import {
  createCategoryAndBudgetAtomic,
  createCategoryAndTransactionAtomic,
  ensureOtherCategory,
  findExistingCategoryByCoreToken,
  findExplicitCategoryInText,
  findFallbackOtherCategory,
  findHistoricalCategoryMatch,
  getRecentCategoryExamples,
  hasExplicitOtherCategoryIntent,
  isCategoryAlreadyOwned,
  resolveCategoryFallback,
  resolveCategoryForCommand,
  suggestStandardCategoryIfMissing,
  toTitleCaseCategoryName,
} from '../../services/categoryIntelligence.service';
import { deleteBudget, listBudgets, upsertBudget } from '../budgets/budgets.service';
import { contributeGoal, createGoal } from '../goals/goals.service';
import { createTransaction } from '../transactions/transactions.service';
import { buildChatSystemInstruction } from './ai.prompts';
import { computeAndSaveForecast } from './forecast.service';
import {
  buildSpendingBreakdown,
  calculateFinancialPlan,
  extractPlanningIntent,
} from './planning.service';
import { computeSawHealth } from './saw.service';

export type ChatCardType =
  | 'FORECAST'
  | 'ANOMALY'
  | 'RECOMMENDATION'
  | 'BUDGET'
  | 'BUDGET_SET'
  | 'BUDGET_UPDATED'
  | 'BUDGET_DELETED'
  | 'BUDGET_RESET'
  | 'SPENDING_BREAKDOWN'
  | 'SUMMARY'
  | 'GOAL'
  | 'WALLET'
  | 'FINANCIAL_PLAN'
  | 'WALLET_PICKER'
  | 'TRANSACTION_PREVIEW'
  | 'TRANSACTION_CREATED'
  | null;

export type ChatIntentType =
  | 'CREATE_TRANSACTION'
  | 'TRANSFER'
  | 'CREATE_GOAL'
  | 'GOAL_CONTRIBUTE'
  | 'DELETE_GOAL'
  | 'UPSERT_BUDGET'
  | 'SET_BUDGET'
  | 'DELETE_BUDGET'
  | 'RESET_BUDGET'
  | 'FINANCIAL_ADVICE';

export interface ChatActionCard {
  type: 'ACTION_CARD';
  badge: string;
  accent: 'blue' | 'green' | 'red' | 'amber';
  title: string;
  amount: number;
  rows: Array<{ label: string; value: string }>;
  detailRoute?: { type: 'transaction' | 'budget' | 'goal'; id: string };
}

export interface ChatSummaryCard {
  type: 'SUMMARY_CARD';
  title: string;
  metrics: Array<{
    label: string;
    value: string;
    tone?: 'default' | 'green' | 'red' | 'blue';
  }>;
  items?: Array<{
    id?: string;
    label: string;
    subtitle?: string;
    value: string;
    status?: string;
    periodLabel?: 'Harian' | 'Mingguan' | 'Bulanan';
    usableText?: string;
    usageText?: string;
    tone?: 'green' | 'amber' | 'red';
    isExceeded?: boolean;
  }>;
  tip?: string;
}

export interface ChatChoiceCard {
  type: 'CHOICE_CARD';
  title: string;
  options: Array<{
    label: string;
    sublabel?: string;
    messageToSend: string;
    color?: string;
    kind?: 'wallet' | 'category' | 'action';
  }>;
}

export type ChatStructuredCard =
  | ChatActionCard
  | ChatSummaryCard
  | ChatChoiceCard
  | ChatDraftCard;

export interface ChatHistoryTurn {
  role: 'user' | 'assistant' | 'model';
  content?: string;
  text?: string;
}

export interface ChatResponsePayload {
  reply: string;
  intent: ChatIntentType;
  actionExecuted: boolean;
  pendingConfirmation: boolean;
  cardType: ChatCardType;
  cardData: Record<string, unknown> | null;
  card?: ChatStructuredCard | null;
}

const actionPayloadSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']).optional(),
  amount: z.coerce.number().finite().nonnegative().optional().default(0),
  limitAmount: z.coerce.number().finite().nonnegative().nullable().optional(),
  period: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).nullable().optional(),
  isUpdate: z.boolean().optional(),
  budgetId: z.string().trim().nullable().optional(),
  alertThresholdPct: z.coerce.number().int().min(1).max(100).optional(),
  note: z.string().trim().max(255).optional().default(''),
  goalName: z.string().trim().max(80).nullable().optional(),
  deadlineDays: z.coerce.number().int().positive().max(3650).nullable().optional(),
  deadlineMonths: z.coerce.number().int().positive().max(240).nullable().optional(),
  walletId: z.string().trim().optional().nullable(),
  destinationWalletId: z.string().trim().optional().nullable(),
  sourceType: z.enum(['WALLET', 'EXTERNAL']).optional().nullable(),
  categoryId: z.string().trim().optional().nullable(),
  categoryConfidence: z.enum(['high', 'medium', 'low']).optional().nullable(),
  candidateCategoryIds: z.array(z.string().trim()).max(5).optional().nullable(),
  suggestedNewCategory: z
    .object({ name: z.string().trim().min(1).max(40) })
    .nullable()
    .optional(),
  goalId: z.string().trim().optional().nullable(),
});

function sanitizeReplyText(raw: string): string {
  return raw
    .replace(/\*\*/g, '')
    .replace(/[\u2022\u00B7]/g, '')
    .replace(/\u2014/g, '-')
    .replace(/\.{3}|\u2026/g, '')
    .replace(/\s*\n+\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function formatShortIdDate(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function stripJsonFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

export function normalizeIndonesianAmount(
  rawAmount: number,
  rawMessage: string,
  txType?: 'INCOME' | 'EXPENSE' | 'TRANSFER'
): number {
  if (!Number.isFinite(rawAmount) || rawAmount <= 0) return 0;
  const lower = rawMessage.toLowerCase();

  // Jika angka < 1000 dalam bahasa sehari-hari Indonesia ("beli pecel lele 10", "parkir 2", "gaji 5")
  if (rawAmount < 1000) {
    if (/\b\d+(?:[.,]\d+)?\s*(jt|juta)\b/i.test(lower)) {
      return Math.round(rawAmount * 1_000_000);
    }
    if (txType === 'INCOME' && /\b(gaji|bonus|thr|pendapatan)\b/i.test(lower) && rawAmount <= 100) {
      return Math.round(rawAmount * 1_000_000);
    }
    return Math.round(rawAmount * 1_000);
  }
  return Math.round(rawAmount);
}

function findMentionedWallets<T extends { id: string; name: string; type: WalletType }>(
  text: string,
  wallets: T[]
): T[] {
  const lower = text.toLowerCase();
  const matches: Array<{ wallet: T; index: number }> = [];

  for (const w of wallets) {
    const wLower = w.name.toLowerCase();
    let idx = lower.indexOf(wLower);

    // Cek kecocokan nama pendek / alias umum (misal "tunai"/"cash" untuk Uang Tunai, "bca" untuk Bank BCA)
    if (idx === -1) {
      const tokens = wLower
        .split(/\s+/)
        .filter((t) => t.length >= 3 && !['bank', 'uang', 'dompet', 'tabungan'].includes(t));
      for (const token of tokens) {
        const re = new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        const m = re.exec(lower);
        if (m) {
          idx = m.index;
          break;
        }
      }
    }

    if (idx === -1 && w.type === WalletType.CASH) {
      const cashMatch = /\b(tunai|cash|kas)\b/i.exec(lower);
      if (cashMatch) idx = cashMatch.index;
    }

    if (idx !== -1) {
      matches.push({ wallet: w, index: idx });
    }
  }

  matches.sort((a, b) => a.index - b.index);
  return matches.map((m) => m.wallet);
}

function formatWalletOptions<T extends { name: string }>(wallets: T[]): string {
  return wallets.map((w) => w.name).join(', ');
}

function extractUnknownWalletHint(text: string): string | null {
  const prepMatch = text.match(/\b(?:pakai|pake|via|menggunakan|dompet)\s+([a-z0-9][a-z0-9\s._-]{1,24})/i);
  if (prepMatch?.[1]) {
    const candidate = prepMatch[1]
      .replace(/(\d+(?:[.,]\d+)?)\s*(rb|ribu|k|jt|juta)?/gi, '')
      .trim();
    if (candidate.length >= 2) return candidate;
  }
  const knownProvider = text.match(/\b(ovo|dana|shopeepay|linkaja|seabank|jago|jenius|bri|bni|cimb|permata|danamon|blu|sakuku)\b/i);
  return knownProvider?.[1] ?? null;
}

function findExplicitCategory<T extends { id: string; name: string; type: CategoryType }>(
  categories: T[],
  text: string,
  txType: 'INCOME' | 'EXPENSE'
): T | undefined {
  return findExplicitCategoryInText(categories, text, txType) ?? undefined;
}

function isGenericActionNote(note: string, txType: 'INCOME' | 'EXPENSE' | 'TRANSFER'): boolean {
  if (txType === 'TRANSFER') return false;
  const stripped = note
    .toLowerCase()
    .replace(/\b(beli|bayar|keluar|pengeluaran|pemasukan|terima|dapat|masuk|kasih|kirim|pakai|pake|via|dari|ke|di|untuk|uang|saldo|transaksi|catat|catatkan|tolong)\b/gi, '')
    .replace(/[^a-z0-9]/gi, '')
    .trim();
  return stripped.length < 2;
}

function matchBestCategory<T extends { id: string; name: string; type: CategoryType }>(
  categories: T[],
  text: string,
  txType: 'INCOME' | 'EXPENSE'
): T | undefined {
  return resolveCategoryFallback(categories, text, txType) ?? undefined;
}

function parseDeterministicIntent(
  message: string,
  wallets: Array<{ id: string; name: string; type: WalletType; currentBalance: number }>,
  categories: Array<{ id: string; name: string; type: CategoryType }>,
  goals: Array<{ id: string; name: string }>,
  history: ChatHistoryTurn[] = []
): {
  intent: ChatIntentType;
  reply: string;
  actionPayload: z.infer<typeof actionPayloadSchema> | null;
} | null {
  let effectiveMessage = message.trim();
  const directWallets = findMentionedWallets(effectiveMessage, wallets);
  const hasDirectAmount = /\d/.test(effectiveMessage);

  // Jika user membalas nama dompet atau keterangan barang untuk melengkapi pesan sebelumnya
  if (!hasDirectAmount && history.length > 0) {
    const prevUserTurns = history
      .filter((h) => h.role === 'user')
      .map((h) => (h.content ?? h.text ?? '').trim())
      .filter(Boolean);
    const txPattern =
      /\b(beli|bayar|makan|minum|ngopi|naik|parkir|ojek|belanja|jajan|isi|topup|keluar|sedekah|infaq|zakat|donasi|servis|ganti oli|cuci|laundry|potong rambut|salon|langganan|perpanjang|sewa|cicilan|angsuran|kirim|kasih|traktir|nonton|tiket|gaji|gajian|terima|dapat|masuk|bonus|thr|pemasukan|freelance|jualan|omzet|dividen|cashback|refund|transfer|pindah saldo|kirim ke|nabung|tabung)\b/i;
    const lastTxMsg = [...prevUserTurns]
      .reverse()
      .find((m) => /\d/.test(m) && txPattern.test(m));

    if (lastTxMsg) {
      const prevHadWallet = findMentionedWallets(lastTxMsg, wallets).length > 0;
      if (directWallets.length > 0 || prevHadWallet) {
        effectiveMessage = `${lastTxMsg} ${effectiveMessage}`;
      } else if (effectiveMessage.split(/\s+/).length <= 4) {
        const cleanedChoice = effectiveMessage
          .replace(/\b(pakai|pake|via|menggunakan|dompet)\b/gi, '')
          .trim();
        return {
          intent: 'CREATE_TRANSACTION',
          reply: `Dompet "${cleanedChoice || effectiveMessage}" belum terdaftar di akunmu. Silakan pilih salah satu dompet aktif yang tersedia: ${formatWalletOptions(wallets)}.`,
          actionPayload: null,
        };
      }
    }
  }

  const lower = effectiveMessage.toLowerCase().trim();
  const isTransfer = /\b(transfer|pindah saldo|kirim ke)\b/i.test(lower);
  const isGoal = /\b(nabung|tabung|tabungan|sisihkan|target|goal)\b/i.test(lower) ||
    /\b(setor|masukin)\b.*\b(tabungan|target|goal|dana darurat)\b/i.test(lower);
  const isIncome = /\b(gaji|gajian|terima|dapat|masuk|bonus|thr|pemasukan|freelance|jualan|omzet|dividen|cashback|refund|honor)\b/i.test(lower);
  const isExpense = /\b(beli|bayar|makan|minum|ngopi|naik|parkir|ojek|belanja|jajan|isi|topup|keluar|sedekah|infaq|zakat|donasi|servis|ganti oli|cuci|laundry|potong rambut|salon|langganan|perpanjang|sewa|cicilan|angsuran|kirim|kasih|traktir|nonton|tiket|grooming)\b/i.test(lower);

  if (!isTransfer && !isGoal && !isIncome && !isExpense) {
    return null;
  }

  // Ekstrak angka + satuan opsional (rb, k, ribu, jt, juta)
  const numMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(rb|ribu|k|jt|juta)?/i);
  let rawNum = 0;
  if (numMatch) {
    const cleaned = numMatch[1].replace(/\./g, '').replace(',', '.');
    rawNum = Number(cleaned);
    const unit = (numMatch[2] || '').toLowerCase();
    if (unit === 'rb' || unit === 'ribu' || unit === 'k') {
      rawNum = rawNum * 1000;
    } else if (unit === 'jt' || unit === 'juta') {
      rawNum = rawNum * 1_000_000;
    }
  }

  const txType: 'INCOME' | 'EXPENSE' | 'TRANSFER' = isTransfer
    ? 'TRANSFER'
    : isIncome
      ? 'INCOME'
      : 'EXPENSE';

  const amount = normalizeIndonesianAmount(rawNum, effectiveMessage, txType);
  const noteClean = effectiveMessage
    .replace(/(\d+(?:[.,]\d+)?)\s*(rb|ribu|k|jt|juta)?/gi, '')
    .replace(/\bkategori\s+[a-z0-9\s&._-]+$/gi, '')
    .replace(/\b(pakai|pake|via|dari|ke|dompet|saldo)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const mentionedWallets = findMentionedWallets(effectiveMessage, wallets);
  // Bersihkan nama dompet dari catatan agar catatan tetap rapi
  let cleanNote = noteClean;
  for (const w of mentionedWallets) {
    cleanNote = cleanNote.replace(new RegExp(w.name, 'gi'), '').trim();
  }
  cleanNote = cleanNote.replace(/\s+/g, ' ').trim();
  const note = cleanNote || (txType === 'INCOME' ? 'Pemasukan' : 'Pengeluaran');

  if (isGoal && goals.length > 0 && amount > 0) {
    const goal = goals.find((g) => lower.includes(g.name.toLowerCase())) ?? goals[0];
    return {
      intent: 'GOAL_CONTRIBUTE',
      reply: `Saya siap menyetor Rp ${amount.toLocaleString('id-ID')} ke target "${goal.name}". Tekan Konfirmasi untuk menyimpan.`,
      actionPayload: {
        type: 'TRANSFER',
        amount,
        note: `Setor ${goal.name}`,
        walletId: mentionedWallets[0]?.id ?? null,
        destinationWalletId: null,
        categoryId: null,
        goalId: goal.id,
      },
    };
  }

  if (isTransfer) {
    if (wallets.length < 2) {
      return {
        intent: 'TRANSFER',
        reply: 'Untuk transfer antar dompet, Anda perlu memiliki minimal 2 dompet aktif.',
        actionPayload: null,
      };
    }
    if (amount <= 0) {
      return {
        intent: 'TRANSFER',
        reply: 'Berapa nominal yang ingin Anda transfer antar dompet?',
        actionPayload: null,
      };
    }
    if (mentionedWallets.length < 2) {
      return {
        intent: 'TRANSFER',
        reply: `Dompet asal dan tujuan transfer belum lengkap. Sebutkan dari dompet mana ke dompet mana (pilihan aktif: ${formatWalletOptions(wallets)}).`,
        actionPayload: null,
      };
    }
    const src = mentionedWallets[0];
    const dest = mentionedWallets[1];
    return {
      intent: 'TRANSFER',
      reply: `Siap memindahkan Rp ${amount.toLocaleString('id-ID')} dari ${src.name} ke ${dest.name}. Tekan Konfirmasi untuk melanjutkan.`,
      actionPayload: {
        type: 'TRANSFER',
        amount,
        note: note || `Transfer ke ${dest.name}`,
        walletId: src.id,
        destinationWalletId: dest.id,
        categoryId: null,
        goalId: null,
      },
    };
  }

  if (amount <= 0) {
    return {
      intent: 'CREATE_TRANSACTION',
      reply: `Berapa nominal untuk "${note}"? Contoh: "${note} 15rb pakai Uang Tunai".`,
      actionPayload: null,
    };
  }

  if (mentionedWallets.length === 0) {
    const unknownHint = extractUnknownWalletHint(effectiveMessage);
    if (unknownHint) {
      return {
        intent: 'CREATE_TRANSACTION',
        reply: `Dompet "${unknownHint}" tidak ditemukan di akunmu. Silakan pilih salah satu dompet aktif yang tersedia: ${formatWalletOptions(wallets)}.`,
        actionPayload: null,
      };
    }
    return {
      intent: 'CREATE_TRANSACTION',
      reply: `Untuk mencatat ${txType === 'INCOME' ? 'pemasukan' : 'pengeluaran'} "${note}" sebesar Rp ${amount.toLocaleString('id-ID')}, mau pakai dompet apa? Pilihan dompet aktif: ${formatWalletOptions(wallets)}.`,
      actionPayload: null,
    };
  }

  const chosenWallet = mentionedWallets[0];
  const chosenCategory = matchBestCategory(categories, effectiveMessage, txType === 'INCOME' ? CategoryType.INCOME : CategoryType.EXPENSE);

  return {
    intent: 'CREATE_TRANSACTION',
    reply: `Siap mencatat ${txType === 'INCOME' ? 'pemasukan' : 'pengeluaran'} "${note}" sebesar Rp ${amount.toLocaleString('id-ID')} ke ${chosenWallet.name} (${chosenCategory?.name ?? 'Lainnya'}). Silakan konfirmasi di bawah.`,
    actionPayload: {
      type: txType,
      amount,
      note,
      walletId: chosenWallet.id,
      destinationWalletId: null,
      categoryId: chosenCategory?.id ?? null,
      goalId: null,
    },
  };
}

type BudgetSummaryRow = {
  id?: string;
  name?: string | null;
  category?: { name?: string };
  period?: string;
  limitAmount?: number;
  spentAmount?: number;
  remainingAmount?: number;
  percentage?: number;
  alertThresholdPct?: number;
};

function buildBudgetSummaryCard(list: BudgetSummaryRow[]): ChatSummaryCard {
  const periodOrder: Record<string, number> = {
    DAILY: 0,
    WEEKLY: 1,
    MONTHLY: 2,
  };
  const sorted = [...list].sort(
    (a, b) => (periodOrder[a.period ?? 'MONTHLY'] ?? 2) - (periodOrder[b.period ?? 'MONTHLY'] ?? 2)
  );

  let totalRemaining = 0;
  let totalSpent = 0;
  let totalLimit = 0;
  let exceededCount = 0;
  const amberNames: string[] = [];

  const items = sorted.map((b) => {
    const limit = Number(b.limitAmount ?? 0);
    const spent = Number(b.spentAmount ?? 0);
    const remaining = Math.max(0, limit - spent);
    const exceeded = Math.max(0, spent - limit);
    const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
    const alertThreshold = Number(b.alertThresholdPct ?? 80);
    const periodLabel: 'Harian' | 'Mingguan' | 'Bulanan' =
      b.period === 'DAILY'
        ? 'Harian'
        : b.period === 'WEEKLY'
          ? 'Mingguan'
          : 'Bulanan';
    const isExceeded = exceeded > 0;
    const tone: 'green' | 'amber' | 'red' = isExceeded
      ? 'red'
      : pct >= alertThreshold
        ? 'amber'
        : 'green';

    totalRemaining += remaining;
    totalSpent += spent;
    totalLimit += limit;
    if (isExceeded) exceededCount += 1;
    if (tone === 'amber' && b.category?.name) {
      amberNames.push(b.category.name);
    }

    return {
      id: b.id,
      label: b.name?.trim() || b.category?.name || 'Kategori',
      value: `Rp ${spent.toLocaleString('id-ID')} / Rp ${limit.toLocaleString('id-ID')}`,
      status: `${pct}%`,
      periodLabel,
      usableText: isExceeded
        ? `Lewat Rp ${exceeded.toLocaleString('id-ID')}`
        : `Rp ${remaining.toLocaleString('id-ID')}`,
      usageText: `Terpakai Rp ${spent.toLocaleString('id-ID')} dari Rp ${limit.toLocaleString('id-ID')}`,
      tone,
      isExceeded,
    };
  });

  const tip =
    exceededCount > 0
      ? `Ada ${exceededCount} anggaran yang melewati batas, tahan pengeluaran di kategori tersebut.`
      : amberNames.length > 0
        ? `Anggaran ${amberNames[0]} sudah mendekati batas, gunakan sisa dana dengan hemat.`
        : `Semua anggaran masih aman, total sisa yang bisa dipakai Rp ${totalRemaining.toLocaleString('id-ID')}.`;

  return {
    type: 'SUMMARY_CARD',
    title: 'Sisa Anggaran Aktif',
    metrics: [
      {
        label: 'Masih Bisa Dipakai',
        value: `Rp ${totalRemaining.toLocaleString('id-ID')}`,
        tone: totalRemaining > 0 ? 'green' : 'red',
      },
      {
        label: 'Sudah Terpakai',
        value: `Rp ${totalSpent.toLocaleString('id-ID')}`,
        tone: totalSpent > totalLimit ? 'red' : 'blue',
      },
    ],
    items,
    tip,
  };
}

function buildMonthlySummaryCard(params: {
  income: number;
  expense: number;
  totalBalance: number;
  totalSavingsBalance: number;
}): ChatSummaryCard {
  const remaining = params.income - params.expense;
  const tip =
    params.income === 0 && params.expense === 0
      ? 'Belum ada pemasukan atau pengeluaran yang tercatat bulan ini.'
      : remaining > 0
        ? `Keuangan bulan ini masih tersisa Rp ${remaining.toLocaleString('id-ID')}, sisihkan sebagian ke tabungan.`
        : remaining === 0
          ? 'Pemasukan dan pengeluaran bulan ini seimbang, tetap jaga batas belanja.'
          : `Pengeluaran bulan ini lebih besar Rp ${Math.abs(remaining).toLocaleString('id-ID')} dari pemasukan, coba kurangi belanja yang tidak mendesak.`;

  return {
    type: 'SUMMARY_CARD',
    title: 'Ringkasan Bulan Ini',
    metrics: [
      {
        label: 'Pemasukan',
        value: `Rp ${Math.round(params.income).toLocaleString('id-ID')}`,
        tone: 'green',
      },
      {
        label: 'Pengeluaran',
        value: `Rp ${Math.round(params.expense).toLocaleString('id-ID')}`,
        tone: 'red',
      },
      {
        label: 'Sisa Bulan Ini',
        value: `Rp ${Math.round(remaining).toLocaleString('id-ID')}`,
        tone: remaining >= 0 ? 'blue' : 'red',
      },
      {
        label: 'Saldo Siap Pakai',
        value: `Rp ${Math.round(params.totalBalance).toLocaleString('id-ID')}`,
        tone: 'blue',
      },
    ],
    items:
      params.totalSavingsBalance > 0
        ? [
            {
              label: 'Total Tabungan',
              value: `Rp ${Math.round(params.totalSavingsBalance).toLocaleString('id-ID')}`,
            },
          ]
        : [],
    tip,
  };
}

function buildMonthlySpendingCard(params: {
  label?: string;
  dayCount?: number;
  transactionCount?: number;
  categoryName?: string | null;
  totalExpense: number;
  dailyAverage: number;
  items: Array<{
    category: string;
    subtitle?: string;
    total: number;
    percentage: number;
    count?: number;
  }>;
}): ChatSummaryCard {
  const periodLabel = params.label ?? 'Bulan Ini';
  const dayCount = params.dayCount ?? 2;
  const top = params.items[0];
  const title = params.categoryName
    ? `Pengeluaran ${params.categoryName} ${periodLabel}`
    : `Pengeluaran ${periodLabel}`;

  const tip = params.categoryName
    ? `Total pengeluaran ${params.categoryName} untuk ${periodLabel.toLowerCase()} sebesar Rp ${Math.round(params.totalExpense).toLocaleString('id-ID')}.`
    : top
      ? `Pengeluaran terbesarmu untuk ${periodLabel.toLowerCase()} ada di ${top.category} (${Math.round(top.percentage)}%). Coba pantau batas kategori ini supaya lebih terkendali.`
      : 'Catat pengeluaranmu agar pola belanja terlihat jelas.';

  return {
    type: 'SUMMARY_CARD',
    title,
    metrics: [
      {
        label: 'Total Pengeluaran',
        value: `Rp ${Math.round(params.totalExpense).toLocaleString('id-ID')}`,
        tone: 'red',
      },
      dayCount === 1
        ? {
            label: 'Jumlah Transaksi',
            value: `${params.transactionCount ?? params.items.length} transaksi`,
            tone: 'default',
          }
        : {
            label: 'Rata-rata per Hari',
            value: `Rp ${Math.round(params.dailyAverage).toLocaleString('id-ID')}`,
            tone: 'default',
          },
    ],
    items: params.items.slice(0, 5).map((it) => ({
      label: it.category,
      subtitle:
        it.subtitle ??
        `${Math.round(it.percentage)}% dari total, ${it.count ?? 1} transaksi`,
      value: `Rp ${Math.round(it.total).toLocaleString('id-ID')}`,
    })),
    tip,
  };
}

function buildBudgetCheckResponse(list: BudgetSummaryRow[]): ChatResponsePayload {
  if (list.length === 0) {
    return {
      reply: 'Kamu belum punya anggaran aktif. Mau buat sekarang?',
      intent: 'FINANCIAL_ADVICE',
      actionExecuted: false,
      pendingConfirmation: false,
      cardType: null,
      cardData: null,
      card: {
        type: 'CHOICE_CARD',
        title: 'Pilih anggaran cepat',
        options: [
          {
            label: 'Makan 50rb per hari',
            messageToSend: 'Buat anggaran makan 50rb per hari',
          },
          {
            label: 'Transport 200rb per minggu',
            messageToSend: 'Buat anggaran transport 200rb per minggu',
          },
          {
            label: 'Belanja 1jt per bulan',
            messageToSend: 'Buat anggaran belanja 1jt per bulan',
          },
        ],
      },
    };
  }

  return {
    reply: 'Ini sisa anggaran yang masih bisa kamu pakai:',
    intent: 'FINANCIAL_ADVICE',
    actionExecuted: false,
    pendingConfirmation: false,
    cardType: 'BUDGET',
    cardData: { budgets: list },
    card: buildBudgetSummaryCard(list),
  };
}

function buildStructuredCard(res: ChatResponsePayload): ChatStructuredCard | null {
  if (res.card) return res.card;
  const data = (res.cardData ?? {}) as Record<string, unknown>;

  if (res.cardType === 'WALLET_PICKER' && Array.isArray(data.wallets)) {
    const options = (
      data.wallets as Array<{ name?: string; currentBalance?: number; color?: string }>
    )
      .filter((w) => typeof w.name === 'string' && w.name.length > 0)
      .slice(0, 6)
      .map((w) => ({
        label: w.name!,
        sublabel:
          typeof w.currentBalance === 'number'
            ? `Rp ${w.currentBalance.toLocaleString('id-ID')}`
            : undefined,
        messageToSend: w.name!,
        color: w.color || '#2563EB',
        kind: 'wallet' as const,
      }));
    if (options.length > 0) {
      return {
        type: 'CHOICE_CARD',
        title: 'Pilih dompet yang mau dipakai',
        options,
      };
    }
  }

  if (res.cardType === 'BUDGET_SET' || res.cardType === 'BUDGET_UPDATED') {
    const amount = Number(data.limitAmount ?? data.amount ?? 0);
    const catName = String(data.categoryName ?? 'Anggaran');
    const periodLabel = String(data.periodLabel ?? 'Bulan ini');
    const budgetId = typeof data.budgetId === 'string' ? data.budgetId : undefined;
    return {
      type: 'ACTION_CARD',
      badge:
        res.cardType === 'BUDGET_UPDATED'
          ? 'Anggaran Diperbarui'
          : 'Anggaran Disimpan',
      accent: 'blue',
      title: catName,
      amount,
      rows: [
        { label: 'Kategori', value: catName },
        { label: 'Periode', value: periodLabel },
      ],
      detailRoute: budgetId ? { type: 'budget', id: budgetId } : undefined,
    };
  }

  if (res.cardType === 'BUDGET_DELETED') {
    const amount = Number(data.limitAmount ?? data.amount ?? 0);
    const catName = String(data.categoryName ?? 'Anggaran');
    return {
      type: 'ACTION_CARD',
      badge: 'Anggaran Dihapus',
      accent: 'red',
      title: catName,
      amount,
      rows: [{ label: 'Kategori', value: catName }],
    };
  }

  if (res.cardType === 'TRANSACTION_CREATED') {
    const amount = Number(data.amount ?? 0);
    const txType = String(data.type ?? 'EXPENSE');
    const note = String(data.note ?? '');
    const catName = String(data.categoryName ?? 'Lainnya');
    const walletName = String(data.walletName ?? '');
    const destName = data.destinationWalletName
      ? String(data.destinationWalletName)
      : '';
    const txId =
      typeof data.transactionId === 'string' ? data.transactionId : undefined;
    const goalId = typeof data.goalId === 'string' ? data.goalId : undefined;

    if (res.intent === 'GOAL_CONTRIBUTE') {
      return {
        type: 'ACTION_CARD',
        badge: 'Setoran Tabungan',
        accent: 'green',
        title: note || 'Setoran Target',
        amount,
        rows: [
          ...(walletName ? [{ label: 'Dompet', value: walletName }] : []),
          ...(destName ? [{ label: 'Tujuan', value: destName }] : []),
        ].slice(0, 3),
        detailRoute: goalId ? { type: 'goal', id: goalId } : undefined,
      };
    }

    if (txType === 'TRANSFER') {
      return {
        type: 'ACTION_CARD',
        badge: 'Transfer Berhasil',
        accent: 'blue',
        title: note || 'Transfer Antar Dompet',
        amount,
        rows: [
          ...(walletName ? [{ label: 'Dari', value: walletName }] : []),
          ...(destName ? [{ label: 'Ke', value: destName }] : []),
        ].slice(0, 3),
        detailRoute: txId ? { type: 'transaction', id: txId } : undefined,
      };
    }

    const isIncome = txType === 'INCOME';
    return {
      type: 'ACTION_CARD',
      badge: isIncome ? 'Pemasukan Tercatat' : 'Pengeluaran Tercatat',
      accent: isIncome ? 'green' : 'red',
      title: note || catName,
      amount,
      rows: [
        { label: 'Kategori', value: catName },
        ...(walletName ? [{ label: 'Dompet', value: walletName }] : []),
      ].slice(0, 3),
      detailRoute: txId ? { type: 'transaction', id: txId } : undefined,
    };
  }

  if (res.cardType === 'SUMMARY' && data.summary && typeof data.summary === 'object') {
    const s = data.summary as {
      income?: number;
      expense?: number;
      totalBalance?: number;
      totalSavingsBalance?: number;
    };
    return buildMonthlySummaryCard({
      income: Number(s.income ?? 0),
      expense: Number(s.expense ?? 0),
      totalBalance: Number(s.totalBalance ?? 0),
      totalSavingsBalance: Number(s.totalSavingsBalance ?? 0),
    });
  }

  if (res.cardType === 'BUDGET' && Array.isArray(data.budgets)) {
    return buildBudgetSummaryCard(data.budgets as BudgetSummaryRow[]);
  }

  if (
    res.cardType === 'SPENDING_BREAKDOWN' &&
    data.spendingBreakdown &&
    typeof data.spendingBreakdown === 'object'
  ) {
    const sb = data.spendingBreakdown as {
      totalExpense?: number;
      dailyAverage?: number;
      items?: Array<{ category: string; total: number; percentage: number; count?: number }>;
    };
    return buildMonthlySpendingCard({
      totalExpense: Number(sb.totalExpense ?? 0),
      dailyAverage: Number(sb.dailyAverage ?? 0),
      items: sb.items ?? [],
    });
  }

  if (res.cardType === 'GOAL' && Array.isArray(data.goals)) {
    const list = data.goals as Array<{
      name?: string;
      currentAmount?: number;
      targetAmount?: number;
      percentage?: number;
    }>;
    return {
      type: 'SUMMARY_CARD',
      title: 'Target Tabungan Aktif',
      metrics: [
        {
          label: 'Jumlah Target',
          value: `${list.length} target`,
          tone: 'blue',
        },
        {
          label: 'Total Terkumpul',
          value: `Rp ${list.reduce((s, g) => s + Number(g.currentAmount ?? 0), 0).toLocaleString('id-ID')}`,
          tone: 'green',
        },
      ],
      items: list.slice(0, 4).map((g) => ({
        label: g.name ?? 'Target',
        value: `Rp ${Number(g.currentAmount ?? 0).toLocaleString('id-ID')}`,
        status: `${Math.round(Number(g.percentage ?? 0))}%`,
      })),
    };
  }

  if (res.cardType === 'WALLET' && Array.isArray(data.wallets)) {
    const list = data.wallets as Array<{ name?: string; currentBalance?: number }>;
    return {
      type: 'SUMMARY_CARD',
      title: 'Daftar Dompet Aktif',
      metrics: [
        {
          label: 'Total Saldo',
          value: `Rp ${Number(data.totalBalance ?? 0).toLocaleString('id-ID')}`,
          tone: 'blue',
        },
        {
          label: 'Jumlah Dompet',
          value: `${list.length} dompet`,
          tone: 'default',
        },
      ],
      items: list.slice(0, 4).map((w) => ({
        label: w.name ?? 'Dompet',
        value: `Rp ${Number(w.currentBalance ?? 0).toLocaleString('id-ID')}`,
      })),
    };
  }

  if (res.cardType === 'FORECAST' && data.forecast && typeof data.forecast === 'object') {
    const f = data.forecast as { projectedExpense?: number; projectedBalance?: number };
    return {
      type: 'SUMMARY_CARD',
      title: 'Perkiraan Akhir Bulan',
      metrics: [
        {
          label: 'Perkiraan Pengeluaran',
          value: `Rp ${Number(f.projectedExpense ?? 0).toLocaleString('id-ID')}`,
          tone: 'red',
        },
        {
          label: 'Perkiraan Sisa Uang',
          value: `Rp ${Number(f.projectedBalance ?? 0).toLocaleString('id-ID')}`,
          tone: (f.projectedBalance ?? 0) >= 0 ? 'green' : 'red',
        },
      ],
    };
  }

  return null;
}

export async function chatWithFinAi(params: {
  userId: string;
  message: string;
  month: number;
  year: number;
  executeImmediately?: boolean;
  history?: ChatHistoryTurn[];
  ipAddress?: string | null;
}): Promise<ChatResponsePayload> {
  const res = await chatWithFinAiInner(params);
  return {
    ...res,
    reply: sanitizeReplyText(res.reply),
    card: buildStructuredCard(res),
  };
}

async function chatWithFinAiInner(params: {
  userId: string;
  message: string;
  month: number;
  year: number;
  executeImmediately?: boolean;
  history?: ChatHistoryTurn[];
  ipAddress?: string | null;
}): Promise<ChatResponsePayload> {
  const {
    userId,
    message,
    month,
    year,
    executeImmediately = false,
    history = [],
    ipAddress = null,
  } = params;

  const [walletsRaw, categories, goals, forecastData, budgets, sawHealth, spendingBreakdown, userProfile, recentCategoryExamples] =
    await Promise.all([
      prisma.wallet.findMany({
        where: { userId, isArchived: false },
        select: { id: true, name: true, type: true, color: true, currentBalance: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.category.findMany({
        where: { userId },
        select: { id: true, name: true, type: true },
      }),
      prisma.financialGoal.findMany({
        where: { userId, status: GoalStatus.ACTIVE },
        select: { id: true, name: true, targetAmount: true, currentAmount: true, deadline: true },
      }),
      computeAndSaveForecast(userId, month, year),
      listBudgets(userId, month, year),
      computeSawHealth(userId, month, year),
      buildSpendingBreakdown(userId, month, year),
      prisma.user.findUnique({
        where: { id: userId },
        select: { monthlyIncomeTarget: true },
      }),
      getRecentCategoryExamples(userId, 10),
    ]);

  const wallets = walletsRaw.map((w) => ({
    id: w.id,
    name: w.name,
    type: w.type,
    color: w.color || '#2563EB',
    currentBalance: Number(w.currentBalance),
  }));

  const totalBalance = wallets.reduce((s, w) => s + w.currentBalance, 0);
  const totalSavingsBalance = goals.reduce(
    (s, g) => s + Number(g.currentAmount),
    0
  );

  if (isCancelDraftCommand(message)) {
    clearPendingDraft(userId);
    return {
      reply: 'Oke, draf dibatalkan.',
      intent: 'FINANCIAL_ADVICE',
      actionExecuted: false,
      pendingConfirmation: false,
      cardType: null,
      cardData: null,
      card: null,
    };
  }

  if (isFreshCheckQuery(message)) {
    clearPendingDraft(userId);
  }

  const trimmedLower = message.trim().toLowerCase();
  if (/^(cek|cek\s+keuangan)$/i.test(trimmedLower)) {
    return {
      reply: 'Mau cek bagian keuangan yang mana?',
      intent: 'FINANCIAL_ADVICE',
      actionExecuted: false,
      pendingConfirmation: false,
      cardType: null,
      cardData: null,
      card: {
        type: 'CHOICE_CARD',
        title: 'Pilih jenis pengecekan',
        options: [
          { label: 'Ringkasan bulan ini', messageToSend: 'Ringkasan bulan ini' },
          { label: 'Pengeluaran hari ini', messageToSend: 'Pengeluaran hari ini' },
          { label: 'Cek anggaran', messageToSend: 'Cek anggaran' },
          { label: 'Cek tabungan', messageToSend: 'Cek tabungan' },
        ],
      },
    };
  }

  if (/\b(cek\s+tabungan|cek\s+target|progress\s+target|status\s+target|cek\s+goal|tabungan\s+saya)\b/i.test(trimmedLower)) {
    return {
      reply: goals.length > 0 ? 'Ini daftar tabungan dan targetmu:' : 'Kamu belum punya target tabungan aktif.',
      intent: 'FINANCIAL_ADVICE',
      actionExecuted: false,
      pendingConfirmation: false,
      cardType: 'GOAL',
      cardData: { goals },
      card: {
        type: 'SUMMARY_CARD',
        title: 'Tabungan & Target Aktif',
        metrics: [
          {
            label: 'Total Terkumpul',
            value: `Rp ${Math.round(totalSavingsBalance).toLocaleString('id-ID')}`,
            tone: 'green',
          },
          {
            label: 'Target Aktif',
            value: `${goals.length} target`,
            tone: 'blue',
          },
        ],
        items: goals.map((g) => {
          const target = Number(g.targetAmount);
          const current = Number(g.currentAmount);
          const remaining = Math.max(0, target - current);
          return {
            id: g.id,
            label: g.name,
            subtitle:
              remaining > 0
                ? `Kurang Rp ${Math.round(remaining).toLocaleString('id-ID')}`
                : 'Target tercapai',
            value: `Rp ${Math.round(current).toLocaleString('id-ID')} / Rp ${Math.round(target).toLocaleString('id-ID')}`,
          };
        }),
        tip:
          goals.length > 0
            ? 'Ketuk salah satu target untuk melihat rincian atau menambah setoran.'
            : 'Buat target pertamamu dengan mengetik nama target dan nominalnya.',
      },
    };
  }

  if (/\b(cek\s+dompet|cek\s+saldo|daftar\s+dompet|saldo\s+saya|sisa\s+uang\s+saya)\b/i.test(trimmedLower)) {
    return {
      reply: 'Ini saldo dompet aktifmu saat ini:',
      intent: 'FINANCIAL_ADVICE',
      actionExecuted: false,
      pendingConfirmation: false,
      cardType: 'WALLET',
      cardData: { wallets },
      card: {
        type: 'SUMMARY_CARD',
        title: 'Saldo Dompet Aktif',
        metrics: [
          {
            label: 'Saldo Siap Pakai',
            value: `Rp ${Math.round(totalBalance).toLocaleString('id-ID')}`,
            tone: 'blue',
          },
          {
            label: 'Total Tabungan',
            value: `Rp ${Math.round(totalSavingsBalance).toLocaleString('id-ID')}`,
            tone: 'green',
          },
        ],
        items: wallets.map((w) => ({
          label: w.name,
          value: `Rp ${Math.round(w.currentBalance).toLocaleString('id-ID')}`,
        })),
      },
    };
  }

  if (/^hapus\s+anggaran$/i.test(trimmedLower)) {
    if (budgets.length === 0) {
      return {
        reply: 'Kamu belum punya anggaran aktif untuk dihapus.',
        intent: 'DELETE_BUDGET',
        actionExecuted: false,
        pendingConfirmation: false,
        cardType: null,
        cardData: null,
        card: null,
      };
    }
    return {
      reply: 'Anggaran mana yang mau kamu hapus?',
      intent: 'DELETE_BUDGET',
      actionExecuted: false,
      pendingConfirmation: false,
      cardType: null,
      cardData: null,
      card: {
        type: 'CHOICE_CARD',
        title: 'Pilih anggaran yang mau dihapus',
        options: budgets.map((b) => ({
          label: b.name || b.category.name,
          sublabel: `Rp ${Math.round(b.limitAmount).toLocaleString('id-ID')}`,
          messageToSend: `Hapus anggaran ${b.name || b.category.name}`,
        })),
      },
    };
  }

  // Deteksi permintaan hapus target tabungan (HITL)
  const lowerForDelete = message.toLowerCase();
  const wantsDeleteGoal =
    /\b(hapus|habus|delete|buang|hilangkan)\b.*\b(tabungan|target|goal)\b|\b(tabungan|target|goal)\b.*\b(hapus|habus|delete|buang|hilangkan)\b/i.test(
      lowerForDelete
    ) ||
    (/\b(hapus|habus|delete)\b/i.test(lowerForDelete) &&
      goals.some((g) => lowerForDelete.includes(g.name.toLowerCase())));

  if (wantsDeleteGoal) {
    if (goals.length === 0) {
      return {
        reply: 'Kamu belum punya target tabungan aktif untuk dihapus.',
        intent: 'DELETE_GOAL',
        actionExecuted: false,
        pendingConfirmation: false,
        cardType: null,
        cardData: null,
      };
    }

    const recentText = history
      .slice(-4)
      .map((h) => (h.content ?? h.text ?? '').toLowerCase())
      .join(' ');
    const matchedGoal =
      goals.find((g) => lowerForDelete.includes(g.name.toLowerCase())) ??
      goals.find((g) => recentText.includes(g.name.toLowerCase())) ??
      (goals.length === 1 ? goals[0] : undefined);

    if (!matchedGoal) {
      return {
        reply: `Target tabungan mana yang mau kamu hapus? Target aktif saat ini: ${goals.map((g) => g.name).join(', ')}.`,
        intent: 'DELETE_GOAL',
        actionExecuted: false,
        pendingConfirmation: false,
        cardType: null,
        cardData: null,
      };
    }

    const currentSaved = Number(matchedGoal.currentAmount);
    return {
      reply: `Saya siapkan penghapusan target tabungan "${matchedGoal.name}" (terkumpul Rp ${currentSaved.toLocaleString('id-ID')}). Tekan Konfirmasi untuk menghapus.`,
      intent: 'DELETE_GOAL',
      actionExecuted: false,
      pendingConfirmation: true,
      cardType: 'TRANSACTION_PREVIEW',
      cardData: {
        intent: 'DELETE_GOAL',
        goalId: matchedGoal.id,
        type: 'EXPENSE',
        amount: currentSaved,
        note: `Hapus target ${matchedGoal.name}`,
        categoryName: 'Hapus Target',
        walletName: matchedGoal.name,
        currentWalletBalance: currentSaved,
        projectedWalletBalance: 0,
      },
    };
  }

  const draftCtx: DraftContextData = {
    wallets,
    categories,
    goals: goals.map((g) => ({
      id: g.id,
      name: g.name,
      targetAmount: Number(g.targetAmount),
      currentAmount: Number(g.currentAmount),
    })),
    budgets,
  };

  function buildSingleMissingSlotResponse(
    draft: PendingDraft,
    missingKey: string
  ): ChatResponsePayload {
    if (draft.intent === 'CREATE_TRANSACTION' && missingKey === 'description') {
      const { question, label } = getGenericItemPrompt(draft.data.description);
      const walletObj = wallets.find((w) => w.id === draft.data.walletId);
      const txWord = draft.data.type === 'INCOME' ? 'pemasukan' : 'pengeluaran';
      return {
        reply: question,
        intent: 'CREATE_TRANSACTION',
        actionExecuted: false,
        pendingConfirmation: false,
        cardType: null,
        cardData: null,
        card: {
          type: 'CHOICE_CARD',
          title: 'Pilih atau tulis nama item',
          options: [
            {
              label: `Catat sebagai ${label} saja`,
              messageToSend: `Konfirmasi catat ${txWord} ${draft.data.amount} deskripsi persis ${label} pakai ${walletObj?.name ?? 'Dompet'}`,
            },
          ],
        },
      };
    }

    if (
      (draft.intent === 'CREATE_TRANSACTION' || draft.intent === 'GOAL_CONTRIBUTE') &&
      missingKey === 'walletId'
    ) {
      const options: ChatChoiceCard['options'] = wallets.map((w) => ({
        label: w.name,
        sublabel: `Rp ${w.currentBalance.toLocaleString('id-ID')}`,
        messageToSend: w.name,
        color: w.color,
        kind: 'wallet',
      }));
      if (draft.intent === 'GOAL_CONTRIBUTE') {
        options.push({
          label: 'Dana Luar',
          sublabel: 'Tidak potong dompet',
          messageToSend: 'Dana Luar',
          color: '#059669',
          kind: 'wallet',
        });
      }
      return {
        reply: 'Mau pakai dompet yang mana?',
        intent: draft.intent,
        actionExecuted: false,
        pendingConfirmation: false,
        cardType: null,
        cardData: null,
        card: {
          type: 'CHOICE_CARD',
          title: 'Pilih dompet yang mau dipakai',
          options,
        },
      };
    }

    if (
      draft.intent === 'TRANSFER' &&
      (missingKey === 'fromWalletId' || missingKey === 'toWalletId')
    ) {
      const excludeId =
        missingKey === 'toWalletId' ? draft.data.fromWalletId : undefined;
      const options: ChatChoiceCard['options'] = wallets
        .filter((w) => w.id !== excludeId)
        .map((w) => ({
          label: w.name,
          sublabel: `Rp ${w.currentBalance.toLocaleString('id-ID')}`,
          messageToSend: w.name,
          color: w.color,
          kind: 'wallet',
        }));
      return {
        reply:
          missingKey === 'fromWalletId'
            ? 'Mau transfer dari dompet mana?'
            : 'Mau transfer ke dompet mana?',
        intent: 'TRANSFER',
        actionExecuted: false,
        pendingConfirmation: false,
        cardType: null,
        cardData: null,
        card: {
          type: 'CHOICE_CARD',
          title:
            missingKey === 'fromWalletId'
              ? 'Pilih dompet asal'
              : 'Pilih dompet tujuan',
          options,
        },
      };
    }

    if (draft.intent === 'SET_BUDGET' && missingKey === 'period') {
      return {
        reply: 'Mau atur anggaran ini untuk periode apa?',
        intent: 'SET_BUDGET',
        actionExecuted: false,
        pendingConfirmation: false,
        cardType: null,
        cardData: null,
        card: {
          type: 'CHOICE_CARD',
          title: 'Pilih periode anggaran',
          options: [
            { label: 'Harian', messageToSend: 'harian' },
            { label: 'Mingguan', messageToSend: 'mingguan' },
            { label: 'Bulanan', messageToSend: 'bulanan' },
          ],
        },
      };
    }

    if (draft.intent === 'GOAL_CONTRIBUTE' && missingKey === 'goalId') {
      return {
        reply: 'Mau setor ke target tabungan yang mana?',
        intent: 'GOAL_CONTRIBUTE',
        actionExecuted: false,
        pendingConfirmation: false,
        cardType: null,
        cardData: null,
        card: {
          type: 'CHOICE_CARD',
          title: 'Pilih target tabungan',
          options: goals.map((g) => ({
            label: g.name,
            sublabel: `Rp ${Number(g.currentAmount).toLocaleString('id-ID')} / Rp ${Number(g.targetAmount).toLocaleString('id-ID')}`,
            messageToSend: g.name,
          })),
        },
      };
    }

    return {
      reply: 'Datanya belum lengkap. Balas langsung di chat atau lengkapi di form:',
      intent: draft.intent,
      actionExecuted: false,
      pendingConfirmation: false,
      cardType: null,
      cardData: null,
      card: buildDraftCard(draft, draftCtx),
    };
  }

  async function executeCompletedDraft(draft: PendingDraft): Promise<ChatResponsePayload> {
    if (draft.intent === 'CREATE_TRANSACTION') {
      const d = draft.data;
      const wallet = wallets.find((w) => w.id === d.walletId)!;
      const txType = d.type === 'INCOME' ? TransactionType.INCOME : TransactionType.EXPENSE;
      const catType = d.type === 'INCOME' ? CategoryType.INCOME : CategoryType.EXPENSE;
      const amt = d.amount!;
      const note = d.description || 'Transaksi';
      const cat =
        categories.find((c) => c.id === d.categoryId && c.type === catType) ??
        resolveCategoryFallback(categories, note, catType) ??
        null;

      if (txType === TransactionType.EXPENSE && wallet.currentBalance < amt) {
        const alternatives = wallets.filter(
          (w) => w.id !== wallet.id && w.currentBalance >= amt
        );
        return {
          reply: `Saldo ${wallet.name} kamu tidak cukup untuk transaksi ini, sisa saat ini Rp ${wallet.currentBalance.toLocaleString('id-ID')}.`,
          intent: 'CREATE_TRANSACTION',
          actionExecuted: false,
          pendingConfirmation: false,
          cardType: alternatives.length > 0 ? 'WALLET_PICKER' : null,
          cardData: alternatives.length > 0 ? { wallets: alternatives } : null,
        };
      }

      const created = await createTransaction(
        userId,
        {
          walletId: wallet.id,
          categoryId: cat?.id ?? null,
          type: txType,
          amount: amt,
          note,
        },
        ipAddress
      );
      const updatedWallet = await prisma.wallet.findUnique({
        where: { id: wallet.id },
        select: { currentBalance: true },
      });
      const newBal = Number(updatedWallet?.currentBalance ?? wallet.currentBalance);
      return {
        reply: `Beres! ${note} Rp ${amt.toLocaleString('id-ID')} sudah dicatat ke ${wallet.name} (${cat?.name ?? 'Lainnya'}).`,
        intent: 'CREATE_TRANSACTION',
        actionExecuted: true,
        pendingConfirmation: false,
        cardType: 'TRANSACTION_CREATED',
        cardData: {
          transactionId: created.id,
          type: d.type,
          amount: amt,
          note,
          categoryId: cat?.id ?? null,
          categoryName: cat?.name ?? 'Lainnya',
          walletId: wallet.id,
          walletName: wallet.name,
          newWalletBalance: newBal,
        },
      };
    }

    if (draft.intent === 'TRANSFER') {
      const fromW = wallets.find((w) => w.id === draft.data.fromWalletId)!;
      const toW = wallets.find((w) => w.id === draft.data.toWalletId)!;
      const amt = draft.data.amount!;
      if (fromW.currentBalance < amt) {
        return {
          reply: `Saldo ${fromW.name} kamu tidak cukup untuk transfer Rp ${amt.toLocaleString('id-ID')}.`,
          intent: 'TRANSFER',
          actionExecuted: false,
          pendingConfirmation: false,
          cardType: null,
          cardData: null,
        };
      }
      const created = await createTransaction(
        userId,
        {
          walletId: fromW.id,
          destinationWalletId: toW.id,
          categoryId: null,
          type: TransactionType.TRANSFER,
          amount: amt,
          note: `Transfer ke ${toW.name}`,
        },
        ipAddress
      );
      return {
        reply: `Beres! Transfer Rp ${amt.toLocaleString('id-ID')} dari ${fromW.name} ke ${toW.name} sudah dicatat.`,
        intent: 'TRANSFER',
        actionExecuted: true,
        pendingConfirmation: false,
        cardType: 'TRANSACTION_CREATED',
        cardData: {
          transactionId: created.id,
          type: 'TRANSFER',
          amount: amt,
          note: `Transfer ke ${toW.name}`,
          walletId: fromW.id,
          walletName: fromW.name,
          destinationWalletId: toW.id,
          destinationWalletName: toW.name,
          newWalletBalance: fromW.currentBalance - amt,
        },
      };
    }

    if (draft.intent === 'SET_BUDGET') {
      const d = draft.data;
      const periodVal = d.period ?? 'MONTHLY';
      const periodLabel =
        periodVal === 'DAILY'
          ? 'Harian'
          : periodVal === 'WEEKLY'
            ? 'Mingguan'
            : 'Bulanan';
      const saved = await upsertBudget(
        userId,
        {
          name: d.name,
          categoryId: d.categoryId,
          categoryName: !d.categoryId ? d.name : undefined,
          month,
          year,
          period: periodVal,
          limitAmount: d.amount!,
        },
        ipAddress
      );
      return {
        reply: `Beres! Anggaran ${saved.name || saved.category.name} Rp ${d.amount!.toLocaleString('id-ID')} (${periodLabel}) sudah disimpan.`,
        intent: 'SET_BUDGET',
        actionExecuted: true,
        pendingConfirmation: false,
        cardType: 'BUDGET_SET',
        cardData: {
          budgetId: saved.id,
          categoryId: saved.categoryId,
          categoryName: saved.name || saved.category.name,
          limitAmount: d.amount!,
          period: periodVal,
          periodLabel,
        },
      };
    }

    if (draft.intent === 'CREATE_GOAL') {
      const d = draft.data;
      const deadlineDate = new Date();
      if (d.durationDays && d.durationDays > 0) {
        deadlineDate.setDate(deadlineDate.getDate() + d.durationDays);
      } else {
        deadlineDate.setMonth(deadlineDate.getMonth() + Math.max(1, d.durationMonths ?? 3));
      }
      const createdGoal = await createGoal(
        userId,
        {
          name: d.name!,
          targetAmount: d.targetAmount!,
          currentAmount: 0,
          deadline: deadlineDate,
        },
        ipAddress
      );
      return {
        reply: `Beres! Target tabungan ${createdGoal.name} sebesar Rp ${d.targetAmount!.toLocaleString('id-ID')} sudah dibuat.`,
        intent: 'CREATE_GOAL',
        actionExecuted: true,
        pendingConfirmation: false,
        cardType: 'GOAL',
        cardData: {
          goalId: createdGoal.id,
          goalName: createdGoal.name,
          targetAmount: d.targetAmount!,
        },
        card: {
          type: 'ACTION_CARD',
          badge: 'Target Dibuat',
          accent: 'blue',
          title: createdGoal.name,
          amount: d.targetAmount!,
          rows: [
            {
              label: 'Target Dana',
              value: `Rp ${d.targetAmount!.toLocaleString('id-ID')}`,
            },
          ],
          detailRoute: { type: 'goal', id: createdGoal.id },
        },
      };
    }

    if (draft.intent === 'GOAL_CONTRIBUTE') {
      const d = draft.data;
      const isExternal = d.sourceType === 'EXTERNAL';
      const contrib = await contributeGoal(
        userId,
        d.goalId!,
        {
          amount: d.amount!,
          sourceType: isExternal ? 'EXTERNAL' : 'WALLET',
          walletId: isExternal ? undefined : d.walletId,
        },
        ipAddress
      );
      const goalObj = goals.find((g) => g.id === d.goalId);
      const srcWallet = wallets.find((w) => w.id === d.walletId);
      const sourceLabel = isExternal ? 'Dana Luar' : srcWallet?.name ?? 'Dompet';
      return {
        reply: `Beres! Setoran Rp ${d.amount!.toLocaleString('id-ID')} ke ${goalObj?.name ?? 'Tabungan'} sudah dicatat.`,
        intent: 'GOAL_CONTRIBUTE',
        actionExecuted: true,
        pendingConfirmation: false,
        cardType: 'GOAL',
        cardData: {
          goalId: d.goalId!,
          goalName: goalObj?.name ?? 'Tabungan',
          amount: d.amount!,
          walletName: sourceLabel,
          newGoalBalance: Number(contrib.currentAmount),
          targetAmount: Number(contrib.targetAmount),
        },
        card: {
          type: 'ACTION_CARD',
          badge: 'Setoran Tabungan',
          accent: 'green',
          title: goalObj?.name ?? 'Tabungan',
          amount: d.amount!,
          rows: [
            { label: 'Sumber Dana', value: sourceLabel },
            {
              label: 'Terkumpul',
              value: `Rp ${Number(contrib.currentAmount).toLocaleString('id-ID')} / Rp ${Number(contrib.targetAmount).toLocaleString('id-ID')}`,
            },
          ],
          detailRoute: { type: 'goal', id: d.goalId! },
        },
      };
    }

    return {
      reply: 'Draf belum dapat diproses.',
      intent: 'FINANCIAL_ADVICE',
      actionExecuted: false,
      pendingConfirmation: false,
      cardType: null,
      cardData: null,
    };
  }

  const activeDraft = getPendingDraft(userId);
  if (
    activeDraft &&
    !/^buat\s+kategori\s+/i.test(message.trim()) &&
    !isFreshCheckQuery(message)
  ) {
    const merged = mergePendingDraft(activeDraft, message, draftCtx);
    const missing = evaluateDraftMissingSlots(merged);
    if (missing.length === 0) {
      clearPendingDraft(userId);
      return executeCompletedDraft(merged);
    }
    setPendingDraft(userId, merged);
    if (missing.length === 1) {
      return buildSingleMissingSlotResponse(merged, missing[0]);
    }
    return {
      reply: 'Datanya belum lengkap. Balas langsung di chat atau lengkapi di form:',
      intent: merged.intent,
      actionExecuted: false,
      pendingConfirmation: false,
      cardType: null,
      cardData: null,
      card: buildDraftCard(merged, draftCtx),
    };
  }

  const incompleteDraft =
    !/^buat\s+kategori\s+/i.test(message.trim()) &&
    !isFreshCheckQuery(message)
      ? detectIncompleteDraftIntent(message, draftCtx)
      : null;
  if (incompleteDraft) {
    const missing = evaluateDraftMissingSlots(incompleteDraft);
    if (missing.length >= 1) {
      setPendingDraft(userId, incompleteDraft);
      if (missing.length === 1) {
        return buildSingleMissingSlotResponse(incompleteDraft, missing[0]);
      }
      return {
        reply: 'Datanya belum lengkap. Balas langsung di chat atau lengkapi di form:',
        intent: incompleteDraft.intent,
        actionExecuted: false,
        pendingConfirmation: false,
        cardType: null,
        cardData: null,
        card: buildDraftCard(incompleteDraft, draftCtx),
      };
    }
  }

  const atomicTxMatch = message
    .trim()
    .match(
      /^buat\s+kategori\s+([a-z0-9\s&._-]{2,35}?)\s+catat\s+(pengeluaran|pemasukan)\s+(\d+)\s+"([^"]+)"\s+dari\s+(.+)$/i
    );
  if (atomicTxMatch) {
    const rawCatName = atomicTxMatch[1].trim();
    const catType =
      atomicTxMatch[2].toLowerCase() === 'pemasukan'
        ? CategoryType.INCOME
        : CategoryType.EXPENSE;
    const txAmt = Number(atomicTxMatch[3]);
    const txNote = atomicTxMatch[4].trim();
    const walletNameRaw = atomicTxMatch[5].trim();
    const targetWallet =
      wallets.find((w) => w.name.toLowerCase() === walletNameRaw.toLowerCase()) ??
      findMentionedWallets(walletNameRaw, wallets)[0];

    if (!targetWallet) {
      return {
        reply: `Dompet "${walletNameRaw}" tidak ditemukan.`,
        intent: 'CREATE_TRANSACTION',
        actionExecuted: false,
        pendingConfirmation: false,
        cardType: 'WALLET_PICKER',
        cardData: { wallets },
      };
    }

    if (catType === CategoryType.EXPENSE && targetWallet.currentBalance < txAmt) {
      const alternatives = wallets.filter(
        (w) => w.id !== targetWallet.id && w.currentBalance >= txAmt
      );
      return {
        reply: `Saldo ${targetWallet.name} tidak mencukupi (tersedia Rp ${targetWallet.currentBalance.toLocaleString('id-ID')}).`,
        intent: 'CREATE_TRANSACTION',
        actionExecuted: false,
        pendingConfirmation: false,
        cardType: alternatives.length > 0 ? 'WALLET_PICKER' : null,
        cardData: alternatives.length > 0 ? { wallets: alternatives } : null,
      };
    }

    const atomicRes = await createCategoryAndTransactionAtomic({
      userId,
      categoryName: rawCatName,
      type: catType,
      walletId: targetWallet.id,
      amount: txAmt,
      note: txNote,
    });

    await logAudit({
      userId,
      action: 'AI_CREATE_CATEGORY_AND_TX',
      entityType: 'TRANSACTION',
      entityId: atomicRes.transaction.id,
      metadata: {
        categoryId: atomicRes.category.id,
        categoryName: atomicRes.category.name,
        isNewCategory: atomicRes.isNewCategory,
        amount: txAmt,
      },
      ipAddress,
    });

    return {
      reply: `Beres! ${txNote} Rp ${txAmt.toLocaleString('id-ID')} sudah dicatat ke ${targetWallet.name} (${atomicRes.category.name}).`,
      intent: 'CREATE_TRANSACTION',
      actionExecuted: true,
      pendingConfirmation: false,
      cardType: 'TRANSACTION_CREATED',
      cardData: {
        transactionId: atomicRes.transaction.id,
        type: catType === CategoryType.INCOME ? 'INCOME' : 'EXPENSE',
        amount: txAmt,
        note: txNote,
        categoryId: atomicRes.category.id,
        categoryName: atomicRes.category.name,
        walletId: targetWallet.id,
        walletName: targetWallet.name,
        newWalletBalance: atomicRes.newWalletBalance,
      },
      card: {
        type: 'ACTION_CARD',
        badge: 'Tercatat',
        accent: catType === CategoryType.INCOME ? 'green' : 'blue',
        title: txNote,
        amount: txAmt,
        rows: [
          { label: 'Dompet', value: targetWallet.name },
          {
            label: 'Kategori',
            value: `${atomicRes.category.name}${atomicRes.isNewCategory ? ' (Baru)' : ''}`,
          },
          {
            label: 'Sisa Saldo',
            value: `Rp ${atomicRes.newWalletBalance.toLocaleString('id-ID')}`,
          },
        ],
        detailRoute: { type: 'transaction', id: atomicRes.transaction.id },
      },
    };
  }

  const atomicBudgetMatch = message
    .trim()
    .match(
      /^buat\s+kategori\s+([a-z0-9\s&._-]{2,35}?)\s+pasang\s+anggaran\s+(\d+)\s+(sehari|seminggu|sebulan)$/i
    );
  if (atomicBudgetMatch) {
    const rawCatName = atomicBudgetMatch[1].trim();
    const limitAmt = Number(atomicBudgetMatch[2]);
    const periodWord = atomicBudgetMatch[3].toLowerCase();
    const periodVal: 'DAILY' | 'WEEKLY' | 'MONTHLY' =
      periodWord === 'sehari'
        ? 'DAILY'
        : periodWord === 'seminggu'
          ? 'WEEKLY'
          : 'MONTHLY';
    const periodLabel =
      periodVal === 'DAILY'
        ? 'Harian'
        : periodVal === 'WEEKLY'
          ? 'Mingguan'
          : 'Bulanan';

    const atomicRes = await createCategoryAndBudgetAtomic({
      userId,
      categoryName: rawCatName,
      month,
      year,
      period: periodVal,
      limitAmount: limitAmt,
    });

    await logAudit({
      userId,
      action: 'AI_CREATE_CATEGORY_AND_BUDGET',
      entityType: 'BUDGET',
      entityId: atomicRes.budget.id,
      metadata: {
        categoryId: atomicRes.category.id,
        categoryName: atomicRes.category.name,
        isNewCategory: atomicRes.isNewCategory,
        limitAmount: limitAmt,
        period: periodVal,
      },
      ipAddress,
    });

    return {
      reply: `Beres! Kategori ${atomicRes.category.name} dan anggaran Rp ${limitAmt.toLocaleString('id-ID')} ${periodWord} sudah disimpan.`,
      intent: 'SET_BUDGET',
      actionExecuted: true,
      pendingConfirmation: false,
      cardType: 'BUDGET_SET',
      cardData: {
        budgetId: atomicRes.budget.id,
        categoryId: atomicRes.category.id,
        categoryName: atomicRes.category.name,
        limitAmount: limitAmt,
        period: periodVal,
        periodLabel,
      },
      card: {
        type: 'ACTION_CARD',
        badge: 'Anggaran Disimpan',
        accent: 'blue',
        title: atomicRes.category.name,
        amount: limitAmt,
        rows: [
          {
            label: 'Kategori',
            value: `${atomicRes.category.name}${atomicRes.isNewCategory ? ' (Baru)' : ''}`,
          },
          { label: 'Periode', value: periodLabel },
        ],
        detailRoute: { type: 'budget', id: atomicRes.budget.id },
      },
    };
  }

  // Deteksi permintaan hapus anggaran (langsung eksekusi -> BUDGET_DELETED)
  const wantsDeleteBudget =
    /\b(hapus|habus|delete|buang|hilangkan)\b.*\b(ang+ar+an|budget)\b|\b(ang+ar+an|budget)\b.*\b(hapus|habus|delete|buang|hilangkan)\b/i.test(
      lowerForDelete
    );

  if (wantsDeleteBudget) {
    if (budgets.length === 0) {
      return {
        reply: 'Kamu belum punya anggaran aktif bulan ini untuk dihapus.',
        intent: 'DELETE_BUDGET',
        actionExecuted: false,
        pendingConfirmation: false,
        cardType: null,
        cardData: null,
      };
    }

    const matchedCat = matchBestCategory(categories, message, CategoryType.EXPENSE);
    const matchedBudget =
      budgets.find((b) => lowerForDelete.includes(b.category.name.toLowerCase())) ??
      (matchedCat ? budgets.find((b) => b.categoryId === matchedCat.id) : undefined);

    if (!matchedBudget) {
      return {
        reply: `Anggaran kategori mana yang mau kamu hapus? Anggaran aktif saat ini: ${budgets.map((b) => b.category.name).join(', ')}.`,
        intent: 'DELETE_BUDGET',
        actionExecuted: false,
        pendingConfirmation: false,
        cardType: null,
        cardData: null,
      };
    }

    await deleteBudget(userId, matchedBudget.id, ipAddress);
    await logAudit({
      userId,
      action: 'AI_DELETE_BUDGET',
      entityType: 'BUDGET',
      entityId: matchedBudget.id,
      metadata: {
        categoryId: matchedBudget.categoryId,
        categoryName: matchedBudget.category.name,
        oldLimitAmount: matchedBudget.limitAmount,
        period: matchedBudget.period,
        via: 'AI_CHAT',
      },
      ipAddress,
    });

    return {
      reply: `Beres! Anggaran ${matchedBudget.category.name} (batas lama Rp ${matchedBudget.limitAmount.toLocaleString('id-ID')}) sudah dihapus.`,
      intent: 'DELETE_BUDGET',
      actionExecuted: true,
      pendingConfirmation: false,
      cardType: 'BUDGET_DELETED',
      cardData: {
        budgetId: matchedBudget.id,
        categoryId: matchedBudget.categoryId,
        categoryName: matchedBudget.category.name,
        oldLimitAmount: matchedBudget.limitAmount,
        limitAmount: matchedBudget.limitAmount,
        period: matchedBudget.period,
        periodLabel: matchedBudget.periodLabel,
      },
    };
  }

  // Deteksi permintaan tambah / edit parsial anggaran (SET_BUDGET -> langsung simpan & kembalikan BUDGET_SET / BUDGET_UPDATED)
  const wantsUpsertBudget =
    /\b(?:buat\w*|bikin\w*|tambah\w*|atur\w*|set(?:ting)?|pasang\w*|ubah\w*|ganti\w*|naik\w*|turun\w*|edit\w*|alokasi\w*|batas)\b.*\b(?:ang+ar+an|budget|jajan)\b|\b(?:ang+ar+an|budget)\b.*\b(?:baru|jadi|ke|sebesar|sehari|seminggu|sebulan|harian|mingguan|bulanan)\b|\b(?:ang+ar+an|budget)\b\s+[a-z\s]{1,30}\d+/i.test(
      lowerForDelete
    );

  if (wantsUpsertBudget) {
    const numMatch = message.match(/(\d+(?:[.,]\d+)?)\s*(rb|ribu|k|jt|juta)?/i);
    let budgetAmount = 0;
    if (numMatch?.[1]) {
      let raw = Number(numMatch[1].replace(/\./g, '').replace(',', '.'));
      const unit = (numMatch[2] || '').toLowerCase();
      if (unit === 'rb' || unit === 'ribu' || unit === 'k') raw *= 1000;
      else if (unit === 'jt' || unit === 'juta') raw *= 1_000_000;
      budgetAmount = normalizeIndonesianAmount(raw, message, 'EXPENSE');
    }

    const isDailyBudget =
      /\b(harian|per\s*hari|sehari|tiap\s*hari|setiap\s*hari|(?:selama\s*)?(?:1|satu)\s*hari)\b/i.test(
        lowerForDelete
      );
    const isWeeklyBudget =
      !isDailyBudget &&
      /\b(mingguan|per\s*minggu|seminggu|tiap\s*minggu|setiap\s*minggu|(?:selama\s*)?(?:1|satu)\s*minggu)\b/i.test(
        lowerForDelete
      );
    const isMonthlyExplicit =
      !isDailyBudget &&
      !isWeeklyBudget &&
      /\b(bulanan|per\s*bulan|sebulan|tiap\s*bulan|setiap\s*bulan)\b/i.test(
        lowerForDelete
      );
    const requestedPeriod: 'DAILY' | 'WEEKLY' | 'MONTHLY' | null = isDailyBudget
      ? 'DAILY'
      : isWeeklyBudget
        ? 'WEEKLY'
        : isMonthlyExplicit
          ? 'MONTHLY'
          : null;

    let matchedCat = await resolveCategoryForCommand({
      userId,
      type: CategoryType.EXPENSE,
      text: message,
      categories,
      walletNames: wallets.map((w) => w.name),
      allowOtherFallback: hasExplicitOtherCategoryIntent(message),
    });
    if (!matchedCat && hasExplicitOtherCategoryIntent(message)) {
      const ensured = await ensureOtherCategory(userId, CategoryType.EXPENSE);
      matchedCat = ensured;
    }
    const suggestedBudgetCat = matchedCat
      ? null
      : suggestStandardCategoryIfMissing(categories, message, CategoryType.EXPENSE);
    let resolvedCategoryName = matchedCat?.name ?? suggestedBudgetCat ?? '';

    if (!matchedCat && !suggestedBudgetCat) {
      const cleanedName = message
        .replace(/(\d+(?:[.,]\d+)?)\s*(rb|ribu|k|jt|juta|rp)?/gi, '')
        .replace(
          /\b(aku|saya|gw|gua|mau|ingin|buat\w*|bikin\w*|tambah\w*|atur\w*|set(?:ting)?|pasang\w*|ubah\w*|ganti\w*|naik\w*|turun\w*|edit\w*|alokasi\w*|batas|jajan|ang+ar+an|budget|baru|jadi|ke|sebesar|untuk|harian|mingguan|bulanan|per\s*hari|per\s*minggu|per\s*bulan|sehari|seminggu|sebulan|tiap\s*hari|tiap\s*minggu|tiap\s*bulan|bulan\s*ini)\b/gi,
          ''
        )
        .replace(/\s+/g, ' ')
        .trim();

      if (cleanedName.length >= 2) {
        resolvedCategoryName = cleanedName
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ')
          .slice(0, 40);
      }
    }

    if (!resolvedCategoryName) {
      const expenseCats = categories
        .filter((c) => c.type === CategoryType.EXPENSE)
        .slice(0, 6)
        .map((c) => c.name)
        .join(', ');
      return {
        reply: `Kategori pengeluaran mana yang mau dibuatkan anggarannya? Contoh kategori: ${expenseCats}.`,
        intent: 'SET_BUDGET',
        actionExecuted: false,
        pendingConfirmation: false,
        cardType: null,
        cardData: null,
      };
    }

    const existingBudget = matchedCat
      ? budgets.find((b) => b.categoryId === matchedCat.id)
      : undefined;

    if (!existingBudget && budgetAmount <= 0) {
      return {
        reply: `Berapa batas anggaran untuk kategori "${resolvedCategoryName}"? Contoh: "atur anggaran ${resolvedCategoryName} 35rb sehari" atau "500rb sebulan".`,
        intent: 'SET_BUDGET',
        actionExecuted: false,
        pendingConfirmation: false,
        cardType: null,
        cardData: null,
      };
    }

    const finalLimit =
      budgetAmount > 0 ? budgetAmount : existingBudget!.limitAmount;
    const finalPeriod: 'DAILY' | 'WEEKLY' | 'MONTHLY' =
      requestedPeriod ?? existingBudget?.period ?? 'MONTHLY';
    const periodLabel =
      finalPeriod === 'DAILY'
        ? 'Hari Ini'
        : finalPeriod === 'WEEKLY'
          ? 'Minggu Ini'
          : 'Bulan Ini';
    const periodPlain =
      finalPeriod === 'DAILY'
        ? 'sehari'
        : finalPeriod === 'WEEKLY'
          ? 'seminggu'
          : 'sebulan';

    if (!matchedCat && suggestedBudgetCat) {
      const otherCat = findFallbackOtherCategory(categories, CategoryType.EXPENSE);
      return {
        reply: `Kamu belum punya kategori ${suggestedBudgetCat}. Mau dibuatkan sekalian untuk anggarannya?`,
        intent: 'SET_BUDGET',
        actionExecuted: false,
        pendingConfirmation: false,
        cardType: null,
        cardData: null,
        card: {
          type: 'CHOICE_CARD',
          title: 'Pilih kategori anggaran',
          options: [
            {
              label: `Buat ${suggestedBudgetCat} & pasang anggaran`,
              messageToSend: `Buat kategori ${suggestedBudgetCat} pasang anggaran ${finalLimit} ${periodPlain}`,
            },
            ...(otherCat
              ? [
                  {
                    label: `Masukkan ke ${otherCat.name}`,
                    messageToSend: `Atur anggaran kategori ${otherCat.name} ${finalLimit} ${periodPlain}`,
                  },
                ]
              : []),
          ],
        },
      };
    }

    const savedBudget = await upsertBudget(
      userId,
      {
        categoryId: matchedCat?.id,
        categoryName: matchedCat ? undefined : resolvedCategoryName,
        month,
        year,
        period: finalPeriod,
        limitAmount: finalLimit,
      },
      ipAddress
    );

    const isUpdateMode = Boolean(existingBudget);
    await logAudit({
      userId,
      action: isUpdateMode ? 'AI_UPDATE_BUDGET' : 'AI_CREATE_BUDGET',
      entityType: 'BUDGET',
      entityId: savedBudget.id,
      metadata: {
        categoryId: savedBudget.categoryId,
        categoryName: savedBudget.category.name,
        limitAmount: finalLimit,
        period: finalPeriod,
        via: 'AI_CHAT',
      },
      ipAddress,
    });

    return {
      reply: isUpdateMode
        ? `Beres! Anggaran ${savedBudget.category.name} sudah diperbarui menjadi Rp ${finalLimit.toLocaleString('id-ID')} ${periodPlain}.`
        : `Beres! Anggaran ${savedBudget.category.name} sudah ditambahkan Rp ${finalLimit.toLocaleString('id-ID')} ${periodPlain}.`,
      intent: 'SET_BUDGET',
      actionExecuted: true,
      pendingConfirmation: false,
      cardType: isUpdateMode ? 'BUDGET_UPDATED' : 'BUDGET_SET',
      cardData: {
        budgetId: savedBudget.id,
        categoryId: savedBudget.categoryId,
        categoryName: savedBudget.category.name,
        limitAmount: finalLimit,
        period: finalPeriod,
        periodLabel,
      },
    };
  }

  // Deteksi perencanaan target finansial (ported dari FinAI Web)
  const planningGoals = goals.map((g) => ({
    id: g.id,
    name: g.name,
    targetAmount: Number(g.targetAmount),
    currentAmount: Number(g.currentAmount),
    deadline: g.deadline ? g.deadline.toISOString() : null,
  }));
  const planningDetected = extractPlanningIntent(message, planningGoals);
  if (planningDetected?.shouldPlan) {
    if (
      planningDetected.relatedGoal &&
      /\b(setor|isi|masukin|tambah|nabung\s+ke)\b/i.test(message) &&
      findMentionedWallets(message, wallets).length > 0
    ) {
      // Biarkan diproses sebagai GOAL_CONTRIBUTE dengan dompet
    } else if (!planningDetected.relatedGoal && planningDetected.targetAmount > 0) {
      const deadlineDate = new Date();
      if (planningDetected.durationDays && planningDetected.durationDays > 0) {
        deadlineDate.setDate(deadlineDate.getDate() + planningDetected.durationDays);
      } else {
        deadlineDate.setMonth(
          deadlineDate.getMonth() + Math.max(1, planningDetected.durationMonths ?? 3)
        );
      }
      const createdGoal = await createGoal(
        userId,
        {
          name: planningDetected.targetName,
          targetAmount: planningDetected.targetAmount,
          currentAmount: 0,
          deadline: deadlineDate,
          initialSourceType: 'EXTERNAL',
        },
        ipAddress
      );
      const deadlineLabel = formatShortIdDate(deadlineDate);
      return {
        reply: `Siap, target tabungan "${createdGoal.name}" sebesar Rp ${createdGoal.targetAmount.toLocaleString('id-ID')} sudah dibuat.`,
        intent: 'CREATE_GOAL',
        actionExecuted: true,
        pendingConfirmation: false,
        cardType: 'GOAL',
        cardData: {
          goalId: createdGoal.id,
          name: createdGoal.name,
          amount: createdGoal.targetAmount,
          deadline: createdGoal.deadline,
        },
        card: {
          type: 'ACTION_CARD',
          badge: 'Target Tabungan Dibuat',
          accent: 'blue',
          title: createdGoal.name,
          amount: createdGoal.targetAmount,
          rows: [
            { label: 'Target Dana', value: `Rp ${createdGoal.targetAmount.toLocaleString('id-ID')}` },
            { label: 'Tenggat', value: deadlineLabel },
          ],
          detailRoute: { type: 'goal', id: createdGoal.id },
        },
      };
    } else if (!planningDetected.durationMonths && !planningDetected.relatedGoal?.deadline) {
      return {
        reply: `Berapa lama kamu ingin menabung untuk "${planningDetected.targetName}" (target Rp ${planningDetected.targetAmount.toLocaleString('id-ID')})? Sebutkan durasi dalam bulan atau tahun, misalnya "dalam 6 bulan".`,
        intent: 'FINANCIAL_ADVICE',
        actionExecuted: false,
        pendingConfirmation: false,
        cardType: null,
        cardData: null,
      };
    } else {
      const actualIncome = forecastData.forecast.totalIncomeMtd;
      const targetIncome = Number(userProfile?.monthlyIncomeTarget ?? 0);
      const effectiveIncome = actualIncome > 0 ? actualIncome : targetIncome;
      const incomeSource: 'actual' | 'target' | 'none' =
        actualIncome > 0 ? 'actual' : targetIncome > 0 ? 'target' : 'none';

      const plan = calculateFinancialPlan({
        targetName: planningDetected.targetName,
        targetAmount: planningDetected.targetAmount,
        currentAmount: planningDetected.currentAmount,
        durationMonths: planningDetected.durationMonths ?? null,
        durationDays: planningDetected.durationDays ?? null,
        durationLabel: planningDetected.durationLabel ?? null,
        deadline: planningDetected.relatedGoal?.deadline ?? null,
        monthlyIncome: effectiveIncome,
        monthlyExpense: forecastData.forecast.totalExpenseMtd,
        incomeSource,
        relatedGoal: planningDetected.relatedGoal,
      });

      const feasibilityText =
        plan.feasibility === 'realistic'
          ? 'realistis dan aman'
          : plan.feasibility === 'tight'
            ? 'cukup ketat'
            : plan.feasibility === 'unlikely'
              ? 'berat dengan arus kas saat ini'
              : 'belum tercatat sisa uang pemasukan yang cukup';

      const durationText = plan.durationLabel ?? `${plan.durationMonths} bulan`;
      const savingText =
        plan.requiredDailySaving && plan.requiredDailySaving > 0
          ? `Rp ${plan.requiredDailySaving.toLocaleString('id-ID')}/hari`
          : `Rp ${plan.requiredMonthlySaving.toLocaleString('id-ID')}/bulan`;

      return {
        reply: `Rencana "${plan.targetName}" membutuhkan tabungan sekitar ${savingText} selama ${durationText}. Secara uang masuk & keluar, kondisi saat ini ${feasibilityText}. Pilih dompet di bawah jika ingin menaruh rencana tabungan ini:`,
        intent: 'FINANCIAL_ADVICE',
        actionExecuted: false,
        pendingConfirmation: false,
        cardType: 'FINANCIAL_PLAN',
        cardData: {
          plan,
          wallets: wallets.map((w) => ({
            id: w.id,
            name: w.name,
            type: w.type,
            currentBalance: w.currentBalance,
            sufficient: w.currentBalance >= plan.requiredMonthlySaving,
          })),
        },
      };
    }
  }

  const isBudgetCheckQuery =
    (/\b(cek|sisa|lihat|status|info)\s+(anggaran|budget)\b|\b(anggaran|budget)\s+(harian|mingguan|bulanan)\b|\bbatas\s+pengeluaran\b/i.test(
      message
    ) ||
      message.trim().toLowerCase() === 'anggaran') &&
    !/\b(buat|bikin|tambah|atur|set|ubah|ganti|edit|hapus)\b/i.test(message);

  if (isBudgetCheckQuery) {
    return buildBudgetCheckResponse(budgets);
  }

  const isSpendingBreakdownQuery =
    /\b(cek\s+pengeluaran|rincian\s+pengeluaran|pengeluaran(\s+[\w\s]+)?|uang\s+habis|kategori\s+(paling\s+)?boros|belanja\s+terbesar|habis\s+berapa|keluar\s+berapa|spending\s+breakdown)\b/i.test(
      message
    ) && !/\b(catat|beli|bayar|buat|bikin|tambah|atur|set|ubah|hapus)\b/i.test(message);

  if (isSpendingBreakdownQuery) {
    const range = parseWibDateRangeQuery(message);
    const explicitCat = findExplicitCategory(
      categories,
      message,
      CategoryType.EXPENSE
    );
    const matchedCat = await resolveCategoryForCommand({
      userId,
      type: CategoryType.EXPENSE,
      text: message
        .replace(
          /\b(cek|rincian|pengeluaran|uang|habis|berapa|keluar|buat|untuk|hari\s+ini|kemarin|minggu\s+ini|minggu\s+lalu|bulan\s+ini|bulan\s+lalu|hari\s+terakhir|tanggal|tgl|sampai|kategori|paling|boros)\b/gi,
          ' '
        )
        .trim(),
      categories,
      walletNames: wallets.map((w) => w.name),
      allowOtherFallback: false,
    });

    const hasCategoryHint =
      Boolean(explicitCat) ||
      (/\b(buat|untuk|kategori)\b/i.test(message) && Boolean(matchedCat));
    const filterCat = explicitCat ?? (hasCategoryHint ? matchedCat : null);

    const expenses = await prisma.transaction.findMany({
      where: {
        userId,
        type: TransactionType.EXPENSE,
        transactionDate: { gte: range.startDate, lt: range.endDate },
        ...(filterCat ? { categoryId: filterCat.id } : {}),
      },
      select: {
        amount: true,
        note: true,
        transactionDate: true,
        category: { select: { name: true } },
      },
      orderBy: [{ transactionDate: 'desc' }, { amount: 'desc' }],
    });

    if (expenses.length === 0) {
      return {
        reply: filterCat
          ? `Belum ada pengeluaran ${filterCat.name} tercatat untuk ${range.label}.`
          : `Belum ada pengeluaran tercatat untuk ${range.label}.`,
        intent: 'FINANCIAL_ADVICE',
        actionExecuted: false,
        pendingConfirmation: false,
        cardType: null,
        cardData: null,
        card: null,
      };
    }

    const totalExpense = expenses.reduce((s, tx) => s + Number(tx.amount), 0);
    const dailyAverage = Math.round(totalExpense / Math.max(1, range.dayCount));

    let items: Array<{
      category: string;
      subtitle?: string;
      total: number;
      percentage: number;
      count?: number;
    }>;

    if (filterCat) {
      items = expenses.slice(0, 5).map((tx) => {
        const amt = Number(tx.amount);
        return {
          category: tx.note?.trim() || filterCat.name,
          subtitle: formatWibShortDate(tx.transactionDate),
          total: Math.round(amt),
          percentage: totalExpense > 0 ? Math.round((amt / totalExpense) * 100) : 0,
        };
      });
    } else {
      const byCategory = new Map<string, { total: number; count: number }>();
      for (const tx of expenses) {
        const catName = tx.category?.name ?? 'Lainnya';
        const prev = byCategory.get(catName) ?? { total: 0, count: 0 };
        byCategory.set(catName, {
          total: prev.total + Number(tx.amount),
          count: prev.count + 1,
        });
      }
      items = Array.from(byCategory.entries())
        .map(([catName, agg]) => ({
          category: catName,
          total: Math.round(agg.total),
          count: agg.count,
          percentage:
            totalExpense > 0 ? Math.round((agg.total / totalExpense) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
    }

    return {
      reply: `Ini rincian pengeluaranmu ${range.label.toLowerCase()}:`,
      intent: 'FINANCIAL_ADVICE',
      actionExecuted: false,
      pendingConfirmation: false,
      cardType: 'SPENDING_BREAKDOWN',
      cardData: {
        spendingBreakdown: {
          period: range.label,
          totalExpense: Math.round(totalExpense),
          dailyAverage,
          items,
        },
      },
      card: buildMonthlySpendingCard({
        label: range.label,
        dayCount: range.dayCount,
        transactionCount: expenses.length,
        categoryName: filterCat?.name ?? null,
        totalExpense,
        dailyAverage,
        items,
      }),
    };
  }

  const isMonthlySummaryQuery =
    /\b(ringkasan\s+bulan\s+ini|analisis\s+bulan\s+ini|kondisi\s+keuanganku|kondisi\s+keuangan|rekap\s+bulan\s+ini|ringkasan\s+keuangan)\b/i.test(
      message
    );

  if (isMonthlySummaryQuery) {
    const { start, end } = getMonthDateRangeWib(month, year);
    const [incomeAgg, expenseAgg] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          userId,
          type: TransactionType.INCOME,
          transactionDate: { gte: start, lt: end },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          type: TransactionType.EXPENSE,
          transactionDate: { gte: start, lt: end },
        },
        _sum: { amount: true },
      }),
    ]);

    const income = Number(incomeAgg._sum.amount ?? 0);
    const expense = Number(expenseAgg._sum.amount ?? 0);

    return {
      reply: 'Ini ringkasan keuanganmu bulan ini:',
      intent: 'FINANCIAL_ADVICE',
      actionExecuted: false,
      pendingConfirmation: false,
      cardType: 'SUMMARY',
      cardData: {
        summary: {
          income,
          expense,
          totalBalance,
          totalSavingsBalance,
        },
      },
      card: buildMonthlySummaryCard({
        income,
        expense,
        totalBalance,
        totalSavingsBalance,
      }),
    };
  }

  const financialContext = {
    periode: `${month}/${year}`,
    saldoSiapPakai: totalBalance,
    totalTabungan: totalSavingsBalance,
    totalKekayaanBersih: totalBalance + totalSavingsBalance,
    totalSaldoDompetAktif: totalBalance,
    daftarDompet: wallets,
    daftarKategori: categories,
    polaKategoriTerbaru: recentCategoryExamples,
    targetTabunganAktif: goals.map((g) => ({
      id: g.id,
      name: g.name,
      targetAmount: Number(g.targetAmount),
      currentAmount: Number(g.currentAmount),
    })),
    arusKas: {
      pemasukanBulanIni: forecastData.forecast.totalIncomeMtd,
      pengeluaranBulanIni: forecastData.forecast.totalExpenseMtd,
      burnRateHarian: forecastData.forecast.dailyBurnRate,
      proyeksiPengeluaranAkhirBulan: forecastData.forecast.projectedExpense,
      proyeksiSaldoAkhirBulan: forecastData.forecast.projectedBalance,
      levelRisiko: forecastData.forecast.riskLevel,
    },
    budgets: budgets.map((b) => ({
      budgetId: b.id,
      categoryId: b.categoryId,
      categoryName: b.category.name,
      period: b.period,
      periodLabel: b.periodLabel,
      limitAmount: b.limitAmount,
      spentAmount: b.spentAmount,
      remainingAmount: b.remainingAmount,
      percentage: b.percentage,
      status: b.status,
    })),
    anomaliAktif: forecastData.anomalies.map((a) => ({
      tipe: a.anomalyType,
      tingkat: a.severity,
      pesan: a.message,
    })),
    skorKesehatanSAW: sawHealth,
  };

  const coldStartNote = !sawHealth.hasEnoughData
    ? `Akun ini baru memiliki ${sawHealth.txCount} dari ${sawHealth.minTransactionsNeeded} transaksi minimum. Jika user hanya menyapa/konsultasi, sapa dengan ramah dan ajak mencatat minimal 3 transaksi.`
    : `Skor kesehatan keuangan pengguna saat ini: ${sawHealth.healthScore}/100 (${sawHealth.statusLabel}). Ingat: JANGAN sebut kata SAW atau C1/C2/C3/C4 ke pengguna, jelaskan langsung intinya.`;

  const systemInstruction = buildChatSystemInstruction({
    financialContextJson: JSON.stringify(financialContext),
    coldStartNote,
  });

  const recentHistoryText = history
    .slice(-6)
    .map((h) => `${h.role === 'user' ? 'User' : 'FinAI'}: ${h.content ?? h.text ?? ''}`)
    .join('\n');

  const prompt = recentHistoryText
    ? `Riwayat singkat:\n${recentHistoryText}\n\nPertanyaan terbaru User: ${message}`
    : `Pertanyaan User: ${message}`;

  let intent: ChatIntentType = 'FINANCIAL_ADVICE';
  let reply = '';
  let cardType: ChatCardType = null;
  let parsedAction: z.infer<typeof actionPayloadSchema> | null = null;
  let parsedSuggestedNewCategory: { name: string } | null = null;

  try {
    const geminiRes = await callGemini({
      prompt,
      systemInstruction,
      responseMimeType: 'application/json',
      temperature: 0.3,
    });
    reply = geminiRes.text;

    try {
      const parsed = JSON.parse(stripJsonFences(geminiRes.text)) as {
        intent?: ChatIntentType;
        reply?: string;
        cardType?: ChatCardType;
        actionPayload?: unknown;
        suggestedNewCategory?: { name?: string } | null;
      };
      if (parsed.reply) reply = parsed.reply;
      if (
        parsed.suggestedNewCategory &&
        typeof parsed.suggestedNewCategory.name === 'string' &&
        parsed.suggestedNewCategory.name.trim().length > 0
      ) {
        parsedSuggestedNewCategory = { name: parsed.suggestedNewCategory.name.trim() };
      }
      if (
        parsed.intent === 'CREATE_TRANSACTION' ||
        parsed.intent === 'TRANSFER' ||
        parsed.intent === 'CREATE_GOAL' ||
        parsed.intent === 'GOAL_CONTRIBUTE' ||
        parsed.intent === 'SET_BUDGET' ||
        parsed.intent === 'DELETE_BUDGET' ||
        parsed.intent === 'FINANCIAL_ADVICE'
      ) {
        intent = parsed.intent;
      }
      if (
        parsed.cardType === 'FORECAST' ||
        parsed.cardType === 'ANOMALY' ||
        parsed.cardType === 'RECOMMENDATION' ||
        parsed.cardType === 'BUDGET' ||
        parsed.cardType === 'SPENDING_BREAKDOWN' ||
        parsed.cardType === 'SUMMARY' ||
        parsed.cardType === 'GOAL' ||
        parsed.cardType === 'WALLET'
      ) {
        cardType = parsed.cardType;
      }
      if (parsed.actionPayload && typeof parsed.actionPayload === 'object') {
        const safe = actionPayloadSchema.safeParse(parsed.actionPayload);
        if (safe.success) {
          parsedAction = safe.data;
        }
      }
    } catch {
      // Gunakan fallback deterministik jika JSON gagal di-parse
    }
  } catch (err) {
    // Jika Gemini & Groq belum terkonfigurasi, coba parser deterministik agar pencatatan tetap jalan
    const det = parseDeterministicIntent(message, wallets, categories, goals, history);
    if (!det) {
      throw err;
    }
    intent = det.intent;
    reply = det.reply;
    parsedAction = det.actionPayload;
  }

  if (intent === 'CREATE_GOAL') {
    const rawTarget = parsedAction?.amount ?? 0;
    const targetAmt =
      rawTarget > 0
        ? normalizeIndonesianAmount(rawTarget, message, 'EXPENSE')
        : 0;
    const goalTitle = (parsedAction?.goalName || parsedAction?.note || '').trim();

    if (!goalTitle || targetAmt <= 0) {
      return {
        reply: 'Sebutkan nama target dan nominal tabungan yang ingin dibuat.',
        intent: 'CREATE_GOAL',
        actionExecuted: false,
        pendingConfirmation: false,
        cardType: null,
        cardData: null,
      };
    }

    const deadlineDate = new Date();
    if (parsedAction?.deadlineDays && parsedAction.deadlineDays > 0) {
      deadlineDate.setDate(deadlineDate.getDate() + parsedAction.deadlineDays);
    } else {
      deadlineDate.setMonth(
        deadlineDate.getMonth() + Math.max(1, parsedAction?.deadlineMonths ?? 3)
      );
    }

    const createdGoal = await createGoal(
      userId,
      {
        name: goalTitle,
        targetAmount: targetAmt,
        currentAmount: 0,
        deadline: deadlineDate,
        initialSourceType: 'EXTERNAL',
      },
      ipAddress
    );
    const deadlineLabel = formatShortIdDate(deadlineDate);
    return {
      reply: `Siap, target tabungan "${createdGoal.name}" sebesar Rp ${createdGoal.targetAmount.toLocaleString('id-ID')} sudah dibuat.`,
      intent: 'CREATE_GOAL',
      actionExecuted: true,
      pendingConfirmation: false,
      cardType: 'GOAL',
      cardData: {
        goalId: createdGoal.id,
        name: createdGoal.name,
        amount: createdGoal.targetAmount,
        deadline: createdGoal.deadline,
      },
      card: {
        type: 'ACTION_CARD',
        badge: 'Target Tabungan Dibuat',
        accent: 'blue',
        title: createdGoal.name,
        amount: createdGoal.targetAmount,
        rows: [
          { label: 'Target Dana', value: `Rp ${createdGoal.targetAmount.toLocaleString('id-ID')}` },
          { label: 'Tenggat', value: deadlineLabel },
        ],
        detailRoute: { type: 'goal', id: createdGoal.id },
      },
    };
  }

  if (intent === 'SET_BUDGET') {
    const rawLimit = parsedAction?.limitAmount ?? parsedAction?.amount ?? 0;
    const limitAmt =
      rawLimit && rawLimit > 0
        ? normalizeIndonesianAmount(rawLimit, message, 'EXPENSE')
        : 0;
    const chosenCat =
      categories.find(
        (c) => c.id === parsedAction?.categoryId && c.type === CategoryType.EXPENSE
      ) ?? matchBestCategory(categories, message, CategoryType.EXPENSE);

    if (chosenCat) {
      const existingBudget = budgets.find((b) => b.categoryId === chosenCat.id);
      if (!existingBudget && limitAmt <= 0) {
        return {
          reply: `Berapa batas anggaran untuk kategori "${chosenCat.name}"?`,
          intent: 'SET_BUDGET',
          actionExecuted: false,
          pendingConfirmation: false,
          cardType: null,
          cardData: null,
        };
      }
      const finalLimit = limitAmt > 0 ? limitAmt : existingBudget!.limitAmount;
      const period = parsedAction?.period ?? existingBudget?.period ?? 'MONTHLY';
      const periodLabel =
        period === 'DAILY' ? 'Hari Ini' : period === 'WEEKLY' ? 'Minggu Ini' : 'Bulan Ini';
      const savedBudget = await upsertBudget(
        userId,
        {
          categoryId: chosenCat.id,
          month,
          year,
          period,
          limitAmount: finalLimit,
          alertThresholdPct: parsedAction?.alertThresholdPct,
        },
        ipAddress
      );
      const isUpdateMode = Boolean(existingBudget);
      await logAudit({
        userId,
        action: isUpdateMode ? 'AI_UPDATE_BUDGET' : 'AI_CREATE_BUDGET',
        entityType: 'BUDGET',
        entityId: savedBudget.id,
        metadata: {
          categoryId: savedBudget.categoryId,
          limitAmount: finalLimit,
          period,
          via: 'AI_CHAT',
        },
        ipAddress,
      });
      return {
        reply:
          reply ||
          `Beres! Anggaran ${chosenCat.name} sudah ${isUpdateMode ? 'diperbarui' : 'ditambahkan'} Rp ${finalLimit.toLocaleString('id-ID')} (${periodLabel}).`,
        intent: 'SET_BUDGET',
        actionExecuted: true,
        pendingConfirmation: false,
        cardType: isUpdateMode ? 'BUDGET_UPDATED' : 'BUDGET_SET',
        cardData: {
          budgetId: savedBudget.id,
          categoryId: savedBudget.categoryId,
          categoryName: chosenCat.name,
          limitAmount: finalLimit,
          period,
          periodLabel,
        },
      };
    }
  }

  if (intent === 'DELETE_BUDGET') {
    const targetBudget =
      budgets.find((b) => b.id === parsedAction?.budgetId) ??
      budgets.find((b) => b.categoryId === parsedAction?.categoryId) ??
      budgets.find((b) => message.toLowerCase().includes(b.category.name.toLowerCase()));
    if (!targetBudget) {
      return {
        reply: 'Anggaran untuk kategori itu belum ada di bulan ini.',
        intent: 'DELETE_BUDGET',
        actionExecuted: false,
        pendingConfirmation: false,
        cardType: null,
        cardData: null,
      };
    }
    await deleteBudget(userId, targetBudget.id, ipAddress);
    await logAudit({
      userId,
      action: 'AI_DELETE_BUDGET',
      entityType: 'BUDGET',
      entityId: targetBudget.id,
      metadata: {
        categoryId: targetBudget.categoryId,
        oldLimitAmount: targetBudget.limitAmount,
        period: targetBudget.period,
        via: 'AI_CHAT',
      },
      ipAddress,
    });
    return {
      reply:
        reply ||
        `Beres! Anggaran ${targetBudget.category.name} sudah dihapus.`,
      intent: 'DELETE_BUDGET',
      actionExecuted: true,
      pendingConfirmation: false,
      cardType: 'BUDGET_DELETED',
      cardData: {
        budgetId: targetBudget.id,
        categoryId: targetBudget.categoryId,
        categoryName: targetBudget.category.name,
        oldLimitAmount: targetBudget.limitAmount,
        limitAmount: targetBudget.limitAmount,
        period: targetBudget.period,
        periodLabel: targetBudget.periodLabel,
      },
    };
  }

  // Tangani intent aksi transaksi / transfer / target tabungan
  if (
    intent === 'CREATE_TRANSACTION' ||
    intent === 'TRANSFER' ||
    intent === 'GOAL_CONTRIBUTE'
  ) {
    const txType: 'INCOME' | 'EXPENSE' | 'TRANSFER' =
      intent === 'TRANSFER'
        ? 'TRANSFER'
        : parsedAction?.type ?? 'EXPENSE';

    const amount = normalizeIndonesianAmount(
      parsedAction?.amount ?? 0,
      message,
      txType
    );

    if (!parsedAction) {
      // Coba ekstrak nominal dari pesan (termasuk riwayat transaksi sebelumnya jika ada)
      const detFallback = parseDeterministicIntent(message, wallets, categories, goals, history);
      const fallbackAmount = detFallback?.actionPayload?.amount ?? 0;
      const numMatch = message.match(/(\d+(?:[.,]\d+)?)\s*(rb|ribu|k|jt|juta)?/i);
      let inferredAmount = fallbackAmount;
      if (inferredAmount <= 0 && numMatch) {
        let raw = Number(numMatch[1].replace(/\./g, '').replace(',', '.'));
        const unit = (numMatch[2] || '').toLowerCase();
        if (unit === 'rb' || unit === 'ribu' || unit === 'k') raw *= 1000;
        else if (unit === 'jt' || unit === 'juta') raw *= 1_000_000;
        inferredAmount = normalizeIndonesianAmount(raw, message, txType);
      }

      const hasWalletInMsg = findMentionedWallets(message, wallets).length > 0;
      const noteWithoutAmount = message
        .replace(/(\d+(?:[.,]\d+)?)\s*(rb|ribu|k|jt|juta)?/gi, '')
        .trim();
      const missingItem = isGenericActionNote(noteWithoutAmount, txType);

      if (
        inferredAmount > 0 &&
        wallets.length > 0 &&
        intent === 'CREATE_TRANSACTION' &&
        !hasWalletInMsg &&
        !missingItem
      ) {
        return {
          reply,
          intent,
          actionExecuted: false,
          pendingConfirmation: false,
          cardType: 'WALLET_PICKER',
          cardData: {
            intent,
            type: txType,
            amount: inferredAmount,
            note: 'Transaksi',
            wallets: wallets.map((w) => ({
              id: w.id,
              name: w.name,
              type: w.type,
              currentBalance: w.currentBalance,
              sufficient: txType === 'INCOME' ? true : w.currentBalance >= inferredAmount,
            })),
          },
        };
      }

      return {
        reply,
        intent,
        actionExecuted: false,
        pendingConfirmation: false,
        cardType: null,
        cardData: null,
      };
    }

    if (amount <= 0) {
      return {
        reply: reply || 'Nominal belum terdeteksi. Berapa jumlah Rupiah yang ingin dicatat?',
        intent,
        actionExecuted: false,
        pendingConfirmation: false,
        cardType: null,
        cardData: null,
      };
    }

    if (intent === 'GOAL_CONTRIBUTE') {
      if (goals.length === 0) {
        return {
          reply: 'Kamu belum punya target tabungan aktif. Yuk buat target dulu di menu Anggaran & Target atau lewat rencana tabungan.',
          intent,
          actionExecuted: false,
          pendingConfirmation: false,
          cardType: null,
          cardData: null,
        };
      }

      const lowerMsg = message.toLowerCase();
      const goal =
        goals.find((g) => g.id === parsedAction?.goalId) ??
        goals.find((g) => lowerMsg.includes(g.name.toLowerCase())) ??
        (goals.length === 1 ? goals[0] : undefined);

      if (!goal) {
        return {
          reply: `Target tabungan yang kamu maksud belum ketemu. Target aktif kamu saat ini: ${goals.map((g) => g.name).join(', ')}.`,
          intent,
          actionExecuted: false,
          pendingConfirmation: false,
          cardType: null,
          cardData: null,
        };
      }

      const isExternalSource =
        parsedAction?.sourceType === 'EXTERNAL' ||
        /(dari\s+)?(dana\s+luar|uang\s+luar|celengan|luar\s+dompet|tunai\s+luar)/i.test(
          lowerMsg
        );

      const mentionedGoalWallets = findMentionedWallets(message, wallets);
      const srcWallet = isExternalSource
        ? undefined
        : mentionedGoalWallets[0] ??
          wallets.find((w) => w.id === parsedAction?.walletId);
      const destWallet = isExternalSource
        ? undefined
        : mentionedGoalWallets[1] ??
          wallets.find(
            (w) =>
              w.id === parsedAction?.destinationWalletId &&
              w.id !== srcWallet?.id
          );

      if (!isExternalSource && !srcWallet && wallets.length > 0) {
        return {
          reply: `Mau ambil uang dari dompet mana untuk setor Rp ${amount.toLocaleString('id-ID')} ke target "${goal.name}"?`,
          intent,
          actionExecuted: false,
          pendingConfirmation: false,
          cardType: 'WALLET_PICKER',
          cardData: {
            intent,
            goalId: goal.id,
            type: 'TRANSFER',
            amount,
            note: `Setor ${goal.name}`,
            wallets: wallets.map((w) => ({
              id: w.id,
              name: w.name,
              type: w.type,
              currentBalance: w.currentBalance,
              sufficient: w.currentBalance >= amount,
            })),
          },
        };
      }

      if (srcWallet && srcWallet.currentBalance < amount) {
        const alternatives = wallets.filter(
          (w) => w.id !== srcWallet.id && w.currentBalance >= amount
        );
        return {
          reply: `Saldo ${srcWallet.name} kamu tidak cukup untuk transaksi ini, sisa saat ini Rp ${srcWallet.currentBalance.toLocaleString('id-ID')}. Kamu bisa pilih dompet lain atau catat pemasukan dulu.`,
          intent,
          actionExecuted: false,
          pendingConfirmation: false,
          cardType: alternatives.length > 0 ? 'WALLET_PICKER' : null,
          cardData:
            alternatives.length > 0
              ? {
                  intent,
                  goalId: goal.id,
                  type: 'TRANSFER',
                  amount,
                  note: `Setor ${goal.name}`,
                  wallets: wallets.map((w) => ({
                    id: w.id,
                    name: w.name,
                    type: w.type,
                    currentBalance: w.currentBalance,
                    sufficient: w.currentBalance >= amount,
                  })),
                }
              : null,
        };
      }

      const txTypeForGoal: 'TRANSFER' = 'TRANSFER';

      if (executeImmediately) {
        const updatedGoal = await contributeGoal(
          userId,
          goal.id,
          {
            amount,
            sourceType: isExternalSource ? 'EXTERNAL' : 'WALLET',
            walletId: isExternalSource ? null : (srcWallet?.id ?? null),
            destinationWalletId: destWallet?.id ?? null,
            note: `Setor ${goal.name}`,
          },
          ipAddress
        );
        await logAudit({
          userId,
          action: 'AI_AUTO_RECORD',
          entityType: 'GOAL',
          entityId: goal.id,
          metadata: {
            amount,
            sourceType: isExternalSource ? 'EXTERNAL' : 'WALLET',
            walletId: isExternalSource ? null : srcWallet?.id,
            destinationWalletId: destWallet?.id,
            via: 'AI_CHAT',
          },
          ipAddress,
        });
        return {
          reply: `Beres! Setoran Rp ${amount.toLocaleString('id-ID')} ke target "${goal.name}" sudah dicatat${isExternalSource ? ' dari dana luar' : srcWallet ? ` dari ${srcWallet.name}` : ''}.`,
          intent,
          actionExecuted: true,
          pendingConfirmation: false,
          cardType: 'TRANSACTION_CREATED',
          cardData: {
            goalId: goal.id,
            type: txTypeForGoal,
            sourceType: isExternalSource ? 'EXTERNAL' : 'WALLET',
            amount,
            note: `Setor ${goal.name}`,
            categoryName: 'Target Tabungan',
            walletId: isExternalSource ? null : srcWallet?.id,
            walletName: isExternalSource ? 'Dana Luar' : (srcWallet?.name ?? goal.name),
            destinationWalletId: destWallet?.id ?? null,
            destinationWalletName: destWallet?.name ?? null,
            newWalletBalance:
              !isExternalSource && srcWallet
                ? Math.max(0, srcWallet.currentBalance - amount)
                : Number(updatedGoal.currentAmount),
          },
        };
      }

      return {
        reply:
          reply ||
          `Siap menyetor Rp ${amount.toLocaleString('id-ID')} ke target "${goal.name}"${isExternalSource ? ' dari dana luar' : srcWallet ? ` dari ${srcWallet.name}` : ''}. Tekan Konfirmasi untuk menyimpan.`,
        intent,
        actionExecuted: false,
        pendingConfirmation: true,
        cardType: 'TRANSACTION_PREVIEW',
        cardData: {
          intent,
          goalId: goal.id,
          type: txTypeForGoal,
          sourceType: isExternalSource ? 'EXTERNAL' : 'WALLET',
          amount,
          note: `Setor ${goal.name}`,
          categoryName: 'Target Tabungan',
          walletId: isExternalSource ? null : srcWallet?.id,
          walletName: isExternalSource ? 'Dana Luar' : (srcWallet?.name ?? goal.name),
          destinationWalletId: destWallet?.id ?? null,
          destinationWalletName: destWallet?.name ?? null,
          currentWalletBalance:
            !isExternalSource && srcWallet
              ? srcWallet.currentBalance
              : Number(goal.currentAmount),
          projectedWalletBalance:
            !isExternalSource && srcWallet
              ? Math.max(0, srcWallet.currentBalance - amount)
              : Number(goal.currentAmount) + amount,
        },
      };
    }

    if (wallets.length === 0) {
      return {
        reply: 'Anda belum memiliki dompet aktif. Tambahkan dompet terlebih dahulu sebelum mencatat transaksi.',
        intent,
        actionExecuted: false,
        pendingConfirmation: false,
        cardType: null,
        cardData: null,
      };
    }

    const mentionedDirect = findMentionedWallets(message, wallets);
    const walletCandidate = wallets.find((w) => w.id === parsedAction?.walletId);
    // Pastikan dompet benar-benar disebut user (atau dipilih via follow-up), jangan izinkan LLM menebak dompet diam-diam
    const wallet =
      mentionedDirect.length > 0
        ? mentionedDirect[0]
        : !/\d/.test(message) && walletCandidate
          ? walletCandidate
          : undefined;

    const buildWalletPickerCard = () => ({
      intent,
      type: txType,
      amount,
      note: parsedAction?.note?.trim() || (txType === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'),
      wallets: wallets.map((w) => ({
        id: w.id,
        name: w.name,
        type: w.type,
        color: w.color,
        currentBalance: w.currentBalance,
        sufficient: txType === 'INCOME' ? true : w.currentBalance >= amount,
      })),
    });

    if (!wallet) {
      return {
        reply:
          reply ||
          `Mau pakai dompet apa untuk mencatat transaksi Rp ${amount.toLocaleString('id-ID')} ini? Pilih salah satu dompet di bawah:`,
        intent,
        actionExecuted: false,
        pendingConfirmation: false,
        cardType: 'WALLET_PICKER',
        cardData: buildWalletPickerCard(),
      };
    }

    const destWallet =
      txType === 'TRANSFER'
        ? wallets.find(
          (w) =>
            w.id === parsedAction?.destinationWalletId && w.id !== wallet.id
        )
        : undefined;

    if (txType === 'TRANSFER' && !destWallet) {
      return {
        reply:
          wallets.length < 2
            ? 'Untuk transfer antar dompet, Anda perlu memiliki minimal 2 dompet aktif.'
            : `Dompet tujuan transfer belum ditentukan. Pilih dompet tujuan dari: ${formatWalletOptions(wallets.filter((w) => w.id !== wallet.id))}.`,
        intent,
        actionExecuted: false,
        pendingConfirmation: false,
        cardType: null,
        cardData: null,
      };
    }

    if ((txType === 'EXPENSE' || txType === 'TRANSFER') && wallet.currentBalance < amount) {
      const alternatives = wallets.filter(
        (w) => w.id !== wallet.id && w.currentBalance >= amount
      );
      const altText =
        alternatives.length > 0
          ? ' Pilih dompet lain yang saldonya mencukupi di bawah:'
          : ' Saat ini belum ada dompet aktif lain yang saldonya mencukupi.';
      return {
        reply: `Saldo dompet "${wallet.name}" tidak mencukupi (tersedia Rp ${wallet.currentBalance.toLocaleString('id-ID')}, dibutuhkan Rp ${amount.toLocaleString('id-ID')}).${altText}`,
        intent,
        actionExecuted: false,
        pendingConfirmation: false,
        cardType: alternatives.length > 0 ? 'WALLET_PICKER' : null,
        cardData: alternatives.length > 0 ? buildWalletPickerCard() : null,
      };
    }

    const rawNote = parsedAction.note.trim();
    if (
      txType !== 'TRANSFER' &&
      (isGenericActionNote(rawNote, txType) ||
        isGenericActionNote(
          message
            .replace(/(\d+(?:[.,]\d+)?)\s*(rb|ribu|k|jt|juta)?/gi, '')
            .replace(new RegExp(wallet.name, 'gi'), ''),
          txType
        )) &&
      isGenericActionNote(rawNote, txType)
    ) {
      return {
        reply:
          txType === 'INCOME'
            ? `Untuk mencatat pemasukan Rp ${amount.toLocaleString('id-ID')} ke ${wallet.name}, ini pemasukan dari mana? (Contoh: "gaji 5jt ${wallet.name}")`
            : `Untuk mencatat pengeluaran Rp ${amount.toLocaleString('id-ID')} dari ${wallet.name}, ini untuk beli atau bayar apa? (Contoh: "beli kopi 30k ${wallet.name}")`,
        intent,
        actionExecuted: false,
        pendingConfirmation: false,
        cardType: null,
        cardData: null,
      };
    }

    const targetCatType = txType === 'INCOME' ? CategoryType.INCOME : CategoryType.EXPENSE;
    let explicitCat =
      txType === 'TRANSFER'
        ? null
        : findExplicitCategory(categories, message, targetCatType);
    if (txType !== 'TRANSFER' && !explicitCat && hasExplicitOtherCategoryIntent(message)) {
      explicitCat = await ensureOtherCategory(userId, targetCatType);
    }
    const historicalCat =
      txType === 'TRANSFER' || explicitCat
        ? null
        : await findHistoricalCategoryMatch({
            userId,
            type: targetCatType,
            text: `${message} ${parsedAction.note}`,
            categories,
            walletNames: wallets.map((w) => w.name),
          });

    if (
      txType !== 'TRANSFER' &&
      !explicitCat &&
      !historicalCat &&
      parsedAction?.categoryConfidence === 'low'
    ) {
      const pool = categories.filter((c) => c.type === targetCatType);
      const poolById = new Map(pool.map((c) => [c.id, c]));
      const candidateCats = (parsedAction.candidateCategoryIds ?? [])
        .map((cid) => poolById.get(cid))
        .filter((c): c is NonNullable<typeof c> => Boolean(c))
        .slice(0, 3);
      const otherCat = findFallbackOtherCategory(pool, targetCatType);
      if (otherCat && !candidateCats.some((c) => c.id === otherCat.id)) {
        candidateCats.push(otherCat);
      }

      if (candidateCats.length >= 2) {
        return {
          reply: 'Mau masukkan ke kategori mana?',
          intent,
          actionExecuted: false,
          pendingConfirmation: false,
          cardType: null,
          cardData: null,
          card: {
            type: 'CHOICE_CARD',
            title: 'Pilih kategori transaksi',
            options: candidateCats.map((c) => ({
              label: c.name,
              messageToSend: `${message} [kategori: ${c.name}]`,
            })),
          },
        };
      }
    }

    const category =
      txType === 'TRANSFER'
        ? null
        : explicitCat ??
          historicalCat ??
          categories.find(
            (c) =>
              c.id === parsedAction?.categoryId &&
              c.type === targetCatType
          ) ??
          resolveCategoryFallback(
            categories,
            `${message} ${parsedAction.note}`,
            targetCatType
          ) ??
          null;

    const note =
      rawNote ||
      (txType === 'TRANSFER'
        ? `Transfer ke ${destWallet?.name ?? 'Dompet'}`
        : category?.name ?? 'Transaksi');

    const projectedBalance =
      txType === 'INCOME'
        ? wallet.currentBalance + amount
        : wallet.currentBalance - amount;

    if (txType !== 'INCOME' && wallet.currentBalance < amount) {
      const alternatives = wallets.filter(
        (w) => w.id !== wallet.id && w.currentBalance >= amount
      );
      return {
        reply: `Saldo ${wallet.name} kamu tidak cukup untuk transaksi ini, sisa saat ini Rp ${wallet.currentBalance.toLocaleString('id-ID')}. Kamu bisa pilih dompet lain atau catat pemasukan dulu.`,
        intent,
        actionExecuted: false,
        pendingConfirmation: false,
        cardType: alternatives.length > 0 ? 'WALLET_PICKER' : null,
        cardData:
          alternatives.length > 0
            ? {
                intent,
                type: txType,
                amount,
                note,
                categoryId: category?.id ?? null,
                destinationWalletId: destWallet?.id ?? null,
                wallets: wallets.map((w) => ({
                  id: w.id,
                  name: w.name,
                  type: w.type,
                  currentBalance: w.currentBalance,
                  sufficient: w.currentBalance >= amount,
                })),
              }
            : null,
      };
    }

    if (txType !== 'TRANSFER' && !explicitCat && !historicalCat) {
      const llmSuggested =
        parsedSuggestedNewCategory?.name ??
        parsedAction?.suggestedNewCategory?.name ??
        null;
      const rawSuggested =
        llmSuggested ??
        suggestStandardCategoryIfMissing(
          categories,
          `${message} ${parsedAction.note}`,
          targetCatType
        );
      const coreTokenExisting = rawSuggested
        ? findExistingCategoryByCoreToken(categories, rawSuggested, targetCatType)
        : null;
      const suggestedName =
        rawSuggested &&
        !coreTokenExisting &&
        !isCategoryAlreadyOwned(categories, rawSuggested, targetCatType)
          ? toTitleCaseCategoryName(rawSuggested)
          : null;

      if (suggestedName) {
        const cleanCmdNote = note.replace(/"/g, '').trim() || suggestedName;
        const txLabelWord = txType === 'INCOME' ? 'pemasukan' : 'pengeluaran';
        const nearestExisting = categories.find(
          (c) =>
            c.id === parsedAction?.categoryId &&
            c.type === targetCatType &&
            !/^lain/i.test(c.name.trim())
        );
        const options: Array<{ label: string; messageToSend: string }> = [
          {
            label: `Buat ${suggestedName} & catat`,
            messageToSend: `Buat kategori ${suggestedName} catat ${txLabelWord} ${amount} "${cleanCmdNote}" dari ${wallet.name}`,
          },
          {
            label: 'Masukkan ke Lainnya',
            messageToSend: `Catat ${txLabelWord} ${amount} ${cleanCmdNote} [kategori: Lainnya] pakai ${wallet.name}`,
          },
        ];
        if (nearestExisting) {
          options.push({
            label: nearestExisting.name,
            messageToSend: `Catat ${txLabelWord} ${amount} ${cleanCmdNote} [kategori: ${nearestExisting.name}] pakai ${wallet.name}`,
          });
        }

        return {
          reply: `Kamu belum punya kategori ${suggestedName}. Mau dibuatkan sekalian?`,
          intent,
          actionExecuted: false,
          pendingConfirmation: false,
          cardType: null,
          cardData: null,
          card: {
            type: 'CHOICE_CARD',
            title: 'Pilih kategori untuk transaksi ini',
            options,
          },
        };
      }
    }

    if (executeImmediately) {
      const created = await createTransaction(
        userId,
        {
          walletId: wallet.id,
          destinationWalletId: destWallet?.id ?? null,
          categoryId: category?.id ?? null,
          type:
            txType === 'INCOME'
              ? TransactionType.INCOME
              : txType === 'TRANSFER'
                ? TransactionType.TRANSFER
                : TransactionType.EXPENSE,
          amount,
          note,
        },
        ipAddress
      );

      await logAudit({
        userId,
        action: 'AI_AUTO_RECORD',
        entityType: 'TRANSACTION',
        entityId: created.id,
        metadata: { amount, type: txType, note, via: 'AI_CHAT' },
        ipAddress,
      });

      const updatedWallet = await prisma.wallet.findUnique({
        where: { id: wallet.id },
        select: { currentBalance: true },
      });

      const catLabel = category?.name ?? (txType === 'TRANSFER' ? 'Transfer' : 'Lainnya');
      return {
        reply:
          reply ||
          `Beres! ${note} Rp ${amount.toLocaleString('id-ID')} sudah dicatat ke ${wallet.name} (${catLabel}).`,
        intent,
        actionExecuted: true,
        pendingConfirmation: false,
        cardType: 'TRANSACTION_CREATED',
        cardData: {
          transactionId: created.id,
          type: txType,
          amount,
          note,
          categoryId: category?.id ?? null,
          categoryName: category?.name ?? (txType === 'TRANSFER' ? 'Transfer' : 'Lainnya'),
          walletId: wallet.id,
          walletName: wallet.name,
          destinationWalletId: destWallet?.id ?? null,
          destinationWalletName: destWallet?.name ?? null,
          newWalletBalance: Number(updatedWallet?.currentBalance ?? projectedBalance),
        },
      };
    }

    return {
      reply:
        reply ||
        `Saya siapkan pencatatan ${txType === 'INCOME' ? 'pemasukan' : txType === 'TRANSFER' ? 'transfer' : 'pengeluaran'} "${note}" sebesar Rp ${amount.toLocaleString('id-ID')} di ${wallet.name}. Tekan Konfirmasi untuk menyimpan ke Transaksi.`,
      intent,
      actionExecuted: false,
      pendingConfirmation: true,
      cardType: 'TRANSACTION_PREVIEW',
      cardData: {
        intent,
        type: txType,
        amount,
        note,
        categoryId: category?.id ?? null,
        categoryName: category?.name ?? (txType === 'TRANSFER' ? 'Transfer' : 'Lainnya'),
        walletId: wallet.id,
        walletName: wallet.name,
        destinationWalletId: destWallet?.id ?? null,
        destinationWalletName: destWallet?.name ?? null,
        currentWalletBalance: wallet.currentBalance,
        projectedWalletBalance: projectedBalance,
      },
    };
  }

  if (!cardType && intent === 'FINANCIAL_ADVICE') {
    const q = message.toLowerCase();
    if (/rincian\s+pengeluaran|belanja\s+terbesar|pengeluaran\s+terbesar|spending\s+breakdown|kategori\s+boros/i.test(q)) {
      cardType = 'SPENDING_BREAKDOWN';
    } else if (/cek\s+dompet|cek\s+saldo|daftar\s+dompet|saldo\s+saya/i.test(q)) {
      cardType = 'WALLET';
    } else if (/cek\s+target|progress\s+target|status\s+target|cek\s+goal/i.test(q)) {
      cardType = 'GOAL';
    } else if (/cek\s+budget|anggaran|batas\s+pengeluaran/i.test(q)) {
      cardType = 'BUDGET';
    } else if (/ringkasan|arus\s+kas|surplus|defisit|kondisi\s+keuangan|sehat\s+nggak|skor\s+saw/i.test(q)) {
      cardType = 'SUMMARY';
    }
  }

  let cardData: Record<string, unknown> | null = null;
  if (cardType === 'FORECAST') {
    cardData = {
      forecast: forecastData.forecast,
      pacing: forecastData.pacing,
    };
  } else if (cardType === 'ANOMALY') {
    cardData = {
      anomalies: forecastData.anomalies.slice(0, 3),
    };
  } else if (cardType === 'BUDGET') {
    cardData = {
      budgets,
    };
  } else if (cardType === 'RECOMMENDATION') {
    cardData = {
      dailyBurnRate: forecastData.forecast.dailyBurnRate,
      projectedBalance: forecastData.forecast.projectedBalance,
      riskLevel: forecastData.forecast.riskLevel,
    };
  } else if (cardType === 'SPENDING_BREAKDOWN') {
    cardData = {
      spendingBreakdown,
    };
  } else if (cardType === 'SUMMARY') {
    const income = forecastData.forecast.totalIncomeMtd;
    const expense = forecastData.forecast.totalExpenseMtd;
    cardData = {
      summary: {
        period: spendingBreakdown.period,
        income,
        expense,
        remaining: income - expense,
        totalBalance,
        activeGoals: goals.length,
        sawScore: sawHealth.healthScore,
        sawStatus: sawHealth.statusLabel,
        sawClassification: sawHealth.classification,
      },
    };
  } else if (cardType === 'GOAL') {
    cardData = {
      goals: goals.slice(0, 4).map((g) => {
        const target = Number(g.targetAmount);
        const current = Number(g.currentAmount);
        return {
          id: g.id,
          name: g.name,
          targetAmount: target,
          currentAmount: current,
          remainingAmount: Math.max(0, target - current),
          percentage: target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0,
        };
      }),
    };
  } else if (cardType === 'WALLET') {
    cardData = {
      totalBalance,
      wallets: wallets.map((w) => ({
        id: w.id,
        name: w.name,
        type: w.type,
        currentBalance: w.currentBalance,
        sufficient: true,
      })),
    };
  }

  return {
    reply,
    intent,
    actionExecuted: false,
    pendingConfirmation: false,
    cardType,
    cardData,
  };
}
