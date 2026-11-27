import { formatIndonesianFullDate } from '@/components/CalendarPickerSheet';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/ToastProvider';
import { useFinance } from '@/context/FinanceContext';
import { formatIDR } from '@/lib/format';
import { transactionService } from '@/services/transaction.service';
import { Colors, FontFamily, Radius, Typography } from '@/theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Briefcase,
  Car,
  Coffee,
  Gamepad2,
  HeartPulse,
  Home,
  Pencil,
  ShoppingBag,
  Tag,
  Trash2,
  Utensils,
  Zap,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function renderCategoryIcon(iconKey: string, color: string, size = 26) {
  const key = iconKey.toLowerCase();
  if (key.includes('utensil') || key.includes('food') || key.includes('makan')) {
    return <Utensils size={size} color={color} strokeWidth={2} />;
  }
  if (key.includes('coffee') || key.includes('kopi')) {
    return <Coffee size={size} color={color} strokeWidth={2} />;
  }
  if (key.includes('car') || key.includes('transport')) {
    return <Car size={size} color={color} strokeWidth={2} />;
  }
  if (key.includes('shop') || key.includes('bag') || key.includes('belanja')) {
    return <ShoppingBag size={size} color={color} strokeWidth={2} />;
  }
  if (key.includes('game') || key.includes('hibur')) {
    return <Gamepad2 size={size} color={color} strokeWidth={2} />;
  }
  if (key.includes('zap') || key.includes('listrik') || key.includes('tagih')) {
    return <Zap size={size} color={color} strokeWidth={2} />;
  }
  if (key.includes('heart') || key.includes('sehat')) {
    return <HeartPulse size={size} color={color} strokeWidth={2} />;
  }
  if (key.includes('home') || key.includes('rumah')) {
    return <Home size={size} color={color} strokeWidth={2} />;
  }
  if (key.includes('briefcase') || key.includes('gaji')) {
    return <Briefcase size={size} color={color} strokeWidth={2} />;
  }
  return <Tag size={size} color={color} strokeWidth={2} />;
}

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { transactions, refreshAllData } = useFinance();

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const tx = transactions.find((t) => t.id === id);

  if (!tx) {
    return (
      <View style={[styles.root, styles.emptyState]}>
        <Text style={styles.emptyTitle}>Transaksi tidak ditemukan</Text>
        <Pressable onPress={() => router.back()} style={styles.backFallbackBtn}>
          <Text style={styles.backFallbackText}>Kembali</Text>
        </Pressable>
      </View>
    );
  }

  const isIncome = tx.type === 'INCOME';
  const isTransfer = tx.type === 'TRANSFER';

  const typeMeta = isIncome
    ? {
        label: 'Pemasukan',
        bg: Colors.incomeSoft,
        textColor: Colors.incomeText,
        amountColor: Colors.income,
        prefix: '+',
      }
    : isTransfer
      ? {
          label: 'Transfer',
          bg: Colors.primarySoft,
          textColor: Colors.primaryDark,
          amountColor: Colors.primary,
          prefix: '',
        }
      : {
          label: 'Pengeluaran',
          bg: Colors.expenseSoft,
          textColor: Colors.expenseText,
          amountColor: Colors.expense,
          prefix: '-',
        };

  const fullDateLabel = (() => {
    if (tx.transactionDate) {
      const d = new Date(tx.transactionDate);
      if (!Number.isNaN(d.getTime())) {
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${formatIndonesianFullDate(d)} ${hh}:${mm}`;
      }
    }
    return tx.dateGroup ? `${tx.dateGroup} ${tx.dateLabel}` : tx.dateLabel;
  })();

  const handleDelete = async () => {
    setConfirmDeleteOpen(false);
    setDeleting(true);
    try {
      await transactionService.deleteTransaction(tx.id);
      await refreshAllData();
      showToast('Transaksi dihapus');
      router.back();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Gagal menghapus transaksi',
        'error'
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 112 + insets.bottom }}
      >
        <LinearGradient
          colors={['#4B89FF', '#3B7AF5', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}
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
                Detail Transaksi
              </Text>
            </View>

            <View style={styles.headerActions}>
              <Pressable
                onPress={() =>
                  router.push(`/transaction/form?id=${encodeURIComponent(tx.id)}` as Href)
                }
                accessibilityRole="button"
                accessibilityLabel="Edit transaksi"
                style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.75 }]}
              >
                <Pencil size={17} color="#FFFFFF" strokeWidth={2.1} />
              </Pressable>
              <Pressable
                onPress={() => setConfirmDeleteOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Hapus transaksi"
                style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.75 }]}
              >
                <Trash2 size={17} color="#FFFFFF" strokeWidth={2.1} />
              </Pressable>
            </View>
          </View>
        </LinearGradient>

        {/* HERO RECEIPT CARD */}
        <Animated.View
          entering={FadeInDown.duration(320).easing(Easing.out(Easing.cubic))}
          style={styles.heroCard}
        >
          <View style={[styles.heroIconCircle, { backgroundColor: typeMeta.bg }]}>
            {isTransfer ? (
              <ArrowLeftRight size={26} color={typeMeta.amountColor} strokeWidth={2} />
            ) : isIncome ? (
              <ArrowDownLeft size={26} color={typeMeta.amountColor} strokeWidth={2} />
            ) : (
              renderCategoryIcon(tx.categoryKey, typeMeta.amountColor, 26)
            )}
          </View>

          <View style={[styles.typeBadge, { backgroundColor: typeMeta.bg }]}>
            <Text style={[styles.typeBadgeText, { color: typeMeta.textColor }]}>
              {typeMeta.label}
            </Text>
          </View>

          <Text
            style={[
              styles.heroAmount,
              Typography.tabularNums,
              { color: typeMeta.amountColor },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {typeMeta.prefix}
            {formatIDR(tx.amount)}
          </Text>

          <Text style={styles.heroTitle}>{tx.title}</Text>
          <Text style={styles.heroDate}>{fullDateLabel}</Text>
        </Animated.View>

        {/* KARTU RINCIAN LENGKAP */}
        <Animated.View
          entering={FadeInDown.delay(60).duration(320).easing(Easing.out(Easing.cubic))}
          style={styles.detailCard}
        >
          {!isTransfer ? (
            <>
              <DetailRow label="Kategori" value={tx.categoryLabel} />
              <View style={styles.rowDivider} />
            </>
          ) : null}

          {isTransfer ? (
            <>
              <DetailRow label="Dari Dompet" value={tx.walletName} />
              <View style={styles.rowDivider} />
              <DetailRow label="Ke Dompet" value={tx.targetWalletName || 'Dompet'} />
            </>
          ) : (
            <DetailRow label="Dompet" value={tx.walletName} />
          )}

          <View style={styles.rowDivider} />
          <DetailRow label="Tanggal" value={fullDateLabel} />

          {tx.note && tx.note.trim().length > 0 ? (
            <>
              <View style={styles.rowDivider} />
              <DetailRow label="Catatan" value={tx.note} multiline />
            </>
          ) : null}

          <View style={styles.rowDivider} />
          <DetailRow
            label="Dicatat lewat"
            value={tx.recurringId ? 'Jadwal Rutin' : 'Manual'}
          />
        </Animated.View>
      </ScrollView>

      {/* STICKY FOOTER */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <Pressable
          onPress={() =>
            router.push(`/transaction/form?id=${encodeURIComponent(tx.id)}` as Href)
          }
          accessibilityRole="button"
          accessibilityLabel="Edit Transaksi"
          style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.88 }]}
        >
          <Pencil size={17} color="#FFFFFF" strokeWidth={2.2} />
          <Text style={styles.editBtnText}>Edit Transaksi</Text>
        </Pressable>

        <Pressable
          disabled={deleting}
          onPress={() => setConfirmDeleteOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Hapus Transaksi"
          style={({ pressed }) => [
            styles.deleteBtn,
            deleting && { opacity: 0.6 },
            pressed && { opacity: 0.82 },
          ]}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={Colors.expense} />
          ) : (
            <>
              <Trash2 size={17} color={Colors.expense} strokeWidth={2.2} />
              <Text style={styles.deleteBtnText}>Hapus</Text>
            </>
          )}
        </Pressable>
      </View>

      <ConfirmDialog
        visible={confirmDeleteOpen}
        title="Hapus Transaksi?"
        message={`Transaksi "${tx.title}" akan dihapus dan saldo dompet disesuaikan.`}
        confirmLabel="Hapus"
        variant="danger"
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </View>
  );
}

function DetailRow({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <View style={[styles.detailRow, multiline && styles.detailRowTop]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={multiline ? 4 : 2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  backFallbackBtn: {
    marginTop: 14,
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backFallbackText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 42,
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
    gap: 12,
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
    marginTop: -26,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    padding: 22,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 4,
  },
  heroIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: Radius.full,
    marginBottom: 10,
  },
  typeBadgeText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12.5,
  },
  heroAmount: {
    fontFamily: FontFamily.bold,
    fontSize: 30,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  heroTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 15.5,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  heroDate: {
    fontFamily: FontFamily.regular,
    fontSize: 12.5,
    color: Colors.textMuted,
    marginTop: 4,
  },
  detailCard: {
    marginHorizontal: 18,
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    paddingHorizontal: 18,
    paddingVertical: 6,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    gap: 16,
  },
  detailRowTop: {
    alignItems: 'flex-start',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  detailLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.textMuted,
    minWidth: 92,
  },
  detailValue: {
    flex: 1,
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
    paddingHorizontal: 18,
    paddingTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  editBtn: {
    flex: 1.4,
    height: 50,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  editBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 14.5,
    color: '#FFFFFF',
  },
  deleteBtn: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  deleteBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 14.5,
    color: Colors.expense,
  },
});
