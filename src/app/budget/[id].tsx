import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/ToastProvider';
import { useFinance } from '@/context/FinanceContext';
import { formatIDR } from '@/lib/format';
import { type BudgetPeriod, type TransactionItem } from '@/lib/mockData';
import { budgetService } from '@/services/budget.service';
import { Colors, FontFamily, Radius, Typography } from '@/theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowLeft,
  Pencil,
  Plus,
  Receipt,
  Trash2,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function getPeriodBounds(period: BudgetPeriod): { start: Date; end: Date } {
  const now = new Date();
  if (period === 'DAILY') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }
  if (period === 'WEEKLY') {
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + diffToMonday,
      0,
      0,
      0,
      0
    );
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  return { start, end };
}

export default function BudgetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const {
    budgets,
    setBudgets,
    transactions,
    wallets,
    categories,
    recordTransaction,
    updateTransaction,
    deleteTransaction,
    refreshAllData,
  } = useFinance();

  const budget = budgets.find((b) => b.id === id);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const bPeriod: BudgetPeriod = budget?.period ?? 'MONTHLY';
  const periodShort =
    bPeriod === 'DAILY' ? 'Harian' : bPeriod === 'WEEKLY' ? 'Mingguan' : 'Bulanan';

  const categoryTransactions = useMemo(() => {
    if (!budget) return [];
    const targetName = (budget.categoryName ?? budget.name).toLowerCase();
    return transactions.filter((tx) => {
      if (tx.type !== 'EXPENSE') return false;
      const matchesCat =
        tx.categoryLabel.toLowerCase() === targetName ||
        tx.categoryKey === budget.iconKey;
      if (!matchesCat) return false;
      if (bPeriod === 'DAILY') {
        const dg = (tx.dateGroup ?? '').toLowerCase();
        const dl = (tx.dateLabel ?? '').toLowerCase();
        return dg.includes('hari ini') || dl.includes('hari ini') || dl === 'baru saja';
      }
      return true;
    });
  }, [budget, bPeriod, transactions]);

  if (!budget) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <Text style={styles.emptyTitle}>Anggaran tidak ditemukan</Text>
        <Pressable onPress={() => router.back()} style={styles.backFallbackBtn}>
          <Text style={styles.backFallbackText}>Kembali</Text>
        </Pressable>
      </View>
    );
  }

  const pct = budget.limit > 0 ? Math.round((budget.spent / budget.limit) * 100) : 0;
  const remaining = budget.remaining ?? Math.max(0, budget.limit - budget.spent);
  const exceeded = budget.exceeded ?? Math.max(0, budget.spent - budget.limit);
  const nowLocal = new Date();
  const fallbackDaysLeft =
    bPeriod === 'DAILY'
      ? 1
      : bPeriod === 'WEEKLY'
        ? nowLocal.getDay() === 0
          ? 1
          : 8 - nowLocal.getDay()
        : Math.max(
            1,
            new Date(nowLocal.getFullYear(), nowLocal.getMonth() + 1, 0).getDate() -
              nowLocal.getDate() +
              1
          );
  const daysLeftInPeriod = budget.daysLeftInPeriod ?? fallbackDaysLeft;
  const safeDailyAmount =
    budget.safeDailyAmount ??
    ((bPeriod === 'WEEKLY' || bPeriod === 'MONTHLY') && remaining > 0
      ? Math.floor(remaining / Math.max(1, daysLeftInPeriod))
      : 0);
  const isOver = pct > 100;
  const isWarn = !isOver && pct >= budget.alertThresholdPct;
  const statusConfig = isOver
    ? { label: 'Lewat Batas', color: Colors.expense, bg: Colors.expenseSoft, text: Colors.expenseText }
    : isWarn
      ? { label: 'Waspada', color: Colors.warning, bg: Colors.warningSoft, text: Colors.warningText }
      : { label: 'Aman', color: Colors.income, bg: Colors.incomeSoft, text: Colors.incomeText };

  const periodScopeLabel =
    bPeriod === 'DAILY'
      ? 'Hari Ini'
      : bPeriod === 'WEEKLY'
        ? 'Minggu Ini'
        : 'Bulan Ini';
  const heroCaption =
    remaining > 0
      ? `Bisa Dipakai ${periodScopeLabel}`
      : exceeded === 0
        ? 'Batas Periode Ini Sudah Habis'
        : `Lewat Batas ${periodScopeLabel}`;
  const heroAmountText =
    exceeded > 0
      ? formatIDR(exceeded)
      : remaining === 0
        ? 'Rp 0'
        : formatIDR(remaining);
  const heroAmountColor =
    exceeded > 0 ? '#DC2626' : remaining === 0 || isWarn ? '#D97706' : '#059669';

  const dailyGuideText =
    bPeriod === 'DAILY'
      ? 'Sisa batas untuk hari ini, otomatis diulang besok pukul 00.00 WIB'
      : remaining > 0
        ? `Kamu bisa pakai sekitar ${formatIDR(safeDailyAmount)} per hari untuk ${daysLeftInPeriod} hari tersisa ${bPeriod === 'WEEKLY' ? 'minggu ini' : 'bulan ini'}`
        : null;

  const txCount = categoryTransactions.length;
  const avgSpend = txCount > 0 ? Math.round(budget.spent / txCount) : 0;

  const handleDeleteBudget = async () => {
    setConfirmDeleteOpen(false);
    setBudgets((prev) => prev.filter((b) => b.id !== budget.id));
    try {
      await budgetService.deleteBudget(budget.id);
      await refreshAllData();
      showToast('Anggaran dihapus');
      router.back();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus anggaran', 'error');
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
      >
        <LinearGradient
          colors={['#4B89FF', '#3B7AF5', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 10 }]}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Pressable
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel="Kembali"
                style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.75 }]}
              >
                <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.2} />
              </Pressable>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {budget.name}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* HERO CARD */}
        <Animated.View entering={FadeInDown.duration(300).easing(Easing.out(Easing.cubic))} style={styles.heroCard}>
          <View style={styles.badgeRow}>
            {budget.customName && budget.categoryName ? (
              <View style={styles.periodPill}>
                <Text style={styles.periodPillText}>{budget.categoryName}</Text>
              </View>
            ) : null}
            <View style={styles.periodPill}>
              <Text style={styles.periodPillText}>{periodShort}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: statusConfig.bg }]}>
              <Text style={[styles.statusPillText, { color: statusConfig.text }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>

          <Text style={styles.heroCaption}>{heroCaption}</Text>

          <Text
            style={[
              styles.heroRemaining,
              Typography.tabularNums,
              { color: heroAmountColor },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {heroAmountText}
          </Text>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, pct)}%`, backgroundColor: statusConfig.color },
              ]}
            />
          </View>

          <View style={styles.progressBottomRow}>
            <Text style={[styles.progressText, Typography.tabularNums]}>
              Terpakai {formatIDR(budget.spent)}
            </Text>
            <Text style={[styles.progressTextBold, Typography.tabularNums]}>
              Batas {formatIDR(budget.limit)} ({pct}%)
            </Text>
          </View>

          {dailyGuideText ? (
            <View style={styles.dailyGuideBox}>
              <Text style={[styles.dailyGuideText, Typography.tabularNums]}>
                {dailyGuideText}
              </Text>
            </View>
          ) : null}

          <View style={styles.miniTilesRow}>
            <View style={styles.miniTile}>
              <Text style={styles.miniTileLabel}>Jumlah Transaksi</Text>
              <Text style={[styles.miniTileValue, Typography.tabularNums]}>
                {txCount} transaksi
              </Text>
            </View>
            <View style={styles.miniTile}>
              <Text style={styles.miniTileLabel}>Rata-rata Belanja</Text>
              <Text style={[styles.miniTileValue, Typography.tabularNums]} numberOfLines={1}>
                {formatIDR(avgSpend)}/transaksi
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* RIWAYAT PENGELUARAN */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Riwayat Pengeluaran Kategori Ini</Text>
          {categoryTransactions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Receipt size={22} color={Colors.textMuted} strokeWidth={1.8} />
              <Text style={styles.emptyTitle}>Belum ada pengeluaran di kategori ini</Text>
              <Text style={styles.emptyDesc}>
                Catat pengeluaran baru untuk memantau batas anggaranmu.
              </Text>
            </View>
          ) : (
            <View style={styles.txListCard}>
              {categoryTransactions.map((tx, idx) => (
                <Pressable
                  key={tx.id}
                  onPress={() =>
                    router.push(`/transaction/${encodeURIComponent(tx.id)}` as Href)
                  }
                  style={({ pressed }) => [
                    styles.txRow,
                    idx < categoryTransactions.length - 1 && styles.txRowBorder,
                    pressed && { backgroundColor: '#F8FAFC' },
                  ]}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.txTitle} numberOfLines={1}>
                      {tx.note || tx.title}
                    </Text>
                    <Text style={styles.txMeta} numberOfLines={1}>
                      {tx.walletName}, {tx.dateLabel}
                    </Text>
                  </View>
                  <Text style={[styles.txAmount, Typography.tabularNums]}>
                    -{formatIDR(tx.amount)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* KELOLA ANGGARAN (MUDAH DIJANGKAU) */}
        <View style={styles.manageRow}>
          <Pressable
            onPress={() =>
              router.push(`/budget/form?id=${encodeURIComponent(budget.id)}` as Href)
            }
            style={({ pressed }) => [styles.manageEditBtn, pressed && { opacity: 0.8 }]}
          >
            <Pencil size={16} color={Colors.primary} strokeWidth={2.1} />
            <Text style={styles.manageEditText}>Edit Anggaran</Text>
          </Pressable>
          <Pressable
            onPress={() => setConfirmDeleteOpen(true)}
            style={({ pressed }) => [styles.manageDeleteBtn, pressed && { opacity: 0.8 }]}
          >
            <Trash2 size={16} color={Colors.expense} strokeWidth={2.1} />
            <Text style={styles.manageDeleteText}>Hapus</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* STICKY BOTTOM CTA */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <Pressable
          onPress={() =>
            router.push(
              `/transaction/form?type=EXPENSE&categoryKey=${encodeURIComponent(budget.iconKey)}` as Href
            )
          }
          style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.88 }]}
        >
          <Plus size={18} color="#FFFFFF" strokeWidth={2.4} />
          <Text style={styles.primaryBtnText}>Catat Pengeluaran</Text>
        </Pressable>
      </View>

      <ConfirmDialog
        visible={confirmDeleteOpen}
        title="Hapus Anggaran?"
        message={`Anggaran "${budget.name}" akan dihapus dari bulan ini. Riwayat transaksi tetap aman.`}
        confirmLabel="Hapus"
        variant="danger"
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleDeleteBudget()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 40,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: '#FFFFFF',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    marginHorizontal: 18,
    marginTop: -22,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    padding: 18,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 3,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  periodPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  periodPillText: {
    fontFamily: FontFamily.medium,
    fontSize: 11.5,
    color: Colors.textSecondary,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusPillText: {
    fontFamily: FontFamily.semibold,
    fontSize: 11.5,
  },
  heroCaption: {
    fontFamily: FontFamily.semibold,
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  heroRemaining: {
    fontFamily: FontFamily.bold,
    fontSize: 28,
    marginBottom: 12,
  },
  progressTrack: {
    height: 10,
    borderRadius: 99,
    backgroundColor: '#EDF1F7',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
  },
  progressBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  progressText: {
    fontFamily: FontFamily.regular,
    fontSize: 12.5,
    color: Colors.textSecondary,
  },
  progressTextBold: {
    fontFamily: FontFamily.semibold,
    fontSize: 12.5,
    color: Colors.textPrimary,
  },
  monthlyEqNote: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
    color: '#94A3B8',
    marginTop: 6,
  },
  dailyGuideBox: {
    marginTop: 12,
    backgroundColor: '#EBF2FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dailyGuideText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    lineHeight: 17,
    color: '#1E40AF',
  },
  miniTilesRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  miniTile: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  miniTileLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
    color: Colors.textSecondary,
  },
  miniTileValue: {
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
    color: Colors.textPrimary,
    marginTop: 4,
  },
  sectionWrap: {
    paddingHorizontal: 18,
    marginTop: 20,
  },
  sectionTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 14,
    color: Colors.textPrimary,
    marginTop: 4,
  },
  emptyDesc: {
    fontFamily: FontFamily.regular,
    fontSize: 12.5,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  txListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  txRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  txTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
    color: Colors.textPrimary,
  },
  txMeta: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
    color: Colors.textMuted,
    marginTop: 2,
  },
  txAmount: {
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
    color: Colors.expense,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 10,
    backgroundColor: 'rgba(245,247,251,0.96)',
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B7AF5',
    borderRadius: 14,
    paddingVertical: 14,
  },
  primaryBtnText: {
    fontFamily: FontFamily.semibold,
    fontSize: 14.5,
    color: '#FFFFFF',
  },
  backFallbackBtn: {
    marginTop: 14,
    backgroundColor: '#3B7AF5',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backFallbackText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  manageRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 18,
    marginTop: 18,
  },
  manageEditBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 14,
    paddingVertical: 12,
  },
  manageEditText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
    color: Colors.primary,
  },
  manageDeleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    paddingVertical: 12,
  },
  manageDeleteText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
    color: Colors.expense,
  },
});
