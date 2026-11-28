import { BudgetPeriod, CategoryType, TransactionType } from '@prisma/client';
import { prisma } from '../config/prisma';
import { pickCategoryIcon } from '../constants/categoryIcons';
import { AppError } from '../utils/errors';

export interface ActiveCategoryItem {
  id: string;
  name: string;
  type: CategoryType;
}

export type CategoryConfidence = 'high' | 'medium' | 'low';

export interface CategoryResolutionResult {
  category: ActiveCategoryItem | null;
  source: 'EXPLICIT' | 'USER_HISTORY' | 'LLM' | 'FALLBACK_KEYWORD' | 'FALLBACK_OTHER' | 'NONE';
  confidence: CategoryConfidence;
}

const STOPWORDS = new Set([
  'beli',
  'bayar',
  'buat',
  'untuk',
  'di',
  'ke',
  'dari',
  'pakai',
  'pake',
  'via',
  'uang',
  'saldo',
  'transaksi',
  'catat',
  'catatkan',
  'tolong',
  'pengeluaran',
  'pemasukan',
  'keluar',
  'masuk',
  'terima',
  'dapat',
  'kasih',
  'kirim',
  'kemarin',
  'tadi',
  'hari',
  'ini',
  'minggu',
  'bulan',
  'lalu',
  'sekarang',
  'yang',
  'dan',
  'atau',
  'sama',
  'keperluan',
  'kategori',
]);

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normalizeTransactionDescription(
  rawText: string,
  walletNames: string[] = []
): string {
  let cleaned = rawText
    .toLowerCase()
    .replace(/\brp\s*/gi, ' ')
    .replace(/\b\d+(?:[.,]\d+)?\s*(rb|ribu|k|jt|juta|m)?\b/gi, ' ');

  for (const wName of walletNames) {
    const trimmed = wName.trim();
    if (trimmed.length >= 2) {
      cleaned = cleaned.replace(new RegExp(`\\b${escapeRegex(trimmed)}\\b`, 'gi'), ' ');
    }
  }

  const tokens = cleaned
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));

  return tokens.join(' ').trim();
}

export function hasExplicitOtherCategoryIntent(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    /\[kategori:\s*(lainnya|lain-lain|other)\s*\]/i.test(lower) ||
    /\bkategori\s+(lainnya|lain-lain|other)\b/i.test(lower) ||
    /\b(?:masukkan\s+ke|ke)\s+(lainnya|lain-lain|other)\b/i.test(lower)
  );
}

export function findExplicitCategoryInText<T extends ActiveCategoryItem>(
  categories: T[],
  text: string,
  txType: CategoryType
): T | null {
  const pool = categories.filter((c) => c.type === txType);
  if (pool.length === 0) return null;

  const lower = text.toLowerCase();
  const bracketMatch = lower.match(/\[kategori:\s*([^\]]+)\]/i);
  const explicitMatch = lower.match(/\bkategori\s+([a-z0-9][a-z0-9\s&._-]{1,30})/i);
  const target = (bracketMatch?.[1] ?? explicitMatch?.[1] ?? '').trim();

  if (target) {
    const matched = [...pool]
      .sort((a, b) => b.name.length - a.name.length)
      .find(
        (c) =>
          c.name.toLowerCase() === target ||
          target.includes(c.name.toLowerCase()) ||
          c.name.toLowerCase().includes(target)
      );
    if (matched) return matched;
  }

  if (hasExplicitOtherCategoryIntent(lower)) {
    return findFallbackOtherCategory(pool, txType);
  }

  return null;
}

