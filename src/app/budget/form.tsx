import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/ToastProvider';
import { useFinance, type ManagedCategory } from '@/context/FinanceContext';
import { formatIDR } from '@/lib/format';
import { type BudgetPeriod } from '@/lib/mockData';
import { budgetService, type BackendBudget } from '@/services/budget.service';
import { categoryService } from '@/services/category.service';
import { Colors, FontFamily, Radius, Typography } from '@/theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowLeft,
  Car,
  Cloud,
  Gamepad2,
  HeartPulse,
  Home,
  Info,
  Lock,
  ShoppingBag,
  Tag,
  Trash2,
  Utensils,
  Zap,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PERIOD_OPTIONS: Array<{ key: BudgetPeriod; label: string }> = [
  { key: 'DAILY', label: 'Harian' },
  { key: 'WEEKLY', label: 'Mingguan' },
  { key: 'MONTHLY', label: 'Bulanan' },
];

const QUICK_AMOUNTS_BY_PERIOD: Record<BudgetPeriod, number[]> = {
  DAILY: [50_000, 100_000, 150_000],
  WEEKLY: [250_000, 500_000, 1_000_000],
  MONTHLY: [500_000, 1_000_000, 2_000_000],
};

const THRESHOLD_OPTIONS = [70, 80, 90];

