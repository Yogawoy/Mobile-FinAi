import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowLeftRight, ShoppingBag } from 'lucide-react-native';
import { BaseBottomSheet } from '@/components/ui/BaseBottomSheet';
import { useToast } from '@/components/ui/ToastProvider';
import { formatIDR } from '@/lib/format';
import { type GoalItem, type WalletItem } from '@/lib/mockData';
import { Colors, FontFamily, Radius, Typography } from '@/theme/tokens';

export type GoalRealizeAction = 'EXPENSE' | 'TRANSFER';

export interface GoalRealizePayload {
  goalId: string;
  action: GoalRealizeAction;
  sourceWalletId: string;
  destinationWalletId?: string;
  amount: number;
}

interface GoalRealizeSheetProps {
  visible: boolean;
  goal: GoalItem | null;
  wallets: WalletItem[];
  onClose: () => void;
  onRealize: (payload: GoalRealizePayload) => void;
}

export function GoalRealizeSheet({
  visible,
  goal,
  wallets,
  onClose,
  onRealize,
}: GoalRealizeSheetProps) {
  const { showToast } = useToast();
  const [action, setAction] = useState<GoalRealizeAction>('EXPENSE');
  const [destWalletId, setDestWalletId] = useState('bca');

  const storageWalletId = goal?.walletId || wallets[0]?.id || 'mandiri';
  const storageWallet = wallets.find((w) => w.id === storageWalletId);
  const otherWallets = wallets.filter((w) => w.id !== storageWalletId);

  useEffect(() => {
    if (!visible || !goal) return;
    setAction('EXPENSE');
    setDestWalletId(otherWallets[0]?.id || wallets[0]?.id || 'bca');
  }, [visible, goal, wallets]);

  if (!goal) return null;

  const amountToUse = goal.current;

  const handleConfirm = () => {
    if (storageWallet && storageWallet.balance < amountToUse) {
      showToast(
        `Saldo ${storageWallet.name} tidak mencukupi (${formatIDR(storageWallet.balance)})`,
        'error'
      );
      return;
    }

    if (action === 'TRANSFER' && destWalletId === storageWalletId) {
      showToast('Pilih dompet harian lain sebagai tujuan', 'error');
      return;
    }

    onRealize({
      goalId: goal.id,
      action,
      sourceWalletId: storageWalletId,
      destinationWalletId: action === 'TRANSFER' ? destWalletId : undefined,
      amount: amountToUse,
    });
    showToast(
      action === 'EXPENSE'
        ? `Dana "${goal.name}" direalisasikan`
        : `Dana "${goal.name}" dipindahkan`
    );
    onClose();
  };

  return (
    <BaseBottomSheet
      visible={visible}
      title="Gunakan Dana Target"
      onClose={onClose}
      footer={
        <Pressable
          onPress={handleConfirm}
          accessibilityRole="button"
          accessibilityLabel="Konfirmasi Gunakan Dana"
          style={({ pressed }) => [
            styles.confirmBtn,
            pressed && { backgroundColor: Colors.primaryDark },
          ]}
        >
          <Text style={styles.confirmBtnText}>
            {action === 'EXPENSE' ? 'Realisasikan & Catat Keluar' : 'Pindahkan Dana'}
          </Text>
        </Pressable>
      }
    >
      <View style={styles.summaryBox}>
        <Text style={styles.goalName}>{goal.name}</Text>
        <Text style={[styles.goalAmount, Typography.tabularNums]}>
          {formatIDR(amountToUse)}
        </Text>
        <Text style={styles.walletInfo}>
          Sumber: {storageWallet?.name || goal.walletName || 'Dompet'} (Saldo:{' '}
          {formatIDR(storageWallet?.balance ?? 0)})
        </Text>
      </View>

      <Text style={styles.sectionLabel}>Pilih Cara Penggunaan Dana</Text>

      <Pressable
        onPress={() => setAction('EXPENSE')}
        style={[
          styles.optionCard,
          action === 'EXPENSE' && styles.optionCardActive,
        ]}
      >
        <View
          style={[
            styles.optionIcon,
            {
              backgroundColor:
                action === 'EXPENSE' ? Colors.primarySoft : Colors.canvas,
            },
          ]}
        >
          <ShoppingBag
            size={18}
            color={action === 'EXPENSE' ? Colors.primary : Colors.textMuted}
            strokeWidth={1.9}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.optionTitle}>Langsung Belanjakan (Realisasi)</Text>
          <Text style={styles.optionSub}>
            Saldo dompet penyimpanan berkurang & dicatat sebagai pengeluaran
            realisasi target.
          </Text>
        </View>
      </Pressable>

      <Pressable
        onPress={() => setAction('TRANSFER')}
        style={[
          styles.optionCard,
          action === 'TRANSFER' && styles.optionCardActive,
        ]}
      >
        <View
          style={[
            styles.optionIcon,
            {
              backgroundColor:
                action === 'TRANSFER' ? Colors.primarySoft : Colors.canvas,
            },
          ]}
        >
          <ArrowLeftRight
            size={18}
            color={action === 'TRANSFER' ? Colors.primary : Colors.textMuted}
            strokeWidth={1.9}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.optionTitle}>Pindahkan ke Dompet Harian</Text>
          <Text style={styles.optionSub}>
            Transfer dana ke dompet operasional untuk digunakan secara bertahap.
          </Text>
        </View>
      </Pressable>

      {action === 'TRANSFER' && otherWallets.length > 0 ? (
        <>
          <Text style={styles.sectionLabel}>Pilih Dompet Harian Tujuan</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.walletRow}>
              {otherWallets.map((w) => {
                const selected = w.id === destWalletId;
                return (
                  <Pressable
                    key={w.id}
                    onPress={() => setDestWalletId(w.id)}
                    style={[styles.walletChip, selected && styles.walletChipActive]}
                  >
                    <Text
                      style={[
                        styles.walletChipText,
                        selected && styles.walletChipTextActive,
                      ]}
                    >
                      {w.shortName || w.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </>
      ) : null}
    </BaseBottomSheet>
  );
}

const styles = StyleSheet.create({
  summaryBox: {
    backgroundColor: Colors.incomeSoft,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 14,
  },
  goalName: {
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
    color: Colors.incomeText,
  },
  goalAmount: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  walletInfo: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  sectionLabel: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 10,
    marginTop: 4,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  optionCardActive: {
    borderColor: Colors.primary,
    backgroundColor: '#F8FBFF',
  },
  optionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  optionSub: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 3,
    lineHeight: 17,
  },
  walletRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 6,
  },
  walletChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.full,
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  walletChipActive: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
  },
  walletChipText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  walletChipTextActive: {
    fontFamily: FontFamily.semibold,
    color: Colors.primaryDark,
  },
  confirmBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontFamily: FontFamily.semibold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
