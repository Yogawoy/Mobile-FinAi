import {
  CalendarPickerSheet,
  formatIndonesianFullDate,
} from '@/components/CalendarPickerSheet';
import { HorizontalScrollStrip } from '@/components/HorizontalScrollStrip';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/ToastProvider';
import { useFinance, type ManagedCategory } from '@/context/FinanceContext';
import { useKeyboardFocusScroll } from '@/hooks/useKeyboardFocusScroll';
import { formatIDR } from '@/lib/format';
import { type TransactionMode } from '@/lib/mockData';
import { useResponsive } from '@/lib/responsive';
import { categoryService } from '@/services/category.service';
import { transactionService } from '@/services/transaction.service';
import { Colors, FontFamily, Radius, Typography } from '@/theme/tokens';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowLeft,
  ArrowUpDown,
  Briefcase,
  Calendar,
  Car,
  Coffee,
  Gamepad2,
  HeartPulse,
  Home,
  ShoppingBag,
  Tag,
  Trash2,
  Utensils,
  Wallet,
  Zap,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TYPE_OPTIONS: Array<{
  key: TransactionMode;
  label: string;
  accent: string;
}> = [
  { key: 'EXPENSE', label: 'Pengeluaran', accent: '#EF4444' },
  { key: 'INCOME', label: 'Pemasukan', accent: '#10B981' },
  { key: 'TRANSFER', label: 'Transfer', accent: '#2563EB' },
];

