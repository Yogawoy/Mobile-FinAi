import { CategoryType, GoalStatus, TransactionType, WalletType } from '@prisma/client';
import { z } from 'zod';
import { callGemini } from '../../config/gemini';
import { prisma } from '../../config/prisma';
import { logAudit } from '../../utils/audit';
import { deleteBudget, listBudgets, upsertBudget } from '../budgets/budgets.service';
import { contributeGoal } from '../goals/goals.service';
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
  | 'GOAL_CONTRIBUTE'
  | 'DELETE_GOAL'
  | 'UPSERT_BUDGET'
  | 'SET_BUDGET'
  | 'DELETE_BUDGET'
  | 'RESET_BUDGET'
  | 'FINANCIAL_ADVICE';

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
  walletId: z.string().trim().optional().nullable(),
  destinationWalletId: z.string().trim().optional().nullable(),
  categoryId: z.string().trim().optional().nullable(),
  goalId: z.string().trim().optional().nullable(),
});

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
  const pool = categories.filter((c) => c.type === txType);
  if (pool.length === 0) return undefined;
  const lower = text.toLowerCase();
  const explicitMatch = lower.match(/\bkategori\s+([a-z0-9][a-z0-9\s&._-]{1,30})/i);
  if (!explicitMatch?.[1]) return undefined;

  const target = explicitMatch[1].trim();
  return [...pool]
    .sort((a, b) => b.name.length - a.name.length)
    .find(
      (c) =>
        c.name.toLowerCase() === target ||
        target.includes(c.name.toLowerCase()) ||
        c.name.toLowerCase().includes(target)
    );
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
  const pool = categories.filter((c) => c.type === txType);
  if (pool.length === 0) return undefined;
  const lower = text.toLowerCase();

  // 1. Cek perintah eksplisit "kategori <nama>"
  const explicit = findExplicitCategory(categories, text, txType);
  if (explicit) return explicit;

  // 2. Cocokkan langsung nama kategori milik user (termasuk kategori custom, prioritas terpanjang)
  const byName = [...pool]
    .sort((a, b) => b.name.length - a.name.length)
    .find((c) => lower.includes(c.name.toLowerCase()));
  if (byName) return byName;

  // 3. Cocokkan token/kata bermakna dari nama kategori (misal "Kos & Sewa" -> "kos")
  const stopWords = new Set(['dan', 'atau', 'untuk', 'yang', 'lainnya', 'biaya', 'uang']);
  for (const cat of pool) {
    const tokens = cat.name
      .toLowerCase()
      .split(/[\s&/,._-]+/)
      .filter((t) => t.length >= 3 && !stopWords.has(t));
    for (const token of tokens) {
      const re = new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (re.test(lower)) return cat;
    }
  }

  // 4. Fallback ke keywordMap 20 kategori kehidupan sehari-hari
  const keywordMap: Array<{ re: RegExp; target: string[] }> = [
    { re: /pecel|nasi|makan|bakso|mie|soto|warteg|gofood|grabfood|lauk|sarapan|ayam|sate|geprek|nasi padang/i, target: ['makan', 'minum', 'kuliner'] },
    { re: /kopi|ngopi|cafe|boba|matcha|nonton|bioskop|karaoke|konser|game|steam|mlbb|valorant|hiburan/i, target: ['ngopi', 'hiburan', 'game'] },
    { re: /ojek|gojek|grab|maxim|bensin|pertamax|pertalite|parkir|tol|etoll|kereta|krl|mrt|bus|transjakarta|tiket/i, target: ['transport'] },
    { re: /ganti oli|\boli\b|servis motor|servis mobil|bengkel|tambal ban|cuci motor|cuci mobil|sparepart|ban motor/i, target: ['kendaraan', 'servis', 'otomotif'] },
    { re: /skincare|sunscreen|serum|facial|sabun muka|parfum|make\s?up|potong rambut|barbershop|salon|creambath/i, target: ['skincare', 'perawatan'] },
    { re: /belanja|baju|sepatu|tas|shopee|tokopedia|lazada|indomaret|alfamart|minimarket|supermarket/i, target: ['belanja'] },
    { re: /listrik|pln|token|pdam|\bair\b|wifi|internet|indihome|biznet|pulsa|kuota|paket data|bpjs|tagihan/i, target: ['tagihan', 'utilitas', 'pulsa', 'internet'] },
    { re: /netflix|spotify|youtube|icloud|google one|chatgpt|canva|disney|vidio|langganan/i, target: ['langganan', 'streaming', 'digital'] },
    { re: /\bkos\b|kosan|kontrakan|sewa kamar|ipl|kebersihan|keamanan|gas lpg|galon|aqua|hunian/i, target: ['kos', 'hunian', 'sewa'] },
    { re: /laundry|setrika|deterjen|sabun cuci|pel|sapu|perabot|peralatan rumah|rumah tangga/i, target: ['laundry', 'rumah tangga'] },
    { re: /obat|apotek|dokter|klinik|rumah sakit|puskesmas|vitamin|cek darah|gigi|kacamata|sehat/i, target: ['kesehatan', 'medis'] },
    { re: /\bgym\b|fitness|futsal|badminton|padel|renang|lari|sepeda|protein|whey|olahraga/i, target: ['olahraga', 'kebugaran', 'gym'] },
    { re: /buku|kuliah|spp|kursus|\bles\b|seminar|bootcamp|udemy|alat tulis|fotokopi|pendidikan/i, target: ['pendidikan', 'kursus', 'edukasi'] },
    { re: /kucing|anjing|whiskas|royal canin|pasir kucing|grooming|\bvet\b|dokter hewan|pakan|peliharaan/i, target: ['peliharaan', 'hewan', 'kucing'] },
    { re: /sedekah|infaq|zakat|donasi|amal|kotak amal|yatim|sumbangan/i, target: ['donasi', 'sedekah', 'amal'] },
    { re: /orang tua|ibu|ayah|adik|kakak|istri|suami|anak|keluarga|kondangan|arisan|kado/i, target: ['keluarga', 'sosial', 'kado'] },
    { re: /cicilan|angsuran|kredit|paylater|pinjaman|pajak|stnk|pbb/i, target: ['cicilan', 'kewajiban', 'pinjaman', 'tagihan'] },
    { re: /gaji|gajian|proyek|project|freelance|honor|upah|lembur/i, target: ['gaji', 'proyek'] },
    { re: /bonus|thr|hadiah|insentif|cashback|refund|angpao/i, target: ['bonus', 'hadiah'] },
    { re: /investasi|dividen|saham|reksadana|emas|jualan|omzet|profit|hasil usaha/i, target: ['investasi', 'dividen', 'bisnis', 'jualan'] },
  ];

  for (const rule of keywordMap) {
    if (rule.re.test(lower)) {
      const hit = pool.find((c) =>
        rule.target.some((t) => c.name.toLowerCase().includes(t))
      );
      if (hit) return hit;
    }
  }

  return pool[0];
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
  const isGoal = /\b(nabung|tabung|target|goal)\b/i.test(lower);
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
        type: 'EXPENSE',
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

