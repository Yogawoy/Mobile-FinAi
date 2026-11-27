import { getWalletTheme, type WalletColorKey, type WalletTypeKey } from './walletTheme';

export type TransactionMode = 'EXPENSE' | 'INCOME' | 'TRANSFER';

export interface WalletItem {
  id: string;
  name: string;
  shortName?: string;
  type: WalletTypeKey;
  last4: string;
  balance: number;
  colorKey?: WalletColorKey;
  isArchived?: boolean;
  dotColor?: string;
  gradient: [string, string, string];
}

export type CategoryIconKey =
  | 'utensils'
  | 'car'
  | 'shopping'
  | 'zap'
  | 'briefcase'
  | 'coffee'
  | 'wallet';

export interface TransactionItem {
  id: string;
  title: string;
  categoryKey: CategoryIconKey;
  categoryLabel: string;
  walletId: string;
  walletName: string;
  targetWalletId?: string;
  targetWalletName?: string;
  dateGroup?: string;
  dateLabel: string;
  amount: number;
  type: TransactionMode;
  note?: string;
  iconBg: string;
  iconColor: string;
}

export interface CategoryOption {
  key: CategoryIconKey;
  label: string;
  iconBg: string;
  iconColor: string;
}

export const INITIAL_WALLETS: WalletItem[] = [
  {
    id: 'bca',
    name: 'Bank BCA',
    shortName: 'Bank BCA',
    type: 'BANK',
    last4: '•••• 4821',
    balance: 2_500_000,
    colorKey: 'royal',
    isArchived: false,
    dotColor: getWalletTheme('BANK', 'royal').dotColor,
    gradient: getWalletTheme('BANK', 'royal').gradient,
  },
  {
    id: 'gopay',
    name: 'GoPay',
    shortName: 'GoPay',
    type: 'EWALLET',
    last4: '•••• 8812',
    balance: 850_000,
    colorKey: 'teal',
    isArchived: false,
    dotColor: getWalletTheme('EWALLET', 'teal').dotColor,
    gradient: getWalletTheme('EWALLET', 'teal').gradient,
  },
  {
    id: 'mandiri',
    name: 'Tabungan Mandiri',
    shortName: 'Mandiri',
    type: 'SAVINGS',
    last4: '•••• 3309',
    balance: 1_000_000,
    colorKey: 'navy',
    isArchived: false,
    dotColor: getWalletTheme('SAVINGS', 'navy').dotColor,
    gradient: getWalletTheme('SAVINGS', 'navy').gradient,
  },
  {
    id: 'cash',
    name: 'Uang Tunai',
    shortName: 'Uang Tunai',
    type: 'CASH',
    last4: 'Dompet Fisik',
    balance: 500_000,
    colorKey: 'slate',
    isArchived: false,
    dotColor: getWalletTheme('CASH', 'slate').dotColor,
    gradient: getWalletTheme('CASH', 'slate').gradient,
  },
];

export const INITIAL_SUMMARY = {
  income: 6_200_000,
  expense: 1_350_000,
  budgetLabel: 'Anggaran Nov 2026',
  budgetLimit: 4_000_000,
  aiScore: 84,
  aiInsight: 'Proyeksi akhir bulan aman, pengeluaran turun 12%',
};

