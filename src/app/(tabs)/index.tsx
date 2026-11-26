import { CategoryManagerSheet } from '@/components/modals/CategoryManagerSheet';
import {
  INITIAL_NOTIFICATIONS,
  NotificationSheet,
  type NotificationItem,
} from '@/components/modals/NotificationSheet';
import { ProfileSheet } from '@/components/modals/ProfileSheet';
import {
  RecurringBillsSheet,
  type RecurringBillItem,
} from '@/components/modals/RecurringBillsSheet';
import {
  QuickTransactionSheet,
  type QuickTransactionSubmitPayload,
} from '@/components/transactions/QuickTransactionSheet';
import { BUDGET_RULE_META, useFinance } from '@/context/FinanceContext';
import { formatIDR } from '@/lib/format';
import {
  INITIAL_SUMMARY,
  type CategoryIconKey,
  type TransactionMode
} from '@/lib/mockData';
import { useResponsive } from '@/lib/responsive';
import { getWalletTheme } from '@/lib/walletTheme';
import { Colors, FontFamily, TouchTarget, Typography } from '@/theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Bell,
  Briefcase,
  CalendarClock,
  Car,
  ChevronRight,
  Coffee,
  Eye,
  EyeOff,
  PieChart,
  Plus,
  Receipt,
  ShoppingBag,
  Sparkles,
  Tag,
  Target,
  TrendingUp,
  Utensils,
  Wallet,
  Zap,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function renderCategoryIcon(key: CategoryIconKey, color: string) {
  switch (key) {
    case 'utensils':
      return <Utensils size={18} color={color} strokeWidth={1.85} />;
    case 'car':
      return <Car size={18} color={color} strokeWidth={1.85} />;
    case 'shopping':
      return <ShoppingBag size={18} color={color} strokeWidth={1.85} />;
    case 'zap':
      return <Zap size={18} color={color} strokeWidth={1.85} />;
    case 'briefcase':
      return <Briefcase size={18} color={color} strokeWidth={1.85} />;
    case 'coffee':
      return <Coffee size={18} color={color} strokeWidth={1.85} />;
    case 'wallet':
      return <Wallet size={18} color={color} strokeWidth={1.85} />;
  }
}

