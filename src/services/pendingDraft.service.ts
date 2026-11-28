import { CategoryType } from '@prisma/client';
import { resolveCategoryFallback } from './categoryIntelligence.service';

export type PendingDraftIntent =
  | 'CREATE_TRANSACTION'
  | 'TRANSFER'
  | 'SET_BUDGET'
  | 'DELETE_BUDGET'
  | 'CREATE_GOAL'
  | 'GOAL_CONTRIBUTE';

export interface CreateTransactionDraftData {
  type: 'EXPENSE' | 'INCOME';
  description?: string;
  descriptionLocked?: boolean;
  amount?: number;
  walletId?: string;
  categoryId?: string;
}

export interface TransferDraftData {
  amount?: number;
  fromWalletId?: string;
  toWalletId?: string;
}

export interface SetBudgetDraftData {
  name?: string;
  categoryId?: string;
  amount?: number;
  period?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
}

export interface DeleteBudgetDraftData {
  budgetId?: string;
}

export interface CreateGoalDraftData {
  name?: string;
  targetAmount?: number;
  deadline?: string;
  durationDays?: number;
  durationMonths?: number;
}

export interface GoalContributeDraftData {
  goalId?: string;
  amount?: number;
  sourceType?: 'WALLET' | 'EXTERNAL';
  walletId?: string;
}

export type PendingDraft =
  | { intent: 'CREATE_TRANSACTION'; data: CreateTransactionDraftData; updatedAt: number }
  | { intent: 'TRANSFER'; data: TransferDraftData; updatedAt: number }
  | { intent: 'SET_BUDGET'; data: SetBudgetDraftData; updatedAt: number }
  | { intent: 'DELETE_BUDGET'; data: DeleteBudgetDraftData; updatedAt: number }
  | { intent: 'CREATE_GOAL'; data: CreateGoalDraftData; updatedAt: number }
  | { intent: 'GOAL_CONTRIBUTE'; data: GoalContributeDraftData; updatedAt: number };

export interface ChatDraftCard {
  type: 'DRAFT_CARD';
  title: string;
  rows: Array<{ label: string; value: string; isMissing: boolean }>;
  hint: string;
  formRoute: {
    pathname: '/transaction/form' | '/budget/form' | '/goal/form';
    params?: Record<string, string>;
  };
}

export interface DraftContextData {
  wallets: Array<{ id: string; name: string; color?: string; currentBalance: number }>;
  categories: Array<{ id: string; name: string; type: CategoryType }>;
  goals: Array<{ id: string; name: string; targetAmount: number | string; currentAmount: number | string }>;
  budgets: Array<{ id: string; name?: string | null; categoryId: string; category: { name: string }; period: 'DAILY' | 'WEEKLY' | 'MONTHLY'; limitAmount: number }>;
}

const DRAFT_TTL_MS = 10 * 60 * 1000;
const draftStore = new Map<string, PendingDraft>();

export function getPendingDraft(userId: string, now = Date.now()): PendingDraft | null {
  const entry = draftStore.get(userId);
  if (!entry) return null;
  if (now - entry.updatedAt > DRAFT_TTL_MS) {
    draftStore.delete(userId);
    return null;
  }
  return entry;
}

export function setPendingDraft(userId: string, draft: PendingDraft): PendingDraft {
  const stamped = { ...draft, updatedAt: Date.now() } as PendingDraft;
  draftStore.set(userId, stamped);
  return stamped;
}

export function clearPendingDraft(userId: string): void {
  draftStore.delete(userId);
}

const GENERIC_ITEM_WORDS = new Set([
  'makan',
  'makanan',
  'makan pagi',
  'makan siang',
  'makan sore',
  'makan malam',
  'sarapan',
  'makan berat',
  'minum',
  'minuman',
  'minum dingin',
  'minum manis',
  'jajan',
  'jajanan',
  'cemilan',
  'snack',
  'jajan siang',
  'jajan malam',
  'jajan sore',
  'belanja',
  'belanjaan',
  'belanja harian',
  'belanja bulanan',
  'barang',
  'sesuatu',
  'kebutuhan',
  'keperluan',
  'pengeluaran',
  'transaksi',
]);

export function hasExactDescriptionBypass(message: string): string | null {
  const match = message.match(
    /\bdeskripsi\s+persis\s+([a-z0-9\s&._-]{2,40}?)(?:\s+pakai|\s+dari|$)/i
  );
  if (!match?.[1]) return null;
  const clean = match[1].trim();
  return clean.length >= 2 ? clean : null;
}

