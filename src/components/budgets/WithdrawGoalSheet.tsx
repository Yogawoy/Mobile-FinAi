import { HorizontalScrollStrip } from '@/components/HorizontalScrollStrip';
import { BaseBottomSheet } from '@/components/ui/BaseBottomSheet';
import { FocusTextInput } from '@/components/ui/FocusTextInput';
import { useToast } from '@/components/ui/ToastProvider';
import { formatIDR } from '@/lib/format';
import { type GoalItem, type WalletItem } from '@/lib/mockData';
import { Colors, FontFamily, Radius, Typography } from '@/theme/tokens';
import { Info } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export interface GoalWithdrawPayload {
  goalId: string;
  amount: number;
  destinationType: 'WALLET' | 'EXTERNAL';
  walletId?: string | null;
}

interface WithdrawGoalSheetProps {
  visible: boolean;
  goal: GoalItem | null;
  wallets: WalletItem[];
  onClose: () => void;
  onWithdraw: (payload: GoalWithdrawPayload) => void;
}

function formatThousands(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function WithdrawGoalSheet({
  visible,
  goal,
  wallets,
  onClose,
  onWithdraw,
}: WithdrawGoalSheetProps) {
  const { showToast } = useToast();
  const activeWallets = wallets.filter((w) => !w.isArchived);

  const [amountText, setAmountText] = useState('');
  const [destinationType, setDestinationType] = useState<'WALLET' | 'EXTERNAL'>(
    'WALLET'
  );
  const [walletId, setWalletId] = useState<string>(activeWallets[0]?.id ?? '');

  useEffect(() => {
    if (!visible || !goal) return;
    setAmountText('');
    if (activeWallets.length > 0) {
      setDestinationType('WALLET');
      setWalletId(activeWallets[0].id);
    } else {
      setDestinationType('EXTERNAL');
      setWalletId('');
    }
  }, [visible, goal]);

  if (!goal) return null;

  const handleSubmit = () => {
    const amount = Number(amountText.replace(/[^0-9]/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('Masukkan nominal penarikan lebih dari Rp 0', 'error');
      return;
    }
    if (amount > goal.current) {
      showToast(
        `Nominal melebihi saldo tabungan (${formatIDR(goal.current)})`,
        'error'
      );
      return;
    }
    if (destinationType === 'WALLET' && !walletId) {
      showToast('Pilih dompet tujuan terlebih dahulu', 'error');
      return;
    }

    onWithdraw({
      goalId: goal.id,
      amount,
      destinationType,
      walletId: destinationType === 'WALLET' ? walletId : null,
    });
    onClose();
  };

  return (
    <BaseBottomSheet
      visible={visible}
      title="Tarik Dana"
      onClose={onClose}
      footer={
        <Pressable
          onPress={handleSubmit}
          accessibilityRole="button"
          accessibilityLabel="Konfirmasi Penarikan"
          style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.88 }]}
        >
          <Text style={styles.submitBtnText}>Tarik Dana</Text>
        </Pressable>
      }
    >
      <View style={styles.previewBox}>
        <Text style={styles.previewName}>{goal.name}</Text>
        <Text style={[styles.previewBalance, Typography.tabularNums]}>
          Saldo tabungan tersedia {formatIDR(goal.current)}
        </Text>
      </View>

      <View style={styles.labelRow}>
        <Text style={styles.label}>Nominal Penarikan</Text>
        <Pressable
          onPress={() => setAmountText(formatThousands(String(goal.current)))}
          style={styles.allBtn}
        >
          <Text style={styles.allBtnText}>Tarik Semua</Text>
        </Pressable>
      </View>

      <View style={styles.amountBox}>
        <Text style={styles.rpPrefix}>Rp</Text>
        <FocusTextInput
          showFocusBorder={false}
          style={[styles.amountInput, Typography.tabularNums]}
          placeholder="0"
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
          value={amountText}
          onChangeText={(val) => setAmountText(formatThousands(val))}
        />
      </View>

      <Text style={styles.label}>Tujuan Dana</Text>
      <View style={styles.segmentRow}>
        <Pressable
          onPress={() => setDestinationType('WALLET')}
          style={[
            styles.segmentBtn,
            destinationType === 'WALLET' && styles.segmentBtnActive,
          ]}
        >
          <Text
            style={[
              styles.segmentText,
              destinationType === 'WALLET' && styles.segmentTextActive,
            ]}
          >
            Ke Dompet
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setDestinationType('EXTERNAL')}
          style={[
            styles.segmentBtn,
            destinationType === 'EXTERNAL' && styles.segmentBtnActive,
          ]}
        >
          <Text
            style={[
              styles.segmentText,
              destinationType === 'EXTERNAL' && styles.segmentTextActive,
            ]}
          >
            Ambil Langsung
          </Text>
        </Pressable>
      </View>

      {destinationType === 'WALLET' ? (
        <HorizontalScrollStrip fadeColor="#FFFFFF">
          <View style={styles.walletChipRow}>
            {activeWallets.map((w) => {
              const selected = w.id === walletId;
              return (
                <Pressable
                  key={w.id}
                  onPress={() => setWalletId(w.id)}
                  style={[styles.walletChip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {w.shortName || w.name}
                  </Text>
                  <Text
                    style={[
                      styles.walletChipBal,
                      Typography.tabularNums,
                      selected && styles.walletChipBalSelected,
                    ]}
                  >
                    {formatIDR(w.balance)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </HorizontalScrollStrip>
      ) : (
        <View style={styles.infoBox}>
          <Info size={15} color={Colors.primary} strokeWidth={2.1} />
          <Text style={styles.infoText}>Saldo dompet tidak akan berubah</Text>
        </View>
      )}
    </BaseBottomSheet>
  );
}

const styles = StyleSheet.create({
  previewBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 3,
  },
  previewName: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  previewBalance: {
    fontFamily: FontFamily.medium,
    fontSize: 12.5,
    color: Colors.textSecondary,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 8,
  },
  label: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 14,
    marginBottom: 8,
  },
  allBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: '#EBF2FF',
  },
  allBtnText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12,
    color: Colors.primaryDark,
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    gap: 8,
  },
  rpPrefix: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
    color: Colors.textSecondary,
  },
  amountInput: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: 20,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  segmentBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F5F7FB',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: '#EBF2FF',
    borderColor: Colors.primary,
  },
  segmentText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: Colors.primaryDark,
  },
  walletChipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  walletChip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 2,
  },
  chipSelected: {
    backgroundColor: '#EBF2FF',
    borderColor: Colors.primary,
  },
  chipText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  chipTextSelected: {
    color: Colors.primaryDark,
  },
  walletChipBal: {
    fontFamily: FontFamily.medium,
    fontSize: 11.5,
    color: Colors.textMuted,
  },
  walletChipBalSelected: {
    color: Colors.primary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EBF2FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  infoText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.primaryDark,
    flex: 1,
  },
  submitBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
