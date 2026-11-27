import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/ToastProvider';
import { RealisticWalletCard } from '@/components/wallets/RealisticWalletCard';
import { useFinance } from '@/context/FinanceContext';
import { formatIDR } from '@/lib/format';
import { useResponsive } from '@/lib/responsive';
import { getWalletTheme } from '@/lib/walletTheme';
import { walletService } from '@/services/wallet.service';
import { Colors, FontFamily, Radius, Typography } from '@/theme/tokens';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  ArrowLeftRight,
  Pencil,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function WalletDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isSmallWidth, isShortHeight } = useResponsive();
  const { showToast } = useToast();
  const { wallets, setWallets, transactions, refreshAllData } = useFinance();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const horizontalMargin = isSmallWidth ? 14 : 18;
  const cardPadding = isSmallWidth ? 14 : 16;

  const wallet = useMemo(
    () => (id ? wallets.find((w) => w.id === id) ?? null : null),
    [id, wallets]
  );

  const totalActiveBalance = useMemo(
    () =>
      wallets
        .filter((w) => !w.isArchived)
        .reduce((sum, w) => sum + w.balance, 0),
    [wallets]
  );

  const recentTx = useMemo(() => {
    if (!wallet) return [];
    return transactions
      .filter((tx) => tx.walletId === wallet.id || tx.targetWalletId === wallet.id)
      .slice(0, 10);
  }, [transactions, wallet]);

  const handleToggleArchive = async () => {
    if (!wallet || archiving) return;
    const nextArchived = !wallet.isArchived;
    setConfirmOpen(false);
    setArchiving(true);
    setWallets((prev) =>
      prev.map((w) => (w.id === wallet.id ? { ...w, isArchived: nextArchived } : w))
    );
    try {
      await walletService.updateWallet(wallet.id, { isArchived: nextArchived });
      await refreshAllData();
      showToast(
        nextArchived
          ? `"${wallet.name}" diarsipkan`
          : `"${wallet.name}" diaktifkan kembali`
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Gagal memperbarui status dompet',
        'error'
      );
    } finally {
      setArchiving(false);
    }
  };

  if (!wallet) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <View
          style={[
            styles.header,
            {
              paddingHorizontal: horizontalMargin,
              paddingTop: Math.max(insets.top, 12) + 8,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Kembali"
              style={styles.iconBtn}
            >
              <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.2} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Detail Dompet</Text>
            <View style={styles.headerSpacer} />
          </View>
        </View>
        <View style={[styles.emptyWrap, { marginHorizontal: horizontalMargin }]}>
          <Text style={styles.emptyTitle}>Dompet tidak ditemukan</Text>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.back()}
            style={styles.emptyBackBtn}
          >
            <Text style={styles.emptyBackText}>Kembali ke Dompet</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const theme = getWalletTheme(wallet.type, wallet.colorKey);
  const sharePct =
    !wallet.isArchived && totalActiveBalance > 0
      ? Math.round((wallet.balance / totalActiveBalance) * 100)
      : 0;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 108 + insets.bottom }}
      >
        <View
          style={[
            styles.header,
            {
              paddingHorizontal: horizontalMargin,
              paddingTop: Math.max(insets.top, 12) + 8,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Kembali"
              style={styles.iconBtn}
            >
              <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.2} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {wallet.name}
            </Text>
            <View style={styles.headerSpacer} />
          </View>
        </View>

        <View style={{ paddingHorizontal: horizontalMargin }}>
          <Animated.View
            entering={FadeInDown.duration(300).easing(Easing.out(Easing.cubic))}
            style={styles.cardOverlap}
          >
            <RealisticWalletCard wallet={wallet} compact />
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(50).duration(300).easing(Easing.out(Easing.cubic))}
            style={[styles.surfaceCard, { padding: cardPadding }]}
          >
            <View style={styles.summaryTop}>
              <View style={styles.summaryLeft}>
                <Text style={styles.summaryCaption}>Saldo Dompet</Text>
                <Text
                  style={[styles.summaryBalance, Typography.tabularNums]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {formatIDR(wallet.balance)}
                </Text>
              </View>
              <View style={styles.portionPill}>
                <Text style={[styles.portionText, Typography.tabularNums]}>
                  {wallet.isArchived ? 'Diarsipkan' : `${sharePct}% dari total`}
                </Text>
              </View>
            </View>
            <Text style={styles.metaText}>
              {theme.subLabel}, {wallet.last4}
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(100).duration(300).easing(Easing.out(Easing.cubic))}
            style={[styles.surfaceCard, { padding: cardPadding }]}
          >
            <View style={styles.txHeaderRow}>
              <Text style={styles.sectionLabel}>Riwayat Transaksi</Text>
              <Text style={[styles.txCountText, Typography.tabularNums]}>
                {recentTx.length} terbaru
              </Text>
            </View>

            {recentTx.length === 0 ? (
              <Text style={styles.emptyTxText}>
                Belum ada transaksi tercatat pada dompet ini.
              </Text>
            ) : (
              recentTx.map((tx, idx) => {
                const isIncome =
                  tx.type === 'INCOME' ||
                  (tx.type === 'TRANSFER' && tx.targetWalletId === wallet.id);
                const amountColor = isIncome ? Colors.income : Colors.expense;
                const prefix = isIncome ? '+' : '-';

                return (
                  <TouchableOpacity
                    key={tx.id}
                    activeOpacity={0.75}
                    onPress={() =>
                      router.push(`/transaction/${encodeURIComponent(tx.id)}` as Href)
                    }
                    style={[styles.txRow, idx > 0 && styles.txDivider]}
                  >
                    <View style={styles.txInfo}>
                      <Text style={styles.txTitle} numberOfLines={1}>
                        {tx.title}
                      </Text>
                      <Text style={styles.txMeta} numberOfLines={1}>
                        {tx.categoryLabel}, {tx.dateGroup || tx.dateLabel}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.txAmount,
                        Typography.tabularNums,
                        { color: amountColor },
                      ]}
                    >
                      {prefix}
                      {formatIDR(tx.amount)}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </Animated.View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            paddingHorizontal: horizontalMargin,
            paddingBottom: Math.max(insets.bottom, 14),
          },
        ]}
      >
        <View style={styles.actionRow}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() =>
              router.push(
                `/transaction/form?type=TRANSFER&walletId=${encodeURIComponent(wallet.id)}` as Href
              )
            }
            style={[styles.actionBtnPrimary, { height: isShortHeight ? 46 : 50 }]}
          >
            <ArrowLeftRight size={16} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.actionBtnPrimaryText}>Transfer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() =>
              router.push(`/wallet/form?id=${encodeURIComponent(wallet.id)}` as Href)
            }
            style={[styles.actionBtnOutline, { height: isShortHeight ? 46 : 50 }]}
          >
            <Pencil size={16} color={Colors.textPrimary} strokeWidth={2} />
            <Text style={styles.actionBtnOutlineText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            disabled={archiving}
            onPress={() => setConfirmOpen(true)}
            style={[styles.actionBtnArchive, { height: isShortHeight ? 46 : 50 }]}
          >
            {wallet.isArchived ? (
              <ArchiveRestore size={16} color={Colors.primary} strokeWidth={2} />
            ) : (
              <Archive size={16} color={Colors.warningText} strokeWidth={2} />
            )}
            <Text
              style={[
                styles.actionBtnArchiveText,
                wallet.isArchived && { color: Colors.primary },
              ]}
            >
              {wallet.isArchived ? 'Aktifkan' : 'Arsipkan'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ConfirmDialog
        visible={confirmOpen}
        title={wallet.isArchived ? 'Aktifkan Dompet?' : 'Arsipkan Dompet?'}
        message={
          wallet.isArchived
            ? `Dompet "${wallet.name}" akan kembali ditampilkan di daftar aktif.`
            : `Dompet "${wallet.name}" akan dipindahkan ke tab Arsip.`
        }
        confirmLabel={wallet.isArchived ? 'Aktifkan' : 'Arsipkan'}
        variant={wallet.isArchived ? 'primary' : 'warning'}
        icon="archive"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void handleToggleArchive()}
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
    backgroundColor: '#2563EB',
    paddingBottom: 56,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 40,
  },
  cardOverlap: {
    marginTop: -40,
    marginBottom: 14,
  },
  surfaceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    marginBottom: 14,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  summaryLeft: {
    flex: 1,
    minWidth: 0,
  },
  summaryCaption: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.textMuted,
  },
  summaryBalance: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    color: Colors.textPrimary,
    letterSpacing: -0.4,
    marginTop: 2,
  },
  portionPill: {
    flexShrink: 0,
    backgroundColor: '#EBF2FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  portionText: {
    fontFamily: FontFamily.semibold,
    fontSize: 11.5,
    color: '#2563EB',
  },
  metaText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 8,
  },
  txHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sectionLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  txCountText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.textMuted,
  },
  emptyTxText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: 18,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 12,
  },
  txDivider: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  txInfo: {
    flex: 1,
    minWidth: 0,
  },
  txTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
    color: Colors.textPrimary,
  },
  txMeta: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  txAmount: {
    flexShrink: 0,
    fontFamily: FontFamily.bold,
    fontSize: 13.5,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
    paddingTop: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnPrimary: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionBtnPrimaryText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  actionBtnOutline: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionBtnOutlineText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  actionBtnArchive: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: Colors.warningSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionBtnArchiveText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Colors.warningText,
  },
  emptyWrap: {
    marginTop: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  emptyBackBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#2563EB',
  },
  emptyBackText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: '#FFFFFF',
  },
});
