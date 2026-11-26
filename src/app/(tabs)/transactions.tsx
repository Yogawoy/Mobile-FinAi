import React, { useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import {
  Briefcase,
  Car,
  Coffee,
  Plus,
  Receipt,
  Search,
  ShoppingBag,
  Utensils,
  Wallet,
  X,
  Zap,
} from 'lucide-react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  QuickTransactionSheet,
  type QuickTransactionSubmitPayload,
} from '@/components/transactions/QuickTransactionSheet';
import { TransactionDetailSheet } from '@/components/transactions/TransactionDetailSheet';
import { useToast } from '@/components/ui/ToastProvider';
import { useFinance } from '@/context/FinanceContext';
import { formatIDR } from '@/lib/format';
import {
  type CategoryIconKey,
  type TransactionItem,
  type TransactionMode,
} from '@/lib/mockData';
import { Colors, FontFamily, Radius, TouchTarget, Typography } from '@/theme/tokens';

type TypeFilter = 'ALL' | TransactionMode;

const TYPE_TABS: { key: TypeFilter; label: string }[] = [
  { key: 'ALL', label: 'Semua' },
  { key: 'INCOME', label: 'Masuk' },
  { key: 'EXPENSE', label: 'Keluar' },
  { key: 'TRANSFER', label: 'Transfer' },
];

function renderCategoryIcon(key: CategoryIconKey, color: string) {
  switch (key) {
    case 'utensils':
      return <Utensils size={19} color={color} strokeWidth={1.85} />;
    case 'car':
      return <Car size={19} color={color} strokeWidth={1.85} />;
    case 'shopping':
      return <ShoppingBag size={19} color={color} strokeWidth={1.85} />;
    case 'zap':
      return <Zap size={19} color={color} strokeWidth={1.85} />;
    case 'briefcase':
      return <Briefcase size={19} color={color} strokeWidth={1.85} />;
    case 'coffee':
      return <Coffee size={19} color={color} strokeWidth={1.85} />;
    case 'wallet':
      return <Wallet size={19} color={color} strokeWidth={1.85} />;
  }
}