export default function HomeTabScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useResponsive();
  const {
    userProfile,
    wallets,
    budgets,
    transactions,
    hasCompletedSetup,
    hasSeenTutorial,
    tutorialVisible,
    tutorialStep,
    aiButtonRect,
    monthlyIncomeActual,
    monthlyExpenseActual,
    remainingDailySafeLimit,
    recordTransaction,
    updateUserProfile,
    setTutorialVisible,
    setTutorialStep,
    setTutorialTargetRect,
  } = useFinance();

  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const balanceRef = useRef<ComponentRef<typeof View>>(null);
  const actionsRef = useRef<ComponentRef<typeof View>>(null);
  const summaryRef = useRef<ComponentRef<typeof View>>(null);
  const shortcutsRef = useRef<ComponentRef<typeof View>>(null);

  const [hideBalance, setHideBalance] = useState(userProfile.hideBalanceOnOpen);

  useEffect(() => {
    setHideBalance(userProfile.hideBalanceOnOpen);
  }, [userProfile.hideBalanceOnOpen]);

  const measureTutorialStep = useCallback(
    (stepIdx: number) => {
      setTutorialTargetRect(null);

      if (stepIdx === 4) {
        setTimeout(() => {
          requestAnimationFrame(() => {
            if (aiButtonRect) {
              setTutorialTargetRect({
                x: aiButtonRect.x,
                y: aiButtonRect.y,
                width: aiButtonRect.width,
                height: aiButtonRect.height,
                padding: 8,
                isCircle: true,
              });
            } else {
              setTutorialTargetRect({
                x: width / 2 - 30,
                y: height - (insets.bottom + 90),
                width: 60,
                height: 60,
                padding: 8,
                isCircle: true,
              });
            }
          });
        }, 160);
        return;
      }

      const measureTarget = (
        ref: React.RefObject<ComponentRef<typeof View> | null>
      ) => {
        requestAnimationFrame(() => {
          ref.current?.measureInWindow((x, y, w, h) => {
            if (w > 0 && h > 0) {
              setTutorialTargetRect({
                x,
                y,
                width: w,
                height: h,
                padding: 8,
                borderRadius: 16,
              });
            }
          });
        });
      };

      if (stepIdx === 3) {
        scrollRef.current?.scrollTo({ y: 240, animated: true });
        setTimeout(() => measureTarget(shortcutsRef), 360);
        return;
      }

      scrollRef.current?.scrollTo({ y: 0, animated: true });
      setTimeout(() => {
        if (stepIdx === 0) measureTarget(balanceRef);
        else if (stepIdx === 1) measureTarget(actionsRef);
        else if (stepIdx === 2) measureTarget(summaryRef);
      }, 360);
    },
    [width, height, insets.bottom, aiButtonRect, setTutorialTargetRect]
  );

  useEffect(() => {
    if (hasSeenTutorial) {
      setTutorialVisible(false);
      setTutorialTargetRect(null);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    const timer = setTimeout(() => {
      setTutorialStep(0);
      setTutorialVisible(true);
    }, 450);
    return () => clearTimeout(timer);
  }, [hasSeenTutorial, setTutorialStep, setTutorialVisible, setTutorialTargetRect]);

  useEffect(() => {
    if (!tutorialVisible) return;
    measureTutorialStep(tutorialStep);
  }, [tutorialVisible, tutorialStep, measureTutorialStep]);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetMode, setSheetMode] = useState<TransactionMode>('EXPENSE');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotificationSheet, setShowNotificationSheet] = useState(false);
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [showRecurringSheet, setShowRecurringSheet] = useState(false);

  const [notifications, setNotifications] =
    useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  const userName = userProfile.name;
  const monthlyIncomeTarget = userProfile.monthlyIncomeTarget;

  const hasUnreadNotif = useMemo(
    () => notifications.some((n) => n.unread),
    [notifications]
  );

  const firstName = userName.trim().split(/\s+/)[0] || 'Yoga';
  const userInitials =
    userName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || '')
      .join('') || 'YS';

  const totalBalance = useMemo(
    () => wallets.reduce((sum, w) => sum + w.balance, 0),
    [wallets]
  );

  const totalBudgetLimit = useMemo(
    () => budgets.reduce((sum, b) => sum + b.limit, 0),
    [budgets]
  );

  const totalBudgetSpent = useMemo(
    () => budgets.reduce((sum, b) => sum + b.spent, 0),
    [budgets]
  );

  const budgetPct =
    totalBudgetLimit > 0
      ? Math.min(100, Math.round((totalBudgetSpent / totalBudgetLimit) * 100))
      : 0;

  const openQuickSheet = (mode: TransactionMode) => {
    setSheetMode(mode);
    setSheetVisible(true);
  };


  const handleQuickSubmit = (payload: QuickTransactionSubmitPayload) => {
    const sourceWallet = wallets.find((w) => w.id === payload.walletId);
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');

    if (payload.mode === 'TRANSFER' && payload.targetWalletId) {
      const targetWallet = wallets.find((w) => w.id === payload.targetWalletId);
      recordTransaction({
        title: payload.note || `Transfer ke ${targetWallet?.name || 'Dompet'}`,
        categoryKey: 'wallet',
        categoryLabel: 'Transfer',
        walletId: payload.walletId,
        walletName: sourceWallet?.name || 'Dompet',
        targetWalletId: payload.targetWalletId,
        targetWalletName: targetWallet?.name,
        dateLabel: `${hh}:${mm}`,
        amount: payload.amount,
        type: 'TRANSFER',
        note: payload.note || undefined,
        iconBg: '#EBF2FF',
        iconColor: '#3B7AF5',
      });
      return;
    }

    const isIncome = payload.mode === 'INCOME';
    recordTransaction({
      title: payload.note || payload.category.label,
      categoryKey: payload.category.key,
      categoryLabel: payload.category.label,
      walletId: payload.walletId,
      walletName: sourceWallet?.name || 'Dompet',
      dateLabel: `${hh}:${mm}`,
      amount: payload.amount,
      type: isIncome ? 'INCOME' : 'EXPENSE',
      note: payload.note || undefined,
      iconBg: payload.category.iconBg,
      iconColor: payload.category.iconColor,
    });
  };

  const handleRecordRecurringBill = (bill: RecurringBillItem) => {
    const defaultWallet = wallets[0];
    if (!defaultWallet) return;

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');

    recordTransaction({
      title: bill.title,
      categoryKey: 'zap',
      categoryLabel: bill.categoryLabel,
      walletId: defaultWallet.id,
      walletName: defaultWallet.name,
      dateLabel: `${hh}:${mm}`,
      amount: bill.amount,
      type: 'EXPENSE',
      iconBg: '#FEF2F2',
      iconColor: '#EF4444',
    });
  };

  const shortcutRows = [
    [
      {
        label: 'Anggaran',
        bg: '#EBF2FF',
        icon: <PieChart size={20} color="#3B7AF5" strokeWidth={1.8} />,
        onPress: () =>
          router.push({ pathname: '/(tabs)/budgets', params: { tab: 'budget' } }),
      },
      {
        label: 'Target',
        bg: '#ECFDF5',
        icon: <Target size={20} color="#10B981" strokeWidth={1.8} />,
        onPress: () =>
          router.push({ pathname: '/(tabs)/budgets', params: { tab: 'goals' } }),
      },
      {
        label: 'Rutin',
        bg: '#FFFBEB',
        icon: <CalendarClock size={20} color="#F59E0B" strokeWidth={1.8} />,
        onPress: () => router.push('/recurring'),
      },
      {
        label: 'Kategori',
        bg: '#EFF6FF',
        icon: <Tag size={20} color="#2563EB" strokeWidth={1.8} />,
        onPress: () => router.push('/categories'),
      },
    ],
    [
      {
        label: 'Dompet',
        bg: '#F0FDFA',
        icon: <Wallet size={20} color="#0D9488" strokeWidth={1.8} />,
        onPress: () => router.push('/(tabs)/wallets'),
      },
      {
        label: 'Riwayat',
        bg: '#F1F5F9',
        icon: <Receipt size={20} color="#475569" strokeWidth={1.8} />,
        onPress: () => router.push('/(tabs)/transactions'),
      },
      {
        label: 'Tanya AI',
        bg: '#EBF2FF',
        icon: <Sparkles size={20} color="#3B7AF5" strokeWidth={1.8} />,
        onPress: () => router.push('/(tabs)/ai'),
      },
      {
        label: 'Prediksi',
        bg: '#EBF2FF',
        icon: <TrendingUp size={20} color="#3B7AF5" strokeWidth={1.8} />,
        onPress: () => router.push('/forecast'),
      },
    ],
  ];

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 112 + insets.bottom },
        ]}
      >
        {/* SECTION 1 — FULL-BLEED DANA BLUE HEADER */}
        <LinearGradient
          colors={['#4B89FF', '#3B7AF5', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.blueHeader, { paddingTop: Math.max(insets.top, 12) + 12 }]}
        >
          {/* Compact Topbar */}
          <View style={styles.topbar}>
            <View style={styles.brandGroup}>
              <View style={styles.miniLogo}>
                <Wallet size={16} color="#FFFFFF" strokeWidth={2} />
              </View>
              <View>
                <Text style={styles.brandTitle}>Smart Finance</Text>
                <Text style={styles.greetingText}>Halo, {firstName}</Text>
              </View>
            </View>

            <View style={styles.topRight}>
              <Pressable
                onPress={() => setShowNotificationSheet(true)}
                accessibilityRole="button"
                accessibilityLabel="Notifikasi"
                style={({ pressed }) => [styles.bellBtn, pressed && { opacity: 0.7 }]}
              >
                <Bell size={20} color="#FFFFFF" strokeWidth={1.85} />
                {hasUnreadNotif ? <View style={styles.redDot} /> : null}
              </Pressable>

              <Pressable
                onPress={() => router.push('/profile')}
                accessibilityRole="button"
                accessibilityLabel={`Profil ${firstName}`}
                style={({ pressed }) => [styles.avatarBtn, pressed && { opacity: 0.7 }]}
              >
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitials}>{userInitials}</Text>
                </View>
              </Pressable>
            </View>
          </View>

          {/* Main Balance Row */}
          <View ref={balanceRef} collapsable={false} style={styles.balanceRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.balanceLabel}>
                Total Saldo ({wallets.length} Dompet)
              </Text>
              <View style={styles.balanceValueRow}>
                <Text
                  style={[styles.balanceAmount, Typography.tabularNums]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {hideBalance ? 'Rp ••••••••' : formatIDR(totalBalance)}
                </Text>
                <Pressable
                  onPress={() => setHideBalance((prev) => !prev)}
                  accessibilityRole="button"
                  accessibilityLabel={hideBalance ? 'Tampilkan saldo' : 'Sembunyikan saldo'}
                  style={styles.eyeBtn}
                >
                  {hideBalance ? (
                    <EyeOff size={18} color="rgba(255,255,255,0.88)" strokeWidth={1.85} />
                  ) : (
                    <Eye size={18} color="rgba(255,255,255,0.88)" strokeWidth={1.85} />
                  )}
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={() => openQuickSheet('EXPENSE')}
              accessibilityRole="button"
              accessibilityLabel="Catat transaksi cepat"
              style={({ pressed }) => [styles.quickRecordPill, pressed && { opacity: 0.8 }]}
            >
              <Plus size={14} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.quickRecordText}>Catat</Text>
            </Pressable>
          </View>

          {/* 4 Main DANA-style Actions */}
          <View ref={actionsRef} collapsable={false} style={styles.actionGrid}>
            <Pressable
              onPress={() => openQuickSheet('EXPENSE')}
              style={({ pressed }) => [styles.actionItem, pressed && { opacity: 0.8 }]}
            >
              <View style={styles.actionBox}>
                <ArrowUpRight size={21} color="#FFFFFF" strokeWidth={1.9} />
              </View>
              <Text
                style={styles.actionLabel}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                Catat Keluar
              </Text>
            </Pressable>

            <Pressable
              onPress={() => openQuickSheet('INCOME')}
              style={({ pressed }) => [styles.actionItem, pressed && { opacity: 0.8 }]}
            >
              <View style={styles.actionBox}>
                <ArrowDownLeft size={21} color="#FFFFFF" strokeWidth={1.9} />
              </View>
              <Text
                style={styles.actionLabel}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                Catat Masuk
              </Text>
            </Pressable>

            <Pressable
              onPress={() => openQuickSheet('TRANSFER')}
              style={({ pressed }) => [styles.actionItem, pressed && { opacity: 0.8 }]}
            >
              <View style={styles.actionBox}>
                <ArrowLeftRight size={20} color="#FFFFFF" strokeWidth={1.9} />
              </View>
              <Text
                style={styles.actionLabel}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                Transfer
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/(tabs)/ai')}
              style={({ pressed }) => [styles.actionItem, pressed && { opacity: 0.8 }]}
            >
              <View style={styles.actionBox}>
                <Sparkles size={20} color="#FFFFFF" strokeWidth={1.9} />
              </View>
              <Text
                style={styles.actionLabel}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                Tanya AI
              </Text>
            </Pressable>
          </View>
        </LinearGradient>

        {/* SECTION 2 — OVERLAPPING WHITE SUMMARY CARD */}
        <Animated.View
          entering={FadeInDown.duration(360).easing(Easing.out(Easing.cubic))}
          style={styles.overlapCard}
        >
          <View ref={summaryRef} collapsable={false}>
            <View style={styles.summaryTopRow}>
              <View style={styles.summaryCol}>
                <Text style={styles.summaryTitle}>Pemasukan</Text>
                <Text
                  style={[styles.incomeAmount, Typography.tabularNums]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.82}
                >
                  +{formatIDR(monthlyIncomeActual)}
                </Text>
              </View>

              <View style={styles.verticalDivider} />

              <View style={styles.summaryCol}>
                <Text style={styles.summaryTitle}>Pengeluaran</Text>
                <Text
                  style={[styles.expenseAmount, Typography.tabularNums]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.82}
                >
                  -{formatIDR(monthlyExpenseActual)}
                </Text>
              </View>
            </View>

            <View style={styles.budgetBlock}>
              <View style={styles.budgetRow}>
                <Text style={styles.budgetLabel}>{INITIAL_SUMMARY.budgetLabel}</Text>
                <Text style={[styles.budgetPctText, Typography.tabularNums]}>
                  {budgetPct}% terpakai
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${budgetPct}%` }]} />
              </View>
            </View>

            <Pressable
              onPress={() => router.push('/forecast')}
              accessibilityRole="button"
              accessibilityLabel="Lihat Prediksi Arus Kas"
              style={({ pressed }) => [styles.aiStrip, pressed && { opacity: 0.82 }]}
            >
              <View style={styles.aiScorePill}>
                <Text style={[styles.aiScoreText, Typography.tabularNums]}>
                  {hasCompletedSetup ? 'Proyeksi' : `Skor AI ${INITIAL_SUMMARY.aiScore}`}
                </Text>
              </View>
              <Text style={styles.aiStripText} numberOfLines={1}>
                {hasCompletedSetup
                  ? remainingDailySafeLimit >= 0
                    ? `Sisa aman hari ini ${formatIDR(remainingDailySafeLimit)} • Pola ${BUDGET_RULE_META[userProfile.budgetRule].label}`
                    : `Melebihi batas harian ${formatIDR(Math.abs(remainingDailySafeLimit))}`
                  : INITIAL_SUMMARY.aiInsight}
              </Text>
              <ChevronRight size={16} color={Colors.primary} strokeWidth={2.2} />
            </Pressable>
          </View>
        </Animated.View>

        {/* SECTION 3 — SWIPEABLE HORIZONTAL WALLET CARDS */}
        <Animated.View
          entering={FadeInDown.delay(70).duration(360).easing(Easing.out(Easing.cubic))}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Dompet Saya</Text>
            <Pressable
              onPress={() => router.push('/(tabs)/wallets')}
              style={styles.seeAllBtn}
            >
              <Text style={styles.seeAllText}>Lihat Semua ›</Text>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.walletsScroll}
          >
            {wallets.map((w) => (
              <Pressable
                key={w.id}
                onPress={() => router.push('/(tabs)/wallets')}
                style={({ pressed }) => [pressed && { opacity: 0.92 }]}
              >
                <LinearGradient
                  colors={getWalletTheme(w.type, w.colorKey).gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.miniWalletCard,
                    { width: Math.min(230, Math.round(width * 0.64)) },
                  ]}
                >
                  <View style={styles.walletCardTop}>
                    <View style={styles.emvChip} />
                    <Text style={styles.walletLast4}>{w.last4}</Text>
                  </View>

                  <View>
                    <Text style={styles.walletName} numberOfLines={1}>
                      {w.name}
                    </Text>
                    <Text style={[styles.walletBalance, Typography.tabularNums]}>
                      {hideBalance ? 'Rp ••••••••' : formatIDR(w.balance)}
                    </Text>
                  </View>
                </LinearGradient>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>

        {/* SECTION 4 — 4x2 QUICK SHORTCUTS GRID */}
        <Animated.View
          entering={FadeInDown.delay(140).duration(360).easing(Easing.out(Easing.cubic))}
          style={styles.shortcutsCard}
        >
          <View ref={shortcutsRef} collapsable={false}>
            {shortcutRows.map((row, rowIdx) => (
              <View
                key={`row-${rowIdx}`}
                style={[styles.shortcutRow, rowIdx > 0 && styles.shortcutRowGap]}
              >
                {row.map((item) => (
                  <Pressable
                    key={item.label}
                    onPress={item.onPress}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                    style={({ pressed }) => [
                      styles.shortcutCell,
                      pressed && { opacity: 0.75, transform: [{ scale: 0.95 }] },
                    ]}
                  >
                    <View style={[styles.shortcutIconBox, { backgroundColor: item.bg }]}>
                      {item.icon}
                    </View>
                    <Text
                      style={styles.shortcutLabel}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        </Animated.View>

        {/* SECTION 5 — RECENT TRANSACTIONS FEED */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(360).easing(Easing.out(Easing.cubic))}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Transaksi Terakhir</Text>
            <Pressable
              onPress={() => router.push('/(tabs)/transactions')}
              style={styles.seeAllBtn}
            >
              <Text style={styles.seeAllText}>Lihat Semua ›</Text>
            </Pressable>
          </View>

          <View style={styles.feedCard}>
            {transactions.length === 0 ? (
              <View style={styles.emptyFeedWrap}>
                <View style={styles.emptyFeedIcon}>
                  <Receipt size={22} color={Colors.primary} strokeWidth={1.9} />
                </View>
                <Text style={styles.emptyFeedTitle}>Belum ada transaksi</Text>
                <Text style={styles.emptyFeedSub}>
                  Catat transaksi pertamamu agar anggaran dan batas aman harian langsung terpantau.
                </Text>
                <Pressable
                  onPress={() => openQuickSheet('EXPENSE')}
                  accessibilityRole="button"
                  accessibilityLabel="Catat Transaksi Pertama"
                  style={({ pressed }) => [
                    styles.emptyFeedCta,
                    pressed && { opacity: 0.88, transform: [{ scale: 0.985 }] },
                  ]}
                >
                  <Plus size={16} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={styles.emptyFeedCtaText}>Catat Transaksi Pertama</Text>
                </Pressable>
              </View>
            ) : (
              transactions.slice(0, 5).map((tx, idx) => {
                const isIncome = tx.type === 'INCOME';
                const isTransfer = tx.type === 'TRANSFER';
                const amountColor = isIncome
                  ? Colors.income
                  : isTransfer
                    ? Colors.primary
                    : Colors.expense;
                const amountPrefix = isIncome ? '+' : isTransfer ? '' : '-';
                return (
                  <Pressable
                    key={tx.id}
                    onPress={() => router.push('/(tabs)/transactions')}
                    style={({ pressed }) => [
                      styles.txRow,
                      idx > 0 && styles.txDivider,
                      pressed && { opacity: 0.78 },
                    ]}
                  >
                    <View style={[styles.txIconBox, { backgroundColor: tx.iconBg }]}>
                      {renderCategoryIcon(tx.categoryKey, tx.iconColor)}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.txTitle} numberOfLines={1}>
                        {tx.title}
                      </Text>
                      <Text style={styles.txMeta} numberOfLines={1}>
                        {isTransfer && tx.targetWalletName
                          ? `${tx.walletName} → ${tx.targetWalletName} · ${tx.dateLabel}`
                          : `${tx.walletName} · ${tx.dateLabel}`}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.txAmount,
                        Typography.tabularNums,
                        { color: amountColor },
                      ]}
                    >
                      {amountPrefix}
                      {formatIDR(tx.amount)}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </View>
        </Animated.View>
      </ScrollView>

      <QuickTransactionSheet
        visible={sheetVisible}
        initialMode={sheetMode}
        wallets={wallets}
        onClose={() => setSheetVisible(false)}
        onSubmit={handleQuickSubmit}
      />

      <NotificationSheet
        visible={showNotificationSheet}
        notifications={notifications}
        onClose={() => setShowNotificationSheet(false)}
        onMarkAllRead={() =>
          setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
        }
      />

      <ProfileSheet
        visible={showProfileModal}
        userName={userName}
        monthlyIncomeTarget={monthlyIncomeTarget}
        onClose={() => setShowProfileModal(false)}
        onSaveProfile={(nextName, nextTarget) => {
          updateUserProfile({ name: nextName, monthlyIncomeTarget: nextTarget });
        }}
        onOpenCategories={() => setShowCategorySheet(true)}
        onLogout={() => router.replace('/login')}
      />

      <CategoryManagerSheet
        visible={showCategorySheet}
        onClose={() => setShowCategorySheet(false)}
      />

      <RecurringBillsSheet
        visible={showRecurringSheet}
        onClose={() => setShowRecurringSheet(false)}
        onRecordBill={handleRecordRecurringBill}
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
    paddingHorizontal: 18,
    paddingBottom: 44,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  miniLogo: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  greetingText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bellBtn: {
    width: TouchTarget.minSize,
    height: TouchTarget.minSize,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  redDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.expense,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  avatarBtn: {
    width: TouchTarget.minSize,
    height: TouchTarget.minSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.24)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  balanceLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.86)',
  },
  balanceValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  balanceAmount: {
    fontFamily: FontFamily.bold,
    fontSize: 30,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  eyeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickRecordPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 99,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  quickRecordText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12.5,
    color: '#FFFFFF',
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  actionItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  actionBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11.5,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  overlapCard: {
    marginTop: -24,
    marginHorizontal: 16,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 14,
    ...CARD_SHADOW,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryCol: {
    flex: 1,
    gap: 3,
  },
  verticalDivider: {
    width: 1,
    height: 34,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 12,
  },
  summaryTitle: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.textMuted,
  },
  incomeAmount: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.income,
  },
  expenseAmount: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.expense,
  },
  budgetBlock: {
    gap: 6,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 12.5,
    color: Colors.textPrimary,
  },
  budgetPctText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12.5,
    color: Colors.primary,
  },
  progressTrack: {
    height: 7,
    borderRadius: 99,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: Colors.primary,
  },
  aiStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
  },
  aiScorePill: {
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  aiScoreText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.primary,
  },
  aiStripText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  seeAllBtn: {
    minHeight: 32,
    justifyContent: 'center',
  },
  seeAllText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Colors.primary,
  },
  walletsScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  miniWalletCard: {
    width: 220,
    height: 124,
    borderRadius: 18,
    padding: 16,
    justifyContent: 'space-between',
  },
  walletCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emvChip: {
    width: 26,
    height: 18,
    borderRadius: 4,
    backgroundColor: 'rgba(253, 224, 71, 0.85)',
  },
  walletLast4: {
    fontFamily: FontFamily.medium,
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.82)',
  },
  walletName: {
    fontFamily: FontFamily.medium,
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.88)',
  },
  walletBalance: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: '#FFFFFF',
    marginTop: 2,
  },
  shortcutsCard: {
    marginHorizontal: 16,
    marginTop: 18,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 16,
    paddingHorizontal: 12,
    ...CARD_SHADOW,
  },
  shortcutRow: {
    flexDirection: 'row',
  },
  shortcutRowGap: {
    marginTop: 16,
  },
  shortcutCell: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  shortcutIconBox: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11.5,
    color: '#334155',
    textAlign: 'center',
  },
  feedCard: {
    marginHorizontal: 16,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 4,
    ...CARD_SHADOW,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  txDivider: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  txIconBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontFamily: FontFamily.bold,
    fontSize: 13.5,
  },
  emptyFeedWrap: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 14,
  },
  emptyFeedIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EBF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyFeedTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 15,
    color: '#0F172A',
  },
  emptyFeedSub: {
    marginTop: 4,
    fontFamily: FontFamily.regular,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#64748B',
    textAlign: 'center',
  },
  emptyFeedCta: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#3B7AF5',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 42,
  },
  emptyFeedCtaText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  // ── Profile Modal ──────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  profileSheet: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 16,
  },
  profileAvatarWrap: {
    marginBottom: 12,
  },
  profileAvatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EBF2FF',
    borderWidth: 3,
    borderColor: '#3B7AF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontFamily: FontFamily.bold,
    fontSize: 26,
    color: '#3B7AF5',
    letterSpacing: -0.5,
  },
  profileName: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  profileEmail: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: '#64748B',
    marginTop: 3,
  },
  profileScorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EBF2FF',
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 10,
  },
  profileScoreText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12.5,
    color: '#3B7AF5',
  },
  profileDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 18,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 13,
    width: '100%',
    justifyContent: 'center',
  },
  logoutText: {
    fontFamily: FontFamily.semibold,
    fontSize: 15,
    color: '#EF4444',
  },
});
