import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Check, Plus } from 'lucide-react-native';
import { BaseBottomSheet } from '@/components/ui/BaseBottomSheet';
import { useToast } from '@/components/ui/ToastProvider';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type CategoryOption,
} from '@/lib/mockData';
import { Colors, FontFamily, Radius } from '@/theme/tokens';

interface CategoryManagerSheetProps {
  visible: boolean;
  onClose: () => void;
}

const COLOR_SWATCHES = [
  { bg: '#EBF2FF', color: '#3B7AF5', label: 'Biru' },
  { bg: '#ECFDF5', color: '#10B981', label: 'Hijau' },
  { bg: '#FFFBEB', color: '#F59E0B', label: 'Amber' },
  { bg: '#FEF2F2', color: '#EF4444', label: 'Merah' },
  { bg: '#F0FDFA', color: '#0D9488', label: 'Teal' },
];

export function CategoryManagerSheet({
  visible,
  onClose,
}: CategoryManagerSheetProps) {
  const { showToast } = useToast();
  const [activeType, setActiveType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [expenseCats, setExpenseCats] = useState<CategoryOption[]>(EXPENSE_CATEGORIES);
  const [incomeCats, setIncomeCats] = useState<CategoryOption[]>(INCOME_CATEGORIES);

  const [newName, setNewName] = useState('');
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);

  const list = activeType === 'EXPENSE' ? expenseCats : incomeCats;

  const handleAddCategory = () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      showToast('Masukkan nama kategori baru', 'error');
      return;
    }

    const palette = COLOR_SWATCHES[selectedColorIdx];
    const nextCat: CategoryOption = {
      key: activeType === 'EXPENSE' ? 'shopping' : 'wallet',
      label: trimmed,
      iconBg: palette.bg,
      iconColor: palette.color,
    };

    if (activeType === 'EXPENSE') {
      setExpenseCats((prev) => [...prev, nextCat]);
    } else {
      setIncomeCats((prev) => [...prev, nextCat]);
    }
    setNewName('');
    showToast(`Kategori "${trimmed}" ditambahkan`);
  };

  return (
    <BaseBottomSheet visible={visible} title="Kelola Kategori Kustom" onClose={onClose}>
      <View style={styles.typeTabs}>
        <Pressable
          onPress={() => setActiveType('EXPENSE')}
          style={[styles.typeTab, activeType === 'EXPENSE' && styles.typeTabActive]}
        >
          <Text
            style={[
              styles.typeTabText,
              activeType === 'EXPENSE' && styles.typeTabTextActive,
            ]}
          >
            Pengeluaran ({expenseCats.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveType('INCOME')}
          style={[styles.typeTab, activeType === 'INCOME' && styles.typeTabActive]}
        >
          <Text
            style={[
              styles.typeTabText,
              activeType === 'INCOME' && styles.typeTabTextActive,
            ]}
          >
            Pemasukan ({incomeCats.length})
          </Text>
        </Pressable>
      </View>

      <View style={styles.catGrid}>
        {list.map((cat, idx) => (
          <View
            key={`${cat.label}-${idx}`}
            style={[
              styles.catChip,
              { backgroundColor: cat.iconBg, borderColor: `${cat.iconColor}33` },
            ]}
          >
            <Text style={[styles.catChipText, { color: cat.iconColor }]}>
              {cat.label}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.addCard}>
        <Text style={styles.addTitle}>Tambah Kategori Baru</Text>
        <TextInput
          style={styles.input}
          placeholder="Contoh: Skincare, Olahraga, Bonus"
          placeholderTextColor="#94A3B8"
          value={newName}
          onChangeText={setNewName}
        />

        <View style={styles.colorRow}>
          {COLOR_SWATCHES.map((sw, idx) => {
            const selected = selectedColorIdx === idx;
            return (
              <Pressable
                key={sw.label}
                onPress={() => setSelectedColorIdx(idx)}
                style={[
                  styles.swatch,
                  { backgroundColor: sw.color },
                  selected && styles.swatchSelected,
                ]}
              >
                {selected ? <Check size={14} color="#FFFFFF" strokeWidth={2.5} /> : null}
              </Pressable>
            );
          })}

          <Pressable
            onPress={handleAddCategory}
            style={({ pressed }) => [
              styles.addBtn,
              pressed && { backgroundColor: Colors.primaryDark },
            ]}
          >
            <Plus size={15} color="#FFFFFF" strokeWidth={2.4} />
            <Text style={styles.addBtnText}>Tambah</Text>
          </Pressable>
        </View>
      </View>
    </BaseBottomSheet>
  );
}

const styles = StyleSheet.create({
  typeTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.canvas,
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
  },
  typeTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 11,
    alignItems: 'center',
  },
  typeTabActive: {
    backgroundColor: Colors.surface,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  typeTabText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.textMuted,
  },
  typeTabTextActive: {
    fontFamily: FontFamily.semibold,
    color: Colors.primary,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  catChip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  catChipText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12.5,
  },
  addCard: {
    backgroundColor: Colors.canvas,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 12,
  },
  addTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
    color: Colors.textPrimary,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 13,
    height: 46,
    fontFamily: FontFamily.regular,
    fontSize: 13.5,
    color: Colors.textPrimary,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: {
    borderWidth: 2.5,
    borderColor: '#DBEAFE',
  },
  addBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 38,
  },
  addBtnText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: '#FFFFFF',
  },
});
