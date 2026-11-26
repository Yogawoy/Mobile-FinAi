import type { GoalCategoryKey, TransactionCategoryKey } from '@/types/api';

export type CategoryScope = 'expense' | 'income' | 'both';

export interface TransactionCategoryMeta {
  id: TransactionCategoryKey;
  label: string;
  shortLabel: string;
  appliesTo: CategoryScope;
  color: string;
  badgeBg: string;
  badgeText: string;
  aliases: string[];
}

export const TRANSACTION_CATEGORIES: TransactionCategoryMeta[] = [
  {
    id: 'food',
    label: 'Makanan & Minuman',
    shortLabel: 'Makanan',
    appliesTo: 'expense',
    color: '#7C7CE6',
    badgeBg: '#EDEAFC',
    badgeText: '#5F5ED4',
    aliases: ['food', 'makanan', 'makanan & minuman', 'food & dining', 'kuliner', 'coffee', 'kopi'],
  },
  {
    id: 'transport',
    label: 'Transportasi',
    shortLabel: 'Transportasi',
    appliesTo: 'expense',
    color: '#8E9AF7',
    badgeBg: '#E6F0FD',
    badgeText: '#3B6DB0',
    aliases: ['transport', 'transportasi', 'transportation', 'kendaraan', 'bensin', 'ojek'],
  },
  {
    id: 'shopping',
    label: 'Belanja',
    shortLabel: 'Belanja',
    appliesTo: 'expense',
    color: '#10B981',
    badgeBg: '#D0EFE5',
    badgeText: '#1B7354',
    aliases: ['shopping', 'belanja', 'belanja & kebutuhan', 'shopping & goods'],
  },
  {
    id: 'bills',
    label: 'Tagihan & Utilitas',
    shortLabel: 'Tagihan',
    appliesTo: 'expense',
    color: '#F97316',
    badgeBg: '#FCE2E0',
    badgeText: '#B83A38',
    aliases: ['bills', 'tagihan', 'tagihan & utilitas', 'bills & utilities', 'utilitas', 'listrik', 'wifi', 'air', 'pulsa', 'bill'],
  },
  {
    id: 'daily_needs',
    label: 'Kebutuhan Harian',
    shortLabel: 'Kebutuhan Harian',
    appliesTo: 'expense',
    color: '#0EA5E9',
    badgeBg: '#E0F2FE',
    badgeText: '#0369A1',
    aliases: ['daily_needs', 'kebutuhan harian', 'harian', 'laundry', 'barber', 'skincare', 'galon', 'gas', 'sabun'],
  },
  {
    id: 'housing',
    label: 'Tempat Tinggal',
    shortLabel: 'Tempat Tinggal',
    appliesTo: 'expense',
    color: '#6366F1',
    badgeBg: '#EEF2FF',
    badgeText: '#4338CA',
    aliases: ['housing', 'tempat tinggal', 'kos', 'kontrakan', 'sewa', 'hunian', 'ipl', 'servis ac'],
  },
  {
    id: 'entertainment',
    label: 'Hiburan',
    shortLabel: 'Hiburan',
    appliesTo: 'expense',
    color: '#F59E0B',
    badgeBg: '#FEF3C7',
    badgeText: '#B45309',
    aliases: ['entertainment', 'hiburan', 'rekreasi', 'nonton', 'bioskop', 'game', 'netflix', 'spotify'],
  },
  {
    id: 'health',
    label: 'Kesehatan',
    shortLabel: 'Kesehatan',
    appliesTo: 'expense',
    color: '#EC4899',
    badgeBg: '#FCE7F3',
    badgeText: '#BE185D',
    aliases: ['health', 'kesehatan', 'health & medical', 'medis', 'obat', 'apotek', 'dokter', 'gym'],
  },
  {
    id: 'education',
    label: 'Pendidikan',
    shortLabel: 'Pendidikan',
    appliesTo: 'expense',
    color: '#9F7AEA',
    badgeBg: '#E0E7FF',
    badgeText: '#4338CA',
    aliases: ['education', 'pendidikan', 'edukasi', 'kursus', 'kuliah', 'buku'],
  },
  {
    id: 'social',
    label: 'Sosial & Donasi',
    shortLabel: 'Sosial',
    appliesTo: 'expense',
    color: '#F43F5E',
    badgeBg: '#FFE4E6',
    badgeText: '#BE123C',
    aliases: ['social', 'sosial', 'sosial & donasi', 'donasi', 'sedekah', 'zakat', 'infaq', 'kado', 'kondangan', 'sumbangan'],
  },
  {
    id: 'debt',
    label: 'Cicilan & Utang',
    shortLabel: 'Cicilan',
    appliesTo: 'expense',
    color: '#EF4444',
    badgeBg: '#FEE2E2',
    badgeText: '#B91C1C',
    aliases: ['debt', 'cicilan', 'cicilan & utang', 'utang', 'hutang', 'pinjaman', 'kpr', 'paylater', 'kartu kredit'],
  },
  {
    id: 'electronics',
    label: 'Elektronik & Gadget',
    shortLabel: 'Elektronik',
    appliesTo: 'expense',
    color: '#06B6D4',
    badgeBg: '#CFFAFE',
    badgeText: '#0E7490',
    aliases: ['electronics', 'elektronik', 'elektronik & gadget', 'gadget', 'smartphone', 'handphone', 'laptop', 'aksesoris'],
  },
  {
    id: 'salary',
    label: 'Gaji & Pendapatan',
    shortLabel: 'Gaji',
    appliesTo: 'income',
    color: '#10B981',
    badgeBg: '#D0EFE5',
    badgeText: '#1B7354',
    aliases: ['salary', 'gaji', 'gaji pokok', 'gaji & pendapatan', 'pendapatan', 'upah'],
  },
  {
    id: 'freelance',
    label: 'Freelance',
    shortLabel: 'Freelance',
    appliesTo: 'income',
    color: '#3B82F6',
    badgeBg: '#DBEAFE',
    badgeText: '#1D4ED8',
    aliases: ['freelance', 'proyek freelance', 'jasa', 'proyek'],
  },
  {
    id: 'bonus',
    label: 'Bonus & Hadiah',
    shortLabel: 'Bonus',
    appliesTo: 'income',
    color: '#10B981',
    badgeBg: '#D0EFE5',
    badgeText: '#1B7354',
    aliases: ['bonus', 'bonus & hadiah', 'hadiah', 'thr', 'komisi', 'cashback', 'reward', 'uang saku'],
  },
  {
    id: 'business',
    label: 'Penjualan & Bisnis',
    shortLabel: 'Bisnis',
    appliesTo: 'income',
    color: '#14B8A6',
    badgeBg: '#CCFBF1',
    badgeText: '#0F766E',
    aliases: ['business', 'bisnis', 'penjualan', 'penjualan & bisnis', 'usaha', 'dagang', 'omzet'],
  },
  {
    id: 'investment',
    label: 'Investasi',
    shortLabel: 'Investasi',
    appliesTo: 'income',
    color: '#F59E0B',
    badgeBg: '#FEF3C7',
    badgeText: '#B45309',
    aliases: ['investment', 'investasi', 'dividen', 'dividen investasi', 'tabungan'],
  },
  {
    id: 'other',
    label: 'Lainnya',
    shortLabel: 'Lainnya',
    appliesTo: 'both',
    color: '#757A95',
    badgeBg: '#F4F3F9',
    badgeText: '#5F5ED4',
    aliases: ['other', 'lainnya', 'lain-lain'],
  },
];

