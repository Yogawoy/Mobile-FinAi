import { HorizontalScrollStrip } from '@/components/HorizontalScrollStrip';
import { BaseBottomSheet } from '@/components/ui/BaseBottomSheet';
import { formatIDR } from '@/lib/format';
import { type WalletItem } from '@/lib/mockData';
import { Colors, FontFamily, Radius, Typography } from '@/theme/tokens';
import { Check, RotateCcw, Trash2, Wallet } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface DeleteGoalSheetProps {
  visible: boolean;
  goalName: string;
  currentAmount: number;
  wallets: WalletItem[];
  onClose: () => void;
  onConfirmDelete: (refundToWalletId?: string) => void;
}

export function DeleteGoalSheet({
  visible,
  goalName,
  currentAmount,
  wallets,
  onClose,
  onConfirmDelete,
}: DeleteGoalSheetProps) {
  const activeWallets = wallets.filter((w) => !w.isArchived);
  const [selectedWalletId, setSelectedWalletId] = useState<string>(
    activeWallets[0]?.id ?? ''
  );

  useEffect(() => {
    if (visible && activeWallets.length > 0 && !selectedWalletId) {
      setSelectedWalletId(activeWallets[0].id);
    }
  }, [visible, activeWallets, selectedWalletId]);

  return (
    <BaseBottomSheet
      visible={visible}
      title="Hapus Tabungan?"
      onClose={onClose}
    >
      <View style={styles.infoBanner}>
        <Text style={styles.infoTitle}>
          Tabungan {goalName} masih memiliki saldo
        </Text>
        <Text style={[styles.infoAmount, Typography.tabularNums]}>
          {formatIDR(currentAmount)}
        </Text>
      </View>

      {activeWallets.length > 0 ? (
        <View style={styles.section}>
          <HorizontalScrollStrip
            label="Pilih dompet pengembalian"
            fadeColor="#FFFFFF"
            contentContainerStyle={styles.walletScroll}
          >
            {activeWallets.map((w) => {
              const selected = w.id === selectedWalletId;
              return (
                <Pressable
                  key={w.id}
                  onPress={() => setSelectedWalletId(w.id)}
                  style={({ pressed }) => [
                    styles.walletChip,
                    selected && styles.walletChipActive,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Wallet
                    size={14}
                    color={selected ? Colors.primary : Colors.textSecondary}
                    strokeWidth={2}
                  />
                  <Text
                    style={[
                      styles.walletName,
                      selected && styles.walletNameActive,
                    ]}
                    numberOfLines={1}
                  >
                    {w.name}
                  </Text>
                  {selected ? (
                    <Check size={13} color={Colors.primary} strokeWidth={2.5} />
                  ) : null}
                </Pressable>
              );
            })}
          </HorizontalScrollStrip>

          <Pressable
            disabled={!selectedWalletId}
            onPress={() => onConfirmDelete(selectedWalletId)}
            style={({ pressed }) => [
              styles.refundBtn,
              !selectedWalletId && { opacity: 0.5 },
              pressed && { opacity: 0.88 },
            ]}
          >
            <RotateCcw size={16} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={styles.refundBtnText}>Kembalikan ke Dompet</Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable
        onPress={() => onConfirmDelete(undefined)}
        style={({ pressed }) => [
          styles.plainDeleteBtn,
          pressed && { opacity: 0.85 },
        ]}
      >
        <Trash2 size={16} color={Colors.expense} strokeWidth={2.1} />
        <Text style={styles.plainDeleteText}>Hapus Tanpa Kembalikan</Text>
      </Pressable>
    </BaseBottomSheet>
  );
}

const styles = StyleSheet.create({
  infoBanner: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 4,
  },
  infoTitle: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: '#92400E',
  },
  infoAmount: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    color: '#78350F',
  },
  section: {
    gap: 10,
    marginBottom: 10,
  },
  sectionLabel: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  walletScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  walletChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: Radius.full,
    backgroundColor: '#F5F7FB',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  walletChipActive: {
    backgroundColor: '#EBF2FF',
    borderColor: Colors.primary,
  },
  walletName: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Colors.textSecondary,
    maxWidth: 130,
  },
  walletNameActive: {
    color: Colors.primaryDark,
  },
  refundBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  refundBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 14.5,
    color: '#FFFFFF',
  },
  plainDeleteBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  plainDeleteText: {
    fontFamily: FontFamily.bold,
    fontSize: 14.5,
    color: Colors.expense,
  },
});
