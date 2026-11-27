import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BaseBottomSheet } from '@/components/ui/BaseBottomSheet';
import { useToast } from '@/components/ui/ToastProvider';
import { formatIDR } from '@/lib/format';
import { calculateGoalRecommendation, formatCompactIDR } from '@/lib/goalCalculator';
import {
  type GoalFrequency,
  type GoalIconKey,
  type GoalItem,
  type WalletItem,
} from '@/lib/mockData';
import { Colors, FontFamily, Radius, Typography } from '@/theme/tokens';

export interface GoalCreatePayload {
  name: string;
  target: number;
  deadline: string;
  iconKey: GoalIconKey;
  walletId: string;
  walletName: string;
  frequency: GoalFrequency;
}

export interface GoalContributePayload {
  goalId: string;
  amount: number;
  sourceWalletId: string;
  targetWalletId: string;
}

interface GoalFormSheetProps {
  visible: boolean;
  wallets: WalletItem[];
  contributingGoal?: GoalItem | null;
  onClose: () => void;
  onCreateGoal: (payload: GoalCreatePayload) => void;
  onContribute: (payload: GoalContributePayload) => void;
}

const GOAL_ICONS: { key: GoalIconKey; label: string }[] = [
  { key: 'shield', label: 'Dana Darurat' },
  { key: 'laptop', label: 'Gadget' },
  { key: 'graduation', label: 'Pendidikan' },
  { key: 'target', label: 'Lainnya' },
];

