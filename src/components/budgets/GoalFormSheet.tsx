import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import { formatIDR } from '@/src/lib/format';
import { type GoalIconKey, type GoalItem, type WalletItem } from '@/src/lib/mockData';
import { Colors, FontFamily, Radius, TouchTarget, Typography } from '@/src/theme/tokens';

export interface GoalCreatePayload {
  name: string;
  target: number;
  deadline: string;
  iconKey: GoalIconKey;
  walletId: string;
  walletName: string;
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

const QUICK_AMOUNTS = [100_000, 250_000, 500_000, 1_000_000];

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
  const defaultStorageWallet =
    wallets.find((w) => w.id === 'mandiri')?.id || wallets[0]?.id || 'bca';
  const defaultSourceWallet =
    wallets.find((w) => w.id === 'bca')?.id || wallets[0]?.id || 'bca';

  const [name, setName] = useState('');
  const [targetText, setTargetText] = useState('');
  const [deadline, setDeadline] = useState('Des 2027');
  const [iconKey, setIconKey] = useState<GoalIconKey>('target');
  const [storageWalletId, setStorageWalletId] = useState(defaultStorageWallet);

  const [contributeText, setContributeText] = useState('');
  const [sourceWalletId, setSourceWalletId] = useState(defaultSourceWallet);
  const [targetWalletId, setTargetWalletId] = useState(defaultStorageWallet);

  useEffect(() => {
    if (!visible) return;
    if (contributingGoal) {
      setContributeText('250.000');
      const goalWallet = contributingGoal.walletId || defaultStorageWallet;
      setTargetWalletId(goalWallet);
      const otherWallets = wallets.filter((w) => w.id !== goalWallet);
      setSourceWalletId(otherWallets[0]?.id || defaultSourceWallet);
      return;
    }
    setName('');
    setTargetText('');
    setDeadline('Des 2027');
    setIconKey('target');
    setStorageWalletId(defaultStorageWallet);
  }, [visible, contributingGoal, wallets, defaultStorageWallet, defaultSourceWallet]);

  const isContributeMode = Boolean(contributingGoal);
  const goalWalletId = contributingGoal?.walletId || defaultStorageWallet;
  const goalWalletName =
    contributingGoal?.walletName ||
    wallets.find((w) => w.id === goalWalletId)?.name ||
    'Dompet Tujuan';
  const availableSourceWallets = wallets.filter((w) => w.id !== goalWalletId);
  const sourceWalletList =
    availableSourceWallets.length > 0 ? availableSourceWallets : wallets;

  const handleSave = () => {
    if (isContributeMode && contributingGoal) {
      const amount = Number(contributeText.replace(/[^0-9]/g, ''));
      if (!Number.isFinite(amount) || amount <= 0) {
        Alert.alert('Nominal tidak valid', 'Masukkan nominal tabungan lebih dari 0.');
        return;
      }

      const sourceWallet = wallets.find((w) => w.id === sourceWalletId);
      if (sourceWallet && sourceWallet.balance < amount) {
        Alert.alert(
          'Saldo tidak cukup',
          `Saldo ${sourceWallet.name} saat ini ${formatIDR(sourceWallet.balance)}.`
        );
        return;
      }

      onContribute({
        goalId: contributingGoal.id,
        amount,
        sourceWalletId,
        targetWalletId,
      });
      onClose();
      return;
    }

    const trimmed = name.trim();
    const target = Number(targetText.replace(/[^0-9]/g, ''));
    if (!trimmed) {
      Alert.alert('Nama target kosong', 'Masukkan nama target tabungan.');
      return;
    }
    if (!Number.isFinite(target) || target <= 0) {
      Alert.alert('Target tidak valid', 'Masukkan nominal target lebih dari 0.');
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
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.dismissArea} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.dragHandle} />

          <View style={styles.headerRow}>
            <Text style={styles.sheetTitle}>
              {isContributeMode ? 'Tambah Tabungan' : 'Target Tabungan Baru'}
            </Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Tutup"
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
            >
              <X size={20} color={Colors.textMuted} strokeWidth={1.9} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.formBody}
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
                    {sourceWalletList.map((w) => {
                      const selected = w.id === sourceWalletId;
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
                  {QUICK_AMOUNTS.map((amt) => (
                    <Pressable
                      key={amt}
                      onPress={() => setContributeText(formatThousands(String(amt)))}
                      style={styles.quickChip}
                    >
                      <Text style={[styles.quickChipText, Typography.tabularNums]}>
                        +{formatIDR(amt)}
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

                <Text style={styles.label}>Tenggat Waktu</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: Des 2027"
                  placeholderTextColor="#94A3B8"
                  value={deadline}
                  onChangeText={setDeadline}
                />
              </>
            )}
          </ScrollView>

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
        </View>
      </KeyboardAvoidingView>
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
    paddingBottom: 24,
    maxHeight: '88%',
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
    marginBottom: 8,
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
  formBody: {
    paddingBottom: 14,
  },
  goalPreviewBox: {
    backgroundColor: Colors.primarySoft,
    borderRadius: 16,
    padding: 14,
    marginTop: 6,
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
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: '#BFDBFE',
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
    marginTop: 10,
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