export function isGenericDescription(description?: string | null): boolean {
  if (!description) return true;
  const cleaned = description
    .toLowerCase()
    .replace(
      /\b(beli|bayar|buat|untuk|uang|biaya|pakai|pake|catat|pengeluaran|pemasukan|di|ke|dari)\b/gi,
      ' '
    )
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length < 2) return true;
  return GENERIC_ITEM_WORDS.has(cleaned);
}

export function getGenericItemPrompt(description?: string | null): {
  question: string;
  label: string;
} {
  const lower = (description ?? '').toLowerCase().trim();
  if (/\bmakan\s+siang\b/.test(lower)) {
    return { question: 'Makan siang apa yang kamu beli?', label: 'Makan siang' };
  }
  if (/\bmakan\s+malam\b/.test(lower)) {
    return { question: 'Makan malam apa yang kamu beli?', label: 'Makan malam' };
  }
  if (/\bmakan\s+pagi\b/.test(lower)) {
    return { question: 'Makan pagi apa yang kamu beli?', label: 'Makan pagi' };
  }
  if (/\bmakan\s+sore\b/.test(lower)) {
    return { question: 'Makan sore apa yang kamu beli?', label: 'Makan sore' };
  }
  if (/\bsarapan\b/.test(lower)) {
    return { question: 'Sarapan apa yang kamu beli?', label: 'Sarapan' };
  }
  if (/\bmakan\s+berat\b/.test(lower)) {
    return { question: 'Makan berat apa yang kamu beli?', label: 'Makan berat' };
  }
  if (/\bmakan(an)?\b/.test(lower)) {
    return { question: 'Makanan apa yang kamu beli?', label: 'Makanan' };
  }
  if (/\bjajan(an)?\b|\bcemilan\b|\bsnack\b/.test(lower)) {
    return { question: 'Jajanan apa yang kamu beli?', label: 'Jajanan' };
  }
  if (/\bminum(an)?\b/.test(lower)) {
    return { question: 'Minuman apa yang kamu beli?', label: 'Minuman' };
  }
  if (/\bbelanja(an)?\b/.test(lower)) {
    return { question: 'Barang apa yang kamu beli?', label: 'Belanja' };
  }
  return { question: 'Barang apa yang kamu beli?', label: 'Barang' };
}

export function isCancelDraftCommand(message: string): boolean {
  return /^(batal|gak\s*jadi|nggak\s*jadi|ga\s*jadi|cancel|reset)$/i.test(
    message.trim()
  );
}

export function isFreshCheckQuery(message: string): boolean {
  const q = message.trim().toLowerCase();
  if (/^(cek|cek\s+keuangan)$/i.test(q)) return true;
  if (
    /\b(cek|sisa|lihat|status|info)\s+(anggaran|budget|dompet|saldo|tabungan|target|goal|pengeluaran)\b/i.test(
      q
    )
  ) {
    return true;
  }
  if (
    /\b(ringkasan\s+bulan\s+ini|analisis\s+bulan\s+ini|kondisi\s+keuangan|rekap\s+bulan\s+ini|tabungan\s+saya|sisa\s+uang\s+saya|pengeluaran\s+(hari\s+ini|kemarin|minggu\s+ini|minggu\s+lalu|bulan\s+ini|bulan\s+lalu|\d+\s+hari\s+terakhir))\b/i.test(
      q
    )
  ) {
    return true;
  }
  return false;
}

export function parseIndonesianAmountFromText(text: string): number | undefined {
  const match = text.match(/\b(\d+(?:[.,]\d+)?)\s*(rb|ribu|k|jt|juta|m)?\b/i);
  if (!match) return undefined;
  const rawNum = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(rawNum) || rawNum <= 0) return undefined;
  const unit = (match[2] ?? '').toLowerCase();
  if (unit === 'jt' || unit === 'juta' || unit === 'm') {
    return Math.round(rawNum * 1_000_000);
  }
  if (unit === 'rb' || unit === 'ribu' || unit === 'k') {
    return Math.round(rawNum * 1_000);
  }
  if (rawNum < 1000 && !/\b(hari|minggu|bulan|tahun|transaksi)\b/i.test(text)) {
    return Math.round(rawNum * 1_000);
  }
  return Math.round(rawNum);
}

