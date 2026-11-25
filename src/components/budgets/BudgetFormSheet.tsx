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
import { Trash2, X } from 'lucide-react-native';
import {
  BUDGET_CATEGORY_OPTIONS,
  type BudgetIconKey,
  type BudgetItem,
} from '@/src/lib/mockData';
import { Colors, FontFamily, Radius, TouchTarget, Typography } from '@/src/theme/tokens';

export interface BudgetFormSubmitPayload {
  id?: string;
  name: string;
  iconKey: BudgetIconKey;
  limit: number;
  alertThresholdPct: number;
}

interface BudgetFormSheetProps {
  visible: boolean;
  editingBudget?: BudgetItem | null;
  onClose: () => void;
  onSubmit: (payload: BudgetFormSubmitPayload) => void;
  onDelete?: (budget: BudgetItem) => void;
}

const THRESHOLD_OPTIONS = [70, 80, 90];

function formatThousands(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function BudgetFormSheet({
  visible,
  editingBudget,
  onClose,
  onSubmit,
  onDelete,
}: BudgetFormSheetProps) {
  const [selectedIconKey, setSelectedIconKey] = useState<BudgetIconKey>('utensils');
  const [name, setName] = useState('Makanan & Minuman');
  const [limitText, setLimitText] = useState('');
  const [thresholdPct, setThresholdPct] = useState(80);

  useEffect(() => {
    if (!visible) return;
    if (editingBudget) {
      setSelectedIconKey(editingBudget.iconKey);
      setName(editingBudget.name);
      setLimitText(formatThousands(String(editingBudget.limit)));
      setThresholdPct(editingBudget.alertThresholdPct);
      return;
    }

    setSelectedIconKey('utensils');
    setName('Makanan & Minuman');
    setLimitText('');
    setThresholdPct(80);
  }, [visible, editingBudget]);

  const handleSelectCategory = (key: BudgetIconKey, label: string) => {
    setSelectedIconKey(key);
    setName(label);
  };

  const handleSave = () => {
    const numericLimit = Number(limitText.replace(/[^0-9]/g, ''));
    if (!Number.isFinite(numericLimit) || numericLimit <= 0) {
      Alert.alert('Batas tidak valid', 'Masukkan batas anggaran lebih dari 0.');
      return;
    }

    onSubmit({
      id: editingBudget?.id,
      name: name.trim() || 'Anggaran',
      iconKey: selectedIconKey,
      limit: numericLimit,
      alertThresholdPct: thresholdPct,
    });
    onClose();
  };

  const handleDeletePress = () => {
    if (!editingBudget || !onDelete) return;
    Alert.alert(
      'Hapus Anggaran',
      `Yakin ingin menghapus anggaran "${editingBudget.name}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => {
            onDelete(editingBudget);
            onClose();
          },
        },
      ]
    );
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
              {editingBudget ? 'Edit Anggaran' : 'Tambah Anggaran'}
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
            <Text style={styles.label}>Kategori Pengeluaran</Text>
            <View style={styles.chipWrap}>
              {BUDGET_CATEGORY_OPTIONS.map((cat) => {
                const selected = selectedIconKey === cat.key;
                return (
                  <Pressable
                    key={cat.key}
                    onPress={() => handleSelectCategory(cat.key, cat.label)}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Batas Anggaran Bulanan (Rp)</Text>
            <View style={styles.amountBox}>
              <Text style={styles.rpPrefix}>Rp</Text>
              <TextInput
                style={[styles.amountInput, Typography.tabularNums]}
                placeholder="0"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={limitText}
                onChangeText={(val) => setLimitText(formatThousands(val))}
              />
            </View>

            <Text style={styles.label}>Ambang Peringatan (%)</Text>
            <View style={styles.thresholdRow}>
              {THRESHOLD_OPTIONS.map((pct) => {
                const selected = thresholdPct === pct;
                return (
                  <Pressable
                    key={pct}
                    onPress={() => setThresholdPct(pct)}
                    style={[styles.thresholdChip, selected && styles.chipSelected]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        Typography.tabularNums,
                        selected && styles.chipTextSelected,
                      ]}
                    >
                      {pct}%
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.footerRow}>
            {editingBudget && onDelete ? (
              <Pressable
                onPress={handleDeletePress}
                accessibilityRole="button"
                accessibilityLabel="Hapus anggaran"
                style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.8 }]}
              >
                <Trash2 size={18} color={Colors.expense} strokeWidth={1.9} />
              </Pressable>
            ) : null}

            <Pressable
              onPress={handleSave}
              accessibilityRole="button"
              accessibilityLabel="Simpan Anggaran"
              style={({ pressed }) => [
                styles.saveBtn,
                pressed && styles.saveBtnPressed,
              ]}
            >
              <Text style={styles.saveBtnText}>Simpan Anggaran</Text>
            </Pressable>
          </View>
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
    maxHeight: '85%',
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
  label: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 14,
    marginBottom: 8,
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
  thresholdRow: {
    flexDirection: 'row',
    gap: 10,
  },
  thresholdChip: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  deleteBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: Colors.expenseSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flex: 1,
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