function formatThousands(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function renderCategoryIcon(iconName: string, color: string, size = 15) {
  const key = iconName.toLowerCase();
  if (key.includes('utensil') || key.includes('food') || key.includes('makan')) {
    return <Utensils size={size} color={color} strokeWidth={2} />;
  }
  if (key.includes('coffee') || key.includes('kopi')) {
    return <Coffee size={size} color={color} strokeWidth={2} />;
  }
  if (key.includes('car') || key.includes('transport')) {
    return <Car size={size} color={color} strokeWidth={2} />;
  }
  if (key.includes('shop') || key.includes('bag') || key.includes('belanja')) {
    return <ShoppingBag size={size} color={color} strokeWidth={2} />;
  }
  if (key.includes('game') || key.includes('hibur')) {
    return <Gamepad2 size={size} color={color} strokeWidth={2} />;
  }
  if (key.includes('zap') || key.includes('listrik') || key.includes('tagih')) {
    return <Zap size={size} color={color} strokeWidth={2} />;
  }
  if (key.includes('heart') || key.includes('sehat')) {
    return <HeartPulse size={size} color={color} strokeWidth={2} />;
  }
  if (key.includes('home') || key.includes('rumah')) {
    return <Home size={size} color={color} strokeWidth={2} />;
  }
  if (key.includes('briefcase') || key.includes('gaji') || key.includes('kerja')) {
    return <Briefcase size={size} color={color} strokeWidth={2} />;
  }
  return <Tag size={size} color={color} strokeWidth={2} />;
}

export default function TransactionFormScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    type?: TransactionMode;
    walletId?: string;
    categoryKey?: string;
    categoryId?: string;
    amount?: string;
    description?: string;
  }>();
  const isEdit = Boolean(params.id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, isSmallWidth, isShortHeight, clamp } = useResponsive();
  const { scrollViewRef, keyboardHeight, scrollToInput, onScroll } =
    useKeyboardFocusScroll({
      stickyBottomHeight: 0,
      breathingRoom: 36,
    });
  const { showToast } = useToast();

  const cardHorizontalMargin = isSmallWidth ? 14 : 18;
  const cardPadding = isSmallWidth ? 14 : 16;
  const walletPillMinWidth = clamp(Math.round(width * 0.34), 118, 152);
  const nominalFontSize = clamp(Math.round(width * 0.068), 22, 28);
  const rpFontSize = clamp(Math.round(width * 0.05), 18, 22);
  const {
    wallets,
    categories,
    setCategories,
    transactions,
    refreshAllData,
  } = useFinance();

  const activeWallets = useMemo(
    () => wallets.filter((w) => !w.isArchived),
    [wallets]
  );

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const [mode, setMode] = useState<TransactionMode>(
    params.type === 'INCOME' || params.type === 'TRANSFER'
      ? params.type
      : 'EXPENSE'
  );
  const [amountText, setAmountText] = useState(() =>
    !isEdit && params.amount ? formatThousands(params.amount) : ''
  );
  const [amountFocused, setAmountFocused] = useState(false);
  const [walletId, setWalletId] = useState<string>(
    params.walletId || activeWallets[0]?.id || ''
  );
  const [targetWalletId, setTargetWalletId] = useState<string>(
    activeWallets.find((w) => w.id !== (params.walletId || activeWallets[0]?.id))?.id || ''
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    !isEdit && params.categoryId ? params.categoryId : ''
  );
  const [selectedDate, setSelectedDate] = useState<Date>(() =>
    startOfLocalDay(new Date())
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [note, setNote] = useState(() =>
    !isEdit && params.description ? params.description : ''
  );
  const [noteFocused, setNoteFocused] = useState(false);

  const [originalTx, setOriginalTx] = useState<{
    type: TransactionMode;
    amount: number;
    walletId: string;
  } | null>(null);

  const filteredCategories = useMemo<ManagedCategory[]>(() => {
    if (mode === 'TRANSFER') return [];
    return categories.filter((c) => c.type === mode);
  }, [categories, mode]);

  useEffect(() => {
    let active = true;

    async function loadInitial() {
      let allCats = categories;
      if (allCats.length === 0) {
        try {
          const fetched = await categoryService.getCategories();
          if (active && fetched.length > 0) {
            const mapped: ManagedCategory[] = fetched.map((c) => ({
              id: c.id,
              label: c.name,
              type: c.type,
              iconKey: 'utensils',
              iconBg: '#EBF2FF',
              iconColor: c.color || '#2563EB',
              isDefault: c.isDefault,
            }));
            setCategories(mapped);
            allCats = mapped;
          }
        } catch {
          // Abaikan jika gagal memuat kategori cadangan
        }
      }

      if (!isEdit || !params.id) {
        if (active && params.categoryKey) {
          const matched = allCats.find(
            (c) =>
              c.type === 'EXPENSE' &&
              c.iconKey.toLowerCase() === params.categoryKey?.toLowerCase()
          );
          if (matched) setSelectedCategoryId(matched.id);
        }
        if (active) setLoading(false);
        return;
      }

      const localFound = transactions.find((t) => t.id === params.id);
      if (localFound && active) {
        setMode(localFound.type);
        setAmountText(formatThousands(String(Math.round(localFound.amount))));
        setWalletId(localFound.walletId);
        if (localFound.targetWalletId) {
          setTargetWalletId(localFound.targetWalletId);
        }
        const matchedCat = allCats.find(
          (c) =>
            c.type === localFound.type &&
            c.label.toLowerCase() === localFound.categoryLabel.toLowerCase()
        );
        if (matchedCat) setSelectedCategoryId(matchedCat.id);
        if (localFound.transactionDate) {
          const d = new Date(localFound.transactionDate);
          if (!Number.isNaN(d.getTime())) setSelectedDate(startOfLocalDay(d));
        }
        setNote(localFound.note ?? '');
        setOriginalTx({
          type: localFound.type,
          amount: localFound.amount,
          walletId: localFound.walletId,
        });
        setLoading(false);
        return;
      }

      try {
        const res = await transactionService.getTransactions({ limit: 100 });
        const found = res.items.find((t) => t.id === params.id);
        if (found && active) {
          setMode(found.type);
          setAmountText(formatThousands(String(Math.round(Number(found.amount)))));
          setWalletId(found.walletId);
          if (found.destinationWalletId) {
            setTargetWalletId(found.destinationWalletId);
          }
          if (found.categoryId) setSelectedCategoryId(found.categoryId);
          const d = new Date(found.transactionDate);
          if (!Number.isNaN(d.getTime())) setSelectedDate(startOfLocalDay(d));
          setNote(found.note ?? '');
          setOriginalTx({
            type: found.type,
            amount: Number(found.amount),
            walletId: found.walletId,
          });
        }
      } catch {
        // Fallback diam
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadInitial();
    return () => {
      active = false;
    };
  }, [params.id, isEdit]);

  useEffect(() => {
    if (mode === 'TRANSFER') return;
    if (filteredCategories.length === 0) return;
    const stillValid = filteredCategories.some((c) => c.id === selectedCategoryId);
    if (!stillValid) {
      setSelectedCategoryId(filteredCategories[0].id);
    }
  }, [mode, filteredCategories, selectedCategoryId]);

  const activeTypeMeta =
    TYPE_OPTIONS.find((t) => t.key === mode) ?? TYPE_OPTIONS[0];
  const numericAmount = Number(amountText.replace(/[^0-9]/g, '')) || 0;

  const selectedSourceWallet = activeWallets.find((w) => w.id === walletId);
  const effectiveAvailableBalance = useMemo(() => {
    if (!selectedSourceWallet) return 0;
    const refundOld =
      originalTx &&
      originalTx.walletId === walletId &&
      originalTx.type !== 'INCOME'
        ? originalTx.amount
        : 0;
    return selectedSourceWallet.balance + refundOld;
  }, [selectedSourceWallet, originalTx, walletId]);

  const isInsufficientBalance =
    mode !== 'INCOME' &&
    numericAmount > 0 &&
    Boolean(selectedSourceWallet) &&
    numericAmount > effectiveAvailableBalance;

  const today = useMemo(() => startOfLocalDay(new Date()), []);
  const yesterday = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return d;
  }, [today]);

  const isTodaySelected = isSameDay(selectedDate, today);
  const isYesterdaySelected = isSameDay(selectedDate, yesterday);

  const handleModeChange = (nextMode: TransactionMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    if (nextMode === 'TRANSFER' && (!targetWalletId || targetWalletId === walletId)) {
      const other = activeWallets.find((w) => w.id !== walletId);
      if (other) setTargetWalletId(other.id);
    }
  };

  const handleSwapWallets = () => {
    if (!walletId || !targetWalletId) return;
    const prevSrc = walletId;
    setWalletId(targetWalletId);
    setTargetWalletId(prevSrc);
  };

  const handleSave = async () => {
    if (numericAmount <= 0) {
      showToast('Masukkan nominal lebih dari Rp 0', 'error');
      return;
    }
    if (!walletId) {
      showToast('Pilih dompet terlebih dahulu', 'error');
      return;
    }
    if (mode === 'TRANSFER') {
      if (!targetWalletId) {
        showToast('Pilih dompet tujuan transfer', 'error');
        return;
      }
      if (walletId === targetWalletId) {
        showToast('Dompet tujuan harus berbeda dari dompet asal', 'error');
        return;
      }
    }
    if (isInsufficientBalance && selectedSourceWallet) {
      showToast(
        `Saldo ${selectedSourceWallet.name} tidak cukup, sisa ${formatIDR(selectedSourceWallet.balance)}`,
        'error'
      );
      return;
    }

    const now = new Date();
    const txDate = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      now.getHours(),
      now.getMinutes(),
      now.getSeconds()
    );

    setSubmitting(true);
    try {
      if (isEdit && params.id) {
        await transactionService.updateTransaction(params.id, {
          walletId,
          destinationWalletId: mode === 'TRANSFER' ? targetWalletId : null,
          categoryId: mode === 'TRANSFER' ? null : selectedCategoryId || null,
          type: mode,
          amount: numericAmount,
          note: note.trim() || null,
          transactionDate: txDate.toISOString(),
        });
        await refreshAllData();
        showToast('Transaksi diperbarui');
      } else {
        await transactionService.createTransaction({
          walletId,
          destinationWalletId: mode === 'TRANSFER' ? targetWalletId : null,
          categoryId: mode === 'TRANSFER' ? null : selectedCategoryId || null,
          type: mode,
          amount: numericAmount,
          note: note.trim() || null,
          transactionDate: txDate.toISOString(),
        });
        await refreshAllData();
        showToast(`Tercatat (${formatIDR(numericAmount)})`);
      }
      router.back();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Gagal menyimpan transaksi',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!params.id) return;
    setConfirmDeleteOpen(false);
    setSubmitting(true);
    try {
      await transactionService.deleteTransaction(params.id);
      await refreshAllData();
      showToast('Transaksi dihapus');
      router.replace('/(tabs)/transactions' as Href);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Gagal menghapus transaksi',
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
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.flex}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={onScroll}
          contentContainerStyle={{
            paddingBottom: 24,
          }}
        >
          {/* CURVED ROYAL BLUE HEADER */}
          <View
            style={[
              styles.header,
              {
                paddingHorizontal: cardHorizontalMargin,
                paddingTop: Math.max(insets.top, 12) + 8,
              },
            ]}
          >
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => router.back()}
                  accessibilityRole="button"
                  accessibilityLabel="Kembali"
                  style={styles.iconBtn}
                >
                  <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.2} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {isEdit ? 'Edit Transaksi' : 'Catat Transaksi'}
                </Text>
              </View>

              {isEdit ? (
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => setConfirmDeleteOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Hapus transaksi"
                  style={styles.iconBtn}
                >
                  <Trash2 size={18} color="#FFFFFF" strokeWidth={2.1} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {loading ? (
            <View
              style={[
                styles.loadingCard,
                { marginHorizontal: cardHorizontalMargin },
              ]}
            >
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingText}>Memuat data transaksi</Text>
            </View>
          ) : (
            <View>
              {/* KARTU ATAS: INPUT NOMINAL DI PALING ATAS + SEGMENTED CONTROL */}
              <View
                style={[
                  styles.heroCard,
                  {
                    marginHorizontal: cardHorizontalMargin,
                    paddingHorizontal: cardPadding,
                    paddingTop: isSmallWidth ? 16 : 20,
                    paddingBottom: cardPadding,
                  },
                ]}
              >
                <Text style={styles.nominalLabel}>Nominal</Text>
                <View
                  style={[
                    styles.amountInputRow,
                    { height: isSmallWidth ? 50 : 56 },
                    amountFocused && { borderColor: activeTypeMeta.accent },
                    isInsufficientBalance && { borderColor: Colors.expense },
                  ]}
                >
                  <Text
                    style={[
                      styles.rpPrefix,
                      {
                        fontSize: rpFontSize,
                        color:
                          numericAmount > 0
                            ? activeTypeMeta.accent
                            : Colors.textSecondary,
                      },
                    ]}
                  >
                    Rp
                  </Text>
                  <TextInput
                    style={[
                      styles.amountInput,
                      Typography.tabularNums,
                      { fontSize: nominalFontSize },
                    ]}
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={amountText}
                    onFocus={(e) => {
                      setAmountFocused(true);
                      scrollToInput(e);
                    }}
                    onBlur={() => setAmountFocused(false)}
                    onChangeText={(val) => setAmountText(formatThousands(val))}
                  />
                </View>

                {isInsufficientBalance && selectedSourceWallet ? (
                  <Text style={[styles.insufficientText, Typography.tabularNums]}>
                    Saldo dompet tidak cukup, sisa {formatIDR(selectedSourceWallet.balance)}
                  </Text>
                ) : null}

                <View style={styles.segmentedBar}>
                  {TYPE_OPTIONS.map((opt) => {
                    const active = mode === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        activeOpacity={0.75}
                        onPress={() => handleModeChange(opt.key)}
                        style={[
                          styles.segmentTab,
                          { minHeight: isSmallWidth ? 38 : 42 },
                          active && styles.segmentTabActive,
                        ]}
                      >
                        <Text
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.85}
                          style={[
                            styles.segmentText,
                            { fontSize: isSmallWidth ? 12 : 13 },
                            active && { color: opt.accent, fontFamily: FontFamily.bold },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* KARTU BAWAH: 1 KARTU TERPADU UNTUK SEMUA DETAIL */}
              <View
                style={[
                  styles.detailCard,
                  {
                    marginHorizontal: cardHorizontalMargin,
                    padding: cardPadding,
                  },
                ]}
              >
                {/* 1. DOMPET */}
                <View style={styles.sectionBlock}>
                  <HorizontalScrollStrip
                    label={mode === 'TRANSFER' ? 'Dari Dompet' : 'Dompet'}
                    fadeColor="#FFFFFF"
                    contentContainerStyle={styles.horizontalScroll}
                    headerRight={
                      mode === 'TRANSFER' && activeWallets.length >= 2 ? (
                        <TouchableOpacity
                          activeOpacity={0.75}
                          onPress={handleSwapWallets}
                          accessibilityRole="button"
                          accessibilityLabel="Tukar dompet asal dan tujuan"
                          style={styles.swapBtn}
                        >
                          <ArrowUpDown size={13} color={Colors.primary} strokeWidth={2.2} />
                          <Text style={styles.swapBtnText}>Tukar</Text>
                        </TouchableOpacity>
                      ) : null
                    }
                  >
                    {activeWallets.map((w) => {
                      const selected = w.id === walletId;
                      return (
                        <TouchableOpacity
                          key={w.id}
                          activeOpacity={0.75}
                          onPress={() => {
                            setWalletId(w.id);
                            if (mode === 'TRANSFER' && w.id === targetWalletId) {
                              const other = activeWallets.find((o) => o.id !== w.id);
                              if (other) setTargetWalletId(other.id);
                            }
                          }}
                          style={[
                            styles.walletPill,
                            { minWidth: walletPillMinWidth },
                            selected && styles.pillActive,
                          ]}
                        >
                          <View style={styles.walletPillTop}>
                            <Wallet
                              size={13}
                              color={selected ? '#2563EB' : Colors.textSecondary}
                              strokeWidth={2}
                            />
                            <Text
                              style={[
                                styles.walletPillName,
                                selected && styles.pillTextActive,
                              ]}
                              numberOfLines={1}
                            >
                              {w.shortName || w.name}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.walletPillBal,
                              Typography.tabularNums,
                              selected && { color: '#2563EB' },
                            ]}
                          >
                            {formatIDR(w.balance)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </HorizontalScrollStrip>

                  {mode === 'TRANSFER' ? (
                    <View style={styles.destWalletWrap}>
                      <HorizontalScrollStrip
                        label="Ke Dompet"
                        fadeColor="#FFFFFF"
                        contentContainerStyle={styles.horizontalScroll}
                      >
                        {activeWallets
                          .filter((w) => w.id !== walletId)
                          .map((w) => {
                            const selected = w.id === targetWalletId;
                            return (
                              <TouchableOpacity
                                key={w.id}
                                activeOpacity={0.75}
                                onPress={() => setTargetWalletId(w.id)}
                                style={[
                                  styles.walletPill,
                                  { minWidth: walletPillMinWidth },
                                  selected && styles.pillActive,
                                ]}
                              >
                                <View style={styles.walletPillTop}>
                                  <Wallet
                                    size={13}
                                    color={selected ? '#2563EB' : Colors.textSecondary}
                                    strokeWidth={2}
                                  />
                                  <Text
                                    style={[
                                      styles.walletPillName,
                                      selected && styles.pillTextActive,
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {w.shortName || w.name}
                                  </Text>
                                </View>
                                <Text
                                  style={[
                                    styles.walletPillBal,
                                    Typography.tabularNums,
                                    selected && { color: '#2563EB' },
                                  ]}
                                >
                                  {formatIDR(w.balance)}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                      </HorizontalScrollStrip>
                    </View>
                  ) : null}
                </View>

                {/* 2. KATEGORI (SEMBUNYI SAAT TRANSFER) */}
                {mode !== 'TRANSFER' ? (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.sectionBlock}>
                      <HorizontalScrollStrip
                        label="Kategori"
                        fadeColor="#FFFFFF"
                        contentContainerStyle={styles.horizontalScroll}
                      >
                        {filteredCategories.map((cat) => {
                          const selected = cat.id === selectedCategoryId;
                          return (
                            <TouchableOpacity
                              key={cat.id}
                              activeOpacity={0.75}
                              onPress={() => setSelectedCategoryId(cat.id)}
                              style={[
                                styles.catPill,
                                selected && styles.pillActive,
                              ]}
                            >
                              {renderCategoryIcon(
                                cat.iconKey,
                                selected ? '#2563EB' : Colors.textSecondary,
                                14
                              )}
                              <Text
                                style={[
                                  styles.catPillText,
                                  selected && styles.pillTextActive,
                                ]}
                              >
                                {cat.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </HorizontalScrollStrip>
                    </View>
                  </>
                ) : null}

                {/* 3. TANGGAL */}
                <View style={styles.divider} />
                <View style={styles.sectionBlock}>
                  <Text style={[styles.sectionLabel, { marginBottom: 10 }]}>
                    Tanggal
                  </Text>
                  <View style={styles.dateRow}>
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() => setSelectedDate(today)}
                      style={[
                        styles.datePill,
                        isTodaySelected && styles.pillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.datePillText,
                          isTodaySelected && styles.pillTextActive,
                        ]}
                      >
                        Hari Ini
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() => setSelectedDate(yesterday)}
                      style={[
                        styles.datePill,
                        isYesterdaySelected && styles.pillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.datePillText,
                          isYesterdaySelected && styles.pillTextActive,
                        ]}
                      >
                        Kemarin
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() => setCalendarOpen(true)}
                      style={[
                        styles.datePill,
                        styles.datePillCalendar,
                        !isTodaySelected && !isYesterdaySelected && styles.pillActive,
                      ]}
                    >
                      <Calendar
                        size={14}
                        color={
                          !isTodaySelected && !isYesterdaySelected
                            ? '#2563EB'
                            : Colors.textSecondary
                        }
                        strokeWidth={2}
                      />
                      <Text
                        style={[
                          styles.datePillText,
                          !isTodaySelected &&
                            !isYesterdaySelected &&
                            styles.pillTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {!isTodaySelected && !isYesterdaySelected
                          ? formatIndonesianFullDate(selectedDate)
                          : 'Pilih Tanggal'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 4. CATATAN (OPSIONAL) */}
                <View style={styles.divider} />
                <View style={styles.sectionBlock}>
                  <Text style={[styles.sectionLabel, { marginBottom: 6 }]}>
                    Catatan (Opsional)
                  </Text>
                  <TextInput
                    style={[
                      styles.noteInput,
                      noteFocused && { borderColor: '#2563EB' },
                    ]}
                    placeholder="Tulis catatan singkat"
                    placeholderTextColor="#94A3B8"
                    value={note}
                    onFocus={(e) => {
                      setNoteFocused(true);
                      scrollToInput(e);
                    }}
                    onBlur={() => setNoteFocused(false)}
                    onChangeText={setNote}
                    maxLength={200}
                  />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* STICKY BOTTOM BUTTON (SELALU ROYAL BLUE #2563EB) */}
        <View
          style={[
            styles.bottomBar,
            {
              paddingHorizontal: cardHorizontalMargin,
              paddingBottom: keyboardHeight > 0 ? 12 : Math.max(insets.bottom, 14),
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.75}
            disabled={loading || submitting || isInsufficientBalance}
            onPress={() => void handleSave()}
            accessibilityRole="button"
            accessibilityLabel={isEdit ? 'Simpan Perubahan' : 'Simpan Transaksi'}
            style={[
              styles.primaryBtn,
              { height: isShortHeight ? 48 : 52 },
              (loading || submitting || isInsufficientBalance) && { opacity: 0.45 },
            ]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {isEdit ? 'Simpan Perubahan' : 'Simpan Transaksi'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <CalendarPickerSheet
        visible={calendarOpen}
        initialDate={selectedDate}
        accentColor="#2563EB"
        allowPastDates
        allowFutureDates={false}
        onClose={() => setCalendarOpen(false)}
        onSelect={(picked) => setSelectedDate(picked)}
      />

      <ConfirmDialog
        visible={confirmDeleteOpen}
        title="Hapus Transaksi?"
        message="Transaksi ini akan dihapus dan saldo dompet akan disesuaikan."
        confirmLabel="Hapus"
        variant="danger"
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  root: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  header: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 18,
    paddingBottom: 22,
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
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCard: {
    marginHorizontal: 18,
    marginTop: 14,
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
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  segmentedBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginTop: 16,
  },
  segmentTab: {
    flex: 1,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentTabActive: {
    backgroundColor: '#FFFFFF',
  },
  segmentText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12.5,
    color: Colors.textSecondary,
  },
  nominalLabel: {
    fontFamily: FontFamily.semibold,
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderColor: '#E2E8F0',
    height: 52,
    gap: 8,
  },
  rpPrefix: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
  },
  amountInput: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: 26,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  insufficientText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.expense,
    marginTop: 8,
  },
  detailCard: {
    marginHorizontal: 18,
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    padding: 16,
  },
  sectionBlock: {
    paddingVertical: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  walletHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 13.5,
    color: Colors.textPrimary,
  },
  swapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: '#EBF2FF',
  },
  swapBtnText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12,
    color: '#2563EB',
  },
  horizontalScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  walletPill: {
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 54,
    justifyContent: 'center',
    gap: 3,
  },
  walletPillTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  walletPillName: {
    fontFamily: FontFamily.semibold,
    fontSize: 12.5,
    color: Colors.textPrimary,
    maxWidth: 105,
  },
  walletPillBal: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.textMuted,
  },
  destWalletWrap: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catPillText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12.5,
    color: Colors.textSecondary,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  datePill: {
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePillCalendar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  datePillText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12.5,
    color: Colors.textSecondary,
  },
  pillActive: {
    backgroundColor: '#EBF2FF',
    borderColor: '#2563EB',
  },
  pillTextActive: {
    color: '#2563EB',
  },
  noteInput: {
    borderBottomWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 2,
    minHeight: 44,
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  primaryBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