export const INITIAL_TRANSACTIONS: TransactionItem[] = [
  {
    id: 'tx-1',
    title: 'Makan Siang Ayam Bakar',
    categoryKey: 'utensils',
    categoryLabel: 'Makanan',
    walletId: 'gopay',
    walletName: 'GoPay',
    dateGroup: 'Hari Ini, 22 Nov 2026',
    dateLabel: '12:30',
    amount: 45_000,
    type: 'EXPENSE',
    note: 'Makan siang di kantin bersama tim',
    iconBg: '#EBF2FF',
    iconColor: '#3B7AF5',
  },
  {
    id: 'tx-2',
    title: 'Top Up Saldo GoPay',
    categoryKey: 'wallet',
    categoryLabel: 'Transfer',
    walletId: 'bca',
    walletName: 'Bank BCA',
    targetWalletId: 'gopay',
    targetWalletName: 'GoPay',
    dateGroup: 'Hari Ini, 22 Nov 2026',
    dateLabel: '09:15',
    amount: 300_000,
    type: 'TRANSFER',
    note: 'Isi saldo GoPay untuk transport & makan',
    iconBg: '#EBF2FF',
    iconColor: '#3B7AF5',
  },
  {
    id: 'tx-3',
    title: 'Kopi Susu Gula Aren',
    categoryKey: 'coffee',
    categoryLabel: 'Harian',
    walletId: 'cash',
    walletName: 'Uang Tunai',
    dateGroup: 'Hari Ini, 22 Nov 2026',
    dateLabel: '08:10',
    amount: 22_000,
    type: 'EXPENSE',
    note: 'Kopi pagi sebelum mulai kerja',
    iconBg: '#F8FAFC',
    iconColor: '#475569',
  },
  {
    id: 'tx-4',
    title: 'Gaji Proyek UI Freelance',
    categoryKey: 'briefcase',
    categoryLabel: 'Gaji / Proyek',
    walletId: 'bca',
    walletName: 'Bank BCA',
    dateGroup: 'Kemarin, 21 Nov 2026',
    dateLabel: '17:15',
    amount: 2_500_000,
    type: 'INCOME',
    note: 'Pembayaran termin 2 desain aplikasi mobile',
    iconBg: '#ECFDF5',
    iconColor: '#10B981',
  },
  {
    id: 'tx-5',
    title: 'GrabBike ke Stasiun',
    categoryKey: 'car',
    categoryLabel: 'Transportasi',
    walletId: 'gopay',
    walletName: 'GoPay',
    dateGroup: 'Kemarin, 21 Nov 2026',
    dateLabel: '14:20',
    amount: 28_000,
    type: 'EXPENSE',
    note: 'Perjalanan menuju stasiun Sudirman',
    iconBg: '#FFFBEB',
    iconColor: '#F59E0B',
  },
  {
    id: 'tx-6',
    title: 'Belanja Kebutuhan Harian',
    categoryKey: 'shopping',
    categoryLabel: 'Belanja',
    walletId: 'mandiri',
    walletName: 'Tabungan Mandiri',
    dateGroup: 'Kemarin, 21 Nov 2026',
    dateLabel: '11:05',
    amount: 320_000,
    type: 'EXPENSE',
    note: 'Sabun, beras, minyak, dan stok dapur',
    iconBg: '#F0FDFA',
    iconColor: '#0D9488',
  },
  {
    id: 'tx-7',
    title: 'Token Listrik PLN',
    categoryKey: 'zap',
    categoryLabel: 'Tagihan',
    walletId: 'bca',
    walletName: 'Bank BCA',
    dateGroup: '20 Nov 2026',
    dateLabel: '19:20',
    amount: 255_000,
    type: 'EXPENSE',
    note: 'Pembelian token listrik bulanan',
    iconBg: '#FEF2F2',
    iconColor: '#EF4444',
  },
  {
    id: 'tx-8',
    title: 'Sisihkan Dana Darurat',
    categoryKey: 'wallet',
    categoryLabel: 'Transfer',
    walletId: 'bca',
    walletName: 'Bank BCA',
    targetWalletId: 'mandiri',
    targetWalletName: 'Tabungan Mandiri',
    dateGroup: '20 Nov 2026',
    dateLabel: '16:00',
    amount: 500_000,
    type: 'TRANSFER',
    note: 'Alokasi tabungan rutin bulan November',
    iconBg: '#EBF2FF',
    iconColor: '#3B7AF5',
  },
  {
    id: 'tx-9',
    title: 'Isi Bensin Pertamax',
    categoryKey: 'car',
    categoryLabel: 'Transportasi',
    walletId: 'cash',
    walletName: 'Uang Tunai',
    dateGroup: '20 Nov 2026',
    dateLabel: '08:45',
    amount: 100_000,
    type: 'EXPENSE',
    note: 'Full tank motor di SPBU',
    iconBg: '#FFFBEB',
    iconColor: '#F59E0B',
  },
  {
    id: 'tx-10',
    title: 'Bonus Kinerja Kuartal',
    categoryKey: 'briefcase',
    categoryLabel: 'Gaji / Proyek',
    walletId: 'mandiri',
    walletName: 'Tabungan Mandiri',
    dateGroup: '19 Nov 2026',
    dateLabel: '15:30',
    amount: 1_200_000,
    type: 'INCOME',
    note: 'Insentif penyelesaian sprint lebih awal',
    iconBg: '#ECFDF5',
    iconColor: '#10B981',
  },
  {
    id: 'tx-11',
    title: 'Langganan Internet Fiber',
    categoryKey: 'zap',
    categoryLabel: 'Tagihan',
    walletId: 'bca',
    walletName: 'Bank BCA',
    dateGroup: '19 Nov 2026',
    dateLabel: '10:00',
    amount: 345_000,
    type: 'EXPENSE',
    note: 'Tagihan WiFi rumah bulan November',
    iconBg: '#FEF2F2',
    iconColor: '#EF4444',
  },
  {
    id: 'tx-12',
    title: 'Makan Malam Nasi Goreng',
    categoryKey: 'utensils',
    categoryLabel: 'Makanan',
    walletId: 'gopay',
    walletName: 'GoPay',
    dateGroup: '19 Nov 2026',
    dateLabel: '20:15',
    amount: 38_000,
    type: 'EXPENSE',
    note: 'Pesan antar GoFood',
    iconBg: '#EBF2FF',
    iconColor: '#3B7AF5',
  },
  {
    id: 'tx-13',
    title: 'Cashback Promo Merchant',
    categoryKey: 'wallet',
    categoryLabel: 'Bonus / Lainnya',
    walletId: 'gopay',
    walletName: 'GoPay',
    dateGroup: '18 Nov 2026',
    dateLabel: '13:40',
    amount: 75_000,
    type: 'INCOME',
    note: 'Cashback transaksi QRIS',
    iconBg: '#EBF2FF',
    iconColor: '#3B7AF5',
  },
  {
    id: 'tx-14',
    title: 'Parkir & Tol Harian',
    categoryKey: 'car',
    categoryLabel: 'Transportasi',
    walletId: 'cash',
    walletName: 'Uang Tunai',
    dateGroup: '18 Nov 2026',
    dateLabel: '18:05',
    amount: 25_000,
    type: 'EXPENSE',
    note: 'Parkir gedung perkantoran',
    iconBg: '#FFFBEB',
    iconColor: '#F59E0B',
  },
];

