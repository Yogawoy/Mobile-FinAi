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
import { BUDGET_CATEGORIES } from '@/constants/categories';
import { FinColors, FinRadius } from '@/constants/theme';
import { extractErrorMessage } from '@/lib/api-client';
import { parseDecimal } from '@/lib/format';
import { budgetService } from '@/services/budget.service';
import type { Budget } from '@/types/api';

interface BudgetModalProps {
  visible: boolean;
  month: number;
  year: number;
  initialBudget?: Budget | null;
  onClose: () => void;
  onSaved: () => void;
}

export function BudgetModal({
  visible,
  month,
  year,
  initialBudget,
  onClose,
  onSaved,
}: BudgetModalProps) {
  const isEditing = Boolean(initialBudget);
  const [category, setCategory] = useState('food');
  const [limitAmount, setLimitAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (initialBudget) {
      setCategory(initialBudget.category);
      setLimitAmount(String(Math.round(parseDecimal(initialBudget.limitAmount))));
    } else {
      setCategory('food');
      setLimitAmount('');
    }
  }, [visible, initialBudget]);

  const handleSubmit = async () => {
    const numericLimit = Number(limitAmount.replace(/[^0-9]/g, ''));
    if (!Number.isFinite(numericLimit) || numericLimit <= 0) {
      Alert.alert('Batas anggaran tidak valid', 'Masukkan nominal lebih dari 0.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && initialBudget) {
        await budgetService.updateBudget(initialBudget.id, {
          category,
          limitAmount: numericLimit,
        });
      } else {
        await budgetService.createBudget({
          category,
          limitAmount: numericLimit,
          month,
          year,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      Alert.alert('Gagal menyimpan anggaran', extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {isEditing ? 'Ubah Pos Anggaran' : 'Buat Pos Anggaran'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={FinColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Batas Anggaran (Rp)</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: 2000000"
              placeholderTextColor={FinColors.textMuted}
              keyboardType="numeric"
              value={limitAmount}
              onChangeText={setLimitAmount}
            />

            <Text style={styles.label}>Kategori</Text>
            <View style={styles.categoryWrap}>
              {BUDGET_CATEGORIES.map((cat) => {
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
                        styles.catText,
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
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>Simpan Anggaran</Text>
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
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: 12,
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
  catText: {
    fontSize: 12,
    color: FinColors.textSecondary,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: FinColors.periwinkle,
    borderRadius: FinRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
