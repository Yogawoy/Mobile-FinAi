import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useToast } from '@/components/ui/ToastProvider';
import { GOAL_CATEGORIES } from '@/constants/categories';
import { FinColors, FinRadius } from '@/constants/theme';
import { extractErrorMessage } from '@/lib/api-client';
import { formatIDR } from '@/lib/format';
import { goalService } from '@/services/goal.service';
import type { Goal, Wallet } from '@/types/api';

interface CreateGoalModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function CreateGoalModal({ visible, onClose, onSaved }: CreateGoalModalProps) {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('emergency');
  const [targetAmount, setTargetAmount] = useState('');
  const [monthsAhead, setMonthsAhead] = useState('12');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setName('');
    setCategory('emergency');
    setTargetAmount('');
    setMonthsAhead('12');
    setFormError(null);
  }, [visible]);

  const handleSubmit = async () => {
    setFormError(null);
    const amountNum = Number(targetAmount.replace(/[^0-9]/g, ''));
    const monthsNum = Math.max(1, Number(monthsAhead.replace(/[^0-9]/g, '')) || 12);
    if (name.trim().length < 2) {
      setFormError('Nama target minimal 2 karakter.');
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setFormError('Target nominal harus lebih dari 0.');
      return;
    }

    const deadlineDate = new Date();
    deadlineDate.setMonth(deadlineDate.getMonth() + monthsNum);

    setSubmitting(true);
    try {
      await goalService.createGoal({
        name: name.trim(),
        category,
        targetAmount: amountNum,
        deadline: deadlineDate.toISOString(),
        frequency: 'MONTHLY',
      });
      showToast('Target tabungan dibuat');
      onSaved();
      onClose();
    } catch (err) {
      setFormError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Buat Target Impian</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={FinColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Nama Target</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Dana Darurat"
              placeholderTextColor={FinColors.textMuted}
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Target Nominal (Rp)</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: 15000000"
              placeholderTextColor={FinColors.textMuted}
              keyboardType="numeric"
              value={targetAmount}
              onChangeText={setTargetAmount}
            />

            <Text style={styles.label}>Jangka Waktu (Bulan dari sekarang)</Text>
            <TextInput
              style={styles.input}
              placeholder="12"
              placeholderTextColor={FinColors.textMuted}
              keyboardType="numeric"
              value={monthsAhead}
              onChangeText={setMonthsAhead}
            />

            <Text style={styles.label}>Kategori</Text>
            <View style={styles.wrap}>
              {GOAL_CATEGORIES.map((cat) => {
                const selected = cat.id === category;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setCategory(cat.id)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {cat.shortLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {formError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{formError}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>Buat Target</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

interface ContributionModalProps {
  visible: boolean;
  goal: Goal | null;
  wallets: Wallet[];
  onClose: () => void;
  onSaved: () => void;
}

export function ContributionModal({
  visible,
  goal,
  wallets,
  onClose,
  onSaved,
}: ContributionModalProps) {
  const [walletId, setWalletId] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setWalletId(goal?.sourceWalletId || wallets[0]?.id || '');
    setAmount('');
  }, [visible, goal, wallets]);

  const { showToast } = useToast();
  const handleSubmit = async () => {
    if (!goal) return;
    const numericAmount = Number(amount.replace(/[^0-9]/g, ''));
    if (!walletId) {
      showToast('Dompet sumber wajib dipilih');
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      showToast('Masukkan nominal setoran lebih dari 0');
      return;
    }

    setSubmitting(true);
    try {
      await goalService.addContribution(goal.id, {
        sourceWalletId: walletId,
        amount: numericAmount,
        contributionDate: new Date().toISOString(),
      });
      showToast('Setoran tabungan dicatat');
      onSaved();
      onClose();
    } catch (err) {
      showToast(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Nabung ke {goal?.name}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={FinColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {goal ? (
              <Text style={styles.subInfo}>
                Sisa target: {formatIDR(goal.remainingAmount ?? 0)}
              </Text>
            ) : null}

            <Text style={styles.label}>Ambil dari Dompet</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {wallets.map((w) => {
                const selected = w.id === walletId;
                return (
                  <TouchableOpacity
                    key={w.id}
                    style={[styles.chip, selected && styles.chipSelected, { marginRight: 8 }]}
                    onPress={() => setWalletId(w.id)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {w.name} ({formatIDR(w.balance)})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.label}>Nominal Setoran (Rp)</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: 500000"
              placeholderTextColor={FinColors.textMuted}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
          </ScrollView>

          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>Catat Setoran</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  errorBanner: {
    marginTop: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  errorBannerText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#DC2626',
  },
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
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: FinColors.textPrimary,
    flex: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: FinRadius.full,
    backgroundColor: FinColors.canvas,
  },
  subInfo: {
    fontSize: 13,
    color: FinColors.textSecondary,
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: FinColors.textSecondary,
    marginBottom: 6,
    marginTop: 12,
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
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: FinRadius.full,
    backgroundColor: FinColors.canvas,
    borderWidth: 1,
    borderColor: FinColors.borderSubtle,
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
  submitBtn: {
    backgroundColor: FinColors.periwinkle,
    borderRadius: FinRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