export async function chatWithFinAi(params: {
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

  const [walletsRaw, categories, goals, forecastData, budgets, sawHealth, spendingBreakdown, userProfile] =
    await Promise.all([
      prisma.wallet.findMany({
        where: { userId, isArchived: false },
        select: { id: true, name: true, type: true, currentBalance: true },
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
    ]);

  const wallets = walletsRaw.map((w) => ({
    id: w.id,
    name: w.name,
    type: w.type,
    currentBalance: Number(w.currentBalance),
  }));

  const totalBalance = wallets.reduce((s, w) => s + w.currentBalance, 0);

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

    const matchedCat = matchBestCategory(categories, message, CategoryType.EXPENSE);
    let resolvedCategoryName = matchedCat?.name ?? '';

    if (!matchedCat) {
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

  const financialContext = {
    periode: `${month}/${year}`,
    totalSaldoDompetAktif: totalBalance,
    daftarDompet: wallets,
    daftarKategori: categories,
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
      };
      if (parsed.reply) reply = parsed.reply;
      if (
        parsed.intent === 'CREATE_TRANSACTION' ||
        parsed.intent === 'TRANSFER' ||
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

      const mentionedGoalWallets = findMentionedWallets(message, wallets);
      const srcWallet =
        mentionedGoalWallets[0] ??
        wallets.find((w) => w.id === parsedAction?.walletId);
      const destWallet =
        mentionedGoalWallets[1] ??
        wallets.find(
          (w) =>
            w.id === parsedAction?.destinationWalletId &&
            w.id !== srcWallet?.id
        );

      if (!srcWallet && wallets.length > 0) {
        return {
          reply: `Mau ambil uang dari dompet mana untuk setor Rp ${amount.toLocaleString('id-ID')} ke target "${goal.name}"?`,
          intent,
          actionExecuted: false,
          pendingConfirmation: false,
          cardType: 'WALLET_PICKER',
          cardData: {
            intent,
            goalId: goal.id,
            type: 'EXPENSE',
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
          reply: `Saldo dompet "${srcWallet.name}" belum cukup (tersedia Rp ${srcWallet.currentBalance.toLocaleString('id-ID')}, butuh Rp ${amount.toLocaleString('id-ID')}).${alternatives.length > 0 ? ' Pilih dompet lain di bawah:' : ''}`,
          intent,
          actionExecuted: false,
          pendingConfirmation: false,
          cardType: alternatives.length > 0 ? 'WALLET_PICKER' : null,
          cardData:
            alternatives.length > 0
              ? {
                  intent,
                  goalId: goal.id,
                  type: 'EXPENSE',
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

      const txTypeForGoal: 'TRANSFER' | 'EXPENSE' = destWallet ? 'TRANSFER' : 'EXPENSE';

      if (executeImmediately) {
        const updatedGoal = await contributeGoal(
          userId,
          goal.id,
          {
            amount,
            walletId: srcWallet?.id ?? null,
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
          metadata: { amount, walletId: srcWallet?.id, destinationWalletId: destWallet?.id, via: 'AI_CHAT' },
          ipAddress,
        });
        return {
          reply: `Beres! Setoran Rp ${amount.toLocaleString('id-ID')} ke target "${goal.name}" sudah dicatat${srcWallet ? ` dari ${srcWallet.name}` : ''}.`,
          intent,
          actionExecuted: true,
          pendingConfirmation: false,
          cardType: 'TRANSACTION_CREATED',
          cardData: {
            goalId: goal.id,
            type: txTypeForGoal,
            amount,
            note: `Setor ${goal.name}`,
            categoryName: 'Target Tabungan',
            walletId: srcWallet?.id,
            walletName: srcWallet?.name ?? goal.name,
            destinationWalletId: destWallet?.id ?? null,
            destinationWalletName: destWallet?.name ?? null,
            newWalletBalance: srcWallet
              ? Math.max(0, srcWallet.currentBalance - amount)
              : Number(updatedGoal.currentAmount),
          },
        };
      }

      return {
        reply:
          reply ||
          `Siap menyetor Rp ${amount.toLocaleString('id-ID')} ke target "${goal.name}"${srcWallet ? ` dari ${srcWallet.name}` : ''}${destWallet ? ` ke ${destWallet.name}` : ''}. Tekan Konfirmasi untuk menyimpan.`,
        intent,
        actionExecuted: false,
        pendingConfirmation: true,
        cardType: 'TRANSACTION_PREVIEW',
        cardData: {
          intent,
          goalId: goal.id,
          type: txTypeForGoal,
          amount,
          note: `Setor ${goal.name}`,
          categoryName: 'Target Tabungan',
          walletId: srcWallet?.id,
          walletName: srcWallet?.name ?? goal.name,
          destinationWalletId: destWallet?.id ?? null,
          destinationWalletName: destWallet?.name ?? null,
          currentWalletBalance: srcWallet?.currentBalance ?? Number(goal.currentAmount),
          projectedWalletBalance: srcWallet
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
    const explicitCat =
      txType === 'TRANSFER'
        ? null
        : findExplicitCategory(categories, message, targetCatType);
    const category =
      txType === 'TRANSFER'
        ? null
        : explicitCat ??
          categories.find(
            (c) =>
              c.id === parsedAction?.categoryId &&
              c.type === targetCatType
          ) ??
          matchBestCategory(
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
      budgets: budgets.slice(0, 4),
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