export function parsePeriodFromText(text: string): 'DAILY' | 'WEEKLY' | 'MONTHLY' | undefined {
  const q = text.toLowerCase();
  if (/\b(harian|per\s*hari|sehari|tiap\s*hari)\b/.test(q)) return 'DAILY';
  if (/\b(mingguan|per\s*minggu|seminggu|tiap\s*minggu)\b/.test(q)) return 'WEEKLY';
  if (/\b(bulanan|per\s*bulan|sebulan|tiap\s*bulan)\b/.test(q)) return 'MONTHLY';
  return undefined;
}

function findMentionedWalletsOrdered(
  text: string,
  wallets: DraftContextData['wallets']
) {
  const lower = text.toLowerCase();
  const matches: Array<{ wallet: DraftContextData['wallets'][number]; index: number }> = [];
  for (const w of wallets) {
    const idx = lower.indexOf(w.name.toLowerCase());
    if (idx !== -1) {
      matches.push({ wallet: w, index: idx });
    }
  }
  return matches.sort((a, b) => a.index - b.index).map((m) => m.wallet);
}

function extractCleanLabelText(
  message: string,
  wallets: DraftContextData['wallets'],
  extraStopRegex: RegExp
): string {
  let cleaned = message
    .replace(/\brp\s*/gi, ' ')
    .replace(/\b\d+(?:[.,]\d+)?\s*(rb|ribu|k|jt|juta|m)?\b/gi, ' ');

  for (const w of wallets) {
    const escaped = w.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleaned = cleaned.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), ' ');
  }

  cleaned = cleaned
    .replace(extraStopRegex, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length < 2) return '';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function extractDeterministicDraftSlots(
  message: string,
  ctx: DraftContextData
) {
  const amount = parseIndonesianAmountFromText(message);
  const period = parsePeriodFromText(message);
  const mentionedWallets = findMentionedWalletsOrdered(message, ctx.wallets);
  const matchedGoal = ctx.goals.find((g) =>
    message.toLowerCase().includes(g.name.toLowerCase())
  );
  const matchedBudget = ctx.budgets.find((b) => {
    const label = (b.name || b.category.name).toLowerCase();
    return message.toLowerCase().includes(label) || message.toLowerCase().includes(b.category.name.toLowerCase());
  });
  const isExternal = /\b(uang\s*luar|dana\s*luar|celengan|luar\s*dompet)\b/i.test(message);

  const daysMatch = message.match(/(\d+)\s*hari\b/i);
  const monthsMatch = message.match(/(\d+)\s*bulan\b/i);
  const durationDays = daysMatch ? Number(daysMatch[1]) : undefined;
  const durationMonths = monthsMatch ? Number(monthsMatch[1]) : undefined;

  return {
    amount,
    period,
    mentionedWallets,
    matchedGoal,
    matchedBudget,
    isExternal,
    durationDays,
    durationMonths,
  };
}

