import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Archive,
  ArchiveRestore,
  ArrowLeftRight,
  Pencil,
  X,
} from 'lucide-react-native';
import { formatIDR } from '@/src/lib/format';
import { type TransactionItem, type WalletItem } from '@/src/lib/mockData';
import { getWalletTheme } from '@/src/lib/walletTheme';
import { Colors, FontFamily, Radius, TouchTarget, Typography } from '@/src/theme/tokens';

interface WalletDetailSheetProps {
  visible: boolean;
  wallet: WalletItem | null;
  totalActiveBalance: number;
  transactions: TransactionItem[];
  onClose: () => void;
  onTransfer: (wallet: WalletItem) => void;
  onEdit: (wallet: WalletItem) => void;
  onToggleArchive: (wallet: WalletItem) => void;
}

export function WalletDetailSheet({
  visible,
  wallet,
  totalActiveBalance,
  transactions,
  onClose,
  onTransfer,
  onEdit,
  onToggleArchive,
}: WalletDetailSheetProps) {
  if (!wallet) return null;

  const theme = getWalletTheme(wallet.type, wallet.colorKey);
  const sharePct =
    !wallet.isArchived && totalActiveBalance > 0
      ? Math.round((wallet.balance / totalActiveBalance) * 100)
      : 0;

  const recentTx = transactions
    .filter((tx) => tx.walletId === wallet.id || tx.targetWalletId === wallet.id)
    .slice(0, 3);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.dragHandle} />

          <View style={styles.headerRow}>
            <View style={styles.titleRow}>
              <Text style={styles.sheetTitle} numberOfLines={1}>
                {wallet.name}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Tutup detail dompet"
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
            >
              <X size={20} color={Colors.textMuted} strokeWidth={1.9} />
            </Pressable>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryTop}>
              <View>
                <Text style={styles.summaryCaption}>Saldo Dompet</Text>
                <Text style={[styles.summaryBalance, Typography.tabularNums]}>
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
              {theme.subLabel} · {wallet.last4}
            </Text>
          </View>

          <Text style={styles.sectionLabel}>3 Transaksi Terakhir</Text>
          <View style={styles.txCard}>
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
                  <View
                    key={tx.id}
                    style={[styles.txRow, idx > 0 && styles.txDivider]}
                  >
                    <View style={styles.txInfo}>
                      <Text style={styles.txTitle} numberOfLines={1}>
                        {tx.title}
                      </Text>
                      <Text style={styles.txMeta} numberOfLines={1}>
                        {tx.categoryLabel} · {tx.dateGroup || tx.dateLabel}
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
                  </View>
                );
              })
            )}
          </View>

          <View style={styles.actionRow}>
            <Pressable
              onPress={() => {
                onClose();
                onTransfer(wallet);
              }}
              style={({ pressed }) => [styles.actionBtnPrimary, pressed && { opacity: 0.85 }]}
            >
              <ArrowLeftRight size={16} color="#FFFFFF" strokeWidth={1.9} />
              <Text style={styles.actionBtnPrimaryText}>Transfer</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                onClose();
                onEdit(wallet);
              }}
              style={({ pressed }) => [
                styles.actionBtnOutline,
                pressed && { backgroundColor: Colors.canvas },
              ]}
            >
              <Pencil size={16} color={Colors.textPrimary} strokeWidth={1.9} />
              <Text style={styles.actionBtnOutlineText}>Edit</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                onToggleArchive(wallet);
                onClose();
              }}
              style={({ pressed }) => [
                styles.actionBtnArchive,
                pressed && { opacity: 0.8 },
              ]}
            >
              {wallet.isArchived ? (
                <ArchiveRestore size={16} color={Colors.primary} strokeWidth={1.9} />
              ) : (
                <Archive size={16} color={Colors.warningText} strokeWidth={1.9} />
              )}
              <Text
                style={[
                  styles.actionBtnArchiveText,
                  wallet.isArchived && { color: Colors.primary },
                ]}
              >
                {wallet.isArchived ? 'Aktifkan' : 'Arsipkan'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
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
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sheetTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.textPrimary,
    flex: 1,
  },
  closeBtn: {
    width: TouchTarget.minSize,
    height: TouchTarget.minSize,
    borderRadius: 22,
    backgroundColor: Colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    backgroundColor: Colors.canvas,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 16,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
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
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  portionText: {
    fontFamily: FontFamily.semibold,
    fontSize: 11.5,
    color: Colors.primaryDark,
  },
  metaText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 8,
  },
  sectionLabel: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  txCard: {
    backgroundColor: Colors.canvas,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 18,
  },
  emptyTxText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: 16,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    gap: 12,
  },
  txDivider: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
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
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnPrimary: {
    flex: 1,
    height: 46,
    borderRadius: 13,
    backgroundColor: Colors.primary,
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
    height: 46,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
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
    height: 46,
    borderRadius: 13,
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
});
