import {
  BUDGET_RULE_META,
  FINANCIAL_CHALLENGE_META,
  type BudgetRuleKey,
  type FinancialChallengeKey,
  type UserProfileState,
} from '@/context/FinanceContext';
import { formatIDR } from '@/lib/format';
import {
  type BudgetItem,
  type TransactionItem,
  type WalletItem,
} from '@/lib/mockData';

import { type AiTransactionCardData } from '@/services/ai.service';

export type ChatRichCardType =
  | 'SUMMARY'
  | 'FORECAST'
  | 'ANOMALY'
  | 'RECOMMENDATIONS'
  | 'WALLET_PICKER'
  | 'TRANSACTION_PREVIEW'
  | 'TRANSACTION_CREATED';

export interface ChatMessage {
  id: string;
  sender: 'USER' | 'AI';
  text: string;
  timestamp: string;
  richCard?: ChatRichCardType;
  cardData?: AiTransactionCardData | null;
  actionStatus?: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
}

export interface ChatLiveContext {
  userProfile: UserProfileState;
  wallets: WalletItem[];
  budgets: BudgetItem[];
  transactions: TransactionItem[];
  monthlyIncomeActual: number;
  monthlyExpenseActual: number;
  todayExpenseActual: number;
  remainingDailySafeLimit: number;
  hasCompletedSetup: boolean;
}

export const QUICK_PROMPTS = [
  'Beli pecel lele 15rb',
  'Analisis bulan ini',
  'Cek kategori paling boros',
  'Prediksi saldo akhir bulan',
  'Tips hemat Rp 500rb',
];