export function detectIncompleteDraftIntent(
  message: string,
  ctx: DraftContextData
): PendingDraft | null {
  const q = message.trim().toLowerCase();
  const slots = extractDeterministicDraftSlots(message, ctx);

  // 1. Transfer tidak lengkap
  if (/^(transfer|kirim\s+uang|pindah\s+saldo)(\s+.*)?$/i.test(q)) {
    return {
      intent: 'TRANSFER',
      data: {
        amount: slots.amount,
        fromWalletId: slots.mentionedWallets[0]?.id,
        toWalletId: slots.mentionedWallets[1]?.id,
      },
      updatedAt: Date.now(),
    };
  }

  // 2. Buat anggaran tidak lengkap
  if (
    /\b(buat|bikin|tambah|atur|pasang|set)\s+(anggaran|budget)\b/i.test(q) &&
    (!slots.amount || !slots.period)
  ) {
    const matchedCat = resolveCategoryFallback(ctx.categories, message, CategoryType.EXPENSE);
    const nonOtherCat = matchedCat && !/^lain/i.test(matchedCat.name) ? matchedCat : undefined;
    const rawName = extractCleanLabelText(
      message,
      ctx.wallets,
      /\b(aku|saya|mau|ingin|buat|bikin|tambah|atur|pasang|set|anggaran|budget|harian|mingguan|bulanan|per|hari|minggu|bulan|sehari|seminggu|sebulan)\b/gi
    );
    return {
      intent: 'SET_BUDGET',
      data: {
        name: rawName || nonOtherCat?.name,
        categoryId: nonOtherCat?.id,
        amount: slots.amount,
        period: slots.period,
      },
      updatedAt: Date.now(),
    };
  }

  // 3. Nabung / Target tabungan tidak lengkap
  if (/\b(mau\s+nabung|ingin\s+nabung|nabung|buat\s+target|bikin\s+target|target\s+tabungan)\b/i.test(q)) {
    if (slots.matchedGoal) {
      return {
        intent: 'GOAL_CONTRIBUTE',
        data: {
          goalId: slots.matchedGoal.id,
          amount: slots.amount,
          sourceType: slots.isExternal
            ? 'EXTERNAL'
            : slots.mentionedWallets[0]
              ? 'WALLET'
              : undefined,
          walletId: slots.mentionedWallets[0]?.id,
        },
        updatedAt: Date.now(),
      };
    }

    const goalName = extractCleanLabelText(
      message,
      ctx.wallets,
      /\b(aku|saya|mau|ingin|buat|bikin|nabung|tabungan|target|untuk|hari|bulan)\b/gi
    );
    if (!goalName || !slots.amount) {
      return {
        intent: 'CREATE_GOAL',
        data: {
          name: goalName || undefined,
          targetAmount: slots.amount,
          durationDays: slots.durationDays,
          durationMonths: slots.durationMonths,
        },
        updatedAt: Date.now(),
      };
    }
  }

  // 4. Pengeluaran / Pemasukan tidak lengkap atau item terlalu umum (misal "beli makan", "beli makanan 20rb pakai Uang Tunai")
  const bypassDesc = hasExactDescriptionBypass(message);
  const isIncomePhrase = /\b(gajian|terima\s+gaji|dapat\s+uang|pemasukan|catat\s+pemasukan)\b/i.test(q);
  const isExpensePhrase = /\b(beli|bayar|jajan|pengeluaran|catat\s+pengeluaran|mau\s+beli)\b/i.test(q);
  if (isIncomePhrase || isExpensePhrase) {
    const txType: 'INCOME' | 'EXPENSE' = isIncomePhrase ? 'INCOME' : 'EXPENSE';
    const catType = txType === 'INCOME' ? CategoryType.INCOME : CategoryType.EXPENSE;
    const rawDesc =
      bypassDesc ||
      extractCleanLabelText(
        message,
        ctx.wallets,
        /\b(aku|saya|mau|ingin|beli|bayar|catat|pengeluaran|pemasukan|pakai|pake|dari|via|di|ke|sesuatu|deskripsi|persis|konfirmasi)\b/gi
      );
    const isGeneric = !bypassDesc && isGenericDescription(rawDesc);
    const matchedCat =
      rawDesc && !isGeneric
        ? resolveCategoryFallback(ctx.categories, rawDesc, catType)
        : null;
    const nonOtherCat = matchedCat && !/^lain/i.test(matchedCat.name) ? matchedCat : undefined;

    if (!slots.amount || !slots.mentionedWallets[0] || !rawDesc || isGeneric) {
      return {
        intent: 'CREATE_TRANSACTION',
        data: {
          type: txType,
          description: rawDesc || (/\bjajan\b/i.test(q) ? 'Jajanan' : undefined),
          descriptionLocked: Boolean(bypassDesc),
          amount: slots.amount,
          walletId: slots.mentionedWallets[0]?.id,
          categoryId: nonOtherCat?.id,
        },
        updatedAt: Date.now(),
      };
    }
  }

  return null;
}