const FREQUENCY_OPTIONS: { key: GoalFrequency; label: string }[] = [
  { key: 'DAILY', label: 'Harian' },
  { key: 'WEEKLY', label: 'Mingguan' },
  { key: 'MONTHLY', label: 'Bulanan' },
];

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
  onCreateGoal,
  onContribute,
}: GoalFormSheetProps) {
  const { showToast } = useToast();

  const defaultStorageWallet =
    wallets.find((w) => w.id === 'mandiri')?.id || wallets[0]?.id || 'bca';
  const defaultSourceWallet =
    wallets.find((w) => w.id === 'bca')?.id || wallets[0]?.id || 'bca';

  const [name, setName] = useState('');
  const [targetText, setTargetText] = useState('');
  const [deadline, setDeadline] = useState('Des 2027');
  const [iconKey, setIconKey] = useState<GoalIconKey>('target');
  const [frequency, setFrequency] = useState<GoalFrequency>('MONTHLY');
  const [storageWalletId, setStorageWalletId] = useState(defaultStorageWallet);

  const [contributeText, setContributeText] = useState('');
  const [sourceWalletId, setSourceWalletId] = useState(defaultSourceWallet);

  const isContributeMode = Boolean(contributingGoal);
  const goalWalletId = contributingGoal?.walletId || defaultStorageWallet;
  const goalWalletName =
    contributingGoal?.walletName ||
    wallets.find((w) => w.id === goalWalletId)?.name ||
    'Dompet Tujuan';

  const contributeRec = contributingGoal
    ? calculateGoalRecommendation(
        contributingGoal.current,
        contributingGoal.target,
        contributingGoal.deadline,
        contributingGoal.frequency
      )
    : null;

  const createTargetNum = Number(targetText.replace(/[^0-9]/g, '')) || 0;
  const createRec = calculateGoalRecommendation(0, createTargetNum, deadline, frequency);

  useEffect(() => {
    if (!visible) return;
    if (contributingGoal) {
      const rec = calculateGoalRecommendation(
        contributingGoal.current,
        contributingGoal.target,
        contributingGoal.deadline,
        contributingGoal.frequency
      );
      setContributeText(
        rec.amount > 0 ? formatThousands(String(rec.amount)) : '250.000'
      );
      const otherWallets = wallets.filter((w) => w.id !== goalWalletId);
      setSourceWalletId(otherWallets[0]?.id || goalWalletId);
      return;
    }
    setName('');
    setTargetText('');
    setDeadline('Des 2027');
    setIconKey('target');
    setFrequency('MONTHLY');
    setStorageWalletId(defaultStorageWallet);
  }, [visible, contributingGoal, wallets, defaultStorageWallet, goalWalletId]);

  const isSameWalletEarmark = sourceWalletId === goalWalletId;

  const handleSave = () => {
    if (isContributeMode && contributingGoal) {
      const remaining = Math.max(0, contributingGoal.target - contributingGoal.current);
      if (remaining <= 0) {
        showToast('Target tabungan ini sudah tercapai 100%', 'error');
        return;
      }

      const amount = Number(contributeText.replace(/[^0-9]/g, ''));
      if (!Number.isFinite(amount) || amount <= 0) {
        showToast('Masukkan nominal tabungan lebih dari 0', 'error');
        return;
      }

      if (amount > remaining) {
        setContributeText(formatThousands(String(remaining)));
        showToast(
          `Maksimal setoran sesuai sisa target (${formatIDR(remaining)})`,
          'error'
        );
        return;
      }

      const sourceWallet = wallets.find((w) => w.id === sourceWalletId);
      if (sourceWallet && sourceWallet.balance < amount) {
        showToast(
          `Saldo ${sourceWallet.name} tidak cukup (${formatIDR(sourceWallet.balance)})`,
          'error'
        );
        return;
      }

      const nextTotal = contributingGoal.current + amount;
      onContribute({
        goalId: contributingGoal.id,
        amount,
        sourceWalletId,
        targetWalletId: goalWalletId,
      });

      if (nextTotal >= contributingGoal.target) {
        showToast(`Selamat! Target "${contributingGoal.name}" Tercapai 100%`);
      } else {
        showToast(`Berhasil menabung ${formatIDR(amount)}`);
      }
      onClose();
      return;
    }

    const trimmed = name.trim();
    const target = Number(targetText.replace(/[^0-9]/g, ''));
    if (!trimmed) {
      showToast('Masukkan nama target tabungan', 'error');
      return;
    }
    if (!Number.isFinite(target) || target <= 0) {
      showToast('Masukkan nominal target lebih dari 0', 'error');
      return;
    }

    const chosenWallet = wallets.find((w) => w.id === storageWalletId);

    onCreateGoal({
      name: trimmed,
      target,
      deadline: deadline.trim() || 'Des 2027',
      iconKey,
      walletId: storageWalletId,
      walletName: chosenWallet?.name || 'Tabungan',
      frequency,
    });
    showToast(`Target "${trimmed}" dibuat`);
    onClose();
  };

  return (
    <BaseBottomSheet
      visible={visible}
      title={isContributeMode ? 'Tambah Tabungan' : 'Target Tabungan Baru'}
      onClose={onClose}
      footer={
        <Pressable
          onPress={handleSave}
          accessibilityRole="button"
          accessibilityLabel={isContributeMode ? 'Simpan Tabungan' : 'Buat Target'}
          style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed]}
        >
          <Text style={styles.saveBtnText}>
            {isContributeMode ? 'Simpan Tabungan' : 'Simpan Target'}
          </Text>
        </Pressable>
      }
    >
      {isContributeMode && contributingGoal ? (
        <>
          <View style={styles.goalPreviewBox}>
            <Text style={styles.goalPreviewName}>{contributingGoal.name}</Text>
            <Text style={[styles.goalPreviewMeta, Typography.tabularNums]}>
              Terkumpul {formatIDR(contributingGoal.current)} /{' '}
              {formatIDR(contributingGoal.target)}
            </Text>
            <Text style={styles.goalPreviewWallet}>
              Disimpan permanen di: {goalWalletName}
            </Text>
          </View>

          <Text style={styles.label}>Ambil dari Dompet</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.walletChipRow}>
              {wallets.map((w) => {
                const selected = w.id === sourceWalletId;
                const isTarget = w.id === goalWalletId;
                return (
                  <Pressable
                    key={w.id}
                    onPress={() => setSourceWalletId(w.id)}
                    style={[styles.walletChip, selected && styles.chipSelected]}
                  >
                    <Text
                      style={[styles.chipText, selected && styles.chipTextSelected]}
                    >
                      {w.shortName || w.name}
                      {isTarget ? ' (Earmark)' : ''}
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

          <Text style={styles.helperText}>
            {isSameWalletEarmark
              ? `Mode Earmark: Dana sudah berada di ${goalWalletName}, saldo dompet tidak berubah.`
              : `Dana akan ditransfer dari dompet pilihan ke ${goalWalletName}.`}
          </Text>

          <Text style={styles.label}>Nominal Kontribusi (Rp)</Text>
          <View style={styles.amountBox}>
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
        </>
      ) : (
        <>
          <Text style={styles.label}>Nama Target</Text>
          <TextInput
            style={styles.input}
            placeholder="Contoh: Dana Darurat, Beli Motor"
            placeholderTextColor="#94A3B8"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Simpan di Dompet (Permanen)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.walletChipRow}>
              {wallets.map((w) => {
                const selected = w.id === storageWalletId;
                return (
                  <Pressable
                    key={w.id}
                    onPress={() => setStorageWalletId(w.id)}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <Text
                      style={[styles.chipText, selected && styles.chipTextSelected]}
                    >
                      {w.shortName || w.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <Text style={styles.label}>Kategori Ikon</Text>
          <View style={styles.chipWrap}>
            {GOAL_ICONS.map((opt) => {
              const selected = iconKey === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setIconKey(opt.key)}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Nominal Target (Rp)</Text>
          <View style={styles.amountBox}>
            <Text style={styles.rpPrefix}>Rp</Text>
            <TextInput
              style={[styles.amountInput, Typography.tabularNums]}
              placeholder="0"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={targetText}
              onChangeText={(val) => setTargetText(formatThousands(val))}
            />
          </View>

          <Text style={styles.label}>Frekuensi & Tenggat Waktu</Text>
          <View style={styles.freqRow}>
            {FREQUENCY_OPTIONS.map((f) => {
              const selected = frequency === f.key;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => setFrequency(f.key)}
                  style={[styles.freqChip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            placeholder="Tenggat, contoh: Des 2027"
            placeholderTextColor="#94A3B8"
            value={deadline}
            onChangeText={setDeadline}
          />

          {createTargetNum > 0 ? (
            <View style={styles.recBanner}>
              <Text style={[styles.recBannerText, Typography.tabularNums]}>
                {createRec.compactLabel} untuk mencapai target tepat waktu
              </Text>
            </View>
          ) : null}
        </>
      )}
    </BaseBottomSheet>
  );
}

const styles = StyleSheet.create({
  goalPreviewBox: {
    backgroundColor: Colors.primarySoft,
    borderRadius: 16,
    padding: 14,
    marginTop: 4,
  },
  goalPreviewName: {
    fontFamily: FontFamily.bold,
    fontSize: 15.5,
    color: Colors.primaryDark,
  },
  goalPreviewMeta: {
    fontFamily: FontFamily.medium,
    fontSize: 12.5,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  goalPreviewWallet: {
    fontFamily: FontFamily.semibold,
    fontSize: 12,
    color: Colors.primary,
    marginTop: 4,
  },
  label: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 14,
    marginBottom: 8,
  },
  helperText: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
    color: Colors.textMuted,
    marginTop: 6,
  },
  input: {
    backgroundColor: Colors.canvas,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    height: 48,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  walletChipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  walletChip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  walletChipBal: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  walletChipBalSelected: {
    color: Colors.primary,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.full,
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipSelected: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
  },
  chipText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  chipTextSelected: {
    fontFamily: FontFamily.semibold,
    color: Colors.primaryDark,
  },
  freqRow: {
    flexDirection: 'row',
    gap: 8,
  },
  freqChip: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recBanner: {
    marginTop: 10,
    backgroundColor: Colors.primarySoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  recBannerText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12,
    color: Colors.primaryDark,
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  quickChipHighlight: {
    backgroundColor: '#DBEAFE',
    borderColor: Colors.primary,
  },
  quickChipText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12.5,
    color: Colors.primaryDark,
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.canvas,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    height: 52,
    gap: 8,
  },
  rpPrefix: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
    color: Colors.textMuted,
  },
  amountInput: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: 19,
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
    backgroundColor: Colors.primaryDark,
  },
  saveBtnText: {
    fontFamily: FontFamily.semibold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
