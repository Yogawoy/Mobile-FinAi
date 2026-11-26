import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowLeft,
  Briefcase,
  Car,
  Check,
  Coffee,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
  Utensils,
  Wallet,
  Zap,
} from 'lucide-react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BaseBottomSheet } from '@/components/ui/BaseBottomSheet';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/ToastProvider';
import { useFinance, type ManagedCategory } from '@/context/FinanceContext';
import { type CategoryIconKey } from '@/lib/mockData';
import { categoryService } from '@/services/category.service';
import { Colors, FontFamily, Radius, TouchTarget, Typography } from '@/theme/tokens';

type CategoryType = 'EXPENSE' | 'INCOME';

const COLOR_SWATCHES = [
  { bg: '#EBF2FF', color: '#3B7AF5', label: 'Biru' },
  { bg: '#ECFDF5', color: '#10B981', label: 'Hijau' },
  { bg: '#FFFBEB', color: '#F59E0B', label: 'Amber' },
  { bg: '#FEF2F2', color: '#EF4444', label: 'Merah' },
  { bg: '#F0FDFA', color: '#0D9488', label: 'Teal' },
];

const ICON_OPTIONS: CategoryIconKey[] = [
  'utensils',
  'car',
  'shopping',
  'zap',
  'coffee',
  'briefcase',
  'wallet',
];

function renderCatIcon(key: CategoryIconKey, color: string) {
  switch (key) {
    case 'utensils':
      return <Utensils size={18} color={color} strokeWidth={1.9} />;
    case 'car':
      return <Car size={18} color={color} strokeWidth={1.9} />;
    case 'shopping':
      return <ShoppingBag size={18} color={color} strokeWidth={1.9} />;
    case 'zap':
      return <Zap size={18} color={color} strokeWidth={1.9} />;
    case 'coffee':
      return <Coffee size={18} color={color} strokeWidth={1.9} />;
    case 'briefcase':
      return <Briefcase size={18} color={color} strokeWidth={1.9} />;
    case 'wallet':
      return <Wallet size={18} color={color} strokeWidth={1.9} />;
  }
}