export function mergePendingDraft(
  existing: PendingDraft,
  message: string,
  ctx: DraftContextData
): PendingDraft {
  const slots = extractDeterministicDraftSlots(message, ctx);

  switch (existing.intent) {
    case 'CREATE_TRANSACTION': {
      const catType =
        existing.data.type === 'INCOME' ? CategoryType.INCOME : CategoryType.EXPENSE;
      const bypassDesc = hasExactDescriptionBypass(message);
      const newDesc =
        bypassDesc ||
        extractCleanLabelText(
          message,
          ctx.wallets,
          /\b(aku|saya|mau|beli|bayar|pakai|pake|dari|via|di|ke|deskripsi|persis|konfirmasi|catat|pengeluaran|pemasukan)\b/gi
        );
      const existingIsGeneric =
        !existing.data.descriptionLocked &&
        isGenericDescription(existing.data.description);
      const mergedDesc = bypassDesc
        ? bypassDesc
        : existingIsGeneric && newDesc
          ? newDesc
          : existing.data.description || newDesc || undefined;
      const locked = Boolean(bypassDesc) || Boolean(existing.data.descriptionLocked);
      const matchedCat = mergedDesc
        ? resolveCategoryFallback(ctx.categories, mergedDesc, catType)
        : null;
      return {
        intent: 'CREATE_TRANSACTION',
        data: {
          ...existing.data,
          description: mergedDesc,
          descriptionLocked: locked,
          amount: existing.data.amount ?? slots.amount,
          walletId: existing.data.walletId ?? slots.mentionedWallets[0]?.id,
          categoryId:
            existingIsGeneric && newDesc
              ? matchedCat?.id
              : existing.data.categoryId ?? matchedCat?.id,
        },
        updatedAt: Date.now(),
      };
    }

    case 'TRANSFER': {
      let fromId = existing.data.fromWalletId;
      let toId = existing.data.toWalletId;
      if (!fromId && slots.mentionedWallets[0]) {
        fromId = slots.mentionedWallets[0].id;
        if (!toId && slots.mentionedWallets[1]) {
          toId = slots.mentionedWallets[1].id;
        }
      } else if (fromId && !toId && slots.mentionedWallets[0]) {
        const candidate = slots.mentionedWallets.find((w) => w.id !== fromId);
        if (candidate) toId = candidate.id;
      }
      return {
        intent: 'TRANSFER',
        data: {
          amount: existing.data.amount ?? slots.amount,
          fromWalletId: fromId,
          toWalletId: toId,
        },
        updatedAt: Date.now(),
      };
    }

    case 'SET_BUDGET': {
      const newName = extractCleanLabelText(
        message,
        ctx.wallets,
        /\b(anggaran|budget|harian|mingguan|bulanan|per|hari|minggu|bulan|sehari|seminggu|sebulan)\b/gi
      );
      const mergedName = existing.data.name || newName || undefined;
      const matchedCat = mergedName
        ? resolveCategoryFallback(ctx.categories, mergedName, CategoryType.EXPENSE)
        : null;
      return {
        intent: 'SET_BUDGET',
        data: {
          name: mergedName,
          categoryId: existing.data.categoryId ?? matchedCat?.id,
          amount: existing.data.amount ?? slots.amount,
          period: existing.data.period ?? slots.period,
        },
        updatedAt: Date.now(),
      };
    }

    case 'DELETE_BUDGET': {
      return {
        intent: 'DELETE_BUDGET',
        data: {
          budgetId: existing.data.budgetId ?? slots.matchedBudget?.id,
        },
        updatedAt: Date.now(),
      };
    }

    case 'CREATE_GOAL': {
      const newName = extractCleanLabelText(
        message,
        ctx.wallets,
        /\b(target|tabungan|nabung|hari|bulan)\b/gi
      );
      return {
        intent: 'CREATE_GOAL',
        data: {
          name: existing.data.name || newName || undefined,
          targetAmount: existing.data.targetAmount ?? slots.amount,
          durationDays: existing.data.durationDays ?? slots.durationDays,
          durationMonths: existing.data.durationMonths ?? slots.durationMonths,
          deadline: existing.data.deadline,
        },
        updatedAt: Date.now(),
      };
    }

    case 'GOAL_CONTRIBUTE': {
      return {
        intent: 'GOAL_CONTRIBUTE',
        data: {
          goalId: existing.data.goalId ?? slots.matchedGoal?.id,
          amount: existing.data.amount ?? slots.amount,
          sourceType:
            existing.data.sourceType ??
            (slots.isExternal
              ? 'EXTERNAL'
              : slots.mentionedWallets[0]
                ? 'WALLET'
                : undefined),
          walletId: existing.data.walletId ?? slots.mentionedWallets[0]?.id,
        },
        updatedAt: Date.now(),
      };
    }
  }
}

