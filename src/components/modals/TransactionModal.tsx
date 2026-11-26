import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants/categories';
import { FinColors, FinRadius } from '@/constants/theme';
import { extractErrorMessage } from '@/lib/api-client';
import { parseDecimal } from '@/lib/format';
import { transactionService } from '@/services/transaction.service';
import type { Transaction, TransactionType, Wallet } from '@/types/api';

interface TransactionModalProps {
  visible: boolean;
  wallets: Wallet[];
  initialTransaction?: Transaction | null;
  defaultWalletId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export function TransactionModal({
  visible,
  wallets,
  initialTransaction,
  defaultWalletId,
  onClose,
  onSaved,
}: TransactionModalProps) {
  const isEditing = Boolean(initialTransaction);
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [walletId, setWalletId] = useState('');
  const [category, setCategory] = useState('food');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (initialTransaction) {
      setType(initialTransaction.type);
      setWalletId(initialTransaction.walletId);
      setCategory(initialTransaction.category);
      setAmount(String(Math.round(parseDecimal(initialTransaction.amount))));
      setDescription(initialTransaction.description);
    } else {
      setType('EXPENSE');
      setWalletId(defaultWalletId || wallets[0]?.id || '');
      setCategory('food');
      setAmount('');
      setDescription('');
    }
  }, [visible, initialTransaction, defaultWalletId, wallets]);

  const categories = type === 'EXPENSE' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType);
    const list = nextType === 'EXPENSE' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    if (!list.some((c) => c.id === category)) {
      setCategory(list[0]?.id || 'other');
    }
  };

  const handleSubmit = async () => {
    const numericAmount = Number(amount.replace(/[^0-9]/g, ''));
    if (!walletId) {
      Alert.alert('Dompet wajib dipilih', 'Buat atau pilih dompet terlebih dahulu.');
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      Alert.alert('Nominal tidak valid', 'Masukkan nominal lebih dari 0.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Deskripsi kosong', 'Isi keterangan transaksi.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && initialTransaction) {
        await transactionService.updateTransaction(initialTransaction.id, {
          walletId,
          type,
          amount: numericAmount,
          category,
          description: description.trim(),
        });
      } else {
        await transactionService.createTransaction({
          walletId,
          type,
          amount: numericAmount,
          category,
          description: description.trim(),
          transactionDate: new Date().toISOString(),
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      Alert.alert('Gagal menyimpan', extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{isEditing ? 'Ubah Transaksi' : 'Catat Transaksi'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={FinColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            <View style={styles.typeSwitch}>
              <TouchableOpacity
                style={[styles.typeBtn, type === 'EXPENSE' && styles.typeBtnExpense]}
                onPress={() => handleTypeChange('EXPENSE')}
              >
                <Text
                  style={[styles.typeBtnText, type === 'EXPENSE' && styles.typeBtnExpenseText]}
                >
                  Pengeluaran
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, type === 'INCOME' && styles.typeBtnIncome]}
                onPress={() => handleTypeChange('INCOME')}
              >
                <Text style={[styles.typeBtnText, type === 'INCOME' && styles.typeBtnIncomeText]}>
                  Pemasukan
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Nominal (Rp)</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: 45000"
              placeholderTextColor={FinColors.textMuted}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />

            <Text style={styles.label}>Deskripsi</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Makan siang"
              placeholderTextColor={FinColors.textMuted}
              value={description}
              onChangeText={setDescription}
            />

            <Text style={styles.label}>Dompet</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {wallets.map((w) => {
                const selected = w.id === walletId;
                return (
                  <TouchableOpacity
                    key={w.id}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setWalletId(w.id)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {w.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.label}>Kategori</Text>
            <View style={styles.categoryWrap}>
              {categories.map((cat) => {
                const selected = cat.id === category;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.catChip,
                      selected && { backgroundColor: cat.badgeBg, borderColor: cat.color },
                    ]}
                    onPress={() => setCategory(cat.id)}
                  >
                    <View style={[styles.dot, { backgroundColor: cat.color }]} />
                    <Text
                      style={[
                        styles.catChipText,
                        selected && { color: cat.badgeText, fontWeight: '700' },
                      ]}
                    >
                      {cat.shortLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>
                {isEditing ? 'Simpan Perubahan' : 'Simpan Transaksi'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(36, 38, 54, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: FinColors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: FinColors.textPrimary,
  },
  closeBtn: {
    padding: 6,
    borderRadius: FinRadius.full,
    backgroundColor: FinColors.canvas,
  },
  body: {
    paddingBottom: 16,
  },
  typeSwitch: {
    flexDirection: 'row',
    backgroundColor: FinColors.canvas,
    borderRadius: FinRadius.md,
    padding: 4,
    marginBottom: 14,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  typeBtnExpense: {
    backgroundColor: FinColors.peach,
  },
  typeBtnIncome: {
    backgroundColor: FinColors.mint,
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: FinColors.textSecondary,
  },
  typeBtnExpenseText: {
    color: FinColors.peachText,
    fontWeight: '700',
  },
  typeBtnIncomeText: {
    color: FinColors.mintText,
    fontWeight: '700',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: FinColors.textSecondary,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: FinColors.canvas,
    borderRadius: FinRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: FinColors.textPrimary,
    borderWidth: 1,
    borderColor: FinColors.borderSubtle,
  },
  chipRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: FinRadius.full,
    backgroundColor: FinColors.canvas,
    borderWidth: 1,
    borderColor: FinColors.borderSubtle,
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: FinColors.lavender,
    borderColor: FinColors.periwinkle,
  },
  chipText: {
    fontSize: 13,
    color: FinColors.textSecondary,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: FinColors.periwinkleDark,
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: FinRadius.full,
    backgroundColor: FinColors.canvas,
    borderWidth: 1,
    borderColor: FinColors.borderSubtle,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  catChipText: {
    fontSize: 12,
    color: FinColors.textSecondary,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: FinColors.periwinkle,
    borderRadius: FinRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  submitDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