export default function CategoriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { categories, setCategories, transactions, refreshAllData } = useFinance();

  const [activeType, setActiveType] = useState<CategoryType>('EXPENSE');

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<ManagedCategory | null>(null);
  const [deletingCat, setDeletingCat] = useState<ManagedCategory | null>(null);

  // Form state
  const [label, setLabel] = useState('');
  const [formType, setFormType] = useState<CategoryType>('EXPENSE');
  const [colorIdx, setColorIdx] = useState(0);
  const [iconKey, setIconKey] = useState<CategoryIconKey>('shopping');

  const categoriesWithCount = useMemo(
    () =>
      categories.map((c) => ({
        ...c,
        txCount: transactions.filter(
          (t) =>
            t.categoryLabel.toLowerCase() === c.label.toLowerCase() ||
            (t.categoryKey === c.iconKey && t.type === c.type)
        ).length,
      })),
    [categories, transactions]
  );

  const { customList, defaultList } = useMemo(() => {
    const filtered = categoriesWithCount.filter((c) => c.type === activeType);
    return {
      customList: filtered.filter((c) => !c.isDefault),
      defaultList: filtered.filter((c) => c.isDefault),
    };
  }, [categoriesWithCount, activeType]);

  const openAddSheet = () => {
    setEditingCat(null);
    setLabel('');
    setFormType(activeType);
    setColorIdx(0);
    setIconKey(activeType === 'INCOME' ? 'wallet' : 'shopping');
    setSheetOpen(true);
  };

  const openEditSheet = (cat: ManagedCategory) => {
    setEditingCat(cat);
    setLabel(cat.label);
    setFormType(cat.type);
    const foundColor = COLOR_SWATCHES.findIndex((s) => s.color === cat.iconColor);
    setColorIdx(foundColor >= 0 ? foundColor : 0);
    setIconKey(cat.iconKey);
    setSheetOpen(true);
  };

  const handleSave = async () => {
    const trimmed = label.trim();
    if (!trimmed) {
      showToast('Masukkan nama kategori', 'error');
      return;
    }
    const palette = COLOR_SWATCHES[colorIdx];
    setSheetOpen(false);

    if (editingCat) {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === editingCat.id
            ? {
                ...c,
                label: trimmed,
                type: formType,
                iconKey,
                iconBg: palette.bg,
                iconColor: palette.color,
              }
            : c
        )
      );
      try {
        await categoryService.updateCategory(editingCat.id, {
          name: trimmed,
          icon: iconKey,
          color: palette.color,
        });
        await refreshAllData();
        showToast(`Kategori "${trimmed}" diperbarui`);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Gagal memperbarui kategori', 'error');
      }
    } else {
      const nextCat: ManagedCategory = {
        id: `cat-${Date.now()}`,
        label: trimmed,
        type: formType,
        iconKey,
        iconBg: palette.bg,
        iconColor: palette.color,
        isDefault: false,
      };
      setCategories((prev) => [nextCat, ...prev]);
      try {
        await categoryService.createCategory({
          name: trimmed,
          type: formType,
          icon: iconKey,
          color: palette.color,
        });
        await refreshAllData();
        showToast(`Kategori "${trimmed}" ditambahkan`);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Gagal menambah kategori', 'error');
      }
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 28 }}
      >
        <LinearGradient
          colors={['#4B89FF', '#3B7AF5', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.blueHeader, { paddingTop: Math.max(insets.top, 12) + 8 }]}
        >
          <View style={styles.topNav}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Kembali"
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
            >
              <ArrowLeft size={22} color="#FFFFFF" strokeWidth={2} />
            </Pressable>
            <Text style={styles.navTitle}>Kategori Transaksi</Text>
            <Pressable
              onPress={openAddSheet}
              accessibilityRole="button"
              accessibilityLabel="Tambah kategori kustom"
              style={({ pressed }) => [styles.addPill, pressed && { opacity: 0.8 }]}
            >
              <Plus size={14} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.addPillText}>Tambah</Text>
            </Pressable>
          </View>
        </LinearGradient>

        {/* SEGMENTED SWITCHER */}
        <View style={styles.switcherWrap}>
          {(
            [
              { key: 'EXPENSE', label: 'Pengeluaran' },
              { key: 'INCOME', label: 'Pemasukan' },
            ] as { key: CategoryType; label: string }[]
          ).map((t) => {
            const active = activeType === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setActiveType(t.key)}
                style={[styles.switcherTab, active && styles.switcherTabActive]}
              >
                <Text
                  style={[styles.switcherText, active && styles.switcherTextActive]}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* KATEGORI KUSTOM */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Kategori Kustom</Text>
          {customList.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                Belum ada kategori kustom. Ketuk + Tambah di kanan atas untuk membuat.
              </Text>
            </View>
          ) : (
            <View style={styles.groupCard}>
              {customList.map((cat, idx) => (
                <Animated.View
                  key={cat.id}
                  entering={FadeInDown.delay(idx * 45).duration(260)}
                  style={[styles.catRow, idx > 0 && styles.rowDivider]}
                >
                  <View style={[styles.iconBox, { backgroundColor: cat.iconBg }]}>
                    {renderCatIcon(cat.iconKey, cat.iconColor)}
                  </View>

                  <View style={styles.catBody}>
                    <Text style={styles.catName} numberOfLines={1}>
                      {cat.label}
                    </Text>
                    <Text style={[styles.catCount, Typography.tabularNums]}>
                      {cat.txCount} transaksi
                    </Text>
                  </View>

                  <View style={styles.catActions}>
                    <Pressable
                      onPress={() => openEditSheet(cat)}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${cat.label}`}
                      style={styles.iconActionBtn}
                    >
                      <Pencil size={15} color={Colors.textSecondary} strokeWidth={1.9} />
                    </Pressable>
                    <Pressable
                      onPress={() => setDeletingCat(cat)}
                      accessibilityRole="button"
                      accessibilityLabel={`Hapus ${cat.label}`}
                      style={[styles.iconActionBtn, { backgroundColor: Colors.expenseSoft }]}
                    >
                      <Trash2 size={15} color={Colors.expense} strokeWidth={1.9} />
                    </Pressable>
                  </View>
                </Animated.View>
              ))}
            </View>
          )}
        </View>

        {/* KATEGORI BAWAAN */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Kategori Bawaan</Text>
          <View style={styles.groupCard}>
            {defaultList.map((cat, idx) => (
              <View
                key={cat.id}
                style={[styles.catRow, idx > 0 && styles.rowDivider]}
              >
                <View style={[styles.iconBox, { backgroundColor: cat.iconBg }]}>
                  {renderCatIcon(cat.iconKey, cat.iconColor)}
                </View>

                <View style={styles.catBody}>
                  <Text style={styles.catName} numberOfLines={1}>
                    {cat.label}
                  </Text>
                  <Text style={[styles.catCount, Typography.tabularNums]}>
                    {cat.txCount} transaksi
                  </Text>
                </View>

                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultBadgeText}>Bawaan</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ADD / EDIT CATEGORY SHEET */}
      <BaseBottomSheet
        visible={sheetOpen}
        title={editingCat ? 'Edit Kategori Kustom' : 'Tambah Kategori Kustom'}
        onClose={() => setSheetOpen(false)}
        footer={
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [
              styles.saveBtn,
              pressed && { backgroundColor: Colors.primaryDark },
            ]}
          >
            <Text style={styles.saveBtnText}>Simpan Kategori</Text>
          </Pressable>
        }
      >
        <Text style={styles.label}>Nama Kategori</Text>
        <TextInput
          style={styles.input}
          placeholder="Contoh: Skincare, Olahraga, Freelance"
          placeholderTextColor="#94A3B8"
          value={label}
          onChangeText={setLabel}
        />

        <Text style={styles.label}>Tipe Transaksi</Text>
        <View style={styles.typeRow}>
          {(
            [
              { key: 'EXPENSE', label: 'Pengeluaran' },
              { key: 'INCOME', label: 'Pemasukan' },
            ] as { key: CategoryType; label: string }[]
          ).map((t) => {
            const selected = formType === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setFormType(t.key)}
                style={[styles.typeChip, selected && styles.typeChipSelected]}
              >
                <Text
                  style={[styles.typeChipText, selected && styles.typeChipTextSelected]}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Pilih Warna</Text>
        <View style={styles.swatchRow}>
          {COLOR_SWATCHES.map((sw, idx) => {
            const selected = colorIdx === idx;
            return (
              <Pressable
                key={sw.label}
                onPress={() => setColorIdx(idx)}
                style={[
                  styles.swatch,
                  { backgroundColor: sw.color },
                  selected && styles.swatchSelected,
                ]}
              >
                {selected ? <Check size={15} color="#FFFFFF" strokeWidth={2.5} /> : null}
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Pilih Ikon</Text>
        <View style={styles.iconGrid}>
          {ICON_OPTIONS.map((key) => {
            const selected = iconKey === key;
            const palette = COLOR_SWATCHES[colorIdx];
            return (
              <Pressable
                key={key}
                onPress={() => setIconKey(key)}
                style={[
                  styles.iconPickBox,
                  selected && {
                    backgroundColor: palette.bg,
                    borderColor: palette.color,
                  },
                ]}
              >
                {renderCatIcon(key, selected ? palette.color : Colors.textMuted)}
              </Pressable>
            );
          })}
        </View>
      </BaseBottomSheet>

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        visible={deletingCat !== null}
        title="Hapus Kategori?"
        message={
          deletingCat
            ? `Kategori "${deletingCat.label}" akan dihapus dari daftar kategori kustom.`
            : ''
        }
        confirmLabel="Hapus"
        variant="danger"
        icon="trash"
        onCancel={() => setDeletingCat(null)}
        onConfirm={async () => {
          if (deletingCat) {
            const target = deletingCat;
            setDeletingCat(null);
            setCategories((prev) => prev.filter((c) => c.id !== target.id));
            try {
              await categoryService.deleteCategory(target.id);
              await refreshAllData();
              showToast(`Kategori "${target.label}" dihapus`);
            } catch (err) {
              showToast(err instanceof Error ? err.message : 'Gagal menghapus kategori', 'error');
            }
          } else {
            setDeletingCat(null);
          }
        }}
      />
    </View>
  );
}

const CARD_SHADOW = {
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.05,
  shadowRadius: 14,
  elevation: 3,
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  blueHeader: {
    paddingHorizontal: 16,
    paddingBottom: 22,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  backBtn: {
    width: TouchTarget.minSize,
    height: TouchTarget.minSize,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: '#FFFFFF',
  },
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 99,
    paddingHorizontal: 13,
    paddingVertical: 7,
    minHeight: 36,
  },
  addPillText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12.5,
    color: '#FFFFFF',
  },

  switcherWrap: {
    marginHorizontal: 16,
    marginTop: 16,
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 4,
    gap: 4,
  },
  switcherTab: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switcherTabActive: {
    backgroundColor: Colors.primary,
  },
  switcherText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.textMuted,
  },
  switcherTextActive: {
    fontFamily: FontFamily.semibold,
    color: '#FFFFFF',
  },

  sectionWrap: {
    marginTop: 18,
    paddingHorizontal: 16,
    gap: 8,
  },
  sectionTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 12.5,
    color: Colors.textMuted,
    paddingHorizontal: 4,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
  groupCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    ...CARD_SHADOW,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catBody: {
    flex: 1,
    minWidth: 0,
  },
  catName: {
    fontFamily: FontFamily.semibold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  catCount: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
    color: Colors.textMuted,
    marginTop: 2,
  },
  catActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultBadge: {
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  defaultBadgeText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.textMuted,
  },

  label: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 12,
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
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeChip: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeChipSelected: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
  },
  typeChipText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  typeChipTextSelected: {
    fontFamily: FontFamily.semibold,
    color: Colors.primaryDark,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 2,
  },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: {
    borderWidth: 3,
    borderColor: '#DBEAFE',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconPickBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: FontFamily.semibold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