export async function findHistoricalCategoryMatch<T extends ActiveCategoryItem>(params: {
  userId: string;
  type: CategoryType;
  text: string;
  categories: T[];
  walletNames?: string[];
}): Promise<T | null> {
  const { userId, type, text, categories, walletNames = [] } = params;
  const pool = categories.filter((c) => c.type === type);
  if (pool.length === 0) return null;

  const normalizedInput = normalizeTransactionDescription(text, walletNames);
  if (normalizedInput.length < 3) return null;

  const inputTokens = normalizedInput.split(' ').filter((t) => t.length >= 4);

  const recentTxs = await prisma.transaction.findMany({
    where: {
      userId,
      type,
      categoryId: { not: null },
      note: { not: null },
    },
    select: {
      note: true,
      categoryId: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 80,
  });

  const poolById = new Map(pool.map((c) => [c.id, c]));

  for (const tx of recentTxs) {
    if (!tx.categoryId || !tx.note) continue;
    const cat = poolById.get(tx.categoryId);
    if (!cat) continue;

    const histNorm = normalizeTransactionDescription(tx.note, walletNames);
    if (histNorm.length < 3) continue;

    if (histNorm === normalizedInput) {
      return cat;
    }

    if (
      histNorm.length >= 4 &&
      (normalizedInput.includes(histNorm) || histNorm.includes(normalizedInput))
    ) {
      return cat;
    }

    const histTokens = histNorm.split(' ').filter((t) => t.length >= 4);
    if (
      inputTokens.length > 0 &&
      histTokens.some((ht) => inputTokens.includes(ht))
    ) {
      return cat;
    }
  }

  return null;
}

export async function getRecentCategoryExamples(
  userId: string,
  limit = 10
): Promise<Array<{ note: string; categoryName: string; type: CategoryType }>> {
  const rows = await prisma.transaction.findMany({
    where: {
      userId,
      type: { in: [TransactionType.INCOME, TransactionType.EXPENSE] },
      categoryId: { not: null },
      note: { not: null },
    },
    select: {
      note: true,
      type: true,
      category: { select: { name: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 40,
  });

  const seen = new Set<string>();
  const examples: Array<{ note: string; categoryName: string; type: CategoryType }> = [];

  for (const row of rows) {
    const cleanNote = row.note?.trim();
    const catName = row.category?.name?.trim();
    if (!cleanNote || !catName) continue;
    const catType =
      row.type === TransactionType.INCOME ? CategoryType.INCOME : CategoryType.EXPENSE;
    const key = `${catType}:${cleanNote.toLowerCase()}:${catName.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    examples.push({
      note: cleanNote,
      categoryName: catName,
      type: catType,
    });
    if (examples.length >= limit) break;
  }

  return examples;
}

export function findFallbackOtherCategory<T extends ActiveCategoryItem>(
  categories: T[],
  type: CategoryType
): T | null {
  const pool = categories.filter((c) => c.type === type);
  return (
    pool.find((c) => /^lainnya$/i.test(c.name.trim())) ??
    pool.find((c) => /lain|other/i.test(c.name)) ??
    null
  );
}

export async function ensureOtherCategory(
  userId: string,
  type: CategoryType
): Promise<ActiveCategoryItem> {
  const existing = await prisma.category.findFirst({
    where: {
      userId,
      type,
      OR: [
        { name: { equals: 'Lainnya', mode: 'insensitive' } },
        { name: { contains: 'lain', mode: 'insensitive' } },
        { name: { equals: 'Other', mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, type: true },
  });
  if (existing) return existing;

  return prisma.category.create({
    data: {
      userId,
      name: 'Lainnya',
      type,
      icon: 'Tag',
      color: type === CategoryType.INCOME ? '#059669' : '#64748B',
      isDefault: false,
    },
    select: { id: true, name: true, type: true },
  });
}

export function resolveCategoryFallback<T extends ActiveCategoryItem>(
  categories: T[],
  text: string,
  type: CategoryType
): T | null {
  const pool = categories.filter((c) => c.type === type);
  if (pool.length === 0) return null;

  const explicit = findExplicitCategoryInText(pool, text, type);
  if (explicit) return explicit;

  const lower = text.toLowerCase();

  // 1. Cocokkan langsung nama kategori user (prioritas terpanjang agar kategori spesifik menang)
  const byName = [...pool]
    .sort((a, b) => b.name.length - a.name.length)
    .find((c) => lower.includes(c.name.toLowerCase()));
  if (byName) return byName;

  // 2. Cocokkan token bermakna dari nama kategori user
  const catStopWords = new Set(['dan', 'atau', 'untuk', 'yang', 'lainnya', 'biaya', 'uang']);
  for (const cat of pool) {
    const tokens = cat.name
      .toLowerCase()
      .split(/[\s&/,._-]+/)
      .filter((t) => t.length >= 3 && !catStopWords.has(t));
    for (const token of tokens) {
      const re = new RegExp(`\\b${escapeRegex(token)}\\b`, 'i');
      if (re.test(lower)) return cat;
    }
  }

  // 3. Kamus objek/tujuan (objek selalu didahulukan sebelum nama toko/platform)
  if (type === CategoryType.EXPENSE) {
    const objectRules: Array<{ re: RegExp; targets: string[] }> = [
      { re: /\b(obat|apotek|dokter|klinik|rumah sakit|puskesmas|vitamin|cek darah|gigi|kacamata)\b/i, targets: ['kesehatan', 'medis'] },
      { re: /\b(skincare|sunscreen|serum|facial|sabun muka|parfum|make\s?up|salon|barbershop|potong rambut)\b/i, targets: ['skincare', 'perawatan'] },
      { re: /\b(buku|kursus|les|kuliah|spp|ukm|skripsi|seminar|sekolah|pendidikan|alat tulis)\b/i, targets: ['pendidikan', 'belajar', 'skripsi'] },
      { re: /\b(top\s?up|diamond|mlbb|mobile legends|valorant|steam|game|ps5|nintendo|roblox)\b/i, targets: ['game', 'hiburan'] },
      { re: /\b(whiskas|royal canin|pasir kucing|kucing|anjing|petshop|pakan)\b/i, targets: ['kucing', 'hewan', 'peliharaan'] },
      { re: /\b(cilok|seblak|gorengan|pentol|martabak|boba|mixue|es teh|kopi|ngopi|cafe|matcha|snack|batagor|siomay|jajanan|cemilan)\b/i, targets: ['jajan', 'cemilan', 'ngopi', 'makan'] },
      { re: /\b(pecel|nasi|makan|bakso|mie|soto|warteg|gofood|grabfood|sarapan|ayam|sate|geprek|nasi padang|nasi goreng|makan siang|makan malam)\b/i, targets: ['makan', 'minum', 'kuliner'] },
      { re: /\b(ojek|gojek|grab|maxim|bensin|pertamax|pertalite|parkir|tol|etoll|kereta|krl|mrt|bus|transjakarta)\b/i, targets: ['transport'] },
      { re: /\b(ganti oli|\boli\b|servis motor|servis mobil|bengkel|tambal ban|cuci motor|cuci mobil|sparepart)\b/i, targets: ['kendaraan', 'servis', 'otomotif'] },
      { re: /\b(listrik|pln|token|pdam|wifi|internet|indihome|biznet|pulsa|kuota|paket data|bpjs|tagihan)\b/i, targets: ['tagihan', 'utilitas', 'pulsa', 'internet'] },
      { re: /\b(netflix|spotify|youtube|icloud|google one|chatgpt|canva|disney|vidio|langganan)\b/i, targets: ['langganan', 'streaming', 'digital'] },
      { re: /\b(kos|kosan|kontrakan|sewa kamar|ipl|gas lpg|galon|aqua|hunian)\b/i, targets: ['kos', 'hunian', 'sewa'] },
      { re: /\b(laundry|setrika|deterjen|sabun cuci|perabot|rumah tangga)\b/i, targets: ['laundry', 'rumah tangga'] },
      { re: /\b(gym|fitness|futsal|badminton|padel|renang|lari|sepeda|olahraga)\b/i, targets: ['olahraga', 'kebugaran', 'gym'] },
      { re: /\b(nonton|bioskop|karaoke|konser|hiburan)\b/i, targets: ['hiburan'] },
      { re: /\b(baju|sepatu|tas|celana|kaos|belanja)\b/i, targets: ['belanja'] },
    ];

    for (const rule of objectRules) {
      if (rule.re.test(lower)) {
        for (const t of rule.targets) {
          const hit = pool.find((c) => c.name.toLowerCase().includes(t));
          if (hit) return hit;
        }
      }
    }
  } else {
    const incomeRules: Array<{ re: RegExp; targets: string[] }> = [
      { re: /\b(gaji|gajian|payroll|upah|thr)\b/i, targets: ['gaji', 'upah'] },
      { re: /\b(bonus|insentif|komisi)\b/i, targets: ['bonus'] },
      { re: /\b(freelance|proyek|project|jasa|fee|klien)\b/i, targets: ['freelance', 'sampingan', 'usaha'] },
      { re: /\b(dividen|bunga|deposito|reksadana|saham|investasi|profit)\b/i, targets: ['investasi'] },
      { re: /\b(hadiah|angpau|pemberian|transfer masuk)\b/i, targets: ['hadiah'] },
    ];

    for (const rule of incomeRules) {
      if (rule.re.test(lower)) {
        const hit = pool.find((c) =>
          rule.targets.some((t) => c.name.toLowerCase().includes(t))
        );
        if (hit) return hit;
      }
    }
  }

  // 4. Fallback darurat aman: hanya ke "Lainnya" / "Lain-lain", DILARANG ke categories[0]
  return findFallbackOtherCategory(pool, type);
}

export async function resolveCategoryForCommand<T extends ActiveCategoryItem>(params: {
  userId: string;
  type: CategoryType;
  text: string;
  categories: T[];
  walletNames?: string[];
  allowOtherFallback?: boolean;
}): Promise<T | null> {
  const {
    userId,
    type,
    text,
    categories,
    walletNames = [],
    allowOtherFallback = true,
  } = params;
  const pool = categories.filter((c) => c.type === type);
  if (pool.length === 0) return null;

  const explicit = findExplicitCategoryInText(pool, text, type);
  if (explicit) return explicit;

  const historical = await findHistoricalCategoryMatch({
    userId,
    type,
    text,
    categories: pool,
    walletNames,
  });
  if (historical) return historical;

  const fallback = resolveCategoryFallback(pool, text, type);
  if (!allowOtherFallback && fallback && /^lain/i.test(fallback.name.trim())) {
    return null;
  }
  return fallback;
}

export function toTitleCaseCategoryName(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .slice(0, 2)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ');
}

export function getCategoryVisualDefaults(
  name: string,
  type: CategoryType,
  usedIcons: string[] = []
): { icon: string; color: string } {
  const icon = pickCategoryIcon(name, undefined, usedIcons);
  const lower = name.toLowerCase();
  let color = type === CategoryType.INCOME ? '#059669' : '#2563EB';
  if (/kesehatan|medis|obat|dokter/.test(lower)) color = '#DC2626';
  else if (/pendidikan|belajar|kursus|skripsi|buku/.test(lower)) color = '#2563EB';
  else if (/game|hiburan/.test(lower)) color = '#0EA5E9';
  else if (/skincare|perawatan|kecantikan/.test(lower)) color = '#EC4899';
  else if (/hewan|kucing|anjing|peliharaan/.test(lower)) color = '#D97706';
  else if (/olahraga|gym|fitness|donasi|sedekah|zakat|amal/.test(lower)) color = '#059669';
  else if (/makan|minum|jajan|kopi|kuliner/.test(lower)) color = '#EA580C';

  return { icon, color };
}

export function findExistingCategoryByCoreToken<T extends ActiveCategoryItem>(
  categories: T[],
  suggestedName: string,
  type: CategoryType
): T | null {
  const clean = suggestedName.trim().toLowerCase();
  if (!clean) return null;
  const pool = categories.filter((c) => c.type === type);

  const exact = pool.find((c) => c.name.toLowerCase() === clean);
  if (exact) return exact;

  const stopTokens = new Set(['dan', 'atau', 'untuk', 'yang', 'lainnya', 'biaya', 'uang']);
  const coreTokens = clean
    .split(/[\s&/,._-]+/)
    .filter((t) => t.length >= 3 && !stopTokens.has(t));

  for (const token of coreTokens) {
    const match = pool.find((c) => c.name.toLowerCase().includes(token));
    if (match) return match;
  }

  return null;
}

const STANDARD_SUGGESTABLE_CATEGORIES: Array<{
  name: string;
  re: RegExp;
  equivalentTerms: string[];
}> = [
  {
    name: 'Kesehatan',
    re: /\b(obat|apotek|dokter|klinik|rumah sakit|puskesmas|vitamin|cek darah|gigi|kacamata|kesehatan)\b/i,
    equivalentTerms: ['kesehatan', 'medis', 'obat'],
  },
  {
    name: 'Pendidikan',
    re: /\b(buku|kursus|les|kuliah|spp|skripsi|seminar|sekolah|pendidikan|alat tulis)\b/i,
    equivalentTerms: ['pendidikan', 'belajar', 'kursus', 'edukasi', 'skripsi'],
  },
  {
    name: 'Hewan',
    re: /\b(whiskas|royal canin|pasir kucing|kucing|anjing|petshop|pakan|hewan|peliharaan)\b/i,
    equivalentTerms: ['hewan', 'kucing', 'anjing', 'peliharaan'],
  },
  {
    name: 'Olahraga',
    re: /\b(gym|fitness|futsal|badminton|padel|renang|lari|sepeda|olahraga)\b/i,
    equivalentTerms: ['olahraga', 'kebugaran', 'gym'],
  },
  {
    name: 'Skincare',
    re: /\b(skincare|sunscreen|serum|facial|sabun muka|parfum|make\s?up)\b/i,
    equivalentTerms: ['skincare', 'perawatan', 'kecantikan'],
  },
  {
    name: 'Game',
    re: /\b(top\s?up|diamond|mlbb|mobile legends|valorant|steam|game|ps5|nintendo|roblox)\b/i,
    equivalentTerms: ['game', 'gaming'],
  },
  {
    name: 'Donasi',
    re: /\b(sedekah|infaq|zakat|donasi|amal|yatim|sumbangan)\b/i,
    equivalentTerms: ['donasi', 'sedekah', 'amal', 'zakat'],
  },
];

export function isCategoryAlreadyOwned<T extends ActiveCategoryItem>(
  categories: T[],
  candidateName: string,
  type: CategoryType
): boolean {
  const clean = candidateName.trim().toLowerCase();
  if (!clean) return true;
  const pool = categories.filter((c) => c.type === type);

  if (
    pool.some(
      (c) =>
        c.name.toLowerCase() === clean ||
        c.name.toLowerCase().includes(clean) ||
        clean.includes(c.name.toLowerCase())
    )
  ) {
    return true;
  }

  const matchedRule = STANDARD_SUGGESTABLE_CATEGORIES.find(
    (r) => r.name.toLowerCase() === clean
  );
  if (matchedRule) {
    return pool.some((c) =>
      matchedRule.equivalentTerms.some((t) => c.name.toLowerCase().includes(t))
    );
  }

  return false;
}

export function suggestStandardCategoryIfMissing<T extends ActiveCategoryItem>(
  categories: T[],
  text: string,
  type: CategoryType
): string | null {
  if (type !== CategoryType.EXPENSE) return null;
  for (const rule of STANDARD_SUGGESTABLE_CATEGORIES) {
    if (rule.re.test(text)) {
      if (!isCategoryAlreadyOwned(categories, rule.name, type)) {
        return rule.name;
      }
      return null;
    }
  }
  return null;
}

export async function createCategoryAndTransactionAtomic(params: {
  userId: string;
  categoryName: string;
  type: CategoryType;
  walletId: string;
  amount: number;
  note: string;
  transactionDate?: Date;
}) {
  const cleanName = toTitleCaseCategoryName(params.categoryName);
  if (!cleanName) {
    throw new AppError('Nama kategori tidak valid', 400);
  }

  return prisma.$transaction(async (tx) => {
    let category = await tx.category.findFirst({
      where: {
        userId: params.userId,
        type: params.type,
        name: { equals: cleanName, mode: 'insensitive' },
      },
    });
    let isNewCategory = false;

    if (!category) {
      const existingIcons = await tx.category.findMany({
        where: { userId: params.userId, type: params.type },
        select: { icon: true },
      });
      const visuals = getCategoryVisualDefaults(
        cleanName,
        params.type,
        existingIcons.map((c) => c.icon)
      );
      category = await tx.category.create({
        data: {
          userId: params.userId,
          name: cleanName,
          type: params.type,
          icon: visuals.icon,
          color: visuals.color,
          isDefault: false,
        },
      });
      isNewCategory = true;
    }

    const wallet = await tx.wallet.findFirst({
      where: { id: params.walletId, userId: params.userId, isArchived: false },
    });
    if (!wallet) {
      throw new AppError('Dompet tidak ditemukan', 404);
    }

    const currentBalance = Number(wallet.currentBalance);
    if (params.type === CategoryType.EXPENSE && currentBalance < params.amount) {
      throw new AppError(
        `Saldo dompet "${wallet.name}" tidak mencukupi (tersedia Rp ${currentBalance.toLocaleString('id-ID')})`,
        400
      );
    }

    const txType =
      params.type === CategoryType.INCOME
        ? TransactionType.INCOME
        : TransactionType.EXPENSE;

    const transaction = await tx.transaction.create({
      data: {
        userId: params.userId,
        walletId: wallet.id,
        categoryId: category.id,
        type: txType,
        amount: params.amount,
        note: params.note.trim() || category.name,
        transactionDate: params.transactionDate ?? new Date(),
      },
    });

    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        currentBalance:
          params.type === CategoryType.INCOME
            ? { increment: params.amount }
            : { decrement: params.amount },
      },
      select: { currentBalance: true },
    });

    return {
      transaction,
      category,
      isNewCategory,
      newWalletBalance: Number(updatedWallet.currentBalance),
    };
  });
}

export async function createCategoryAndBudgetAtomic(params: {
  userId: string;
  categoryName: string;
  month: number;
  year: number;
  period: BudgetPeriod;
  limitAmount: number;
}) {
  const cleanName = toTitleCaseCategoryName(params.categoryName);
  if (!cleanName) {
    throw new AppError('Nama kategori tidak valid', 400);
  }

  return prisma.$transaction(async (tx) => {
    let category = await tx.category.findFirst({
      where: {
        userId: params.userId,
        type: CategoryType.EXPENSE,
        name: { equals: cleanName, mode: 'insensitive' },
      },
    });
    let isNewCategory = false;

    if (!category) {
      const existingIcons = await tx.category.findMany({
        where: { userId: params.userId, type: CategoryType.EXPENSE },
        select: { icon: true },
      });
      const visuals = getCategoryVisualDefaults(
        cleanName,
        CategoryType.EXPENSE,
        existingIcons.map((c) => c.icon)
      );
      category = await tx.category.create({
        data: {
          userId: params.userId,
          name: cleanName,
          type: CategoryType.EXPENSE,
          icon: visuals.icon,
          color: visuals.color,
          isDefault: false,
        },
      });
      isNewCategory = true;
    }

    const budget = await tx.budget.upsert({
      where: {
        userId_categoryId_month_year: {
          userId: params.userId,
          categoryId: category.id,
          month: params.month,
          year: params.year,
        },
      },
      update: {
        period: params.period,
        limitAmount: params.limitAmount,
      },
      create: {
        userId: params.userId,
        categoryId: category.id,
        month: params.month,
        year: params.year,
        period: params.period,
        limitAmount: params.limitAmount,
        alertThresholdPct: 80,
      },
      include: { category: true },
    });

    return {
      budget,
      category,
      isNewCategory,
    };
  });
}
