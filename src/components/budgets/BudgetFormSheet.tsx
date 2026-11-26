import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { BaseBottomSheet } from '@/components/ui/BaseBottomSheet';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/ToastProvider';
import {
  BUDGET_CATEGORY_OPTIONS,
  type BudgetIconKey,
  type BudgetItem,
} from '@/lib/mockData';
import { Colors, FontFamily, Radius, Typography } from '@/theme/tokens';

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
  const { showToast } = useToast();
  const [selectedIconKey, setSelectedIconKey] = useState<BudgetIconKey>('utensils');
  const [name, setName] = useState('Makanan & Minuman');
  const [limitText, setLimitText] = useState('');
  const [thresholdPct, setThresholdPct] = useState(80);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

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
      showToast('Masukkan batas anggaran lebih dari 0', 'error');
      return;
    }

    onSubmit({
      id: editingBudget?.id,
      name: name.trim() || 'Anggaran',
      iconKey: selectedIconKey,
      limit: numericLimit,
      alertThresholdPct: thresholdPct,
    });
    showToast(
      editingBudget ? 'Anggaran diperbarui' : 'Anggaran baru ditambahkan'
    );
    onClose();
  };

  return (
    <>
      <BaseBottomSheet
        visible={visible}
        title={editingBudget ? 'Edit Anggaran' : 'Tambah Anggaran'}
        onClose={onClose}
        footer={
          <View style={styles.footerRow}>
            {editingBudget && onDelete ? (
              <Pressable
                onPress={() => setConfirmDeleteOpen(true)}
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
        }
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
      </BaseBottomSheet>

      {editingBudget && onDelete ? (
        <ConfirmDialog
          visible={confirmDeleteOpen}
          title="Hapus Anggaran?"
          message={`Anggaran "${editingBudget.name}" akan dihapus dari daftar.`}
          confirmLabel="Hapus"
          variant="danger"
          icon="trash"
          onCancel={() => setConfirmDeleteOpen(false)}
          onConfirm={() => {
            setConfirmDeleteOpen(false);
            onDelete(editingBudget);
            showToast('Anggaran dihapus');
            onClose();
          }}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 12,
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
