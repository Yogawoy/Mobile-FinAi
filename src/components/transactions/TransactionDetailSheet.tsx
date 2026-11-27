import { BaseBottomSheet } from '@/components/ui/BaseBottomSheet';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/ToastProvider';
import { formatIDR } from '@/lib/format';
import { type TransactionItem } from '@/lib/mockData';
import { Colors, FontFamily, Radius, Typography } from '@/theme/tokens';
import { Pencil, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
  const { showToast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

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
    ? `${transaction.dateGroup} ${transaction.dateLabel}`
    : transaction.dateLabel;

  return (
    <>
      <BaseBottomSheet
        visible={visible}
        title="Detail Transaksi"
        onClose={onClose}
        footer={
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
              onPress={() => setConfirmOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Hapus transaksi"
              style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.8 }]}
            >
              <Trash2 size={17} color={Colors.expense} strokeWidth={1.85} />
              <Text style={styles.deleteBtnText}>Hapus</Text>
            </Pressable>
          </View>
        }
      >
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
      </BaseBottomSheet>

      <ConfirmDialog
        visible={confirmOpen}
        title="Hapus Transaksi?"
        message={`Transaksi "${transaction.title}" akan dihapus dari daftar.`}
        confirmLabel="Hapus"
        variant="danger"
        icon="trash"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          onDelete(transaction);
          showToast('Transaksi dihapus');
          onClose();
        }}
      />
    </>
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
      <Text style={styles.detailValue} numberOfLines={multiline ? 3 : 2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroSummary: {
    alignItems: 'center',
    paddingVertical: 14,
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
    marginBottom: 8,
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
