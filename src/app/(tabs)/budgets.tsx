import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BudgetFormSheet,
  type BudgetFormSubmitPayload,
} from '@/components/budgets/BudgetFormSheet';
import {
  GoalFormSheet,
  type GoalContributePayload,
  type GoalCreatePayload,
} from '@/components/budgets/GoalFormSheet';
import {
  GoalRealizeSheet,
  type GoalRealizePayload,
} from '@/components/budgets/GoalRealizeSheet';
import { useToast } from '@/components/ui/ToastProvider';
import { BUDGET_RULE_META, useFinance } from '@/context/FinanceContext';
import { formatIDR } from '@/lib/format';
import { budgetService } from '@/services/budget.service';
import { goalService } from '@/services/goal.service';
import { calculateGoalRecommendation } from '@/lib/goalCalculator';
import {
  type BudgetIconKey,
  type BudgetItem,
  type GoalIconKey,
  type GoalItem,
} from '@/lib/mockData';
import { Colors, FontFamily, Radius, Typography } from '@/theme/tokens';

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

function getBudgetStatus(spent: number, limit: number, thresholdPct: number) {
  const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
  if (pct > 100) {
    return {
      pct,
      label: 'Over-Budget',
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
    setBudgets,
    goals,
    setGoals,
    recordTransaction,
    refreshAllData,
  } = useFinance();

  const [budgetSheetVisible, setBudgetSheetVisible] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetItem | null>(null);

  const [goalSheetVisible, setGoalSheetVisible] = useState(false);
  const [contributingGoal, setContributingGoal] = useState<GoalItem | null>(null);
  const [realizingGoal, setRealizingGoal] = useState<GoalItem | null>(null);

  const budgetSummary = useMemo(() => {
    const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
    const totalLimit = budgets.reduce((s, b) => s + b.limit, 0);
    const pct = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;
    const remaining = totalLimit - totalSpent;
    const alertCount = budgets.filter((b) => {
      const st = getBudgetStatus(b.spent, b.limit, b.alertThresholdPct);
      return st.statusKey !== 'SAFE';
    }).length;
    return { totalSpent, totalLimit, pct, remaining, alertCount };
  }, [budgets]);

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
      setEditingBudget(null);
      setBudgetSheetVisible(true);
    } else {
      setContributingGoal(null);
      setGoalSheetVisible(true);
    }
  };

  const handleBudgetSubmit = async (payload: BudgetFormSubmitPayload) => {
    const now = new Date();
    const matchedCat = categories.find(
      (c) => c.type === 'EXPENSE' && c.label.toLowerCase() === payload.name.toLowerCase()
    ) ?? categories.find((c) => c.type === 'EXPENSE');

    if (payload.id) {
      setBudgets((prev) =>
        prev.map((b) =>
          b.id === payload.id
            ? {
                ...b,
                name: payload.name,
                iconKey: payload.iconKey,
                limit: payload.limit,
                alertThresholdPct: payload.alertThresholdPct,
              }
            : b
        )
      );
      if (matchedCat) {
        try {
          await budgetService.upsertBudget({
            categoryId: matchedCat.id,
            month: now.getMonth() + 1,
            year: now.getFullYear(),
            limitAmount: payload.limit,
            alertThresholdPct: payload.alertThresholdPct,
          });
          await refreshAllData();
        } catch (err) {
          showToast(err instanceof Error ? err.message : 'Gagal memperbarui anggaran', 'error');
        }
      }
      return;
    }

    const newBudget: BudgetItem = {
      id: `bdg-${Date.now()}`,
      name: payload.name,
      iconKey: payload.iconKey,
      spent: 0,
      limit: payload.limit,
      alertThresholdPct: payload.alertThresholdPct,
    };
    setBudgets((prev) => [newBudget, ...prev]);
    if (matchedCat) {
      try {
        await budgetService.upsertBudget({
          categoryId: matchedCat.id,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
          limitAmount: payload.limit,
          alertThresholdPct: payload.alertThresholdPct,
        });
        await refreshAllData();
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Gagal menyimpan anggaran', 'error');
      }
    }
  };

  const handleBudgetDelete = async (budget: BudgetItem) => {
    setBudgets((prev) => prev.filter((b) => b.id !== budget.id));
    try {
      await budgetService.deleteBudget(budget.id);
      await refreshAllData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus anggaran', 'error');
    }
  };

  const handleGoalCreate = async (payload: GoalCreatePayload) => {
    const newGoal: GoalItem = {
      id: `goal-${Date.now()}`,
      name: payload.name,
      iconKey: payload.iconKey,
      current: 0,
      target: payload.target,
      deadline: payload.deadline,
      walletId: payload.walletId,
      walletName: payload.walletName,
      frequency: payload.frequency,
      isRealized: false,
    };
    setGoals((prev) => [newGoal, ...prev]);
    try {
      const parsedDate = Date.parse(payload.deadline);
      const isoDeadline = Number.isNaN(parsedDate)
        ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(parsedDate).toISOString();
      await goalService.createGoal({
        name: payload.name,
        targetAmount: payload.target,
        currentAmount: 0,
        deadline: isoDeadline,
      });
      await refreshAllData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal membuat target tabungan', 'error');
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

    if (payload.sourceWalletId !== payload.targetWalletId) {
      const sourceWallet = wallets.find((w) => w.id === payload.sourceWalletId);
      const targetWallet = wallets.find((w) => w.id === payload.targetWalletId);
      recordTransaction({
        title: `Setor Target Tabungan`,
        categoryKey: 'wallet',
        categoryLabel: 'Transfer',
        walletId: payload.sourceWalletId,
        walletName: sourceWallet?.name || 'Dompet',
        targetWalletId: payload.targetWalletId,
        targetWalletName: targetWallet?.name,
        dateLabel: 'Baru saja',
        amount: payload.amount,
        type: 'TRANSFER',
        iconBg: '#EBF2FF',
        iconColor: '#3B7AF5',
      });
    }

    try {
      await goalService.contributeGoal(payload.goalId, payload.amount);
      await refreshAllData();
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
                    {hasCompletedSetup
                      ? `POLA ${BUDGET_RULE_META[userProfile.budgetRule].label} • BATAS ${formatIDR(userProfile.safeDailyLimit)}/HR`
                      : 'TOTAL TERPAKAI BULAN INI'}
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
                  <Text style={styles.microLabel}>Sisa Anggaran</Text>
                  <Text
                    style={[
                      styles.microValue,
                      Typography.tabularNums,
                      {
                        color:
                          budgetSummary.remaining < 0 ? Colors.expense : Colors.income,
                      },
                    ]}
                  >
                    {budgetSummary.remaining < 0
                      ? `-${formatIDR(Math.abs(budgetSummary.remaining))}`
                      : formatIDR(budgetSummary.remaining)}
                  </Text>
                </View>

                <View style={styles.microDivider} />

                <View style={styles.microCol}>
                  <Text style={styles.microLabel}>Kategori Waspada / Over</Text>
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

        {/* SEGMENTED TAB SWITCHER */}
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
              Anggaran Bulanan
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
            ) : budgets.map((budget, idx) => {
                const st = getBudgetStatus(
                  budget.spent,
                  budget.limit,
                  budget.alertThresholdPct
                );
                const diff = budget.limit - budget.spent;

                return (
                  <Animated.View
                    key={budget.id}
                    entering={FadeInDown.delay(Math.min(idx * 55, 220))
                      .duration(320)
                      .easing(Easing.out(Easing.cubic))}
                  >
                    <Pressable
                      onPress={() => {
                        setEditingBudget(budget);
                        setBudgetSheetVisible(true);
                      }}
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
                            <Text
                              style={[
                                styles.cardSubMicro,
                                Typography.tabularNums,
                                diff < 0 && { color: Colors.expense },
                              ]}
                              numberOfLines={1}
                            >
                              {diff < 0
                                ? `Melebihi ${formatIDR(Math.abs(diff))}`
                                : `Sisa ${formatIDR(diff)}`}
                            </Text>
                          </View>
                        </View>

                        <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                          <Text style={[styles.statusBadgeText, { color: st.textColor }]}>
                            {st.label}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cardProgressTrack}>
                        <AnimatedProgressFill pct={st.pct} color={st.color} height={7} />
                      </View>

                      <View style={styles.cardBottomRow}>
                        <Text style={[styles.bottomLeftText, Typography.tabularNums]}>
                          Terpakai {formatIDR(budget.spent)}
                        </Text>
                        <Text style={[styles.bottomRightText, Typography.tabularNums]}>
                          Batas {formatIDR(budget.limit)} ({st.pct}%)
                        </Text>
                      </View>
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

                return (
                  <Animated.View
                    key={goal.id}
                    entering={FadeInDown.delay(Math.min(idx * 65, 220))
                      .duration(320)
                      .easing(Easing.out(Easing.cubic))}
                  >
                    <View style={styles.itemCard}>
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
                                    : Colors.primarySoft,
                              },
                            ]}
                          >
                            {renderGoalIcon(
                              goal.iconKey,
                              isRealized
                                ? Colors.textMuted
                                : isDone
                                  ? Colors.income
                                  : Colors.primary
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.cardTitle} numberOfLines={1}>
                              {goal.name}
                            </Text>
                            <Text style={styles.cardSubMicro} numberOfLines={1}>
                              Target {goal.deadline}
                              {goal.walletName ? ` · ${goal.walletName}` : ''}
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
                            onPress={() => setRealizingGoal(goal)}
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
                            onPress={() => {
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
                          color={isDone ? Colors.income : Colors.primary}
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
                    </View>
                  </Animated.View>
                );
              })}
        </View>
      </ScrollView>

      {/* BUDGET FORM SHEET */}
      <BudgetFormSheet
        visible={budgetSheetVisible}
        editingBudget={editingBudget}
        onClose={() => {
          setBudgetSheetVisible(false);
          setEditingBudget(null);
        }}
        onSubmit={handleBudgetSubmit}
        onDelete={handleBudgetDelete}
      />

      {/* GOAL FORM / CONTRIBUTE SHEET */}
      <GoalFormSheet
        visible={goalSheetVisible}
        wallets={wallets}
        contributingGoal={contributingGoal}
        onClose={() => {
          setGoalSheetVisible(false);
          setContributingGoal(null);
        }}
        onCreateGoal={handleGoalCreate}
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
    marginHorizontal: 16,
    marginTop: 16,
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 4,
    gap: 4,
  },
  switcherTab: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switcherTabActive: {
    backgroundColor: Colors.primary,
  },
  switcherText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.textMuted,
  },
  switcherTextActive: {
    fontFamily: FontFamily.semibold,
    color: '#FFFFFF',
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
  cardSubMicro: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
    color: Colors.textMuted,
    marginTop: 2,
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
