import { BaseBottomSheet } from '@/components/ui/BaseBottomSheet';
import { useToast } from '@/components/ui/ToastProvider';
import { formatIDR } from '@/lib/format';
import { calculateGoalRecommendation, formatCompactIDR } from '@/lib/goalCalculator';
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

export interface GoalCreatePayload {
  name: string;
  target: number;
  deadline: string;
  iconKey: string;
  walletId: string;
  walletName: string;
  frequency: string;
}

export interface GoalContributePayload {
  goalId: string;
  amount: number;
  sourceType: 'WALLET' | 'EXTERNAL';
  sourceWalletId?: string | null;
}

interface GoalFormSheetProps {
  visible: boolean;
  wallets: WalletItem[];
  contributingGoal?: GoalItem | null;
  onClose: () => void;
  onCreateGoal?: (payload: GoalCreatePayload) => void;
  onContribute: (payload: GoalContributePayload) => void;
}

const QUICK_AMOUNTS = [100_000, 250_000, 500_000];

function formatThousands(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function GoalFormSheet({
  visible,
  wallets,
  contributingGoal,
  onClose,
  onContribute,
}: GoalFormSheetProps) {
  const { showToast } = useToast();
  const activeWallets = wallets.filter((w) => !w.isArchived);

  const [sourceType, setSourceType] = useState<'WALLET' | 'EXTERNAL'>('WALLET');
  const [sourceWalletId, setSourceWalletId] = useState<string>(
    activeWallets[0]?.id ?? ''
  );
  const [contributeText, setContributeText] = useState('');

  const contributeRec = contributingGoal
    ? calculateGoalRecommendation(
        contributingGoal.current,
        contributingGoal.target,
        contributingGoal.deadline,
        contributingGoal.frequency
      )
    : null;

  useEffect(() => {
    if (!visible || !contributingGoal) return;
    const rec = calculateGoalRecommendation(
      contributingGoal.current,
      contributingGoal.target,
      contributingGoal.deadline,
      contributingGoal.frequency
    );
    setContributeText(
      rec.amount > 0 ? formatThousands(String(rec.amount)) : '250.000'
    );
    if (activeWallets.length > 0) {
      setSourceType('WALLET');
      setSourceWalletId(activeWallets[0].id);
    } else {
      setSourceType('EXTERNAL');
      setSourceWalletId('');
    }
  }, [visible, contributingGoal]);

  if (!contributingGoal) return null;

  const numericAmount = Number(contributeText.replace(/[^0-9]/g, '')) || 0;
  const selectedWallet = activeWallets.find((w) => w.id === sourceWalletId);
  const isInsufficientBalance =
    sourceType === 'WALLET' &&
    numericAmount > 0 &&
    Boolean(selectedWallet) &&
    numericAmount > (selectedWallet?.balance ?? 0);

  const handleSave = () => {
    const amount = numericAmount;
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('Masukkan nominal setoran lebih dari Rp 0', 'error');
      return;
    }

    if (sourceType === 'WALLET') {
      if (!selectedWallet) {
        showToast('Pilih dompet sumber dana terlebih dahulu', 'error');
        return;
      }
      if (selectedWallet.balance < amount) {
        showToast(
          `Saldo ${selectedWallet.name} tidak cukup (${formatIDR(selectedWallet.balance)})`,
          'error'
        );
        return;
      }
    }

    onContribute({
      goalId: contributingGoal.id,
      amount,
      sourceType,
      sourceWalletId: sourceType === 'WALLET' ? sourceWalletId : null,
    });
    onClose();
  };

  return (
    <BaseBottomSheet
      visible={visible}
      title="Setor Dana"
      onClose={onClose}
      footer={
        <Pressable
          disabled={isInsufficientBalance}
          onPress={handleSave}
          accessibilityRole="button"
          accessibilityLabel="Simpan Setoran"
          style={({ pressed }) => [
            styles.saveBtn,
            isInsufficientBalance && { opacity: 0.45 },
            pressed && styles.saveBtnPressed,
          ]}
        >
          <Text style={styles.saveBtnText}>Simpan Setoran</Text>
        </Pressable>
      }
    >
      <View style={styles.goalPreviewBox}>
        <Text style={styles.goalPreviewName}>{contributingGoal.name}</Text>
        <Text style={[styles.goalPreviewMeta, Typography.tabularNums]}>
          Terkumpul {formatIDR(contributingGoal.current)} dari {formatIDR(contributingGoal.target)}
        </Text>
      </View>

      <Text style={styles.label}>Sumber Dana</Text>
      <View style={styles.segmentRow}>
        <Pressable
          onPress={() => setSourceType('WALLET')}
          style={[styles.segmentBtn, sourceType === 'WALLET' && styles.segmentBtnActive]}
        >
          <Text
            style={[
              styles.segmentText,
              sourceType === 'WALLET' && styles.segmentTextActive,
            ]}
          >
            Dari Dompet
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setSourceType('EXTERNAL')}
          style={[styles.segmentBtn, sourceType === 'EXTERNAL' && styles.segmentBtnActive]}
        >
          <Text
            style={[
              styles.segmentText,
              sourceType === 'EXTERNAL' && styles.segmentTextActive,
            ]}
          >
            Dana Luar
          </Text>
        </Pressable>
      </View>

      {sourceType === 'WALLET' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.walletChipRow}>
            {activeWallets.map((w) => {
              const selected = w.id === sourceWalletId;
              return (
                <Pressable
                  key={w.id}
                  onPress={() => setSourceWalletId(w.id)}
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
        </ScrollView>
      ) : (
        <View style={styles.infoBox}>
          <Info size={15} color={Colors.primary} strokeWidth={2.1} />
          <Text style={styles.infoText}>Saldo dompet tidak akan berkurang</Text>
        </View>
      )}

      <Text style={styles.label}>Nominal Setoran</Text>
      <View
        style={[
          styles.amountBox,
          isInsufficientBalance && { borderColor: Colors.expense },
        ]}
      >
        <Text style={styles.rpPrefix}>Rp</Text>
        <TextInput
          style={[styles.amountInput, Typography.tabularNums]}
          placeholder="0"
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
          value={contributeText}
          onChangeText={(val) => setContributeText(formatThousands(val))}
        />
      </View>
      {isInsufficientBalance && selectedWallet ? (
        <Text style={[styles.insufficientText, Typography.tabularNums]}>
          Saldo dompet tidak cukup, sisa {formatIDR(selectedWallet.balance)}
        </Text>
      ) : null}

      <Text style={styles.label}>Pilih Cepat</Text>
      <View style={styles.chipWrap}>
        {contributeRec && contributeRec.amount > 0 ? (
          <Pressable
            onPress={() =>
              setContributeText(formatThousands(String(contributeRec.amount)))
            }
            style={[styles.quickChip, styles.quickChipHighlight]}
          >
            <Text style={[styles.quickChipText, Typography.tabularNums]}>
              Saran {formatCompactIDR(contributeRec.amount)}
            </Text>
          </Pressable>
        ) : null}

        {QUICK_AMOUNTS.map((amt) => (
          <Pressable
            key={amt}
            onPress={() => setContributeText(formatThousands(String(amt)))}
            style={styles.quickChip}
          >
            <Text style={[styles.quickChipText, Typography.tabularNums]}>
              +{formatCompactIDR(amt)}
            </Text>
          </Pressable>
        ))}
      </View>
    </BaseBottomSheet>
  );
}

const styles = StyleSheet.create({
  goalPreviewBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 4,
    gap: 3,
  },
  goalPreviewName: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  goalPreviewMeta: {
    fontFamily: FontFamily.medium,
    fontSize: 12.5,
    color: Colors.textSecondary,
  },
  label: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 14,
    marginBottom: 8,
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
  insufficientText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.expense,
    marginTop: 6,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: '#F5F7FB',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickChipHighlight: {
    backgroundColor: '#EBF2FF',
    borderColor: Colors.primary,
  },
  quickChipText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12.5,
    color: Colors.textPrimary,
  },
  saveBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnPressed: {
    opacity: 0.88,
  },
  saveBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
