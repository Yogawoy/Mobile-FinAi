import React, { useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ShieldCheck,
  Sparkles,
} from 'lucide-react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  InteractiveForecastChart,
  SIMULATION_SCENARIOS,
  type SimulationKey,
  type SimulationScenario,
} from '@/components/forecast/InteractiveForecastChart';
import { useToast } from '@/components/ui/ToastProvider';
import { BUDGET_RULE_META, useFinance } from '@/context/FinanceContext';
import { formatIDR } from '@/lib/format';
import { mockAnomalies, type AnomalyItem } from '@/lib/mockData';
import { Colors, FontFamily, Radius, TouchTarget, Typography } from '@/theme/tokens';

const TIME_ELAPSED_PCT = 73; // Hari 22/30
const CURRENT_BUDGET_USED_PCT = 34;

export default function ForecastScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const {
    userProfile,
    hasCompletedSetup,
    budgets,
    transactions,
    monthlyIncomeActual,
    monthlyExpenseActual,
    todayExpenseActual,
    forecastData,
    sawHealth,
    isLoadingData,
    refreshAllData,
    dismissAnomalyById,
  } = useFinance();

  const [scenarioKey, setScenarioKey] = useState<SimulationKey>('CURRENT');
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const totalBudgetLimit = useMemo(() => {
    const sum = budgets.reduce((s, b) => s + b.limit, 0);
    return sum > 0 ? sum : Math.max(userProfile.safeDailyLimit * 30, 1_000_000);
  }, [budgets, userProfile.safeDailyLimit]);

  const budgetUsedPct = forecastData
    ? forecastData.pacing.budgetUsedPct
    : hasCompletedSetup
      ? Math.min(100, Math.round((monthlyExpenseActual / totalBudgetLimit) * 100))
      : CURRENT_BUDGET_USED_PCT;

  const liveScenarios = useMemo<Record<SimulationKey, SimulationScenario>>(() => {
    if (forecastData) {
      const f = forecastData.forecast;
      const baseIncome = Math.max(f.totalIncomeMtd, userProfile.monthlyIncomeTarget);
      const remainingDays = Math.max(
        0,
        forecastData.pacing.totalDaysInMonth - forecastData.pacing.elapsedDays
      );
      const currentBurn = Math.round(f.dailyBurnRate);
      const burn20 = Math.round(currentBurn * 0.8);
      const burn35 = Math.round(currentBurn * 0.65);
      const projCurrent = Math.round(f.projectedExpense);
      const proj20 = Math.round(f.totalExpenseMtd + burn20 * remainingDays);
      const proj35 = Math.round(f.totalExpenseMtd + burn35 * remainingDays);

      return {
        CURRENT: {
          key: 'CURRENT',
          label: 'Saat Ini',
          burnRate: currentBurn,
          projectedExpense: projCurrent,
          projectedBalance: Math.round(f.projectedBalance),
        },
        SAVE_20: {
          key: 'SAVE_20',
          label: 'Hemat 20%',
          burnRate: burn20,
          projectedExpense: proj20,
          projectedBalance: baseIncome - proj20,
        },
        SAVE_35: {
          key: 'SAVE_35',
          label: 'Hemat 35%',
          burnRate: burn35,
          projectedExpense: proj35,
          projectedBalance: baseIncome - proj35,
        },
      };
    }

    if (!hasCompletedSetup) return SIMULATION_SCENARIOS;
    const baseIncome = Math.max(monthlyIncomeActual, userProfile.monthlyIncomeTarget);
    const currentBurn =
      transactions.length === 0
        ? 0
        : Math.max(todayExpenseActual, Math.round(monthlyExpenseActual / 7));
    const burn20 = Math.round(currentBurn * 0.8);
    const burn35 = Math.round(currentBurn * 0.65);
    const projCurrent = monthlyExpenseActual + currentBurn * 8;
    const proj20 = monthlyExpenseActual + burn20 * 8;
    const proj35 = monthlyExpenseActual + burn35 * 8;

    return {
      CURRENT: {
        key: 'CURRENT',
        label: 'Saat Ini',
        burnRate: currentBurn,
        projectedExpense: projCurrent,
        projectedBalance: baseIncome - projCurrent,
      },
      SAVE_20: {
        key: 'SAVE_20',
        label: 'Hemat 20%',
        burnRate: burn20,
        projectedExpense: proj20,
        projectedBalance: baseIncome - proj20,
      },
      SAVE_35: {
        key: 'SAVE_35',
        label: 'Hemat 35%',
        burnRate: burn35,
        projectedExpense: proj35,
        projectedBalance: baseIncome - proj35,
      },
    };
  }, [
    forecastData,
    hasCompletedSetup,
    monthlyIncomeActual,
    monthlyExpenseActual,
    todayExpenseActual,
    transactions.length,
    userProfile.monthlyIncomeTarget,
  ]);

  const anomalies = useMemo<AnomalyItem[]>(() => {
    if (forecastData) {
      return forecastData.anomalies
        .filter((a) => !a.isDismissed && !dismissedIds.includes(a.id))
        .map((a) => ({
          id: a.id,
          type: a.anomalyType,
          badgeLabel:
            a.anomalyType === 'OVER_BUDGET'
              ? 'Over-Budget'
              : a.anomalyType === 'CATEGORY_SPIKE'
                ? `+${Math.round(a.deviationPct)}% Lonjakan`
                : 'Outlier',
          severity: a.severity === 'HIGH' ? ('HIGH' as const) : ('MEDIUM' as const),
          message: a.message,
        }));
    }

    const source: AnomalyItem[] = hasCompletedSetup
      ? budgets
        .filter((b) => b.limit > 0 && (b.spent / b.limit) * 100 >= b.alertThresholdPct)
        .map((b) => {
          const pct = Math.round((b.spent / b.limit) * 100);
          const isOver = pct >= 100;
          return {
            id: `anom-${b.id}`,
            type: isOver ? 'OVER_BUDGET' : 'CATEGORY_SPIKE',
            badgeLabel: `${pct}% Terpakai`,
            severity: isOver ? 'HIGH' : 'MEDIUM',
            message: `Kategori ${b.name} terpakai ${formatIDR(b.spent)} dari batas ${formatIDR(b.limit)}.`,
          };
        })
      : mockAnomalies;

    return source.filter((a) => !dismissedIds.includes(a.id));
  }, [forecastData, hasCompletedSetup, budgets, dismissedIds]);

  const scenario = liveScenarios[scenarioKey];
  const isSpendSafe = budgetUsedPct <= TIME_ELAPSED_PCT;

  const handleDismiss = (item: AnomalyItem) => {
    setDismissedIds((prev) => [...prev, item.id]);
    void dismissAnomalyById(item.id);
    showToast(`Peringatan "${item.badgeLabel}" ditandai sudah ditinjau`);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingData}
            onRefresh={() => void refreshAllData()}
            tintColor="#FFFFFF"
            colors={['#3B7AF5']}
          />
        }
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 28 }}
      >
        {/* HEADER BIRU KOMPAK */}
        <LinearGradient
          colors={['#4B89FF', '#3B7AF5', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.blueHeader, { paddingTop: Math.max(insets.top, 12) + 8 }]}
        >
          <View style={styles.topNav}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Kembali"
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
            >
              <ArrowLeft size={22} color="#FFFFFF" strokeWidth={2} />
            </Pressable>

            <Text style={styles.navTitle} numberOfLines={1}>
              Prediksi Arus Kas
            </Text>

            <View style={styles.periodPill}>
              <Text style={styles.periodText}>Nov 2026</Text>
            </View>
          </View>
        </LinearGradient>

        {/* HERO CARD MENUMPANG — SURPLUS & PACING BULAN */}
        <Animated.View
          entering={FadeInDown.duration(320).easing(Easing.out(Easing.cubic))}
          style={styles.heroCard}
        >
          <View style={styles.heroTop}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.heroCaption}>PERKIRAAN SISA UANG AKHIR BULAN</Text>
              <Text
                style={[styles.heroAmount, Typography.tabularNums]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {scenario.projectedBalance >= 0 ? '+' : '-'}
                {formatIDR(Math.abs(scenario.projectedBalance))}
              </Text>
            </View>

            <View
              style={[
                styles.safeBadge,
                scenario.projectedBalance < 0 && { backgroundColor: Colors.expenseSoft },
              ]}
            >
              <Text
                style={[
                  styles.safeBadgeText,
                  scenario.projectedBalance < 0 && { color: Colors.expenseText },
                ]}
              >
                {scenario.projectedBalance >= 0 ? 'Uang Masih Aman' : 'Perlu Kontrol'}
              </Text>
            </View>
          </View>

          {/* Visual Pacing Meter */}
          <View style={styles.pacingBlock}>
            <View style={styles.pacingItem}>
              <View style={styles.pacingLabelRow}>
                <Text style={styles.pacingLabel}>Waktu Berjalan: Hari 22/30</Text>
                <Text style={[styles.pacingPct, Typography.tabularNums]}>
                  {TIME_ELAPSED_PCT}%
                </Text>
              </View>
              <View style={styles.pacingTrack}>
                <View
                  style={[
                    styles.pacingFill,
                    { width: `${TIME_ELAPSED_PCT}%`, backgroundColor: '#CBD5E1' },
                  ]}
                />
              </View>
            </View>

            <View style={styles.pacingItem}>
              <View style={styles.pacingLabelRow}>
                <Text style={styles.pacingLabel}>Anggaran Terpakai</Text>
                <Text
                  style={[
                    styles.pacingPct,
                    Typography.tabularNums,
                    { color: isSpendSafe ? Colors.incomeText : Colors.expense },
                  ]}
                >
                  {budgetUsedPct}%
                </Text>
              </View>
              <View style={styles.pacingTrack}>
                <View
                  style={[
                    styles.pacingFill,
                    {
                      width: `${budgetUsedPct}%`,
                      backgroundColor: isSpendSafe ? Colors.income : Colors.expense,
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* 2 Mini-Tiles Dinamis */}
          <View style={styles.subMetricsRow}>
            <View style={styles.subMetricBox}>
              <Text style={styles.subMetricLabel}>Rata-rata Belanja / Hari</Text>
              <Text
                style={[styles.subMetricVal, Typography.tabularNums]}
                numberOfLines={1}
              >
                {formatIDR(scenario.burnRate)}/hr
              </Text>
            </View>

            <View style={styles.subMetricBox}>
              <Text style={styles.subMetricLabel}>
                {hasCompletedSetup
                  ? `Batas Aman (${BUDGET_RULE_META[userProfile.budgetRule].label})`
                  : 'Perkiraan Pengeluaran'}
              </Text>
              <Text
                style={[styles.subMetricVal, Typography.tabularNums]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {hasCompletedSetup
                  ? `${formatIDR(userProfile.safeDailyLimit)}/hr`
                  : formatIDR(scenario.projectedExpense)}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* SKOR KESEHATAN SAW (4 KRITERIA) */}
        <Animated.View
          entering={FadeInDown.delay(60).duration(320).easing(Easing.out(Easing.cubic))}
          style={styles.sawCard}
        >
          {!sawHealth || !sawHealth.hasEnoughData || sawHealth.healthScore === null ? (
            <View style={{ gap: 10 }}>
              <View style={styles.sawHeaderRow}>
                <Text style={styles.heroCaption}>SKOR KESEHATAN SAW</Text>
                <View style={[styles.sawBadge, { backgroundColor: '#F1F5F9' }]}>
                  <Text style={[styles.sawBadgeText, { color: '#64748B' }]}>
                    Belum Cukup Data
                  </Text>
                </View>
              </View>
              <Text style={styles.sawEmptyTitle}>
                {sawHealth?.txCount ?? transactions.length} dari 3 transaksi tercatat
              </Text>
              <View style={styles.pacingTrack}>
                <View
                  style={[
                    styles.pacingFill,
                    {
                      width: `${Math.min(100, Math.round(((sawHealth?.txCount ?? transactions.length) / 3) * 100))}%`,
                      backgroundColor: Colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.sawEmptyDesc}>
                Catat minimal 3 transaksi bulan ini untuk membuka analisis Skor Kesehatan SAW 4 kriteria.
              </Text>
              <Pressable
                onPress={() => router.push('/(tabs)/transactions')}
                style={({ pressed }) => [styles.sawEmptyBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.sawEmptyBtnText}>+ Catat Transaksi Pertama</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              <View style={styles.sawHeaderRow}>
                <View>
                  <Text style={styles.heroCaption}>SKOR KESEHATAN SAW</Text>
                  <Text style={[styles.sawScoreBig, Typography.tabularNums]}>
                    {sawHealth.healthScore}
                    <Text style={styles.sawScoreUnit}>/100</Text>
                  </Text>
                </View>
                <View
                  style={[
                    styles.sawBadge,
                    {
                      backgroundColor:
                        sawHealth.classification === 'Strong'
                          ? '#ECFDF5'
                          : sawHealth.classification === 'Stable'
                            ? '#EFF6FF'
                            : sawHealth.classification === 'Warning'
                              ? '#FFFBEB'
                              : '#FEF2F2',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.sawBadgeText,
                      {
                        color:
                          sawHealth.classification === 'Strong'
                            ? '#059669'
                            : sawHealth.classification === 'Stable'
                              ? '#2563EB'
                              : sawHealth.classification === 'Warning'
                                ? '#D97706'
                                : '#DC2626',
                      },
                    ]}
                  >
                    {sawHealth.statusLabel}
                  </Text>
                </View>
              </View>

              {sawHealth.criteria ? (
                <View style={styles.sawCriteriaList}>
                  {[
                    sawHealth.criteria.c1SavingsRate,
                    sawHealth.criteria.c2ExpenseControl,
                    sawHealth.criteria.c3BudgetAdherence,
                    sawHealth.criteria.c4LiquidityBuffer,
                  ].map((c) => {
                    const pct = Math.round(c.normalizedScore * 100);
                    return (
                      <View key={c.key} style={styles.sawCriterionRow}>
                        <View style={styles.pacingLabelRow}>
                          <Text style={styles.sawCritLabel}>
                            {c.label} ({Math.round(c.weight * 100)}%)
                          </Text>
                          <Text style={[styles.sawCritVal, Typography.tabularNums]}>
                            {pct}%
                          </Text>
                        </View>
                        <View style={styles.pacingTrack}>
                          <View
                            style={[
                              styles.pacingFill,
                              {
                                width: `${pct}%`,
                                backgroundColor:
                                  pct >= 75
                                    ? Colors.income
                                    : pct >= 50
                                      ? Colors.primary
                                      : Colors.warning,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>
          )}
        </Animated.View>

        <View style={styles.bodyWrap}>
          {/* DIAGRAM KURVA PROYEKSI INTERAKTIF */}
          <Animated.View
            entering={FadeInDown.delay(70).duration(320).easing(Easing.out(Easing.cubic))}
          >
            <InteractiveForecastChart
              scenarioKey={scenarioKey}
              onSelectScenario={setScenarioKey}
              scenarios={liveScenarios}
              budgetLimit={hasCompletedSetup ? totalBudgetLimit : undefined}
              currentExpense={hasCompletedSetup ? monthlyExpenseActual : undefined}
            />
          </Animated.View>

          {/* SECTION DETEKSI PEMBOROSAN RAMPING */}
          <Animated.View
            entering={FadeInDown.delay(130).duration(320).easing(Easing.out(Easing.cubic))}
            style={styles.anomalySection}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Deteksi Pemborosan</Text>
              <View style={styles.countPill}>
                <Text style={[styles.countPillText, Typography.tabularNums]}>
                  {anomalies.length} Aktif
                </Text>
              </View>
            </View>

            {anomalies.length === 0 ? (
              <View style={styles.calmCard}>
                <View style={styles.calmIcon}>
                  <ShieldCheck size={20} color={Colors.income} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.calmTitle}>Semua Peringatan Ditinjau</Text>
                  <Text style={styles.calmSub}>
                    Tidak ada anomali pemborosan tersisa untuk ditinjau.
                  </Text>
                </View>
              </View>
            ) : (
              anomalies.map((item) => {
                const isHigh = item.severity === 'HIGH';
                const accent = isHigh ? Colors.expense : Colors.warning;
                const shortTitle =
                  item.type === 'OVER_BUDGET'
                    ? 'Belanja 108% Batas'
                    : item.type === 'CATEGORY_SPIKE'
                      ? 'Makanan +28%'
                      : 'Belanja Mingguan Tinggi';

                return (
                  <Animated.View
                    key={item.id}
                    exiting={FadeOut.duration(220)}
                    layout={LinearTransition.springify()}
                    style={styles.anomalyCard}
                  >
                    <View style={[styles.leftStrip, { backgroundColor: accent }]} />

                    <View style={styles.anomBody}>
                      <Text style={styles.anomTitle} numberOfLines={1}>
                        {shortTitle}
                      </Text>
                      <Text style={styles.anomMsg} numberOfLines={2}>
                        {item.message}
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => handleDismiss(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`Tandai ${shortTitle} ditinjau`}
                      style={({ pressed }) => [
                        styles.checkCircleBtn,
                        pressed && { backgroundColor: Colors.incomeSoft },
                      ]}
                    >
                      <Check size={16} color={Colors.textSecondary} strokeWidth={2.3} />
                    </Pressable>
                  </Animated.View>
                );
              })
            )}
          </Animated.View>

          {/* STRIP BRIDGE KE CHATBOT */}
          <Pressable
            onPress={() => router.push('/(tabs)/ai')}
            style={({ pressed }) => [styles.bridgeCard, pressed && { opacity: 0.85 }]}
          >
            <Sparkles size={16} color={Colors.primary} strokeWidth={2} />
            <Text style={styles.bridgeText} numberOfLines={1}>
              Butuh saran penghematan spesifik?
            </Text>
            <View style={styles.bridgeLinkRow}>
              <Text style={styles.bridgeLinkText}>Tanya AI</Text>
              <ArrowRight size={14} color={Colors.primary} strokeWidth={2.2} />
            </View>
          </Pressable>
        </View>
      </ScrollView>
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
  blueHeader: {
    paddingHorizontal: 16,
    paddingBottom: 34,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    width: TouchTarget.minSize,
    height: TouchTarget.minSize,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: '#FFFFFF',
  },
  periodPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  periodText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12,
    color: '#FFFFFF',
  },

  heroCard: {
    marginHorizontal: 16,
    marginTop: -22,
    backgroundColor: Colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 14,
    ...CARD_SHADOW,
  },
  sawCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    ...CARD_SHADOW,
  },
  sawHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sawBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  sawBadgeText: {
    fontFamily: FontFamily.semibold,
    fontSize: 11.5,
  },
  sawScoreBig: {
    fontFamily: FontFamily.bold,
    fontSize: 26,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  sawScoreUnit: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Colors.textMuted,
  },
  sawEmptyTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  sawEmptyDesc: {
    fontFamily: FontFamily.regular,
    fontSize: 12.5,
    lineHeight: 18,
    color: Colors.textMuted,
  },
  sawEmptyBtn: {
    marginTop: 2,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  sawEmptyBtnText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  sawCriteriaList: {
    gap: 9,
  },
  sawCriterionRow: {
    gap: 4,
  },
  sawCritLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  sawCritVal: {
    fontFamily: FontFamily.semibold,
    fontSize: 12,
    color: Colors.textPrimary,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  heroCaption: {
    fontFamily: FontFamily.semibold,
    fontSize: 10.5,
    color: Colors.textMuted,
    letterSpacing: 0.6,
  },
  heroAmount: {
    fontFamily: FontFamily.bold,
    fontSize: 25,
    color: Colors.income,
    marginTop: 3,
    letterSpacing: -0.4,
  },
  safeBadge: {
    flexShrink: 0,
    backgroundColor: Colors.incomeSoft,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  safeBadgeText: {
    fontFamily: FontFamily.semibold,
    fontSize: 11.5,
    color: Colors.incomeText,
  },

  pacingBlock: {
    gap: 9,
  },
  pacingItem: {
    gap: 5,
  },
  pacingLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pacingLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11.5,
    color: Colors.textSecondary,
  },
  pacingPct: {
    fontFamily: FontFamily.bold,
    fontSize: 11.5,
    color: Colors.textPrimary,
  },
  pacingTrack: {
    height: 7,
    borderRadius: 99,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  pacingFill: {
    height: '100%',
    borderRadius: 99,
  },

  subMetricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  subMetricBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 12,
  },
  subMetricLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11.5,
    color: Colors.textMuted,
  },
  subMetricVal: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.textPrimary,
    marginTop: 3,
  },

  bodyWrap: {
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 16,
  },
  anomalySection: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15.5,
    color: Colors.textPrimary,
  },
  countPill: {
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  countPillText: {
    fontFamily: FontFamily.semibold,
    fontSize: 11.5,
    color: Colors.primaryDark,
  },
  anomalyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 12,
    paddingRight: 12,
    paddingLeft: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
    ...CARD_SHADOW,
  },
  leftStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  anomBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  anomTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
    color: Colors.textPrimary,
  },
  anomMsg: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
  },
  checkCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  calmCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  calmIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.incomeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calmTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
    color: Colors.textPrimary,
  },
  calmSub: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },

  bridgeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  bridgeText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 12.5,
    color: Colors.textSecondary,
  },
  bridgeLinkRow: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bridgeLinkText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Colors.primary,
  },
});