export function evaluateDraftMissingSlots(draft: PendingDraft): string[] {
  switch (draft.intent) {
    case 'CREATE_TRANSACTION': {
      const missing: string[] = [];
      if (
        !draft.data.description ||
        (!draft.data.descriptionLocked && isGenericDescription(draft.data.description))
      ) {
        missing.push('description');
      }
      if (!draft.data.amount || draft.data.amount <= 0) missing.push('amount');
      if (!draft.data.walletId) missing.push('walletId');
      return missing;
    }
    case 'TRANSFER': {
      const missing: string[] = [];
      if (!draft.data.amount || draft.data.amount <= 0) missing.push('amount');
      if (!draft.data.fromWalletId) missing.push('fromWalletId');
      if (!draft.data.toWalletId) missing.push('toWalletId');
      return missing;
    }
    case 'SET_BUDGET': {
      const missing: string[] = [];
      if (!draft.data.name && !draft.data.categoryId) missing.push('category');
      if (!draft.data.amount || draft.data.amount <= 0) missing.push('amount');
      if (!draft.data.period) missing.push('period');
      return missing;
    }
    case 'DELETE_BUDGET': {
      return draft.data.budgetId ? [] : ['budgetId'];
    }
    case 'CREATE_GOAL': {
      const missing: string[] = [];
      if (!draft.data.name) missing.push('name');
      if (!draft.data.targetAmount || draft.data.targetAmount <= 0) {
        missing.push('targetAmount');
      }
      return missing;
    }
    case 'GOAL_CONTRIBUTE': {
      const missing: string[] = [];
      if (!draft.data.goalId) missing.push('goalId');
      if (!draft.data.amount || draft.data.amount <= 0) missing.push('amount');
      if (draft.data.sourceType !== 'EXTERNAL' && !draft.data.walletId) {
        missing.push('walletId');
      }
      return missing;
    }
  }
}

