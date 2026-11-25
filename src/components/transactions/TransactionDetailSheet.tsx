import React from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Pencil, Trash2, X } from 'lucide-react-native';
import { formatIDR } from '@/src/lib/format';
import { type TransactionItem } from '@/src/lib/mockData';
import { Colors, FontFamily, Radius, TouchTarget, Typography } from '@/src/theme/tokens';

interface TransactionDetailSheetProps {
  visible: boolean;
  transaction: TransactionItem | null;
  onClose: () => void;
  onEdit: (tx: TransactionItem) => void;
  onDelete: (tx: TransactionItem) => void;
}

export function TransactionDetailSheet({
  visible,
  transaction,
  onClose,
  onEdit,
  onDelete,
}: TransactionDetailSheetProps) {
  if (!transaction) return null;

  const isIncome = transaction.type === 'INCOME';
  const isTransfer = transaction.type === 'TRANSFER';

  const badgeConfig = isIncome
    ? {
        label: 'Pemasukan',
        bg: Colors.incomeSoft,
        color: Colors.incomeText,
        amountColor: Colors.income,
        prefix: '+',
      }
    : isTransfer
      ? {
          label: 'Transfer',
          bg: Colors.primarySoft,
          color: Colors.primaryDark,
          amountColor: Colors.primary,
          prefix: '',
        }
      : {
          label: 'Pengeluaran',
          bg: Colors.expenseSoft,
          color: Colors.expenseText,
          amountColor: Colors.expense,
          prefix: '-',
        };

  const walletDisplay =
    isTransfer && transaction.targetWalletName
      ? `${transaction.walletName} → ${transaction.targetWalletName}`
      : transaction.walletName;

  const dateDisplay = transaction.dateGroup
    ? `${transaction.dateGroup} • ${transaction.dateLabel}`
    : transaction.dateLabel;

  const handleDeletePress = () => {
    Alert.alert(
      'Hapus Transaksi',
      `Yakin ingin menghapus "${transaction.title}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => {
            onDelete(transaction);
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.dragHandle} />

          <View style={styles.headerRow}>
            <Text style={styles.sheetTitle}>Detail Transaksi</Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Tutup detail"
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
            >
              <X size={20} color={Colors.textMuted} strokeWidth={1.9} />
            </Pressable>
          </View>

          <View style={styles.heroSummary}>
            <View style={[styles.typeBadge, { backgroundColor: badgeConfig.bg }]}>
              <Text style={[styles.typeBadgeText, { color: badgeConfig.color }]}>
                {badgeConfig.label}
              </Text>
            </View>
            <Text
              style={[
                styles.heroAmount,
                Typography.tabularNums,
                { color: badgeConfig.amountColor },
              ]}
            >
              {badgeConfig.prefix}
              {formatIDR(transaction.amount)}
            </Text>
          </View>

          <View style={styles.detailCard}>
            <DetailRow label="Dompet" value={walletDisplay} />
            <View style={styles.rowDivider} />
            <DetailRow label="Kategori" value={transaction.categoryLabel} />
            <View style={styles.rowDivider} />
            <DetailRow label="Tanggal" value={dateDisplay} />
            <View style={styles.rowDivider} />
            <DetailRow
              label="Catatan"
              value={transaction.note || transaction.title}
              multiline
            />
          </View>

          <View style={styles.actionRow}>
            <Pressable
              onPress={() => {
                onClose();
                onEdit(transaction);
              }}
              accessibilityRole="button"
              accessibilityLabel="Edit transaksi"
              style={({ pressed }) => [
                styles.editBtn,
                pressed && { backgroundColor: Colors.canvas },
              ]}
            >
              <Pencil size={17} color={Colors.textPrimary} strokeWidth={1.85} />
              <Text style={styles.editBtnText}>Edit</Text>
            </Pressable>

            <Pressable
              onPress={handleDeletePress}
              accessibilityRole="button"
              accessibilityLabel="Hapus transaksi"
              style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.8 }]}
            >
              <Trash2 size={17} color={Colors.expense} strokeWidth={1.85} />
              <Text style={styles.deleteBtnText}>Hapus</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
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
      <Text style={styles.detailValue} numberOfLines={multiline ? 3 : 1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  closeBtn: {
    width: TouchTarget.minSize,
    height: TouchTarget.minSize,
    borderRadius: 22,
    backgroundColor: Colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSummary: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  typeBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  typeBadgeText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12.5,
  },
  heroAmount: {
    fontFamily: FontFamily.bold,
    fontSize: 30,
    letterSpacing: -0.5,
  },
  detailCard: {
    backgroundColor: Colors.canvas,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    gap: 16,
  },
  detailRowTop: {
    alignItems: 'flex-start',
  },
  rowDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  detailLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.textMuted,
    minWidth: 74,
  },
  detailValue: {
    flex: 1,
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  editBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  editBtnText: {
    fontFamily: FontFamily.semibold,
    fontSize: 14.5,
    color: Colors.textPrimary,
  },
  deleteBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: Colors.expenseSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteBtnText: {
    fontFamily: FontFamily.semibold,
    fontSize: 14.5,
    color: Colors.expense,
  },
});