export default function TransactionsTabScreen() {
  const insets = useSafeAreaInsets();
  const {
    wallets,
    transactions,
    recordTransaction,
    updateTransaction,
    deleteTransaction,
  } = useFinance();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [walletFilter, setWalletFilter] = useState<string>('ALL');

  const [quickSheetVisible, setQuickSheetVisible] = useState(false);
  const [editingTx, setEditingTx] = useState<TransactionItem | null>(null);
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { showToast } = useToast();

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      showToast('Daftar transaksi diperbarui');
    }, 450);
  };

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (typeFilter !== 'ALL' && tx.type !== typeFilter) return false;
      if (
        walletFilter !== 'ALL' &&
        tx.walletId !== walletFilter &&
        tx.targetWalletId !== walletFilter
      ) {
        return false;
      }
      if (q) {
        const hay = `${tx.title} ${tx.categoryLabel} ${tx.walletName} ${tx.targetWalletName ?? ''} ${tx.note ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, searchQuery, typeFilter, walletFilter]);

  const summary = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    for (const tx of filteredTransactions) {
      if (tx.type === 'INCOME') totalIncome += tx.amount;
      else if (tx.type === 'EXPENSE') totalExpense += tx.amount;
    }
    return { totalIncome, totalExpense };
  }, [filteredTransactions]);

  const groupedSections = useMemo(() => {
    const map = new Map<string, TransactionItem[]>();
    for (const tx of filteredTransactions) {
      const group = tx.dateGroup || 'Hari Ini • 22 Nov 2026';
      const list = map.get(group);
      if (list) list.push(tx);
      else map.set(group, [tx]);
    }
    return Array.from(map.entries()).map(([dateGroup, items]) => {
      const dailyNet = items.reduce((acc, item) => {
        if (item.type === 'INCOME') return acc + item.amount;
        if (item.type === 'EXPENSE') return acc - item.amount;
        return acc;
      }, 0);
      return { dateGroup, items, dailyNet };
    });
  }, [filteredTransactions]);

  const handleOpenNew = () => {
    setEditingTx(null);
    setQuickSheetVisible(true);
  };

  const handleOpenEdit = (tx: TransactionItem) => {
    setEditingTx(tx);
    setQuickSheetVisible(true);
  };

  const handleDeleteTx = (tx: TransactionItem) => {
    deleteTransaction(tx.id);
  };

  const handleSubmitTransaction = (payload: QuickTransactionSubmitPayload) => {
    const sourceWallet = wallets.find((w) => w.id === payload.walletId);
    const targetWallet = payload.targetWalletId
      ? wallets.find((w) => w.id === payload.targetWalletId)
      : undefined;

    const isTransfer = payload.mode === 'TRANSFER';

    if (payload.id) {
      const existing = transactions.find((t) => t.id === payload.id);
      if (!existing) return;
      updateTransaction({
        ...existing,
        title:
          payload.note ||
          (isTransfer
            ? `Transfer ke ${targetWallet?.name || 'Dompet'}`
            : payload.category.label),
        categoryKey: isTransfer ? 'wallet' : payload.category.key,
        categoryLabel: isTransfer ? 'Transfer' : payload.category.label,
        walletId: payload.walletId,
        walletName: sourceWallet?.name || 'Dompet',
        targetWalletId: isTransfer ? payload.targetWalletId : undefined,
        targetWalletName: isTransfer ? targetWallet?.name : undefined,
        amount: payload.amount,
        type: payload.mode,
        note: payload.note || existing.note,
        iconBg: isTransfer ? '#EBF2FF' : payload.category.iconBg,
        iconColor: isTransfer ? '#3B7AF5' : payload.category.iconColor,
      });
      return;
    }

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');

    recordTransaction({
      title:
        payload.note ||
        (isTransfer
          ? `Transfer ke ${targetWallet?.name || 'Dompet'}`
          : payload.category.label),
      categoryKey: isTransfer ? 'wallet' : payload.category.key,
      categoryLabel: isTransfer ? 'Transfer' : payload.category.label,
      walletId: payload.walletId,
      walletName: sourceWallet?.name || 'Dompet',
      targetWalletId: isTransfer ? payload.targetWalletId : undefined,
      targetWalletName: isTransfer ? targetWallet?.name : undefined,
      dateGroup: 'Hari Ini • 22 Nov 2026',
      dateLabel: `${hh}:${mm}`,
      amount: payload.amount,
      type: payload.mode,
      note: payload.note || undefined,
      iconBg: isTransfer ? '#EBF2FF' : payload.category.iconBg,
      iconColor: isTransfer ? '#3B7AF5' : payload.category.iconColor,
    });
  };

  const resetFilters = () => {
    setSearchQuery('');
    setTypeFilter('ALL');
    setWalletFilter('ALL');
  };

  const hasActiveFilter =
    searchQuery.trim().length > 0 || typeFilter !== 'ALL' || walletFilter !== 'ALL';

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
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
              <Text style={styles.headerTitle}>Transaksi</Text>
              <Text style={styles.headerSubtitle}>Nov 2026</Text>
            </View>

            <Pressable
              onPress={handleOpenNew}
              accessibilityRole="button"
              accessibilityLabel="Catat transaksi baru"
              style={({ pressed }) => [styles.quickRecordPill, pressed && { opacity: 0.8 }]}
            >
              <Plus size={14} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.quickRecordText}>Catat</Text>
            </Pressable>
          </View>
        </LinearGradient>

        {/* KARTU RINGKASAN MENUMPANG */}
        <Animated.View
          entering={FadeInDown.duration(360).easing(Easing.out(Easing.cubic))}
          style={styles.summaryCard}
        >
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Total Masuk</Text>
            <Text
              style={[styles.summaryValue, Typography.tabularNums, { color: Colors.income }]}
              numberOfLines={1}
            >
              +{formatIDR(summary.totalIncome)}
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Total Keluar</Text>
            <Text
              style={[styles.summaryValue, Typography.tabularNums, { color: Colors.expense }]}
              numberOfLines={1}
            >
              -{formatIDR(summary.totalExpense)}
            </Text>
          </View>
        </Animated.View>

        {/* PENCARIAN & FILTER 1 JEMPOL */}
        <View style={styles.filterSection}>
          {/* Search Bar */}
          <View style={styles.searchBox}>
            <Search size={18} color={Colors.textMuted} strokeWidth={1.85} />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari catatan, kategori, atau dompet..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => setSearchQuery('')}
                accessibilityRole="button"
                accessibilityLabel="Hapus pencarian"
                style={styles.clearSearchBtn}
              >
                <X size={16} color={Colors.textMuted} strokeWidth={2} />
              </Pressable>
            )}
          </View>

          {/* Tab Tipe Transaksi */}
          <View style={styles.typeTabRow}>
            {TYPE_TABS.map((tab) => {
              const active = typeFilter === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setTypeFilter(tab.key)}
                  style={[styles.typePill, active && styles.typePillActive]}
                >
                  <Text style={[styles.typePillText, active && styles.typePillTextActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Filter Dompet Horizontal */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.walletFilterRow}
          >
            <Pressable
              onPress={() => setWalletFilter('ALL')}
              style={[styles.walletPill, walletFilter === 'ALL' && styles.walletPillActive]}
            >
              <Text
                style={[
                  styles.walletPillText,
                  walletFilter === 'ALL' && styles.walletPillTextActive,
                ]}
              >
                Semua Dompet
              </Text>
            </Pressable>

            {wallets.map((w) => {
              const active = walletFilter === w.id;
              return (
                <Pressable
                  key={w.id}
                  onPress={() => setWalletFilter(w.id)}
                  style={[styles.walletPill, active && styles.walletPillActive]}
                >
                  <Text
                    style={[
                      styles.walletPillText,
                      active && styles.walletPillTextActive,
                    ]}
                  >
                    {w.shortName || w.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* DAFTAR TRANSAKSI DIKELOMPOKKAN PER TANGGAL */}
        {groupedSections.length === 0 ? (
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={styles.emptyCard}
          >
            <View style={styles.emptyIconCircle}>
              <Receipt size={26} color={Colors.primary} strokeWidth={1.85} />
            </View>
            <Text style={styles.emptyTitle}>Tidak ada transaksi ditemukan</Text>
            <Text style={styles.emptySub}>
              {hasActiveFilter
                ? 'Coba ubah kata kunci atau reset filter aktif.'
                : 'Mulai catat transaksi pertamamu dengan tombol + Catat.'}
            </Text>
            {hasActiveFilter ? (
              <Pressable
                onPress={resetFilters}
                style={({ pressed }) => [styles.resetBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.resetBtnText}>Reset Filter</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={handleOpenNew}
                style={({ pressed }) => [styles.resetBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.resetBtnText}>+ Catat Transaksi Pertama</Text>
              </Pressable>
            )}
          </Animated.View>
        ) : (
          groupedSections.map((section, sectionIdx) => {
            const netPrefix = section.dailyNet > 0 ? '+' : section.dailyNet < 0 ? '-' : '';
            const netColor =
              section.dailyNet > 0
                ? Colors.income
                : section.dailyNet < 0
                  ? Colors.expense
                  : Colors.textMuted;

            return (
              <Animated.View
                key={section.dateGroup}
                entering={FadeInDown.delay(Math.min(sectionIdx * 55, 220))
                  .duration(320)
                  .easing(Easing.out(Easing.cubic))}
                style={styles.dateGroupWrap}
              >
                <View style={styles.dateHeaderRow}>
                  <Text style={styles.dateHeaderText}>{section.dateGroup}</Text>
                  <Text style={[styles.dateNetText, Typography.tabularNums, { color: netColor }]}>
                    {netPrefix}
                    {formatIDR(Math.abs(section.dailyNet))}
                  </Text>
                </View>

                <View style={styles.groupCard}>
                  {section.items.map((tx, idx) => {
                    const isIncome = tx.type === 'INCOME';
                    const isTransfer = tx.type === 'TRANSFER';
                    const amountColor = isIncome
                      ? Colors.income
                      : isTransfer
                        ? Colors.primary
                        : Colors.expense;
                    const amountPrefix = isIncome ? '+' : isTransfer ? '' : '-';

                    const subText =
                      isTransfer && tx.targetWalletName
                        ? `${tx.walletName} → ${tx.targetWalletName}`
                        : `${tx.walletName} • ${tx.categoryLabel}`;

                    return (
                      <Pressable
                        key={tx.id}
                        onPress={() => setSelectedTx(tx)}
                        style={({ pressed }) => [
                          styles.txRow,
                          idx > 0 && styles.txDivider,
                          pressed && styles.txRowPressed,
                        ]}
                      >
                        <View style={[styles.txIconBox, { backgroundColor: tx.iconBg }]}>
                          {renderCategoryIcon(tx.categoryKey, tx.iconColor)}
                        </View>

                        <View style={styles.txBody}>
                          <Text style={styles.txTitle} numberOfLines={1}>
                            {tx.title}
                          </Text>
                          <Text style={styles.txSub} numberOfLines={1}>
                            {subText}
                          </Text>
                        </View>

                        <View style={styles.txRight}>
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
                          <Text style={styles.txTime}>{tx.dateLabel}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </Animated.View>
            );
          })
        )}
      </ScrollView>

      {/* SHEET CATAT / EDIT TRANSAKSI */}
      <QuickTransactionSheet
        visible={quickSheetVisible}
        initialMode={editingTx?.type ?? 'EXPENSE'}
        wallets={wallets}
        editingTransaction={editingTx}
        onClose={() => {
          setQuickSheetVisible(false);
          setEditingTx(null);
        }}
        onSubmit={handleSubmitTransaction}
      />

      {/* SHEET DETAIL, EDIT & HAPUS */}
      <TransactionDetailSheet
        visible={selectedTx !== null}
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
        onEdit={handleOpenEdit}
        onDelete={handleDeleteTx}
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
  quickRecordPill: {
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
  quickRecordText: {
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
    paddingVertical: 15,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    ...CARD_SHADOW,
  },
  summaryCol: {
    flex: 1,
    gap: 3,
  },
  summaryDivider: {
    width: 1,
    height: 34,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 14,
  },
  summaryLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.textMuted,
  },
  summaryValue: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    letterSpacing: -0.3,
  },

  filterSection: {
    marginTop: 16,
    gap: 12,
  },
  searchBox: {
    marginHorizontal: 16,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 13.5,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  clearSearchBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },

  typeTabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  typePill: {
    flex: 1,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typePillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typePillText: {
    fontFamily: FontFamily.medium,
    fontSize: 12.5,
    color: Colors.textMuted,
  },
  typePillTextActive: {
    fontFamily: FontFamily.semibold,
    color: '#FFFFFF',
  },

  walletFilterRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  walletPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  walletPillActive: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
  },
  walletPillText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  walletPillTextActive: {
    fontFamily: FontFamily.semibold,
    color: Colors.primaryDark,
  },

  dateGroupWrap: {
    marginTop: 18,
    marginHorizontal: 16,
  },
  dateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  dateHeaderText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12,
    color: Colors.textMuted,
  },
  dateNetText: {
    fontFamily: FontFamily.semibold,
    fontSize: 11.5,
  },
  groupCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
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
    minHeight: TouchTarget.minSize,
  },
  txRowPressed: {
    opacity: 0.7,
  },
  txDivider: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  txIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txBody: {
    flex: 1,
    minWidth: 0,
  },
  txTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
    color: Colors.textPrimary,
  },
  txSub: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
    color: Colors.textMuted,
    marginTop: 2,
  },
  txRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  txAmount: {
    fontFamily: FontFamily.bold,
    fontSize: 13.5,
  },
  txTime: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },

  emptyCard: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: Colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    ...CARD_SHADOW,
  },
  emptyIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  emptySub: {
    fontFamily: FontFamily.regular,
    fontSize: 12.5,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 18,
  },
  resetBtn: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  resetBtnText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: '#FFFFFF',
  },
});