export const EXPENSE_CATEGORIES: CategoryOption[] = [
  { key: 'utensils', label: 'Makanan', iconBg: '#EBF2FF', iconColor: '#3B7AF5' },
  { key: 'car', label: 'Transportasi', iconBg: '#FFFBEB', iconColor: '#F59E0B' },
  { key: 'shopping', label: 'Belanja', iconBg: '#F0FDFA', iconColor: '#0D9488' },
  { key: 'zap', label: 'Tagihan', iconBg: '#FEF2F2', iconColor: '#EF4444' },
  { key: 'coffee', label: 'Harian', iconBg: '#F8FAFC', iconColor: '#475569' },
];

export const INCOME_CATEGORIES: CategoryOption[] = [
  { key: 'briefcase', label: 'Gaji / Proyek', iconBg: '#ECFDF5', iconColor: '#10B981' },
  { key: 'wallet', label: 'Bonus / Lainnya', iconBg: '#EBF2FF', iconColor: '#3B7AF5' },
];

export type BudgetIconKey = 'utensils' | 'cloud' | 'car' | 'shopping' | 'gamepad';

export type BudgetPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface BudgetItem {
  id: string;
  name: string;
  iconKey: BudgetIconKey;
  spent: number;
  limit: number;
  alertThresholdPct: number;
  period?: BudgetPeriod;
  periodLabel?: string;
  monthlyEquivalentLimit?: number;
}

export const BUDGET_CATEGORY_OPTIONS: { key: BudgetIconKey; label: string }[] = [
  { key: 'utensils', label: 'Makanan & Minuman' },
  { key: 'cloud', label: 'Tagihan & Cloud' },
  { key: 'car', label: 'Transportasi' },
  { key: 'shopping', label: 'Belanja' },
  { key: 'gamepad', label: 'Hiburan' },
];

export const mockBudgets: BudgetItem[] = [
  {
    id: 'bdg-1',
    name: 'Makanan & Minuman',
    iconKey: 'utensils',
    spent: 980_000,
    limit: 1_200_000,
    alertThresholdPct: 80,
  },
  {
    id: 'bdg-2',
    name: 'Tagihan & Cloud',
    iconKey: 'cloud',
    spent: 370_000,
    limit: 600_000,
    alertThresholdPct: 80,
  },
  {
    id: 'bdg-3',
    name: 'Transportasi',
    iconKey: 'car',
    spent: 240_000,
    limit: 500_000,
    alertThresholdPct: 80,
  },
  {
    id: 'bdg-4',
    name: 'Belanja',
    iconKey: 'shopping',
    spent: 540_000,
    limit: 500_000,
    alertThresholdPct: 80,
  },
  {
    id: 'bdg-5',
    name: 'Hiburan',
    iconKey: 'gamepad',
    spent: 120_000,
    limit: 400_000,
    alertThresholdPct: 80,
  },
];

export type GoalIconKey = 'shield' | 'laptop' | 'graduation' | 'target';
export type GoalFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface GoalItem {
  id: string;
  name: string;
  iconKey: GoalIconKey;
  current: number;
  target: number;
  deadline: string;
  walletId?: string;
  walletName?: string;
  frequency?: GoalFrequency;
  isRealized?: boolean;
}

