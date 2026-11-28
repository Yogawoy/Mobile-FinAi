import {
  GoalFormSheet,
  type GoalContributePayload,
} from '@/components/budgets/GoalFormSheet';
import {
  GoalRealizeSheet,
  type GoalRealizePayload,
} from '@/components/budgets/GoalRealizeSheet';
import { useToast } from '@/components/ui/ToastProvider';
import { useFinance } from '@/context/FinanceContext';
import { formatIDR } from '@/lib/format';
import { calculateGoalRecommendation } from '@/lib/goalCalculator';
import { getGoalColorPalette, renderGoalThemeIcon } from '@/lib/goalTheme';
import {
  type BudgetIconKey,
  type BudgetItem,
  type BudgetPeriod,
  type GoalIconKey,
  type GoalItem,
} from '@/lib/mockData';
import { budgetService } from '@/services/budget.service';
import { goalService } from '@/services/goal.service';
import { transactionService } from '@/services/transaction.service';
import { Colors, FontFamily, Radius, Typography } from '@/theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Car,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Gamepad2,
  GraduationCap,
  Laptop,
  PieChart,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Target,
  TrendingUp,
  Utensils,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ActiveTab = 'BUDGETS' | 'GOALS';

function renderBudgetIcon(key: BudgetIconKey, color: string) {
  switch (key) {
    case 'utensils':
      return <Utensils size={19} color={color} strokeWidth={1.9} />;
    case 'cloud':
      return <Cloud size={19} color={color} strokeWidth={1.9} />;
    case 'car':
      return <Car size={19} color={color} strokeWidth={1.9} />;
    case 'shopping':
      return <ShoppingBag size={19} color={color} strokeWidth={1.9} />;
    case 'gamepad':
      return <Gamepad2 size={19} color={color} strokeWidth={1.9} />;
  }
}

function renderGoalIcon(key: GoalIconKey, color: string) {
  switch (key) {
    case 'shield':
      return <ShieldCheck size={19} color={color} strokeWidth={1.9} />;
    case 'laptop':
      return <Laptop size={19} color={color} strokeWidth={1.9} />;
    case 'graduation':
      return <GraduationCap size={19} color={color} strokeWidth={1.9} />;
    case 'target':
      return <Target size={19} color={color} strokeWidth={1.9} />;
  }
}

function computeLocalDaysLeft(period: BudgetPeriod): number {
  const now = new Date();
  if (period === 'DAILY') return 1;
  if (period === 'WEEKLY') {
    const day = now.getDay();
    return day === 0 ? 1 : 8 - day;
  }
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Math.max(1, daysInMonth - now.getDate() + 1);
}

function getBudgetStatus(spent: number, limit: number, thresholdPct: number) {
  const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
  if (pct > 100) {
    return {
      pct,
      label: 'Lewat Batas',
      color: Colors.expense,
      bg: Colors.expenseSoft,
      textColor: Colors.expenseText,
      statusKey: 'OVER' as const,
    };
  }
  if (pct >= thresholdPct) {
    return {
      pct,
      label: 'Waspada',
      color: Colors.warning,
      bg: Colors.warningSoft,
      textColor: Colors.warningText,
      statusKey: 'WARN' as const,
    };
  }
  return {
    pct,
    label: 'Aman',
    color: Colors.income,
    bg: Colors.incomeSoft,
    textColor: Colors.incomeText,
    statusKey: 'SAFE' as const,
  };
}