export const EXPENSE_CATEGORIES = TRANSACTION_CATEGORIES.filter(
  (c) => c.appliesTo === 'expense' || c.appliesTo === 'both'
);

export const INCOME_CATEGORIES = TRANSACTION_CATEGORIES.filter(
  (c) => c.appliesTo === 'income' || c.appliesTo === 'both'
);

export const BUDGET_CATEGORIES = EXPENSE_CATEGORIES;

const TRANSACTION_ALIAS_MAP = new Map<string, TransactionCategoryMeta>();
for (const meta of TRANSACTION_CATEGORIES) {
  TRANSACTION_ALIAS_MAP.set(meta.id, meta);
  TRANSACTION_ALIAS_MAP.set(meta.label.toLowerCase(), meta);
  TRANSACTION_ALIAS_MAP.set(meta.shortLabel.toLowerCase(), meta);
  for (const alias of meta.aliases) {
    TRANSACTION_ALIAS_MAP.set(alias.toLowerCase(), meta);
  }
}

export function findTransactionCategory(raw?: string | null): TransactionCategoryMeta | undefined {
  if (!raw) return undefined;
  return TRANSACTION_ALIAS_MAP.get(raw.toLowerCase().trim());
}

export function normalizeTransactionCategory(raw?: string | null): TransactionCategoryKey {
  return findTransactionCategory(raw)?.id ?? 'other';
}

export function getTransactionCategoryLabel(
  raw?: string | null,
  variant: 'full' | 'short' = 'full'
): string {
  const matched = findTransactionCategory(raw);
  if (matched) {
    return variant === 'short' ? matched.shortLabel : matched.label;
  }
  const trimmed = raw?.trim();
  return trimmed || 'Lainnya';
}

export function getTransactionCategoryColor(raw?: string | null): string {
  return findTransactionCategory(raw)?.color ?? '#757A95';
}

export interface GoalCategoryMeta {
  id: GoalCategoryKey;
  label: string;
  shortLabel: string;
}

export const GOAL_CATEGORIES: GoalCategoryMeta[] = [
  { id: 'laptop', label: 'Gadget / Laptop', shortLabel: 'Gadget' },
  { id: 'travel', label: 'Liburan & Wisata', shortLabel: 'Liburan' },
  { id: 'emergency', label: 'Dana Darurat', shortLabel: 'Darurat' },
  { id: 'vehicle', label: 'Kendaraan', shortLabel: 'Kendaraan' },
  { id: 'home', label: 'Rumah & Properti', shortLabel: 'Properti' },
  { id: 'course', label: 'Pendidikan', shortLabel: 'Pendidikan' },
  { id: 'wedding', label: 'Pernikahan', shortLabel: 'Pernikahan' },
  { id: 'worship', label: 'Ibadah / Umroh', shortLabel: 'Ibadah' },
  { id: 'business', label: 'Modal Usaha', shortLabel: 'Modal Usaha' },
  { id: 'other', label: 'Lainnya', shortLabel: 'Lainnya' },
];

export function getGoalCategoryLabel(raw?: string | null): string {
  const key = raw?.toLowerCase().trim();
  return GOAL_CATEGORIES.find((g) => g.id === key)?.label || raw || 'Lainnya';
}