export function formatNowTime(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export interface WelcomeProfileContext {
  name?: string;
  financialChallenge?: FinancialChallengeKey;
  budgetRule?: BudgetRuleKey;
  safeDailyLimit?: number;
  hasCompletedSetup?: boolean;
}

export function getWelcomeMessage(profile?: WelcomeProfileContext): ChatMessage {
  if (profile?.hasCompletedSetup) {
    const firstName = profile.name?.trim().split(/\s+/)[0] || 'Teman';
    const ruleLabel = profile.budgetRule
      ? BUDGET_RULE_META[profile.budgetRule].label
      : '50/30/20';
    const challengeMeta = profile.financialChallenge
      ? FINANCIAL_CHALLENGE_META[profile.financialChallenge]
      : FINANCIAL_CHALLENGE_META.leak_end_of_month;
    const dailyText =
      typeof profile.safeDailyLimit === 'number' && profile.safeDailyLimit > 0
        ? ` dengan batas aman belanja ${formatIDR(profile.safeDailyLimit)}/hari`
        : '';

    return {
      id: 'msg-welcome',
      sender: 'AI',
      text: `Halo ${firstName}! Blueprint keuangan pola ${ruleLabel} sudah aktif${dailyText}. Fokus kita sekarang: ${challengeMeta.focusLabel.toLowerCase()}. ${challengeMeta.aiTip}`,
      timestamp: formatNowTime(),
      richCard: 'SUMMARY',
    };
  }

  return {
    id: 'msg-welcome',
    sender: 'AI',
    text: 'Halo Yoga! Aku sudah membaca ringkasan keuanganmu bulan November 2026. Mau cek prediksi akhir bulan, deteksi pemborosan, atau cari cara hemat?',
    timestamp: formatNowTime(),
    richCard: 'SUMMARY',
  };
}

export function computeLiveMetrics(live?: ChatLiveContext) {
  if (!live) {
    return {
      totalBalance: 4_850_000,
      activeWalletCount: 4,
      totalBudgetLimit: 4_000_000,
      totalSpent: 1_350_000,
      remainingBudget: 2_650_000,
      burnRate: 125_000,
      projectedExpense: 3_750_000,
      projectedSurplus: 2_450_000,
      healthScore: 84,
      healthLabel: 'Sehat',
    };
  }

  const activeWallets = live.wallets.filter((w) => !w.isArchived);
  const totalBalance = activeWallets.reduce((s, w) => s + w.balance, 0);
  const totalBudgetLimit = live.budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent = live.hasCompletedSetup
    ? live.monthlyExpenseActual
    : live.monthlyExpenseActual;
  const remainingBudget = Math.max(0, totalBudgetLimit - totalSpent);

  const burnRate = live.hasCompletedSetup
    ? live.transactions.length === 0
      ? 0
      : Math.max(live.todayExpenseActual, Math.round(totalSpent / 7))
    : 125_000;

  const projectedExpense = live.hasCompletedSetup
    ? totalSpent + burnRate * 8
    : 3_750_000;

  const baseIncome = live.hasCompletedSetup
    ? Math.max(live.monthlyIncomeActual, live.userProfile.monthlyIncomeTarget)
    : live.monthlyIncomeActual;
  const projectedSurplus = baseIncome - projectedExpense;

  const overCount = live.budgets.filter((b) => b.limit > 0 && b.spent > b.limit).length;
  const healthScore = live.hasCompletedSetup
    ? Math.max(60, Math.min(96, 92 - overCount * 10 - (live.remainingDailySafeLimit < 0 ? 8 : 0)))
    : 84;
  const healthLabel = healthScore >= 80 ? 'Sehat' : healthScore >= 68 ? 'Waspada' : 'Perlu Kontrol';

  return {
    totalBalance,
    activeWalletCount: activeWallets.length,
    totalBudgetLimit,
    totalSpent,
    remainingBudget,
    burnRate,
    projectedExpense,
    projectedSurplus,
    healthScore,
    healthLabel,
  };
}

export function generateAiReply(
  userText: string,
  live?: ChatLiveContext
): {
  text: string;
  richCard?: ChatRichCardType;
} {
  const q = userText.toLowerCase();
  const m = computeLiveMetrics(live);

  if (
    q.includes('prediksi') ||
    q.includes('akhir bulan') ||
    q.includes('proyeksi') ||
    q.includes('burn')
  ) {
    if (live?.hasCompletedSetup) {
      const surplusPrefix = m.projectedSurplus >= 0 ? '+' : '-';
      return {
        text:
          live.transactions.length === 0
            ? `Belum ada pengeluaran tercatat sejak Blueprint aktif. Dengan batas aman ${formatIDR(live.userProfile.safeDailyLimit)}/hari, kamu berpotensi surplus ${formatIDR(live.userProfile.monthlyIncomeTarget)} akhir bulan jika disiplin sesuai pola ${BUDGET_RULE_META[live.userProfile.budgetRule].label}.`
            : `Dengan laju pengeluaran sekitar ${formatIDR(m.burnRate)}/hari, total pengeluaran diproyeksikan sekitar ${formatIDR(m.projectedExpense)} dengan estimasi saldo akhir bulan ${surplusPrefix}${formatIDR(Math.abs(m.projectedSurplus))}.`,
        richCard: 'FORECAST',
      };
    }

    return {
      text: 'Dengan rata-rata pengeluaran (burn rate) Rp 125rb/hr, total pengeluaranmu hingga akhir November diproyeksikan sekitar Rp 3,75jt. Kabar baiknya, saldo akhir bulanmu masih surplus sekitar +Rp 2,45jt.',
      richCard: 'FORECAST',
    };
  }

  if (
    q.includes('boros') ||
    q.includes('anomali') ||
    q.includes('peringatan') ||
    q.includes('over')
  ) {
    if (live) {
      const alerts = live.budgets.filter((b) => {
        if (b.limit <= 0) return false;
        return (b.spent / b.limit) * 100 >= b.alertThresholdPct;
      });
      if (alerts.length === 0) {
        return {
          text: `Kabar baik! Semua ${live.budgets.length} kategori anggaranmu masih aman di bawah ambang batas peringatan.`,
          richCard: 'ANOMALY',
        };
      }
      const top = alerts[0];
      const pct = Math.round((top.spent / top.limit) * 100);
      return {
        text: `Aku mendeteksi ${alerts.length} kategori yang perlu diperhatikan. Tertinggi saat ini adalah ${top.name} yang sudah terpakai ${pct}% (${formatIDR(top.spent)} dari batas ${formatIDR(top.limit)}).`,
        richCard: 'ANOMALY',
      };
    }

    return {
      text: 'Aku menemukan 2 sinyal pemborosan utama bulan ini: kategori Belanja sudah tembus 108% (lebih Rp 40.000 dari batas Rp 500.000), dan pengeluaran Makanan naik +28% dibanding rata-rata bulan lalu.',
      richCard: 'ANOMALY',
    };
  }

  if (
    q.includes('hemat') ||
    q.includes('saran') ||
    q.includes('tips') ||
    q.includes('500')
  ) {
    return {
      text: 'Ini 3 langkah paling cepat untuk menjaga surplus dan menekan pengeluaran bulananmu:',
      richCard: 'RECOMMENDATIONS',
    };
  }

  if (
    q.includes('saldo') ||
    q.includes('dompet') ||
    q.includes('rekening') ||
    q.includes('uang')
  ) {
    if (live) {
      const activeWallets = live.wallets.filter((w) => !w.isArchived);
      const breakdown = activeWallets
        .slice(0, 5)
        .map((w) => `${w.name} (${formatIDR(w.balance)})`)
        .join(', ');
      return {
        text: `Total saldo aktifmu saat ini ${formatIDR(m.totalBalance)} yang tersebar di ${activeWallets.length} dompet${breakdown ? `: ${breakdown}` : '.'}`,
        richCard: 'SUMMARY',
      };
    }

    return {
      text: 'Total saldo aktifmu saat ini Rp 4.850.000 yang tersebar di 4 dompet: Bank BCA (Rp 2.500.000), Tabungan Mandiri (Rp 1.000.000), GoPay (Rp 850.000), dan Uang Tunai (Rp 500.000).',
      richCard: 'SUMMARY',
    };
  }

  if (
    q.includes('anggaran') ||
    q.includes('budget') ||
    q.includes('analisis') ||
    q.includes('bulan ini')
  ) {
    if (live?.hasCompletedSetup) {
      return {
        text: `Skor Blueprint keuanganmu saat ini ${m.healthScore}/100 (${m.healthLabel}). Pemasukan tercatat ${formatIDR(live.monthlyIncomeActual)} dan pengeluaran ${formatIDR(live.monthlyExpenseActual)}, dengan sisa batas aman hari ini ${formatIDR(Math.max(0, live.remainingDailySafeLimit))}.`,
        richCard: 'SUMMARY',
      };
    }

    return {
      text: `Kondisi keuanganmu bulan November 2026 tergolong ${m.healthLabel} dengan skor ${m.healthScore}/100. Pemasukan tercatat ${formatIDR(live?.monthlyIncomeActual ?? 6_200_000)} dan pengeluaran ${formatIDR(m.totalSpent)}, sehingga sisa anggaranmu masih aman sekitar ${formatIDR(m.remainingBudget)}.`,
      richCard: 'SUMMARY',
    };
  }

  if (live?.hasCompletedSetup) {
    return {
      text: `Total saldo aktifmu ${formatIDR(m.totalBalance)} dengan batas aman belanja ${formatIDR(live.userProfile.safeDailyLimit)}/hari. Tanyakan soal prediksi akhir bulan, kategori boros, saldo dompet, atau tips hemat!`,
      richCard: 'SUMMARY',
    };
  }

  return {
    text: `Berdasarkan data November 2026, skor kesehatan keuanganmu ${m.healthScore}/100 (${m.healthLabel}) dengan total saldo ${formatIDR(m.totalBalance)}. Kamu bisa tanya detail soal prediksi akhir bulan, kategori boros, atau tips hemat!`,
    richCard: 'SUMMARY',
  };
}
