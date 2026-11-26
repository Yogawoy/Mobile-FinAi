import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Eye, EyeOff, Plus, Wallet } from 'lucide-react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  QuickTransactionSheet,
  type QuickTransactionSubmitPayload,
} from '@/components/transactions/QuickTransactionSheet';
import { RealisticWalletCard } from '@/components/wallets/RealisticWalletCard';
import { WalletDetailSheet } from '@/components/wallets/WalletDetailSheet';
import {
  WalletFormSheet,
  type WalletFormSubmitPayload,
} from '@/components/wallets/WalletFormSheet';
import { useToast } from '@/components/ui/ToastProvider';
import { useFinance } from '@/context/FinanceContext';
import { formatIDR } from '@/lib/format';
import { type WalletItem } from '@/lib/mockData';
import { getWalletTheme } from '@/lib/walletTheme';
import { walletService } from '@/services/wallet.service';
import { Colors, FontFamily, Radius, TouchTarget, Typography } from '@/theme/tokens';

type WalletFilterKey = 'ALL' | 'BANK' | 'EWALLET' | 'SAVINGS' | 'CASH' | 'ARCHIVE';

const FILTER_TABS: { key: WalletFilterKey; label: string }[] = [
  { key: 'ALL', label: 'Semua' },
  { key: 'BANK', label: 'Bank' },
  { key: 'EWALLET', label: 'E-Wallet' },
  { key: 'SAVINGS', label: 'Tabungan' },
  { key: 'CASH', label: 'Tunai' },
  { key: 'ARCHIVE', label: 'Arsip' },
];

