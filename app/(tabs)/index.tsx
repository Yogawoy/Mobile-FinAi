import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
  LogOut,
  PieChart,
  Plus,
  ReceiptText,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Target,
  TrendingUp,
  User,
  Utensils,
  Wallet,
  Zap,
} from 'lucide-react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  QuickTransactionSheet,
  type QuickTransactionSubmitPayload,
} from '@/src/components/transactions/QuickTransactionSheet';
import { formatIDR } from '@/src/lib/format';
import {
  INITIAL_SUMMARY,
  INITIAL_TRANSACTIONS,
  INITIAL_WALLETS,
  type CategoryIconKey,
  type TransactionItem,
  type TransactionMode,
  type WalletItem,
} from '@/src/lib/mockData';
import { Colors, FontFamily, TouchTarget, Typography } from '@/src/theme/tokens';
import { getWalletTheme } from '@/src/lib/walletTheme';

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

  const [wallets, setWallets] = useState<WalletItem[]>(INITIAL_WALLETS);
  const [transactions, setTransactions] = useState<TransactionItem[]>(INITIAL_TRANSACTIONS);
  const [incomeTotal, setIncomeTotal] = useState(INITIAL_SUMMARY.income);
  const [expenseTotal, setExpenseTotal] = useState(INITIAL_SUMMARY.expense);
  const [hideBalance, setHideBalance] = useState(false);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetMode, setSheetMode] = useState<TransactionMode>('EXPENSE');
  const [showProfileModal, setShowProfileModal] = useState(false);

  const totalBalance = useMemo(
    () => wallets.reduce((sum, w) => sum + w.balance, 0),
    [wallets]
  );

  const budgetPct = Math.min(
    100,
    Math.round((expenseTotal / INITIAL_SUMMARY.budgetLimit) * 100)
  );

  const openQuickSheet = (mode: TransactionMode) => {
    setSheetMode(mode);
    setSheetVisible(true);
  };

  const handleQuickSubmit = (payload: QuickTransactionSubmitPayload) => {
    const sourceWallet = wallets.find((w) => w.id === payload.walletId);

    if (payload.mode === 'TRANSFER' && payload.targetWalletId) {
      const targetWallet = wallets.find((w) => w.id === payload.targetWalletId);
      setWallets((prev) =>
        prev.map((w) => {
          if (w.id === payload.walletId) return { ...w, balance: Math.max(0, w.balance - payload.amount) };
          if (w.id === payload.targetWalletId) return { ...w, balance: w.balance + payload.amount };
          return w;
        })
      );

      const transferTx: TransactionItem = {
        id: `tx-${Date.now()}`,
        title: payload.note || `Transfer ke ${targetWallet?.name || 'Dompet'}`,
        categoryKey: 'wallet',
        categoryLabel: 'Transfer',
        walletId: payload.walletId,
        walletName: sourceWallet?.name || 'Dompet',
        dateLabel: 'Baru saja',
        amount: payload.amount,
        type: 'EXPENSE',
        iconBg: '#EBF2FF',
        iconColor: '#3B7AF5',
      };
      setTransactions((prev) => [transferTx, ...prev]);
      return;
    }

    const isIncome = payload.mode === 'INCOME';
    setWallets((prev) =>
      prev.map((w) => {
        if (w.id !== payload.walletId) return w;
        return {
          ...w,
          balance: isIncome ? w.balance + payload.amount : Math.max(0, w.balance - payload.amount),
        };
      })
    );

    if (isIncome) {
      setIncomeTotal((prev) => prev + payload.amount);
    } else {
      setExpenseTotal((prev) => prev + payload.amount);
    }

    const newTx: TransactionItem = {
      id: `tx-${Date.now()}`,
      title: payload.note || payload.category.label,
      categoryKey: payload.category.key,
      categoryLabel: payload.category.label,
      walletId: payload.walletId,
      walletName: sourceWallet?.name || 'Dompet',
      dateLabel: 'Baru saja',
      amount: payload.amount,
      type: isIncome ? 'INCOME' : 'EXPENSE',
      iconBg: payload.category.iconBg,
      iconColor: payload.category.iconColor,
    };
    setTransactions((prev) => [newTx, ...prev]);
  };

  const shortcuts = [
    {
      label: 'Anggaran',
      bg: '#EBF2FF',
      icon: <PieChart size={20} color="#3B7AF5" strokeWidth={1.85} />,
      onPress: () => router.push('/(tabs)/budgets'),
    },
    {
      label: 'Target',
      bg: '#ECFDF5',
      icon: <Target size={20} color="#10B981" strokeWidth={1.85} />,
      onPress: () => Alert.alert('Target Tabungan', 'Dana Darurat tercapai 68% dari target.'),
    },
    {
      label: 'Tagihan Rutin',
      bg: '#FEF2F2',
      icon: <CalendarClock size={20} color="#EF4444" strokeWidth={1.85} />,
      onPress: () => Alert.alert('Tagihan Rutin', 'Tidak ada tagihan jatuh tempo hari ini.'),
    },
    {
      label: 'Prediksi Kas',
      bg: '#EBF2FF',
      icon: <TrendingUp size={20} color="#2563EB" strokeWidth={1.85} />,
      onPress: () => router.push('/(tabs)/ai'),
    },
    {
      label: 'Cek Anomali',
      bg: '#FFFBEB',
      icon: <ShieldAlert size={20} color="#F59E0B" strokeWidth={1.85} />,
      onPress: () => router.push('/(tabs)/ai'),
    },
    {
      label: 'Dompet',
      bg: '#F0FDFA',
      icon: <Wallet size={20} color="#0D9488" strokeWidth={1.85} />,
      onPress: () => router.push('/(tabs)/wallets'),
    },
    {
      label: 'Riwayat',
      bg: '#F8FAFC',
      icon: <ReceiptText size={20} color="#475569" strokeWidth={1.85} />,
      onPress: () => router.push('/(tabs)/transactions'),
    },
  ];

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
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
                <Text style={styles.greetingText}>Halo, Yoga</Text>
              </View>
            </View>

            <View style={styles.topRight}>
              <Pressable
                onPress={() =>
                  Alert.alert('Notifikasi', 'Pengeluaran minggu ini 12% lebih hemat!')
                }
                accessibilityRole="button"
                accessibilityLabel="Notifikasi"
                style={({ pressed }) => [styles.bellBtn, pressed && { opacity: 0.7 }]}
              >
                <Bell size={20} color="#FFFFFF" strokeWidth={1.85} />
                <View style={styles.redDot} />
              </Pressable>

              <Pressable
                onPress={() => setShowProfileModal(true)}
                accessibilityRole="button"
                accessibilityLabel="Profil Yoga"
                style={({ pressed }) => [styles.avatarBtn, pressed && { opacity: 0.7 }]}
              >
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitials}>YS</Text>
                </View>
              </Pressable>
            </View>
          </View>

          {/* Main Balance Row */}
          <View style={styles.balanceRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.balanceLabel}>
                Total Saldo ({wallets.length} Dompet)
              </Text>
              <View style={styles.balanceValueRow}>
                <Text style={[styles.balanceAmount, Typography.tabularNums]}>
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
          <View style={styles.actionGrid}>
            <Pressable
              onPress={() => openQuickSheet('EXPENSE')}
              style={({ pressed }) => [styles.actionItem, pressed && { opacity: 0.8 }]}
            >
              <View style={styles.actionBox}>
                <ArrowUpRight size={21} color="#FFFFFF" strokeWidth={1.9} />
              </View>
              <Text style={styles.actionLabel}>Catat Keluar</Text>
            </Pressable>

            <Pressable
              onPress={() => openQuickSheet('INCOME')}
              style={({ pressed }) => [styles.actionItem, pressed && { opacity: 0.8 }]}
            >
              <View style={styles.actionBox}>
                <ArrowDownLeft size={21} color="#FFFFFF" strokeWidth={1.9} />
              </View>
              <Text style={styles.actionLabel}>Catat Masuk</Text>
            </Pressable>

            <Pressable
              onPress={() => openQuickSheet('TRANSFER')}
              style={({ pressed }) => [styles.actionItem, pressed && { opacity: 0.8 }]}
            >
              <View style={styles.actionBox}>
                <ArrowLeftRight size={20} color="#FFFFFF" strokeWidth={1.9} />
              </View>
              <Text style={styles.actionLabel}>Transfer</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/(tabs)/ai')}
              style={({ pressed }) => [styles.actionItem, pressed && { opacity: 0.8 }]}
            >
              <View style={styles.actionBox}>
                <Sparkles size={20} color="#FFFFFF" strokeWidth={1.9} />
              </View>
              <Text style={styles.actionLabel}>Tanya AI</Text>
            </Pressable>
          </View>
        </LinearGradient>

        {/* SECTION 2 — OVERLAPPING WHITE SUMMARY CARD */}
        <Animated.View
          entering={FadeInDown.duration(360).easing(Easing.out(Easing.cubic))}
          style={styles.overlapCard}
        >
          <View style={styles.summaryTopRow}>
            <View style={styles.summaryCol}>
              <Text style={styles.summaryTitle}>Pemasukan</Text>
              <Text style={[styles.incomeAmount, Typography.tabularNums]}>
                +{formatIDR(incomeTotal)}
              </Text>
            </View>

            <View style={styles.verticalDivider} />

            <View style={styles.summaryCol}>
              <Text style={styles.summaryTitle}>Pengeluaran</Text>
              <Text style={[styles.expenseAmount, Typography.tabularNums]}>
                -{formatIDR(expenseTotal)}
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
            onPress={() => router.push('/(tabs)/ai')}
            accessibilityRole="button"
            accessibilityLabel="Buka Asisten AI"
            style={({ pressed }) => [styles.aiStrip, pressed && { opacity: 0.82 }]}
          >
            <View style={styles.aiScorePill}>
              <Text style={[styles.aiScoreText, Typography.tabularNums]}>
                Skor AI {INITIAL_SUMMARY.aiScore}
              </Text>
            </View>
            <Text style={styles.aiStripText} numberOfLines={1}>
              {INITIAL_SUMMARY.aiInsight}
            </Text>
            <ChevronRight size={16} color={Colors.textMuted} strokeWidth={2} />
          </Pressable>
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
                  style={styles.miniWalletCard}
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
          <View style={styles.shortcutsGrid}>
            {shortcuts.map((item) => (
              <Pressable
                key={item.label}
                onPress={item.onPress}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                style={({ pressed }) => [styles.shortcutCell, pressed && { opacity: 0.72 }]}
              >
                <View style={[styles.shortcutIconBox, { backgroundColor: item.bg }]}>
                  {item.icon}
                </View>
                <Text style={styles.shortcutLabel} numberOfLines={1}>
                  {item.label}
                </Text>
              </Pressable>
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
            {transactions.slice(0, 5).map((tx, idx) => {
              const isIncome = tx.type === 'INCOME';
              return (
                <View key={tx.id} style={[styles.txRow, idx > 0 && styles.txDivider]}>
                  <View style={[styles.txIconBox, { backgroundColor: tx.iconBg }]}>
                    {renderCategoryIcon(tx.categoryKey, tx.iconColor)}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.txTitle} numberOfLines={1}>
                      {tx.title}
                    </Text>
                    <Text style={styles.txMeta} numberOfLines={1}>
                      {tx.walletName} · {tx.dateLabel}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.txAmount,
                      Typography.tabularNums,
                      { color: isIncome ? Colors.income : Colors.expense },
                    ]}
                  >
                    {isIncome ? '+' : '-'}
                    {formatIDR(tx.amount)}
                  </Text>
                </View>
              );
            })}
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

      {/* PROFILE MODAL */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowProfileModal(false)}
        >
          <Pressable style={styles.profileSheet} onPress={() => {}}>
            {/* Avatar */}
            <View style={styles.profileAvatarWrap}>
              <View style={styles.profileAvatarCircle}>
                <Text style={styles.profileAvatarText}>YS</Text>
              </View>
            </View>

            <Text style={styles.profileName}>Yoga Saputra</Text>
            <Text style={styles.profileEmail}>yoga@smartfinance.id</Text>

            {/* AI Score pill */}
            <View style={styles.profileScorePill}>
              <Sparkles size={13} color="#3B7AF5" strokeWidth={2} />
              <Text style={styles.profileScoreText}>Skor AI: 84/100</Text>
            </View>

            <View style={styles.profileDivider} />

            {/* Logout Button */}
            <Pressable
              onPress={() => {
                setShowProfileModal(false);
                router.replace('/login');
              }}
              style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.75 }]}
              accessibilityRole="button"
              accessibilityLabel="Keluar dari akun"
            >
              <LogOut size={18} color="#EF4444" strokeWidth={1.85} />
              <Text style={styles.logoutText}>Keluar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
    padding: 16,
    ...CARD_SHADOW,
  },
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 16,
  },
  shortcutCell: {
    width: '25%',
    alignItems: 'center',
    gap: 6,
  },
  shortcutIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11.5,
    color: Colors.textPrimary,
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