function formatThousands(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function renderCategoryIcon(iconName: string, color: string) {
  const key = iconName.toLowerCase();
  if (key.includes('utensil') || key.includes('food') || key.includes('makan')) {
    return <Utensils size={20} color={color} strokeWidth={2} />;
  }
  if (key.includes('car') || key.includes('transport')) {
    return <Car size={20} color={color} strokeWidth={2} />;
  }
  if (key.includes('shop') || key.includes('bag') || key.includes('belanja')) {
    return <ShoppingBag size={20} color={color} strokeWidth={2} />;
  }
  if (key.includes('game') || key.includes('hibur')) {
    return <Gamepad2 size={20} color={color} strokeWidth={2} />;
  }
  if (key.includes('zap') || key.includes('listrik') || key.includes('tagih')) {
    return <Zap size={20} color={color} strokeWidth={2} />;
  }
  if (key.includes('heart') || key.includes('sehat')) {
    return <HeartPulse size={20} color={color} strokeWidth={2} />;
  }
  if (key.includes('home') || key.includes('rumah')) {
    return <Home size={20} color={color} strokeWidth={2} />;
  }
  if (key.includes('cloud')) {
    return <Cloud size={20} color={color} strokeWidth={2} />;
  }
  return <Tag size={20} color={color} strokeWidth={2} />;
}

function computeMonthlyEquivalent(limit: number, period: BudgetPeriod): number {
  if (!Number.isFinite(limit) || limit <= 0) return 0;
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  if (period === 'DAILY') return Math.round(limit * daysInMonth);
  if (period === 'WEEKLY') return Math.round(limit * (daysInMonth / 7));
  return Math.round(limit);
}

export default function BudgetFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { budgets, categories, setCategories, refreshAllData } = useFinance();

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const [limitText, setLimitText] = useState('');
  const [period, setPeriod] = useState<BudgetPeriod>('MONTHLY');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('');
  const [thresholdPct, setThresholdPct] = useState<number>(80);
  const [editingMonth, setEditingMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [editingYear, setEditingYear] = useState<number>(() => new Date().getFullYear());

  const expenseCategories = useMemo<ManagedCategory[]>(
    () => categories.filter((c) => c.type === 'EXPENSE'),
    [categories]
  );

  useEffect(() => {
    let active = true;

    async function loadInitial() {
      let currentCategories = expenseCategories;
      if (currentCategories.length === 0) {
        try {
          const fetchedCats = await categoryService.getCategories();
          if (active && fetchedCats.length > 0) {
            const mapped: ManagedCategory[] = fetchedCats.map((c) => ({
              id: c.id,
              label: c.name,
              type: c.type,
              iconKey: 'utensils',
              iconBg: '#EBF2FF',
              iconColor: '#3B7AF5',
              isDefault: c.isDefault,
            }));
            setCategories(mapped);
            currentCategories = mapped.filter((c) => c.type === 'EXPENSE');
          }
        } catch {
          // Abaikan jika gagal memuat kategori cadangan
        }
      }

      if (!isEdit || !id) {
        if (active && currentCategories.length > 0) {
          setSelectedCategoryId((prev) => prev || currentCategories[0].id);
          setSelectedCategoryName((prev) => prev || currentCategories[0].label);
        }
        if (active) setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await budgetService.getBudgets();
        const found: BackendBudget | undefined = res.items.find((b) => b.id === id);
        if (active && found) {
          setLimitText(formatThousands(String(Math.round(Number(found.limitAmount)))));
          setPeriod(found.period ?? 'MONTHLY');
          setSelectedCategoryId(found.categoryId);
          setSelectedCategoryName(found.category?.name ?? '');
          setThresholdPct(found.alertThresholdPct ?? 80);
          setEditingMonth(found.month);
          setEditingYear(found.year);
          setLoading(false);
          return;
        }
      } catch {
        // Fallback ke state lokal jika offline
      }

      const localFound = budgets.find((b) => b.id === id);
      if (active && localFound) {
        setLimitText(formatThousands(String(Math.round(localFound.limit))));
        setPeriod(localFound.period ?? 'MONTHLY');
        const matched = currentCategories.find(
          (c) => c.label.toLowerCase() === localFound.name.toLowerCase()
        );
        setSelectedCategoryId(matched?.id ?? '');
        setSelectedCategoryName(localFound.name);
        setThresholdPct(localFound.alertThresholdPct ?? 80);
      }
      if (active) setLoading(false);
    }

    void loadInitial();
    return () => {
      active = false;
    };
  }, [id, isEdit]);

  const numericLimit = Number(limitText.replace(/[^0-9]/g, '')) || 0;
  const monthlyEquivalent = computeMonthlyEquivalent(numericLimit, period);
  const quickAmounts = QUICK_AMOUNTS_BY_PERIOD[period];

  const handleSave = async () => {
    if (numericLimit <= 0) {
      showToast('Masukkan batas anggaran lebih dari Rp 0', 'error');
      return;
    }
    if (!selectedCategoryId && !selectedCategoryName.trim()) {
      showToast('Pilih kategori pengeluaran terlebih dahulu', 'error');
      return;
    }

    if (!isEdit) {
      const duplicate = budgets.find(
        (b) => b.name.toLowerCase() === selectedCategoryName.trim().toLowerCase()
      );
      if (duplicate) {
        showToast(
          `Anggaran untuk kategori ${selectedCategoryName} sudah ada bulan ini`,
          'error'
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      await budgetService.upsertBudget({
        ...(selectedCategoryId ? { categoryId: selectedCategoryId } : {}),
        ...(!selectedCategoryId && selectedCategoryName
          ? { categoryName: selectedCategoryName.trim() }
          : {}),
        month: editingMonth,
        year: editingYear,
        period,
        limitAmount: numericLimit,
        alertThresholdPct: thresholdPct,
      });
      await refreshAllData();
      showToast(isEdit ? 'Anggaran diperbarui' : 'Anggaran berhasil disimpan');
      router.back();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Gagal menyimpan anggaran',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setConfirmDeleteOpen(false);
    setSubmitting(true);
    try {
      await budgetService.deleteBudget(id);
      await refreshAllData();
      showToast('Anggaran dihapus');
      router.replace({ pathname: '/(tabs)/budgets', params: { tab: 'budget' } });
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Gagal menghapus anggaran',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
        >
          <LinearGradient
            colors={['#4B89FF', '#3B7AF5', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 10 }]}
          >
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <Pressable
                  onPress={() => router.back()}
                  accessibilityRole="button"
                  accessibilityLabel="Kembali"
                  style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.75 }]}
                >
                  <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.2} />
                </Pressable>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {isEdit ? 'Edit Anggaran' : 'Tambah Anggaran'}
                </Text>
              </View>

              {isEdit ? (
                <Pressable
                  onPress={() => setConfirmDeleteOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Hapus anggaran"
                  style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.75 }]}
                >
                  <Trash2 size={18} color="#FFFFFF" strokeWidth={2.1} />
                </Pressable>
              ) : null}
            </View>
          </LinearGradient>

          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingText}>Memuat data anggaran</Text>
            </View>
          ) : (
            <>
              {/* OVERLAPPING CARD: INPUT NOMINAL */}
              <View style={styles.heroCard}>
                <Text style={styles.sectionCaption}>
                  {period === 'DAILY'
                    ? 'BATAS PENGELUARAN HARIAN'
                    : period === 'WEEKLY'
                      ? 'BATAS PENGELUARAN MINGGUAN'
                      : 'BATAS PENGELUARAN BULANAN'}
                </Text>

                <View style={styles.amountInputRow}>
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

                <View style={styles.quickChipRow}>
                  {quickAmounts.map((amt) => {
                    const selected = numericLimit === amt;
                    return (
                      <Pressable
                        key={amt}
                        onPress={() => setLimitText(formatThousands(String(amt)))}
                        style={({ pressed }) => [
                          styles.quickChip,
                          selected && styles.quickChipActive,
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.quickChipText,
                            Typography.tabularNums,
                            selected && styles.quickChipTextActive,
                          ]}
                        >
                          {formatIDR(amt)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* PERIODE ANGGARAN */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Periode Anggaran</Text>
                <View style={styles.segmentRow}>
                  {PERIOD_OPTIONS.map((opt) => {
                    const active = period === opt.key;
                    return (
                      <Pressable
                        key={opt.key}
                        onPress={() => setPeriod(opt.key)}
                        style={({ pressed }) => [
                          styles.segmentBtn,
                          active && styles.segmentBtnActive,
                          pressed && { opacity: 0.85 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.segmentText,
                            active && styles.segmentTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {(period === 'DAILY' || period === 'WEEKLY') && numericLimit > 0 ? (
                  <View style={styles.infoBox}>
                    <Info size={15} color={Colors.primary} strokeWidth={2.1} />
                    <Text style={[styles.infoBoxText, Typography.tabularNums]}>
                      Setara {formatIDR(monthlyEquivalent)} per bulan
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* PEMILIH KATEGORI PENGELUARAN */}
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitleNoMargin}>Kategori</Text>
                  <View style={styles.selectedCatBadge}>
                    {isEdit ? (
                      <Lock size={11} color={Colors.primaryDark} strokeWidth={2.2} />
                    ) : null}
                    <Text style={styles.selectedCatBadgeText} numberOfLines={1}>
                      {selectedCategoryName || 'Pilih kategori'}
                    </Text>
                  </View>
                </View>

                <View style={styles.catGrid}>
                  {expenseCategories.map((cat) => {
                    const selected =
                      selectedCategoryId === cat.id ||
                      (!selectedCategoryId &&
                        selectedCategoryName.toLowerCase() === cat.label.toLowerCase());
                    return (
                      <Pressable
                        key={cat.id}
                        disabled={isEdit}
                        accessibilityRole="button"
                        accessibilityLabel={cat.label}
                        onPress={() => {
                          setSelectedCategoryId(cat.id);
                          setSelectedCategoryName(cat.label);
                        }}
                        style={({ pressed }) => [
                          styles.catItem,
                          selected && styles.catItemActive,
                          isEdit && !selected && { opacity: 0.42 },
                          pressed && !isEdit && { opacity: 0.82 },
                        ]}
                      >
                        {renderCategoryIcon(
                          cat.iconKey,
                          selected ? Colors.primary : cat.iconColor || Colors.textSecondary
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                {isEdit ? (
                  <Text style={styles.helperText}>
                    Kategori tidak dapat diubah saat mengedit anggaran yang sudah aktif.
                  </Text>
                ) : null}
              </View>

              {/* BATAS PENGINGAT */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Ingatkan saat terpakai</Text>
                <View style={styles.segmentRow}>
                  {THRESHOLD_OPTIONS.map((pct) => {
                    const active = thresholdPct === pct;
                    return (
                      <Pressable
                        key={pct}
                        onPress={() => setThresholdPct(pct)}
                        style={({ pressed }) => [
                          styles.segmentBtn,
                          active && styles.segmentBtnActive,
                          pressed && { opacity: 0.85 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.segmentText,
                            Typography.tabularNums,
                            active && styles.segmentTextActive,
                          ]}
                        >
                          {pct}%
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </>
          )}
        </ScrollView>

        {/* STICKY BOTTOM CTA */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <Pressable
            disabled={loading || submitting}
            onPress={() => void handleSave()}
            accessibilityRole="button"
            accessibilityLabel={isEdit ? 'Simpan Perubahan' : 'Simpan Anggaran'}
            style={({ pressed }) => [
              styles.primaryBtn,
              (loading || submitting) && { opacity: 0.6 },
              pressed && { opacity: 0.88 },
            ]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {isEdit ? 'Simpan Perubahan' : 'Simpan Anggaran'}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={confirmDeleteOpen}
        title="Hapus Anggaran?"
        message={`Anggaran "${selectedCategoryName || 'ini'}" akan dihapus. Riwayat transaksi tetap aman.`}
        confirmLabel="Hapus"
        variant="danger"
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 40,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: '#FFFFFF',
    flex: 1,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCard: {
    marginHorizontal: 18,
    marginTop: -22,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontFamily: FontFamily.medium,
    fontSize: 13.5,
    color: Colors.textSecondary,
  },
  heroCard: {
    marginHorizontal: 18,
    marginTop: -22,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    padding: 18,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 3,
  },
  sectionCaption: {
    fontFamily: FontFamily.semibold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: Colors.textMuted,
    marginBottom: 10,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 62,
    gap: 10,
  },
  rpPrefix: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    color: Colors.textSecondary,
  },
  amountInput: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: 26,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  quickChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: '#F5F7FB',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickChipActive: {
    backgroundColor: '#EBF2FF',
    borderColor: '#3B7AF5',
  },
  quickChipText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12.5,
    color: Colors.textSecondary,
  },
  quickChipTextActive: {
    color: Colors.primaryDark,
  },
  card: {
    marginHorizontal: 18,
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    padding: 18,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  cardTitleNoMargin: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  selectedCatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EBF2FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    maxWidth: '65%',
  },
  selectedCatBadgeText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12,
    color: Colors.primaryDark,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F5F7FB',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: '#EBF2FF',
    borderColor: '#3B7AF5',
  },
  segmentText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: Colors.primaryDark,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    backgroundColor: '#EBF2FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  infoBoxText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Colors.primaryDark,
    flex: 1,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catItem: {
    width: '17.8%',
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E8EDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catItemActive: {
    backgroundColor: '#EBF2FF',
    borderColor: '#3B7AF5',
  },
  helperText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 10,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