export default function WalletsTabScreen() {
  const insets = useSafeAreaInsets();

  const { showToast } = useToast();
  const {
    userProfile,
    wallets,
    setWallets,
    transactions,
    recordTransaction,
    isLoadingData,
    refreshAllData,
  } = useFinance();
  const [hideBalance, setHideBalance] = useState(userProfile.hideBalanceOnOpen);

  useEffect(() => {
    setHideBalance(userProfile.hideBalanceOnOpen);
  }, [userProfile.hideBalanceOnOpen]);
  const [activeFilter, setActiveFilter] = useState<WalletFilterKey>('ALL');

  const [selectedWallet, setSelectedWallet] = useState<WalletItem | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [editingWallet, setEditingWallet] = useState<WalletItem | null>(null);
  const [transferSheetVisible, setTransferSheetVisible] = useState(false);

  const activeWallets = useMemo(
    () => wallets.filter((w) => !w.isArchived),
    [wallets]
  );

  const totalActiveBalance = useMemo(
    () => activeWallets.reduce((sum, w) => sum + w.balance, 0),
    [activeWallets]
  );

  const allocationItems = useMemo(() => {
    if (totalActiveBalance <= 0) return [];
    return activeWallets
      .filter((w) => w.balance > 0)
      .map((w) => {
        const theme = getWalletTheme(w.type, w.colorKey);
        const pct = Math.max(4, Math.round((w.balance / totalActiveBalance) * 100));
        return {
          id: w.id,
          name: w.shortName || w.name,
          pct,
          color: theme.dotColor,
        };
      });
  }, [activeWallets, totalActiveBalance]);

  const filteredWallets = useMemo(() => {
    if (activeFilter === 'ARCHIVE') {
      return wallets.filter((w) => w.isArchived);
    }
    if (activeFilter === 'ALL') {
      return activeWallets;
    }
    return activeWallets.filter((w) => {
      const normalized = w.type === 'E_WALLET' ? 'EWALLET' : w.type;
      return normalized === activeFilter;
    });
  }, [wallets, activeWallets, activeFilter]);

  const handleOpenAdd = () => {
    setEditingWallet(null);
    setFormVisible(true);
  };

  const handleOpenEdit = (wallet: WalletItem) => {
    setEditingWallet(wallet);
    setFormVisible(true);
  };

  const handleToggleArchive = async (wallet: WalletItem) => {
    const nextArchived = !wallet.isArchived;
    setWallets((prev) =>
      prev.map((w) => (w.id === wallet.id ? { ...w, isArchived: nextArchived } : w))
    );
    try {
      await walletService.updateWallet(wallet.id, { isArchived: nextArchived });
      await refreshAllData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memperbarui status dompet', 'error');
    }
  };

  const handleWalletFormSubmit = async (payload: WalletFormSubmitPayload) => {
    const theme = getWalletTheme(payload.type, payload.colorKey);
    if (payload.id) {
      setWallets((prev) =>
        prev.map((w) =>
          w.id === payload.id
            ? {
                ...w,
                name: payload.name,
                shortName: payload.name,
                type: payload.type,
                balance: payload.balance,
                last4: payload.last4,
                colorKey: payload.colorKey,
                dotColor: theme.dotColor,
                gradient: theme.gradient,
              }
            : w
        )
      );
      try {
        await walletService.updateWallet(payload.id, {
          name: payload.name,
          type: payload.type,
          color: theme.dotColor,
          accountNumber: payload.last4 || null,
        });
        await refreshAllData();
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Gagal memperbarui dompet', 'error');
      }
      return;
    }

    const newWallet: WalletItem = {
      id: `wallet-${Date.now()}`,
      name: payload.name,
      shortName: payload.name,
      type: payload.type,
      balance: payload.balance,
      last4: payload.last4,
      colorKey: payload.colorKey,
      isArchived: false,
      dotColor: theme.dotColor,
      gradient: theme.gradient,
    };
    setWallets((prev) => [newWallet, ...prev]);
    try {
      await walletService.createWallet({
        name: payload.name,
        type: payload.type,
        initialBalance: payload.balance,
        color: theme.dotColor,
        accountNumber: payload.last4 || null,
      });
      await refreshAllData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal membuat dompet', 'error');
    }
  };

  const handleQuickTransferSubmit = (payload: QuickTransactionSubmitPayload) => {
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
        iconBg: '#EBF2FF',
        iconColor: '#3B7AF5',
      });
      return;
    }

    recordTransaction({
      title: payload.note || payload.category.label,
      categoryKey: payload.category.key,
      categoryLabel: payload.category.label,
      walletId: payload.walletId,
      walletName: sourceWallet?.name || 'Dompet',
      dateLabel: `${hh}:${mm}`,
      amount: payload.amount,
      type: payload.mode,
      iconBg: payload.category.iconBg,
      iconColor: payload.category.iconColor,
    });
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
              <Text style={styles.headerTitle}>Dompet Saya</Text>
              <Text style={styles.headerSubtitle}>
                {activeWallets.length} rekening aktif
              </Text>
            </View>

            <View style={styles.headerActions}>
              <Pressable
                onPress={() => setHideBalance((prev) => !prev)}
                accessibilityRole="button"
                accessibilityLabel={hideBalance ? 'Tampilkan saldo' : 'Sembunyikan saldo'}
                style={({ pressed }) => [styles.eyeCircleBtn, pressed && { opacity: 0.75 }]}
              >
                {hideBalance ? (
                  <EyeOff size={18} color="#FFFFFF" strokeWidth={1.9} />
                ) : (
                  <Eye size={18} color="#FFFFFF" strokeWidth={1.9} />
                )}
              </Pressable>

              <Pressable
                onPress={handleOpenAdd}
                accessibilityRole="button"
                accessibilityLabel="Tambah dompet baru"
                style={({ pressed }) => [styles.addPill, pressed && { opacity: 0.8 }]}
              >
                <Plus size={14} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={styles.addPillText}>Tambah</Text>
              </Pressable>
            </View>
          </View>
        </LinearGradient>

        {/* KARTU TOTAL SALDO & BAR DISTRIBUSI MENUMPANG */}
        <Animated.View
          entering={FadeInDown.duration(360).easing(Easing.out(Easing.cubic))}
          style={styles.balanceCard}
        >
          <View style={styles.balanceTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.balanceCaption}>TOTAL SALDO AKTIF</Text>
              <Text style={[styles.balanceValue, Typography.tabularNums]}>
                {hideBalance ? 'Rp ••••••••' : formatIDR(totalActiveBalance)}
              </Text>
            </View>

            <View style={styles.countPill}>
              <Text style={[styles.countPillText, Typography.tabularNums]}>
                {activeWallets.length} Dompet
              </Text>
            </View>
          </View>

          {/* Segmented Allocation Bar */}
          {allocationItems.length > 0 ? (
            <>
              <View style={styles.allocationTrack}>
                {allocationItems.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.allocationSegment,
                      { flex: item.pct, backgroundColor: item.color },
                    ]}
                  />
                ))}
              </View>

              <View style={styles.legendWrap}>
                {allocationItems.map((item) => (
                  <View key={item.id} style={styles.legendItem}>
                    <Text style={styles.legendText} numberOfLines={1}>
                      {item.name}{' '}
                      <Text style={[styles.legendPct, { color: item.color }]}>
                        {item.pct}%
                      </Text>
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.emptyAllocationBox}>
              <View style={styles.allocationTrack}>
                <View style={{ flex: 1, backgroundColor: '#E2E8F0' }} />
              </View>
              <Text style={styles.emptyAllocationHint}>
                Catat pemasukan atau atur saldo dompet untuk melihat proporsi dana.
              </Text>
            </View>
          )}
        </Animated.View>

        {/* FILTER PILL HORIZONTAL */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTER_TABS.map((tab) => {
            const active = activeFilter === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveFilter(tab.key)}
                style={[styles.filterPill, active && styles.filterPillActive]}
              >
                <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* DAFTAR KARTU REKENING FISIK REALISTIS */}
        <View style={styles.cardsList}>
          {filteredWallets.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Wallet size={24} color={Colors.primary} strokeWidth={1.85} />
              </View>
              <Text style={styles.emptyTitle}>
                {activeFilter === 'ARCHIVE'
                  ? 'Belum ada dompet diarsipkan'
                  : 'Tidak ada dompet di kategori ini'}
              </Text>
              <Text style={styles.emptySub}>
                {activeFilter === 'ARCHIVE'
                  ? 'Dompet yang Anda arsipkan akan tampil di sini.'
                  : 'Tambahkan rekening atau e-wallet baru untuk mulai melacak saldo.'}
              </Text>
            </View>
          ) : (
            filteredWallets.map((wallet, idx) => (
              <Animated.View
                key={wallet.id}
                entering={FadeInDown.delay(Math.min(idx * 65, 220))
                  .duration(340)
                  .easing(Easing.out(Easing.cubic))}
              >
                <RealisticWalletCard
                  wallet={wallet}
                  hideBalance={hideBalance}
                  onPress={() => setSelectedWallet(wallet)}
                />
              </Animated.View>
            ))
          )}

          {activeFilter !== 'ARCHIVE' ? (
            <Pressable
              onPress={handleOpenAdd}
              accessibilityRole="button"
              accessibilityLabel="Tambah Dompet Baru"
              style={({ pressed }) => [styles.dashedAddBtn, pressed && { opacity: 0.75 }]}
            >
              <Plus size={18} color={Colors.primary} strokeWidth={2.2} />
              <Text style={styles.dashedAddText}>Tambah Dompet Baru</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      {/* DETAIL & AKSI DOMPET */}
      <WalletDetailSheet
        visible={selectedWallet !== null}
        wallet={selectedWallet}
        totalActiveBalance={totalActiveBalance}
        transactions={transactions}
        onClose={() => setSelectedWallet(null)}
        onTransfer={() => setTransferSheetVisible(true)}
        onEdit={handleOpenEdit}
        onToggleArchive={handleToggleArchive}
      />

      {/* TAMBAH / EDIT DOMPET */}
      <WalletFormSheet
        visible={formVisible}
        editingWallet={editingWallet}
        onClose={() => {
          setFormVisible(false);
          setEditingWallet(null);
        }}
        onSubmit={handleWalletFormSubmit}
      />

      {/* QUICK TRANSFER SHEET */}
      <QuickTransactionSheet
        visible={transferSheetVisible}
        initialMode="TRANSFER"
        wallets={activeWallets}
        onClose={() => setTransferSheetVisible(false)}
        onSubmit={handleQuickTransferSubmit}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eyeCircleBtn: {
    width: TouchTarget.minSize,
    height: TouchTarget.minSize,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
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

  balanceCard: {
    marginHorizontal: 16,
    marginTop: -20,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    ...CARD_SHADOW,
  },
  balanceTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  balanceCaption: {
    fontFamily: FontFamily.semibold,
    fontSize: 10.5,
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  balanceValue: {
    fontFamily: FontFamily.bold,
    fontSize: 25,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    marginTop: 3,
  },
  countPill: {
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  countPillText: {
    fontFamily: FontFamily.semibold,
    fontSize: 11.5,
    color: Colors.primaryDark,
  },
  allocationTrack: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 99,
    overflow: 'hidden',
    gap: 3,
    marginTop: 14,
  },
  allocationSegment: {
    height: '100%',
    borderRadius: 99,
  },
  emptyAllocationBox: {
    gap: 8,
  },
  emptyAllocationHint: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: '#64748B',
  },
  legendWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  legendPct: {
    fontFamily: FontFamily.semibold,
  },

  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 16,
  },
  filterPill: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterPillText: {
    fontFamily: FontFamily.medium,
    fontSize: 12.5,
    color: Colors.textMuted,
  },
  filterPillTextActive: {
    fontFamily: FontFamily.semibold,
    color: '#FFFFFF',
  },

  cardsList: {
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 16,
  },
  dashedAddBtn: {
    height: 56,
    borderRadius: 18,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dashedAddText: {
    fontFamily: FontFamily.semibold,
    fontSize: 14,
    color: Colors.primary,
  },

  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 30,
    paddingHorizontal: 24,
    alignItems: 'center',
    ...CARD_SHADOW,
  },
  emptyIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 15,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: FontFamily.regular,
    fontSize: 12.5,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 18,
  },
});
