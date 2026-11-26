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
import { useFinance } from '@/context/FinanceContext';
import { formatIDR } from '@/lib/format';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type CategoryOption,
  type TransactionItem,
  type TransactionMode,
  type WalletItem,
} from '@/lib/mockData';
import { Colors, FontFamily, Radius, Typography } from '@/theme/tokens';

export interface QuickTransactionSubmitPayload {
  id?: string;
  mode: TransactionMode;
  amount: number;
  walletId: string;
  targetWalletId?: string;
  category: CategoryOption;
  note: string;
}

interface QuickTransactionSheetProps {
  visible: boolean;
  initialMode: TransactionMode;
  wallets: WalletItem[];
  editingTransaction?: TransactionItem | null;
  onClose: () => void;
  onSubmit: (payload: QuickTransactionSubmitPayload) => void;
}

function formatThousands(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function QuickTransactionSheet({
  visible,
  initialMode,
  wallets,
  editingTransaction,
  onClose,
  onSubmit,
}: QuickTransactionSheetProps) {
  const { showToast } = useToast();
  const { categories: managedCategories } = useFinance();
  const [mode, setMode] = useState<TransactionMode>(initialMode);
  const [amountText, setAmountText] = useState('');
  const [walletId, setWalletId] = useState(wallets[0]?.id || 'bca');
  const [targetWalletId, setTargetWalletId] = useState(wallets[1]?.id || 'gopay');
  const [categoryKey, setCategoryKey] = useState('utensils');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!visible) return;
    if (editingTransaction) {
      setMode(editingTransaction.type);
      setAmountText(formatThousands(String(editingTransaction.amount)));
      setWalletId(editingTransaction.walletId);
      setTargetWalletId(
        editingTransaction.targetWalletId ||
          wallets.find((w) => w.id !== editingTransaction.walletId)?.id ||
          wallets[0]?.id ||
          'gopay'
      );
      setCategoryKey(editingTransaction.categoryKey);
      setNote(editingTransaction.note || editingTransaction.title);
      return;
    }

    setMode(initialMode);
    setAmountText('');
    setWalletId(wallets[0]?.id || 'bca');
    setTargetWalletId(wallets[1]?.id || wallets[0]?.id || 'gopay');
    setCategoryKey(initialMode === 'INCOME' ? 'briefcase' : 'utensils');
    setNote('');
  }, [visible, initialMode, wallets, editingTransaction]);

  const categories: CategoryOption[] = React.useMemo(() => {
    const targetType = mode === 'INCOME' ? 'INCOME' : 'EXPENSE';
    const filtered = managedCategories
      .filter((c) => c.type === targetType)
      .map((c) => ({
        key: c.iconKey,
        label: c.label,
        iconBg: c.iconBg,
        iconColor: c.iconColor,
      }));
    if (filtered.length > 0) return filtered;
    return mode === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  }, [managedCategories, mode]);

  const handleModeSwitch = (nextMode: TransactionMode) => {
    setMode(nextMode);
    if (nextMode === 'INCOME') {
      setCategoryKey(INCOME_CATEGORIES[0].key);
    } else if (nextMode === 'EXPENSE') {
      setCategoryKey(EXPENSE_CATEGORIES[0].key);
    }
  };

  const handleSave = () => {
    const numericAmount = Number(amountText.replace(/[^0-9]/g, ''));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      showToast('Masukkan nominal transaksi lebih dari 0', 'error');
      return;
    }

    if (mode === 'TRANSFER' && walletId === targetWalletId) {
      showToast('Dompet tujuan harus berbeda dari dompet asal', 'error');
      return;
    }

    const selectedCat =
      categories.find((c) => c.key === categoryKey) || categories[0];

    onSubmit({
      id: editingTransaction?.id,
      mode,
      amount: numericAmount,
      walletId,
      targetWalletId: mode === 'TRANSFER' ? targetWalletId : undefined,
      category: selectedCat,
      note: note.trim(),
    });
    showToast(
      editingTransaction
        ? 'Transaksi diperbarui'
        : `Tercatat (${formatIDR(numericAmount)})`
    );
    onClose();
  };

  return (
    <BaseBottomSheet
      visible={visible}
      title={editingTransaction ? 'Edit Transaksi' : 'Catat Cepat'}
      onClose={onClose}
      footer={
        <Pressable
          onPress={handleSave}
          accessibilityRole="button"
          accessibilityLabel="Simpan Transaksi"
          style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed]}
        >
          <Text style={styles.saveBtnText}>Simpan</Text>
        </Pressable>
      }
    >
      <View style={styles.modeTabs}>
        {(
          [
            { key: 'EXPENSE', label: 'Pengeluaran' },
            { key: 'INCOME', label: 'Pemasukan' },
            { key: 'TRANSFER', label: 'Transfer' },
          ] as { key: TransactionMode; label: string }[]
        ).map((item) => {
          const active = mode === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => handleModeSwitch(item.key)}
              style={[styles.modeTab, active && styles.modeTabActive]}
            >
              <Text style={[styles.modeTabText, active && styles.modeTabTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Nominal (Rp)</Text>
      <View style={styles.amountBox}>
        <Text style={styles.rpPrefix}>Rp</Text>
        <TextInput
          style={[styles.amountInput, Typography.tabularNums]}
          placeholder="0"
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
          value={amountText}
          onChangeText={(val) => setAmountText(formatThousands(val))}
        />
      </View>

      <Text style={styles.label}>
        {mode === 'TRANSFER' ? 'Dari Dompet' : 'Pilih Dompet'}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chipRow}>
          {wallets.map((w) => {
            const selected = w.id === walletId;
            return (
              <Pressable
                key={w.id}
                onPress={() => setWalletId(w.id)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {w.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {mode === 'TRANSFER' ? (
        <>
          <Text style={styles.label}>Ke Dompet</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {wallets.map((w) => {
                const selected = w.id === targetWalletId;
                return (
                  <Pressable
                    key={w.id}
                    onPress={() => setTargetWalletId(w.id)}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {w.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </>
      ) : (
        <>
          <Text style={styles.label}>Kategori</Text>
          <View style={styles.catWrap}>
            {categories.map((cat) => {
              const selected = cat.key === categoryKey;
              return (
                <Pressable
                  key={cat.key}
                  onPress={() => setCategoryKey(cat.key)}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      <Text style={styles.label}>Catatan</Text>
      <TextInput
        style={styles.noteInput}
        placeholder={
          mode === 'TRANSFER'
            ? 'Contoh: Topup saldo GoPay'
            : 'Contoh: Makan siang atau bonus proyek'
        }
        placeholderTextColor="#94A3B8"
        value={note}
        onChangeText={setNote}
      />
    </BaseBottomSheet>
  );
}

const styles = StyleSheet.create({
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.canvas,
    borderRadius: 14,
    padding: 4,
    marginBottom: 8,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 11,
    alignItems: 'center',
  },
  modeTabActive: {
    backgroundColor: Colors.surface,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  modeTabText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.textMuted,
  },
  modeTabTextActive: {
    fontFamily: FontFamily.semibold,
    color: Colors.primary,
  },
  label: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 12,
    marginBottom: 8,
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
    fontSize: 18,
    color: Colors.textMuted,
  },
  amountInput: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: 20,
    color: Colors.textPrimary,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  catWrap: {
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
  noteInput: {
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