function AnimatedProgressFill({
  pct,
  color,
  height = 8,
}: {
  pct: number;
  color: string;
  height?: number;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  const widthPct = useSharedValue(clamped);

  useEffect(() => {
    widthPct.value = withTiming(clamped, {
      duration: 360,
      easing: Easing.out(Easing.cubic),
    });
  }, [clamped, widthPct]);

  const animStyle = useAnimatedStyle(() => ({
    width: `${widthPct.value}%`,
  }));

  return (
    <Animated.View
      style={[
        {
          height,
          borderRadius: 99,
          backgroundColor: color,
        },
        animStyle,
      ]}
    />
  );
}

export default function BudgetsTabScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tab } = useLocalSearchParams<{ tab?: string }>();

  const [activeTab, setActiveTab] = useState<ActiveTab>(
    tab === 'goals' ? 'GOALS' : 'BUDGETS'
  );

  useEffect(() => {
    if (tab === 'goals') {
      setActiveTab('GOALS');
    } else if (tab === 'budget') {
      setActiveTab('BUDGETS');
    }
  }, [tab]);

  const { showToast } = useToast();
  const {
    userProfile,
    hasCompletedSetup,
    wallets,
    setWallets,
    categories,
    budgets,
    budgetMonthlySummary,
    setBudgets,
    goals,
    setGoals,
    recordTransaction,
    refreshAllData,
  } = useFinance();

  const [periodFilter, setPeriodFilter] = useState<'ALL' | BudgetPeriod>('ALL');

  const filteredBudgets = useMemo(() => {
    if (periodFilter === 'ALL') return budgets;
    return budgets.filter((b) => (b.period ?? 'MONTHLY') === periodFilter);
  }, [budgets, periodFilter]);

  const [goalSheetVisible, setGoalSheetVisible] = useState(false);
  const [contributingGoal, setContributingGoal] = useState<GoalItem | null>(null);
  const [realizingGoal, setRealizingGoal] = useState<GoalItem | null>(null);

  const budgetSummary = useMemo(() => {
    if (periodFilter === 'ALL') {
      const totalLimit =
        budgetMonthlySummary?.totalMonthlyEquivalentLimit ??
        budgets.reduce(
          (s, b) => s + (b.monthlyEquivalentLimit ?? b.limit),
          0
        );
      const totalSpent =
        budgetMonthlySummary?.totalMonthlySpent ??
        budgets.reduce((s, b) => s + b.spent, 0);
      const pct = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;
      const remaining = totalLimit - totalSpent;
      const alertCount = budgets.filter((b) => {
        const st = getBudgetStatus(b.spent, b.limit, b.alertThresholdPct);
        return st.statusKey !== 'SAFE';
      }).length;
      return {
        caption: 'TOTAL SETARA BULANAN',
        totalSpent,
        totalLimit,
        pct,
        remaining,
        alertCount,
      };
    }

    const totalSpent = filteredBudgets.reduce((s, b) => s + b.spent, 0);
    const totalLimit = filteredBudgets.reduce((s, b) => s + b.limit, 0);
    const pct = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;
    const remaining = totalLimit - totalSpent;
    const alertCount = filteredBudgets.filter((b) => {
      const st = getBudgetStatus(b.spent, b.limit, b.alertThresholdPct);
      return st.statusKey !== 'SAFE';
    }).length;
    const caption =
      periodFilter === 'DAILY'
        ? 'TOTAL ANGGARAN HARIAN'
        : periodFilter === 'WEEKLY'
          ? 'TOTAL ANGGARAN MINGGUAN'
          : 'TOTAL ANGGARAN BULANAN';
    return { caption, totalSpent, totalLimit, pct, remaining, alertCount };
  }, [budgets, filteredBudgets, periodFilter, budgetMonthlySummary]);

  const goalSummary = useMemo(() => {
    const totalCurrent = goals.reduce((s, g) => s + g.current, 0);
    const totalTarget = goals.reduce((s, g) => s + g.target, 0);
    const pct = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;
    const achievedCount = goals.filter((g) => g.current >= g.target).length;
    const activeCount = goals.length - achievedCount;
    return { totalCurrent, totalTarget, pct, achievedCount, activeCount };
  }, [goals]);

  const handleHeaderAdd = () => {
    if (activeTab === 'BUDGETS') {
      router.push('/budget/form');
    } else {
      router.push('/goal/form');
    }
  };

  const handleGoalContribute = async (payload: GoalContributePayload) => {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === payload.goalId
          ? { ...g, current: g.current + payload.amount }
          : g
      )
    );

    try {
      await goalService.contributeGoal(payload.goalId, payload.amount, {
        sourceType: payload.sourceType,
        walletId: payload.sourceType === 'WALLET' ? payload.sourceWalletId : null,
        note: 'Setoran target tabungan',
      });
      await refreshAllData();
      showToast(`Setoran ${formatIDR(payload.amount)} berhasil disimpan`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyetor ke target', 'error');
    }
  };

  const handleGoalRealize = async (payload: GoalRealizePayload) => {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === payload.goalId ? { ...g, isRealized: true } : g
      )
    );

    setWallets((prev) =>
      prev.map((w) => {
        if (w.id === payload.sourceWalletId) {
          return { ...w, balance: Math.max(0, w.balance - payload.amount) };
        }
        if (
          payload.action === 'TRANSFER' &&
          payload.destinationWalletId &&
          w.id === payload.destinationWalletId
        ) {
          return { ...w, balance: w.balance + payload.amount };
        }
        return w;
      })
    );

    try {
      await transactionService.createTransaction({
        type: payload.action,
        amount: payload.amount,
        walletId: payload.sourceWalletId,
        destinationWalletId:
          payload.action === 'TRANSFER' ? payload.destinationWalletId ?? null : null,
        categoryId: null,
        note:
          payload.action === 'EXPENSE'
            ? 'Realisasi target tabungan'
            : 'Pindah dana target tabungan',
      });
      await goalService.updateGoal(payload.goalId, { status: 'COMPLETED' });
      await refreshAllData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal merealisasikan target', 'error');
    }
  };

  const summaryBarColor =
    activeTab === 'BUDGETS'
      ? budgetSummary.pct > 100
        ? Colors.expense
        : budgetSummary.pct >= 80
          ? Colors.warning
          : Colors.primary
      : Colors.primary;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 112 + insets.bottom },
        ]}
      >
        {/* HEADER BIRU KOMPAK */}
        <LinearGradient
          colors={['#4B89FF', '#3B7AF5', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.blueHeader, { paddingTop: Math.max(insets.top, 12) + 12 }]}
        >
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>Anggaran</Text>
              <Text style={styles.headerSubtitle}>Nov 2026</Text>
            </View>

            <Pressable
              onPress={handleHeaderAdd}
              accessibilityRole="button"
              accessibilityLabel={
                activeTab === 'BUDGETS' ? 'Tambah anggaran' : 'Tambah target tabungan'
              }
              style={({ pressed }) => [styles.addPill, pressed && { opacity: 0.8 }]}
            >
              <Plus size={14} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.addPillText}>Tambah</Text>
            </Pressable>
          </View>

          {/* SEGMENTED TAB SWITCHER DI DALAM HEADER */}
          <View style={styles.switcherWrap}>
            <Pressable
              onPress={() => setActiveTab('BUDGETS')}
              style={[
                styles.switcherTab,
                activeTab === 'BUDGETS' && styles.switcherTabActive,
              ]}
            >
              <Text
                style={[
                  styles.switcherText,
                  activeTab === 'BUDGETS' && styles.switcherTextActive,
                ]}
              >
                Anggaran
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('GOALS')}
              style={[
                styles.switcherTab,
                activeTab === 'GOALS' && styles.switcherTabActive,
              ]}
            >
              <Text
                style={[
                  styles.switcherText,
                  activeTab === 'GOALS' && styles.switcherTextActive,
                ]}
              >
                Target Tabungan
              </Text>
            </Pressable>
          </View>
        </LinearGradient>

        {/* KARTU RINGKASAN MENUMPANG */}
        <Animated.View
          entering={FadeInDown.duration(340).easing(Easing.out(Easing.cubic))}
          style={styles.summaryCard}
        >
          {activeTab === 'BUDGETS' ? (
            <>
              <View style={styles.summaryTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryCaption}>
                    {periodFilter === 'ALL' && hasCompletedSetup
                      ? `${budgetSummary.caption}, BATAS ${formatIDR(userProfile.safeDailyLimit)}/HR`
                      : budgetSummary.caption}
                  </Text>
                  <View style={styles.summaryAmountRow}>
                    <Text style={[styles.summaryMainAmount, Typography.tabularNums]}>
                      {formatIDR(budgetSummary.totalSpent)}
                    </Text>
                    <Text style={[styles.summarySubLimit, Typography.tabularNums]}>
                      {' '}
                      / {formatIDR(budgetSummary.totalLimit)}
                    </Text>
                  </View>
                </View>

                <View style={styles.pctBadge}>
                  <Text style={[styles.pctBadgeText, Typography.tabularNums]}>
                    {budgetSummary.pct}%
                  </Text>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <AnimatedProgressFill pct={budgetSummary.pct} color={summaryBarColor} height={9} />
              </View>

              <View style={styles.microRow}>
                <View style={styles.microCol}>
                  <Text style={styles.microLabel}>
                    {budgetSummary.remaining < 0 ? 'Lewat Batas' : 'Masih Bisa Dipakai'}
                  </Text>
                  <Text
                    style={[
                      styles.microValue,
                      Typography.tabularNums,
                      {
                        color:
                          budgetSummary.remaining < 0 ? '#DC2626' : '#059669',
                      },
                    ]}
                  >
                    {budgetSummary.remaining < 0
                      ? formatIDR(Math.abs(budgetSummary.remaining))
                      : formatIDR(budgetSummary.remaining)}
                  </Text>
                </View>

                <View style={styles.microDivider} />

                <View style={styles.microCol}>
                  <Text style={styles.microLabel}>Perlu Perhatian</Text>
                  <Text
                    style={[
                      styles.microValue,
                      Typography.tabularNums,
                      {
                        color:
                          budgetSummary.alertCount > 0
                            ? Colors.warningText
                            : Colors.textPrimary,
                      },
                    ]}
                  >
                    {budgetSummary.alertCount} Kategori
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => router.push('/forecast')}
                accessibilityRole="button"
                accessibilityLabel="Lihat Prediksi Akhir Bulan"
                style={({ pressed }) => [
                  styles.forecastLinkRow,
                  pressed && { opacity: 0.78 },
                ]}
              >
                <View style={styles.forecastLinkLeft}>
                  <TrendingUp size={15} color={Colors.primary} strokeWidth={2.1} />
                  <Text style={styles.forecastLinkText}>
                    Lihat Prediksi Akhir Bulan
                  </Text>
                </View>
                <ChevronRight size={16} color={Colors.primary} strokeWidth={2.2} />
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.summaryTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryCaption}>TOTAL TARGET TERKUMPUL</Text>
                  <View style={styles.summaryAmountRow}>
                    <Text style={[styles.summaryMainAmount, Typography.tabularNums]}>
                      {formatIDR(goalSummary.totalCurrent)}
                    </Text>
                    <Text style={[styles.summarySubLimit, Typography.tabularNums]}>
                      {' '}
                      / {formatIDR(goalSummary.totalTarget)}
                    </Text>
                  </View>
                </View>

                <View style={styles.pctBadge}>
                  <Text style={[styles.pctBadgeText, Typography.tabularNums]}>
                    {goalSummary.pct}%
                  </Text>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <AnimatedProgressFill pct={goalSummary.pct} color={Colors.primary} height={9} />
              </View>

              <View style={styles.microRow}>
                <View style={styles.microCol}>
                  <Text style={styles.microLabel}>Target Aktif</Text>
                  <Text style={[styles.microValue, Typography.tabularNums]}>
                    {goalSummary.activeCount} Target
                  </Text>
                </View>

                <View style={styles.microDivider} />

                <View style={styles.microCol}>
                  <Text style={styles.microLabel}>Sudah Tercapai</Text>
                  <Text
                    style={[
                      styles.microValue,
                      Typography.tabularNums,
                      { color: Colors.income },
                    ]}
                  >
                    {goalSummary.achievedCount} Tercapai
                  </Text>
                </View>
              </View>
            </>
          )}
        </Animated.View>

        {activeTab === 'BUDGETS' ? (
          <View style={styles.periodFilterRow}>
            {(
              [
                { key: 'ALL', label: 'Semua' },
                { key: 'DAILY', label: 'Harian' },
                { key: 'WEEKLY', label: 'Mingguan' },
                { key: 'MONTHLY', label: 'Bulanan' },
              ] as const
            ).map((opt) => {
              const active = periodFilter === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setPeriodFilter(opt.key)}
                  style={[
                    styles.periodFilterPill,
                    active && styles.periodFilterPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.periodFilterText,
                      active && styles.periodFilterTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {/* CONTENT LIST */}
        <View style={styles.listWrap}>
          {activeTab === 'BUDGETS'
            ? budgets.length === 0 ? (
              <Animated.View
                entering={FadeInDown.duration(300)}
                style={styles.emptyGoalCard}
              >
                <View style={styles.emptyGoalIcon}>
                  <PieChart size={24} color={Colors.primary} strokeWidth={1.9} />
                </View>
                <Text style={styles.emptyGoalTitle}>Belum ada anggaran kategori</Text>
                <Text style={styles.emptyGoalSub}>
                  Atur batas anggaran tiap kategori sesuai kebutuhanmu (misalnya Makanan, Transportasi, atau Tagihan).
                </Text>
                <Pressable
                  onPress={handleHeaderAdd}
                  style={({ pressed }) => [
                    styles.emptyGoalBtn,
                    pressed && { opacity: 0.88 },
                  ]}
                >
                  <Plus size={16} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={styles.emptyGoalBtnText}>Buat Anggaran Pertama</Text>
                </Pressable>
              </Animated.View>
            ) : filteredBudgets.length === 0 ? (
              <Animated.View entering={FadeInDown.duration(260)} style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Tidak ada anggaran pada periode ini</Text>
                <Text style={styles.emptyDesc}>
                  Pilih filter Semua atau tambahkan anggaran baru untuk periode ini.
                </Text>
              </Animated.View>
            ) : filteredBudgets.map((budget, idx) => {
              const st = getBudgetStatus(
                budget.spent,
                budget.limit,
                budget.alertThresholdPct
              );
              const bPeriod = budget.period ?? 'MONTHLY';
              const periodShort =
                bPeriod === 'DAILY' ? 'Harian' : bPeriod === 'WEEKLY' ? 'Mingguan' : 'Bulanan';
              const periodSpentPhrase =
                bPeriod === 'DAILY'
                  ? 'hari ini'
                  : bPeriod === 'WEEKLY'
                    ? 'minggu ini'
                    : 'bulan ini';
              const remaining =
                budget.remaining ?? Math.max(0, budget.limit - budget.spent);
              const exceeded =
                budget.exceeded ?? Math.max(0, budget.spent - budget.limit);
              const daysLeftInPeriod =
                budget.daysLeftInPeriod ?? computeLocalDaysLeft(bPeriod);
              const safeDailyAmount =
                budget.safeDailyAmount ??
                ((bPeriod === 'WEEKLY' || bPeriod === 'MONTHLY') && remaining > 0
                  ? Math.floor(remaining / Math.max(1, daysLeftInPeriod))
                  : 0);

              const usableLabel =
                remaining > 0
                  ? `Bisa dipakai ${periodSpentPhrase}`
                  : exceeded === 0
                    ? 'Batas periode ini sudah habis'
                    : `Lewat batas ${periodSpentPhrase}`;
              const usableAmountText =
                remaining > 0
                  ? formatIDR(remaining)
                  : exceeded === 0
                    ? 'Rp 0'
                    : formatIDR(exceeded);
              const usableColor =
                exceeded > 0
                  ? '#DC2626'
                  : remaining === 0 || st.statusKey === 'WARN'
                    ? '#D97706'
                    : '#059669';

              return (
                <Animated.View
                  key={budget.id}
                  entering={FadeInDown.delay(Math.min(idx * 55, 220))
                    .duration(320)
                    .easing(Easing.out(Easing.cubic))}
                >
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/budget/[id]',
                        params: { id: budget.id },
                      } as never)
                    }
                    style={({ pressed }) => [
                      styles.itemCard,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <View style={styles.cardTopRow}>
                      <View style={styles.cardLeftGroup}>
                        <View style={[styles.iconBox, { backgroundColor: st.bg }]}>
                          {renderBudgetIcon(budget.iconKey, st.color)}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardTitle} numberOfLines={1}>
                            {budget.name}
                          </Text>
                          {budget.customName && budget.categoryName ? (
                            <Text style={styles.cardCategorySub} numberOfLines={1}>
                              {budget.categoryName}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      <View style={styles.badgeGroupRow}>
                        <View style={styles.periodTag}>
                          <Text style={styles.periodTagText}>{periodShort}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                          <Text style={[styles.statusBadgeText, { color: st.textColor }]}>
                            {st.label}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.usableHighlightRow}>
                      <Text style={styles.usableHighlightLabel} numberOfLines={1}>
                        {usableLabel}
                      </Text>
                      <Text
                        style={[
                          styles.usableHighlightValue,
                          Typography.tabularNums,
                          { color: usableColor },
                        ]}
                        numberOfLines={1}
                      >
                        {usableAmountText}
                      </Text>
                    </View>

                    <View style={styles.cardProgressTrack}>
                      <AnimatedProgressFill pct={st.pct} color={st.color} height={7} />
                    </View>

                    <View style={styles.cardBottomRow}>
                      <Text style={[styles.bottomLeftText, Typography.tabularNums]}>
                        Terpakai {formatIDR(budget.spent)} dari {formatIDR(budget.limit)}
                      </Text>
                      <Text style={[styles.bottomRightText, Typography.tabularNums]}>
                        {st.pct}%
                      </Text>
                    </View>
                    {(bPeriod === 'WEEKLY' || bPeriod === 'MONTHLY') &&
                    remaining > 0 &&
                    safeDailyAmount > 0 ? (
                      <Text style={[styles.safeDailyHelper, Typography.tabularNums]}>
                        Aman dipakai sekitar {formatIDR(safeDailyAmount)} per hari
                      </Text>
                    ) : null}
                  </Pressable>
                </Animated.View>
              );
            })
            : goals.length === 0 ? (
              <Animated.View
                entering={FadeInDown.duration(300)}
                style={styles.emptyGoalCard}
              >
                <View style={styles.emptyGoalIcon}>
                  <Target size={24} color={Colors.primary} strokeWidth={1.9} />
                </View>
                <Text style={styles.emptyGoalTitle}>Belum ada target tabungan</Text>
                <Text style={styles.emptyGoalSub}>
                  Buat target tabungan pertamamu seperti Dana Darurat atau kebutuhan penting lainnya.
                </Text>
                <Pressable
                  onPress={handleHeaderAdd}
                  style={({ pressed }) => [
                    styles.emptyGoalBtn,
                    pressed && { opacity: 0.88 },
                  ]}
                >
                  <Plus size={16} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={styles.emptyGoalBtnText}>Buat Target Pertama</Text>
                </Pressable>
              </Animated.View>
            ) : goals.map((goal, idx) => {
              const pct =
                goal.target > 0
                  ? Math.round((goal.current / goal.target) * 100)
                  : 0;
              const isDone = pct >= 100;
              const isRealized = Boolean(goal.isRealized);
              const rec = calculateGoalRecommendation(
                goal.current,
                goal.target,
                goal.deadline,
                goal.frequency
              );

              const palette = getGoalColorPalette(goal.colorKey);
              return (
                <Animated.View
                  key={goal.id}
                  entering={FadeInDown.delay(Math.min(idx * 65, 220))
                    .duration(320)
                    .easing(Easing.out(Easing.cubic))}
                >
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/goal/[id]',
                        params: { id: goal.id },
                      } as never)
                    }
                    style={({ pressed }) => [
                      styles.itemCard,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <View style={styles.cardTopRow}>
                      <View style={styles.cardLeftGroup}>
                        <View
                          style={[
                            styles.iconBox,
                            {
                              backgroundColor: isRealized
                                ? '#F1F5F9'
                                : isDone
                                  ? Colors.incomeSoft
                                  : palette.softBg,
                            },
                          ]}
                        >
                          {renderGoalThemeIcon(
                            goal.iconKey,
                            isRealized
                              ? Colors.textMuted
                              : isDone
                                ? Colors.income
                                : palette.primary
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardTitle} numberOfLines={1}>
                            {goal.name}
                          </Text>
                          <Text style={styles.cardSubMicro} numberOfLines={1}>
                            Target {goal.deadline}
                            {goal.walletName ? `, ${goal.walletName}` : ''}
                          </Text>
                          {!isDone && !isRealized && rec.amount > 0 ? (
                            <Text style={[styles.goalRecMicro, Typography.tabularNums]}>
                              {rec.compactLabel}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      {isRealized ? (
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: '#F1F5F9' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              { color: Colors.textSecondary },
                            ]}
                          >
                            Selesai
                          </Text>
                        </View>
                      ) : isDone ? (
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            setRealizingGoal(goal);
                          }}
                          style={({ pressed }) => [
                            styles.useFundPill,
                            pressed && { opacity: 0.8 },
                          ]}
                        >
                          <CheckCircle2
                            size={13}
                            color={Colors.incomeText}
                            strokeWidth={2.2}
                          />
                          <Text style={styles.useFundText}>Gunakan Dana</Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            setContributingGoal(goal);
                            setGoalSheetVisible(true);
                          }}
                          style={({ pressed }) => [
                            styles.saveQuickPill,
                            pressed && { opacity: 0.78 },
                          ]}
                        >
                          <Plus size={13} color={Colors.primaryDark} strokeWidth={2.4} />
                          <Text style={styles.saveQuickText}>Tabung</Text>
                        </Pressable>
                      )}
                    </View>

                    <View style={styles.cardProgressTrack}>
                      <AnimatedProgressFill
                        pct={pct}
                        color={isDone ? Colors.income : palette.primary}
                        height={7}
                      />
                    </View>

                    <View style={styles.cardBottomRow}>
                      <Text style={[styles.bottomLeftText, Typography.tabularNums]}>
                        {formatIDR(goal.current)} / {formatIDR(goal.target)}
                      </Text>
                      <Text
                        style={[
                          styles.goalPctText,
                          Typography.tabularNums,
                          isDone && { color: Colors.income },
                        ]}
                      >
                        {pct}%
                      </Text>
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
        </View>
      </ScrollView>

      {/* GOAL CONTRIBUTE SHEET */}
      <GoalFormSheet
        visible={goalSheetVisible}
        wallets={wallets}
        contributingGoal={contributingGoal}
        onClose={() => {
          setGoalSheetVisible(false);
          setContributingGoal(null);
        }}
        onCreateGoal={() => {}}
        onContribute={handleGoalContribute}
      />

      {/* GOAL REALIZE / DISBURSE SHEET */}
      <GoalRealizeSheet
        visible={realizingGoal !== null}
        goal={realizingGoal}
        wallets={wallets}
        onClose={() => setRealizingGoal(null)}
        onRealize={handleGoalRealize}
      />
    </View>
  );
}

const CARD_SHADOW = {
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.05,
  shadowRadius: 14,
  elevation: 3,
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  scrollContent: {
    paddingBottom: 115,
  },
  blueHeader: {
    paddingHorizontal: 20,
    paddingBottom: 34,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 36,
  },
  addPillText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: '#FFFFFF',
  },

  summaryCard: {
    marginHorizontal: 16,
    marginTop: -20,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    ...CARD_SHADOW,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  summaryCaption: {
    fontFamily: FontFamily.semibold,
    fontSize: 10.5,
    color: Colors.textMuted,
    letterSpacing: 0.7,
  },
  summaryAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    marginTop: 3,
  },
  summaryMainAmount: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    color: Colors.textPrimary,
    letterSpacing: -0.4,
  },
  summarySubLimit: {
    fontFamily: FontFamily.medium,
    fontSize: 12.5,
    color: Colors.textMuted,
  },
  pctBadge: {
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  pctBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.primaryDark,
  },
  progressTrack: {
    height: 8,
    borderRadius: 99,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    marginTop: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
  },
  microRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  microCol: {
    flex: 1,
  },
  microDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 12,
  },
  microLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
    color: Colors.textMuted,
  },
  microValue: {
    fontFamily: FontFamily.bold,
    fontSize: 13.5,
    color: Colors.textPrimary,
    marginTop: 2,
  },

  switcherWrap: {
    marginTop: 14,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 13,
    padding: 3,
    gap: 4,
  },
  switcherTab: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switcherTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  switcherText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  switcherTextActive: {
    fontFamily: FontFamily.semibold,
    color: Colors.primaryDark,
  },

  listWrap: {
    paddingHorizontal: 16,
    marginTop: 14,
    gap: 12,
  },
  itemCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    ...CARD_SHADOW,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardLeftGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 14.5,
    color: Colors.textPrimary,
  },
  cardCategorySub: {
    fontFamily: FontFamily.medium,
    fontSize: 11.5,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  cardSubMicro: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
    color: Colors.textMuted,
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  emptyDesc: {
    fontFamily: FontFamily.regular,
    fontSize: 12.5,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  badgeGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  periodTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  periodTagText: {
    fontFamily: FontFamily.medium,
    fontSize: 10.5,
    color: Colors.textSecondary,
  },
  monthlyEqMicro: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'right',
    marginTop: 4,
  },
  usableHighlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 12,
    gap: 8,
  },
  usableHighlightLabel: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 12.5,
    color: '#475569',
  },
  usableHighlightValue: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
  },
  safeDailyHelper: {
    fontFamily: FontFamily.medium,
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 6,
  },
  periodFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 2,
    gap: 8,
  },
  periodFilterPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  periodFilterPillActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  periodFilterText: {
    fontFamily: FontFamily.medium,
    fontSize: 12.5,
    color: '#64748B',
  },
  periodFilterTextActive: {
    fontFamily: FontFamily.semibold,
    color: '#2563EB',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  statusBadgeText: {
    fontFamily: FontFamily.semibold,
    fontSize: 11.5,
  },
  saveQuickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  saveQuickText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12,
    color: Colors.primaryDark,
  },
  goalRecMicro: {
    fontFamily: FontFamily.semibold,
    fontSize: 11,
    color: Colors.primary,
    marginTop: 2,
  },
  useFundPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.incomeSoft,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  useFundText: {
    fontFamily: FontFamily.semibold,
    fontSize: 11.5,
    color: Colors.incomeText,
  },
  cardProgressTrack: {
    height: 8,
    borderRadius: 99,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    marginTop: 14,
  },
  cardProgressFill: {
    height: '100%',
    borderRadius: 99,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 8,
  },
  bottomLeftText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  bottomRightText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.textMuted,
    flexShrink: 0,
  },
  goalPctText: {
    fontFamily: FontFamily.bold,
    fontSize: 12.5,
    color: Colors.primary,
  },
  emptyGoalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    alignItems: 'center',
  },
  emptyGoalIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyGoalTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 15.5,
    color: Colors.textPrimary,
  },
  emptyGoalSub: {
    marginTop: 4,
    fontFamily: FontFamily.regular,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#64748B',
    textAlign: 'center',
  },
  emptyGoalBtn: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 42,
  },
  emptyGoalBtnText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  forecastLinkRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  forecastLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  forecastLinkText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Colors.primary,
  },
});