export function buildDraftCard(
  draft: PendingDraft,
  ctx: DraftContextData
): ChatDraftCard {
  const walletName = (id?: string) =>
    ctx.wallets.find((w) => w.id === id)?.name ?? 'Belum dipilih';
  const categoryName = (id?: string) =>
    ctx.categories.find((c) => c.id === id)?.name ?? 'Belum dipilih';

  switch (draft.intent) {
    case 'CREATE_TRANSACTION': {
      const isIncome = draft.data.type === 'INCOME';
      const itemMissing =
        !draft.data.description ||
        (!draft.data.descriptionLocked && isGenericDescription(draft.data.description));
      return {
        type: 'DRAFT_CARD',
        title: isIncome ? 'Draf Pemasukan' : 'Draf Pengeluaran',
        rows: [
          {
            label: isIncome ? 'Sumber' : 'Item',
            value: itemMissing
              ? draft.data.description
                ? 'Belum spesifik'
                : 'Belum diisi'
              : draft.data.description!,
            isMissing: itemMissing,
          },
          {
            label: 'Nominal',
            value: draft.data.amount
              ? `Rp ${draft.data.amount.toLocaleString('id-ID')}`
              : 'Belum diisi',
            isMissing: !draft.data.amount,
          },
          {
            label: 'Dompet',
            value: draft.data.walletId ? walletName(draft.data.walletId) : 'Belum dipilih',
            isMissing: !draft.data.walletId,
          },
        ],
        hint: itemMissing
          ? 'Contoh balas: Nasi padang pakai Uang Tunai'
          : 'Contoh balas: 25rb pakai Uang Tunai',
        formRoute: {
          pathname: '/transaction/form',
          params: {
            type: draft.data.type,
            ...(draft.data.amount ? { amount: String(draft.data.amount) } : {}),
            ...(draft.data.description ? { description: draft.data.description } : {}),
            ...(draft.data.walletId ? { walletId: draft.data.walletId } : {}),
            ...(draft.data.categoryId ? { categoryId: draft.data.categoryId } : {}),
          },
        },
      };
    }

    case 'TRANSFER':
      return {
        type: 'DRAFT_CARD',
        title: 'Draf Transfer',
        rows: [
          {
            label: 'Nominal',
            value: draft.data.amount
              ? `Rp ${draft.data.amount.toLocaleString('id-ID')}`
              : 'Belum diisi',
            isMissing: !draft.data.amount,
          },
          {
            label: 'Dari Dompet',
            value: draft.data.fromWalletId
              ? walletName(draft.data.fromWalletId)
              : 'Belum dipilih',
            isMissing: !draft.data.fromWalletId,
          },
          {
            label: 'Ke Dompet',
            value: draft.data.toWalletId
              ? walletName(draft.data.toWalletId)
              : 'Belum dipilih',
            isMissing: !draft.data.toWalletId,
          },
        ],
        hint: 'Contoh balas: 100rb dari BCA ke GoPay',
        formRoute: {
          pathname: '/transaction/form',
          params: {
            type: 'TRANSFER',
            ...(draft.data.amount ? { amount: String(draft.data.amount) } : {}),
            ...(draft.data.fromWalletId ? { walletId: draft.data.fromWalletId } : {}),
          },
        },
      };

    case 'SET_BUDGET': {
      const periodText =
        draft.data.period === 'DAILY'
          ? 'Harian'
          : draft.data.period === 'WEEKLY'
            ? 'Mingguan'
            : draft.data.period === 'MONTHLY'
              ? 'Bulanan'
              : 'Belum dipilih';
      return {
        type: 'DRAFT_CARD',
        title: 'Draf Anggaran',
        rows: [
          {
            label: 'Kategori',
            value: draft.data.name || (draft.data.categoryId ? categoryName(draft.data.categoryId) : 'Belum dipilih'),
            isMissing: !draft.data.name && !draft.data.categoryId,
          },
          {
            label: 'Batas Nominal',
            value: draft.data.amount
              ? `Rp ${draft.data.amount.toLocaleString('id-ID')}`
              : 'Belum diisi',
            isMissing: !draft.data.amount,
          },
          {
            label: 'Periode',
            value: periodText,
            isMissing: !draft.data.period,
          },
        ],
        hint: 'Contoh balas: Makan 50rb per hari',
        formRoute: {
          pathname: '/budget/form',
          params: {
            ...(draft.data.name ? { name: draft.data.name } : {}),
            ...(draft.data.amount ? { amount: String(draft.data.amount) } : {}),
            ...(draft.data.period ? { period: draft.data.period } : {}),
            ...(draft.data.categoryId ? { categoryId: draft.data.categoryId } : {}),
          },
        },
      };
    }

    case 'CREATE_GOAL':
      return {
        type: 'DRAFT_CARD',
        title: 'Draf Tabungan',
        rows: [
          {
            label: 'Nama Target',
            value: draft.data.name || 'Belum diisi',
            isMissing: !draft.data.name,
          },
          {
            label: 'Target Dana',
            value: draft.data.targetAmount
              ? `Rp ${draft.data.targetAmount.toLocaleString('id-ID')}`
              : 'Belum diisi',
            isMissing: !draft.data.targetAmount,
          },
        ],
        hint: 'Contoh balas: Dana Darurat 5jt',
        formRoute: {
          pathname: '/goal/form',
          params: {
            ...(draft.data.name ? { name: draft.data.name } : {}),
            ...(draft.data.targetAmount
              ? { targetAmount: String(draft.data.targetAmount) }
              : {}),
          },
        },
      };

    case 'GOAL_CONTRIBUTE': {
      const goalTitle =
        ctx.goals.find((g) => g.id === draft.data.goalId)?.name ?? 'Belum dipilih';
      return {
        type: 'DRAFT_CARD',
        title: 'Draf Setor Tabungan',
        rows: [
          {
            label: 'Target',
            value: goalTitle,
            isMissing: !draft.data.goalId,
          },
          {
            label: 'Nominal',
            value: draft.data.amount
              ? `Rp ${draft.data.amount.toLocaleString('id-ID')}`
              : 'Belum diisi',
            isMissing: !draft.data.amount,
          },
          {
            label: 'Sumber Dana',
            value:
              draft.data.sourceType === 'EXTERNAL'
                ? 'Dana Luar'
                : draft.data.walletId
                  ? walletName(draft.data.walletId)
                  : 'Belum dipilih',
            isMissing:
              draft.data.sourceType !== 'EXTERNAL' && !draft.data.walletId,
          },
        ],
        hint: 'Contoh balas: 200rb dari BCA',
        formRoute: {
          pathname: '/goal/form',
        },
      };
    }

    case 'DELETE_BUDGET':
      return {
        type: 'DRAFT_CARD',
        title: 'Hapus Anggaran',
        rows: [
          {
            label: 'Anggaran',
            value: 'Belum dipilih',
            isMissing: true,
          },
        ],
        hint: 'Pilih anggaran yang ingin dihapus',
        formRoute: {
          pathname: '/budget/form',
        },
      };
  }
}