export const mockGoals: GoalItem[] = [
  {
    id: 'goal-1',
    name: 'Dana Darurat',
    iconKey: 'shield',
    current: 6_500_000,
    target: 10_000_000,
    deadline: 'Des 2026',
    walletId: 'mandiri',
    walletName: 'Tabungan Mandiri',
    frequency: 'MONTHLY',
    isRealized: false,
  },
  {
    id: 'goal-2',
    name: 'Upgrade Laptop',
    iconKey: 'laptop',
    current: 4_800_000,
    target: 12_000_000,
    deadline: 'Jun 2027',
    walletId: 'mandiri',
    walletName: 'Tabungan Mandiri',
    frequency: 'MONTHLY',
    isRealized: false,
  },
  {
    id: 'goal-3',
    name: 'Tabungan Wisuda',
    iconKey: 'graduation',
    current: 2_400_000,
    target: 3_000_000,
    deadline: 'Okt 2027',
    walletId: 'bca',
    walletName: 'Bank BCA',
    frequency: 'WEEKLY',
    isRealized: false,
  },
];

export interface ForecastData {
  dailyBurnRate: number;
  projectedExpense: number;
  projectedBalance: number;
  riskLevel: 'SAFE' | 'WARNING' | 'DANGER';
  actualPoints: number[];
  projectedPoints: number[];
}

export const mockForecast: ForecastData = {
  dailyBurnRate: 125_000,
  projectedExpense: 3_750_000,
  projectedBalance: 2_450_000,
  riskLevel: 'SAFE',
  actualPoints: [0.35, 0.72, 1.1, 1.48, 1.85, 2.25],
  projectedPoints: [2.25, 2.65, 3.02, 3.4, 3.75],
};

export interface AnomalyItem {
  id: string;
  type: 'OVER_BUDGET' | 'CATEGORY_SPIKE' | 'OUTLIER_TX';
  badgeLabel: string;
  severity: 'HIGH' | 'MEDIUM';
  message: string;
}

export const mockAnomalies: AnomalyItem[] = [
  {
    id: 'anom-1',
    type: 'OVER_BUDGET',
    badgeLabel: 'Over-Budget',
    severity: 'HIGH',
    message: 'Kategori Belanja mencapai 108% dari batas anggaran (lebih Rp 40.000).',
  },
  {
    id: 'anom-2',
    type: 'CATEGORY_SPIKE',
    badgeLabel: 'Lonjakan +28%',
    severity: 'MEDIUM',
    message: 'Pengeluaran Makanan naik 28% dibanding rata-rata bulan lalu.',
  },
  {
    id: 'anom-3',
    type: 'OUTLIER_TX',
    badgeLabel: 'Transaksi Ekstrem',
    severity: 'MEDIUM',
    message: 'Transaksi Belanja Mingguan Rp 350.000 melampaui 2x rata-rata kategori.',
  },
];

export interface AiRecommendationItem {
  id: string;
  title: string;
  detail: string;
  savingTag: string;
}

export interface AiInsightData {
  healthScore: number;
  statusLabel: string;
  summary: string;
  generatedAt: string;
  recommendations: AiRecommendationItem[];
}

export const mockAiInsight: AiInsightData = {
  healthScore: 84,
  statusLabel: 'Kondisi Sehat',
  summary:
    'Arus kas bulan ini terjaga dengan rasio tabungan 28%. Proyeksi saldo akhir bulan tetap surplus.',
  generatedAt: 'Terakhir diperbarui 2 mnt lalu',
  recommendations: [
    {
      id: 'rec-1',
      title: 'Kurangi pesan antar Makanan & Minuman',
      detail: 'Masak atau bawa bekal 2x seminggu agar kategori Makanan tetap di bawah 80%.',
      savingTag: 'Hemat ~Rp 210rb/bln',
    },
    {
      id: 'rec-2',
      title: 'Tahan belanja non-esensial hingga akhir bulan',
      detail: 'Anggaran Belanja sudah mencapai 108%. Tunda pembelian impulsif selama 8 hari ke depan.',
      savingTag: 'Hemat ~Rp 180rb/bln',
    },
    {
      id: 'rec-3',
      title: 'Audit langganan Tagihan & Cloud aktif',
      detail: 'Nonaktifkan layanan berbayar yang jarang dipakai untuk menambah Dana Darurat.',
      savingTag: 'Hemat ~Rp 95rb/bln',
    },
  ],
};
