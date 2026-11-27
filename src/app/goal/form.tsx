import {
  CalendarPickerSheet,
  formatIndonesianFullDate,
} from '@/components/CalendarPickerSheet';
import { DeleteGoalSheet } from '@/components/budgets/DeleteGoalSheet';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/ToastProvider';
import { useFinance } from '@/context/FinanceContext';
import { formatIDR } from '@/lib/format';
import {
  GOAL_COLOR_PALETTE,
  GOAL_ICON_OPTIONS,
  getGoalColorPalette,
  loadGoalThemePrefs,
  renderGoalThemeIcon,
  type GoalThemeColorKey,
  type GoalThemeIconKey,
} from '@/lib/goalTheme';
import { goalService, type BackendGoal } from '@/services/goal.service';
import { Colors, FontFamily, Radius, Typography } from '@/theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Trash2,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
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
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutUp,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ReanimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TactilePressableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  children: React.ReactNode;
}

function TactilePressable({
  style,
  scaleTo = 0.96,
  onPressIn,
  onPressOut,
  disabled,
  children,
  ...rest
}: TactilePressableProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <ReanimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        if (!disabled) {
          scale.value = withSpring(scaleTo, { damping: 18, stiffness: 320 });
        }
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 16, stiffness: 260 });
        onPressOut?.(e);
      }}
      style={[style, animStyle]}
    >
      {children}
    </ReanimatedPressable>
  );
}

const STEP_CHIPS: Array<{ label: string; add: number }> = [
  { label: '+500 rb', add: 500_000 },
  { label: '+1 jt', add: 1_000_000 },
  { label: '+5 jt', add: 5_000_000 },
  { label: '+10 jt', add: 10_000_000 },
];

type DurationKey = '3M' | '6M' | '1Y' | '2Y' | 'NONE' | 'CUSTOM';

const DURATION_PRESETS: Array<{
  key: DurationKey;
  label: string;
  months: number | null;
}> = [
  { key: '3M', label: '3 Bulan', months: 3 },
  { key: '6M', label: '6 Bulan', months: 6 },
  { key: '1Y', label: '1 Tahun', months: 12 },
  { key: '2Y', label: '2 Tahun', months: 24 },
  { key: 'NONE', label: 'Fleksibel', months: null },
];

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

const NO_DEADLINE_YEAR = 2099;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatThousands(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addMonthsToDate(base: Date, months: number): Date {
  return new Date(base.getFullYear(), base.getMonth() + months, base.getDate());
}

export default function GoalFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { goals, wallets, refreshAllData, updateGoalTheme } = useFinance();

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteWithBalanceOpen, setDeleteWithBalanceOpen] = useState(false);

  const [name, setName] = useState('');
  const [nameFocused, setNameFocused] = useState(false);
  const [targetText, setTargetText] = useState('');
  const [targetFocused, setTargetFocused] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [showInitialBalance, setShowInitialBalance] = useState(false);

  const activeWallets = useMemo(
    () => wallets.filter((w) => !w.isArchived),
    [wallets]
  );
  const [initialSourceType, setInitialSourceType] = useState<'WALLET' | 'EXTERNAL'>(
    activeWallets.length > 0 ? 'WALLET' : 'EXTERNAL'
  );
  const [initialWalletId, setInitialWalletId] = useState<string>(
    activeWallets[0]?.id ?? ''
  );

  const [iconKey, setIconKey] = useState<GoalThemeIconKey>('shield');
  const [colorKey, setColorKey] = useState<GoalThemeColorKey>('royal');

  const [selectedPreset, setSelectedPreset] = useState<DurationKey>('CUSTOM');
  const [selectedDate, setSelectedDate] = useState<Date | null>(() =>
    startOfLocalDay(new Date())
  );
  const [calendarOpen, setCalendarOpen] = useState(false);

  const previewPulse = useSharedValue(1);
  const progressWidth = useSharedValue(4);
  const chevronDeg = useSharedValue(0);

  const triggerPreviewPulse = () => {
    previewPulse.value = withSequence(
      withSpring(0.985, { damping: 16, stiffness: 260 }),
      withSpring(1, { damping: 15, stiffness: 220 })
    );
  };

  useEffect(() => {
    let active = true;

    async function loadGoal() {
      if (!isEdit || !id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [list, prefs] = await Promise.all([
          goalService.getGoals(),
          loadGoalThemePrefs(),
        ]);
        const found: BackendGoal | undefined = list.find((g) => g.id === id);
        if (active && found) {
          setName(found.name.slice(0, 40));
          setTargetText(formatThousands(String(Math.round(Number(found.targetAmount)))));
          setCurrentText(formatThousands(String(Math.round(Number(found.currentAmount)))));
          if (prefs[found.id]) {
            setIconKey(prefs[found.id].iconKey);
            setColorKey(prefs[found.id].colorKey);
          }
          const d = new Date(found.deadline);
          if (!Number.isNaN(d.getTime())) {
            if (d.getFullYear() >= 2090) {
              setSelectedDate(null);
              setSelectedPreset('NONE');
            } else {
              setSelectedDate(startOfLocalDay(d));
              setSelectedPreset('CUSTOM');
            }
          }
          setLoading(false);
          return;
        }
      } catch {
        // Fallback ke state lokal jika gagal fetch
      }

      const localFound = goals.find((g) => g.id === id);
      if (active && localFound) {
        setName(localFound.name.slice(0, 40));
        setTargetText(formatThousands(String(Math.round(localFound.target))));
        setCurrentText(formatThousands(String(Math.round(localFound.current))));
        setIconKey((localFound.iconKey as GoalThemeIconKey) ?? 'target');
        setColorKey((localFound.colorKey as GoalThemeColorKey) ?? 'royal');
      }
      if (active) setLoading(false);
    }

    void loadGoal();
    return () => {
      active = false;
    };
  }, [id, isEdit]);

  const selectedPalette = getGoalColorPalette(colorKey);
  const targetAmount = Number(targetText.replace(/[^0-9]/g, '')) || 0;
  const currentAmount = Number(currentText.replace(/[^0-9]/g, '')) || 0;
  const previewPct =
    targetAmount > 0
      ? Math.min(100, Math.round((currentAmount / targetAmount) * 100))
      : 0;

  useEffect(() => {
    progressWidth.value = withSpring(Math.max(4, previewPct), {
      damping: 20,
      stiffness: 140,
    });
  }, [previewPct, progressWidth]);

  useEffect(() => {
    chevronDeg.value = withTiming(showInitialBalance ? 180 : 0, { duration: 220 });
  }, [showInitialBalance, chevronDeg]);

  const previewCardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: previewPulse.value }],
  }));

  const progressFillAnimStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const chevronAnimStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronDeg.value}deg` }],
  }));

  const selectedInitialWallet = activeWallets.find((w) => w.id === initialWalletId);
  const isInitialInsufficient =
    !isEdit &&
    currentAmount > 0 &&
    initialSourceType === 'WALLET' &&
    Boolean(selectedInitialWallet) &&
    currentAmount > (selectedInitialWallet?.balance ?? 0);

  const rhythmStats = useMemo(() => {
    if (!selectedDate) return null;
    const remaining = targetAmount - currentAmount;
    if (remaining <= 0) return null;
    const today = startOfLocalDay(new Date());
    const days = Math.max(
      1,
      Math.round((startOfLocalDay(selectedDate).getTime() - today.getTime()) / MS_PER_DAY)
    );
    const weeks = Math.max(1, days / 7);
    const months = Math.max(1, days / 30);
    return {
      daily: Math.ceil(remaining / days / 1000) * 1000,
      weekly: Math.ceil(remaining / weeks / 1000) * 1000,
      monthly: Math.ceil(remaining / months / 1000) * 1000,
      targetLabel: formatIndonesianFullDate(selectedDate),
    };
  }, [selectedDate, targetAmount, currentAmount]);

  const deadlineBadgeText = useMemo(() => {
    if (!selectedDate) return 'Fleksibel';
    if (selectedPreset === '3M') return '3 Bulan';
    if (selectedPreset === '6M') return '6 Bulan';
    if (selectedPreset === '1Y') return '1 Tahun';
    if (selectedPreset === '2Y') return '2 Tahun';
    return `${selectedDate.getDate()} ${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
  }, [selectedDate, selectedPreset]);

  const handleAddStep = (addValue: number) => {
    const next = targetAmount + addValue;
    setTargetText(formatThousands(String(next)));
    triggerPreviewPulse();
  };

  const handleSelectDuration = (key: DurationKey, months: number | null) => {
    setSelectedPreset(key);
    if (months === null) {
      setSelectedDate(null);
    } else {
      setSelectedDate(addMonthsToDate(startOfLocalDay(new Date()), months));
    }
    triggerPreviewPulse();
  };

  const handleSave = async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      showToast('Masukkan nama target tabungan', 'error');
      return;
    }
    if (targetAmount <= 0) {
      showToast('Target dana harus lebih dari Rp 0', 'error');
      return;
    }
    if (currentAmount < 0) {
      showToast('Saldo awal tidak boleh negatif', 'error');
      return;
    }
    if (isInitialInsufficient && selectedInitialWallet) {
      showToast(
        `Saldo ${selectedInitialWallet.name} tidak cukup, sisa ${formatIDR(selectedInitialWallet.balance)}`,
        'error'
      );
      return;
    }

    const deadlineDate = !selectedDate
      ? new Date(Date.UTC(NO_DEADLINE_YEAR, 11, 31, 0, 0, 0))
      : new Date(
          Date.UTC(
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            selectedDate.getDate(),
            12,
            0,
            0
          )
        );

    setSubmitting(true);
    try {
      if (isEdit && id) {
        await goalService.updateGoal(id, {
          name: cleanName,
          targetAmount,
          deadline: deadlineDate.toISOString(),
        });
        await updateGoalTheme(id, { iconKey, colorKey });
        await refreshAllData();
        showToast('Target tabungan diperbarui');
      } else {
        const created = await goalService.createGoal({
          name: cleanName,
          targetAmount,
          currentAmount,
          ...(currentAmount > 0
            ? {
                initialSourceType,
                initialWalletId:
                  initialSourceType === 'WALLET' ? initialWalletId : null,
              }
            : {}),
          deadline: deadlineDate.toISOString(),
        });
        await updateGoalTheme(created.id, { iconKey, colorKey });
        await refreshAllData();
        showToast('Tabungan baru berhasil dibuat');
      }
      router.back();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Gagal menyimpan target tabungan',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (refundToWalletId?: string) => {
    if (!id) return;
    setConfirmDeleteOpen(false);
    setDeleteWithBalanceOpen(false);
    setSubmitting(true);
    try {
      await goalService.deleteGoal(id, refundToWalletId);
      await refreshAllData();
      showToast(
        refundToWalletId
          ? 'Tabungan dihapus dan dana dikembalikan ke dompet'
          : 'Target tabungan dihapus'
      );
      router.replace({ pathname: '/(tabs)/budgets', params: { tab: 'goals' } });
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Gagal menghapus target tabungan',
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
          contentContainerStyle={{ paddingBottom: 112 + insets.bottom }}
        >
          {/* CURVED ROYAL BLUE HEADER */}
          <LinearGradient
            colors={['#4B89FF', '#3B7AF5', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}
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
                  {isEdit ? 'Edit Tabungan' : 'Buat Tabungan Baru'}
                </Text>
              </View>

              {isEdit ? (
                <Pressable
                  onPress={() => {
                    if (currentAmount > 0) {
                      setDeleteWithBalanceOpen(true);
                    } else {
                      setConfirmDeleteOpen(true);
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Hapus target tabungan"
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
              <Text style={styles.loadingText}>Memuat data tabungan</Text>
            </View>
          ) : (
            <Animated.View
              layout={LinearTransition.springify().damping(20).stiffness(160)}
            >
              {/* OVERLAPPING LIVE INTERACTIVE POCKET CARD */}
              <Animated.View
                entering={FadeInDown.duration(360).springify().damping(18).stiffness(140)}
                style={[styles.previewWrap, previewCardAnimStyle]}
              >
                <LinearGradient
                  colors={selectedPalette.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.previewCard}
                >
                  <View style={styles.geoCircleTop} />
                  <View style={styles.geoCircleBottom} />

                  <View style={styles.previewTopRow}>
                    <View style={styles.previewIconBadge}>
                      {renderGoalThemeIcon(iconKey, '#FFFFFF', 20)}
                    </View>
                    <View style={styles.previewDeadlineBadge}>
                      <Text style={styles.previewDeadlineText}>{deadlineBadgeText}</Text>
                    </View>
                  </View>

                  <Text style={styles.previewName} numberOfLines={1}>
                    {name.trim() || 'Nama tabunganmu'}
                  </Text>

                  <Text
                    style={[styles.previewTarget, Typography.tabularNums]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {formatIDR(targetAmount)}
                  </Text>

                  <View style={styles.previewProgressTrack}>
                    <Animated.View
                      style={[styles.previewProgressFill, progressFillAnimStyle]}
                    />
                  </View>

                  <View style={styles.previewFooterRow}>
                    <Text style={[styles.previewFooterText, Typography.tabularNums]}>
                      {currentAmount > 0
                        ? `Terkumpul ${formatIDR(currentAmount)}`
                        : 'Target dana'}
                    </Text>
                    <Text style={[styles.previewFooterPct, Typography.tabularNums]}>
                      {previewPct}%
                    </Text>
                  </View>
                </LinearGradient>
              </Animated.View>

              {/* STRIP RINGKAS PERSONALISASI WARNA & IKON */}
              <Animated.View
                entering={FadeInDown.delay(50).duration(360).springify().damping(18).stiffness(140)}
                layout={LinearTransition.springify().damping(20).stiffness(160)}
                style={styles.softCard}
              >
                <View style={styles.colorRow}>
                  {GOAL_COLOR_PALETTE.map((item) => {
                    const selected = colorKey === item.key;
                    return (
                      <TactilePressable
                        key={item.key}
                        scaleTo={0.92}
                        onPress={() => {
                          setColorKey(item.key);
                          triggerPreviewPulse();
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Pilih warna ${item.label}`}
                        style={[
                          styles.colorOuterRing,
                          selected && { borderColor: item.primary },
                        ]}
                      >
                        <View
                          style={[
                            styles.colorCircle,
                            { backgroundColor: item.primary },
                          ]}
                        >
                          {selected ? (
                            <Check size={14} color="#FFFFFF" strokeWidth={2.8} />
                          ) : null}
                        </View>
                      </TactilePressable>
                    );
                  })}
                </View>

                <View style={styles.stripDivider} />

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.iconScroll}
                >
                  {GOAL_ICON_OPTIONS.map((opt) => {
                    const selected = iconKey === opt.key;
                    return (
                      <TactilePressable
                        key={opt.key}
                        scaleTo={0.93}
                        onPress={() => {
                          setIconKey(opt.key);
                          triggerPreviewPulse();
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Pilih ikon ${opt.label}`}
                        style={[
                          styles.iconOptionBox,
                          selected && {
                            backgroundColor: selectedPalette.softBg,
                            borderColor: selectedPalette.primary,
                          },
                        ]}
                      >
                        {renderGoalThemeIcon(
                          opt.key,
                          selected ? selectedPalette.primary : Colors.textSecondary,
                          19
                        )}
                      </TactilePressable>
                    );
                  })}
                </ScrollView>
              </Animated.View>

              {/* SECTION DETAIL TARGET & NOMINAL PINTAR */}
              <Animated.View
                entering={FadeInDown.delay(100).duration(360).springify().damping(18).stiffness(140)}
                layout={LinearTransition.springify().damping(20).stiffness(160)}
                style={styles.softCard}
              >
                <View style={styles.labelWithCount}>
                  <Text style={styles.cardTitleNoMargin}>Nama Target</Text>
                  <Text style={[styles.charCounter, Typography.tabularNums]}>
                    {name.length}/40
                  </Text>
                </View>
                <TextInput
                  style={[
                    styles.nameInput,
                    nameFocused && { borderColor: selectedPalette.primary },
                  ]}
                  placeholder="Contoh: Dana Darurat"
                  placeholderTextColor="#94A3B8"
                  value={name}
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                  onChangeText={(val) => setName(val.slice(0, 40))}
                  maxLength={40}
                />

                <View style={[styles.labelWithCount, { marginTop: 18 }]}>
                  <Text style={styles.cardTitleNoMargin}>Target Dana</Text>
                  {targetAmount > 0 ? (
                    <TactilePressable
                      scaleTo={0.94}
                      onPress={() => {
                        setTargetText('');
                        triggerPreviewPulse();
                      }}
                      style={styles.resetBtn}
                    >
                      <RotateCcw size={12} color={Colors.textSecondary} strokeWidth={2.2} />
                      <Text style={styles.resetBtnText}>Reset</Text>
                    </TactilePressable>
                  ) : null}
                </View>

                <View
                  style={[
                    styles.amountInputRow,
                    targetFocused && { borderColor: selectedPalette.primary },
                  ]}
                >
                  <Text style={styles.rpPrefix}>Rp</Text>
                  <TextInput
                    style={[styles.amountInput, Typography.tabularNums]}
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={targetText}
                    onFocus={() => setTargetFocused(true)}
                    onBlur={() => setTargetFocused(false)}
                    onChangeText={(val) => setTargetText(formatThousands(val))}
                  />
                </View>

                <View style={styles.stepChipRow}>
                  {STEP_CHIPS.map((step) => (
                    <TactilePressable
                      key={step.add}
                      onPress={() => handleAddStep(step.add)}
                      style={styles.stepChip}
                    >
                      <Text style={[styles.stepChipText, Typography.tabularNums]}>
                        {step.label}
                      </Text>
                    </TactilePressable>
                  ))}
                </View>

                {!isEdit ? (
                  <View style={styles.accordionWrap}>
                    <Pressable
                      onPress={() => setShowInitialBalance((prev) => !prev)}
                      style={styles.accordionHeader}
                    >
                      <Text style={styles.accordionTitle}>
                        Sudah punya saldo awal?
                      </Text>
                      <Animated.View style={chevronAnimStyle}>
                        <ChevronDown size={17} color={Colors.textSecondary} strokeWidth={2.2} />
                      </Animated.View>
                    </Pressable>

                    {showInitialBalance ? (
                      <Animated.View
                        entering={FadeInDown.duration(260)}
                        exiting={FadeOutUp.duration(200)}
                        style={styles.accordionBody}
                      >
                        <View
                          style={[
                            styles.smallAmountRow,
                            isInitialInsufficient && { borderColor: Colors.expense },
                          ]}
                        >
                          <Text style={styles.smallRpPrefix}>Rp</Text>
                          <TextInput
                            style={[styles.smallAmountInput, Typography.tabularNums]}
                            placeholder="0"
                            placeholderTextColor="#94A3B8"
                            keyboardType="numeric"
                            value={currentText}
                            onChangeText={(val) => setCurrentText(formatThousands(val))}
                          />
                        </View>
                        {isInitialInsufficient && selectedInitialWallet ? (
                          <Text style={[styles.insufficientText, Typography.tabularNums]}>
                            Saldo dompet tidak cukup, sisa {formatIDR(selectedInitialWallet.balance)}
                          </Text>
                        ) : null}

                        <Text style={[styles.subLabel, { marginTop: 12, marginBottom: 8 }]}>
                          Sumber Dana Awal (Opsional)
                        </Text>
                        <View style={styles.sourceSegmentRow}>
                          <TactilePressable
                            onPress={() => setInitialSourceType('WALLET')}
                            style={[
                              styles.sourceSegmentBtn,
                              initialSourceType === 'WALLET' && {
                                backgroundColor: selectedPalette.softBg,
                                borderColor: selectedPalette.primary,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.sourceSegmentText,
                                initialSourceType === 'WALLET' && {
                                  color: selectedPalette.text,
                                },
                              ]}
                            >
                              Dari Dompet
                            </Text>
                          </TactilePressable>
                          <TactilePressable
                            onPress={() => setInitialSourceType('EXTERNAL')}
                            style={[
                              styles.sourceSegmentBtn,
                              initialSourceType === 'EXTERNAL' && {
                                backgroundColor: selectedPalette.softBg,
                                borderColor: selectedPalette.primary,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.sourceSegmentText,
                                initialSourceType === 'EXTERNAL' && {
                                  color: selectedPalette.text,
                                },
                              ]}
                            >
                              Dana Luar
                            </Text>
                          </TactilePressable>
                        </View>

                        {initialSourceType === 'WALLET' && activeWallets.length > 0 ? (
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.walletChipScroll}
                          >
                            {activeWallets.map((w) => {
                              const selected = w.id === initialWalletId;
                              return (
                                <TactilePressable
                                  key={w.id}
                                  onPress={() => setInitialWalletId(w.id)}
                                  style={[
                                    styles.walletPickChip,
                                    selected && {
                                      backgroundColor: selectedPalette.softBg,
                                      borderColor: selectedPalette.primary,
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.walletPickName,
                                      selected && { color: selectedPalette.text },
                                    ]}
                                  >
                                    {w.shortName || w.name}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.walletPickBal,
                                      Typography.tabularNums,
                                      selected && { color: selectedPalette.primary },
                                    ]}
                                  >
                                    {formatIDR(w.balance)}
                                  </Text>
                                </TactilePressable>
                              );
                            })}
                          </ScrollView>
                        ) : (
                          <Text style={styles.helperText}>
                            Saldo awal dicatat terpisah tanpa memotong saldo dompet.
                          </Text>
                        )}
                      </Animated.View>
                    ) : null}
                  </View>
                ) : (
                  <View style={styles.readonlyAmountBox}>
                    <Text style={styles.readonlyLabel}>Dana Terkumpul Saat Ini</Text>
                    <Text style={[styles.readonlyAmountValue, Typography.tabularNums]}>
                      {formatIDR(currentAmount)}
                    </Text>
                  </View>
                )}
              </Animated.View>

              {/* SECTION TARGET WAKTU & SIMULASI RITME NABUNG */}
              <Animated.View
                entering={FadeInDown.delay(150).duration(360).springify().damping(18).stiffness(140)}
                layout={LinearTransition.springify().damping(20).stiffness(160)}
                style={styles.softCard}
              >
                <Text style={styles.cardTitle}>Target Waktu</Text>
                <View style={styles.presetGrid}>
                  {DURATION_PRESETS.map((preset) => {
                    const active = selectedPreset === preset.key;
                    return (
                      <TactilePressable
                        key={preset.key}
                        onPress={() => handleSelectDuration(preset.key, preset.months)}
                        style={[
                          styles.presetPill,
                          active && {
                            backgroundColor: selectedPalette.softBg,
                            borderColor: selectedPalette.primary,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.presetText,
                            active && { color: selectedPalette.text },
                          ]}
                        >
                          {preset.label}
                        </Text>
                      </TactilePressable>
                    );
                  })}
                </View>

                <TactilePressable
                  onPress={() => setCalendarOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Buka kalender tanggal target"
                  style={styles.calendarTriggerCard}
                >
                  <View style={styles.calendarTriggerLeft}>
                    <View
                      style={[
                        styles.calendarIconBox,
                        { backgroundColor: selectedPalette.softBg },
                      ]}
                    >
                      <Calendar size={16} color={selectedPalette.primary} strokeWidth={2.2} />
                    </View>
                    <Text
                      style={[
                        styles.calendarTriggerText,
                        !selectedDate && styles.calendarTriggerTextMuted,
                      ]}
                      numberOfLines={1}
                    >
                      {selectedDate
                        ? formatIndonesianFullDate(selectedDate)
                        : 'Pilih tanggal di kalender'}
                    </Text>
                  </View>
                  <View style={styles.calendarChangePill}>
                    <Text style={[styles.calendarChangeText, { color: selectedPalette.primary }]}>
                      Ubah
                    </Text>
                    <ChevronRight size={15} color={selectedPalette.primary} strokeWidth={2.2} />
                  </View>
                </TactilePressable>

                {rhythmStats ? (
                  <Animated.View
                    entering={FadeInDown.duration(260)}
                    exiting={FadeOutUp.duration(200)}
                    layout={LinearTransition.springify().damping(20).stiffness(160)}
                    style={styles.rhythmCard}
                  >
                    <Text style={styles.rhythmHeading}>Simulasi Ritme Nabung</Text>
                    <View style={styles.rhythmCols}>
                      <View style={styles.rhythmCol}>
                        <Text style={styles.rhythmLabel}>Harian</Text>
                        <Text
                          style={[styles.rhythmValue, Typography.tabularNums]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                        >
                          {formatIDR(rhythmStats.daily)}
                        </Text>
                        <Text style={styles.rhythmUnit}>/hari</Text>
                      </View>

                      <View style={styles.rhythmDivider} />

                      <View style={styles.rhythmCol}>
                        <Text style={styles.rhythmLabel}>Mingguan</Text>
                        <Text
                          style={[styles.rhythmValue, Typography.tabularNums]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                        >
                          {formatIDR(rhythmStats.weekly)}
                        </Text>
                        <Text style={styles.rhythmUnit}>/minggu</Text>
                      </View>

                      <View style={styles.rhythmDivider} />

                      <View style={styles.rhythmCol}>
                        <Text style={styles.rhythmLabel}>Bulanan</Text>
                        <Text
                          style={[styles.rhythmValue, Typography.tabularNums]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                        >
                          {formatIDR(rhythmStats.monthly)}
                        </Text>
                        <Text style={styles.rhythmUnit}>/bulan</Text>
                      </View>
                    </View>

                    <Text style={styles.rhythmFooter}>
                      Target tercapai pada {rhythmStats.targetLabel}
                    </Text>
                  </Animated.View>
                ) : null}
              </Animated.View>
            </Animated.View>
          )}
        </ScrollView>

        {/* STICKY BOTTOM ACTION BAR */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <TactilePressable
            disabled={loading || submitting || isInitialInsufficient}
            onPress={() => void handleSave()}
            accessibilityRole="button"
            accessibilityLabel={isEdit ? 'Simpan Perubahan' : 'Buat Tabungan'}
            style={[
              styles.primaryBtn,
              { backgroundColor: selectedPalette.primary },
              (loading || submitting || isInitialInsufficient) && { opacity: 0.5 },
            ]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {isEdit ? 'Simpan Perubahan' : 'Buat Tabungan'}
              </Text>
            )}
          </TactilePressable>
        </View>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={confirmDeleteOpen}
        title="Hapus Target Tabungan?"
        message={`Target "${name || 'ini'}" akan dihapus. Saldo dompet Anda tetap aman.`}
        confirmLabel="Hapus"
        variant="danger"
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />

      <DeleteGoalSheet
        visible={deleteWithBalanceOpen}
        goalName={name || 'ini'}
        currentAmount={currentAmount}
        wallets={wallets}
        onClose={() => setDeleteWithBalanceOpen(false)}
        onConfirmDelete={(refundToWalletId) => void handleDelete(refundToWalletId)}
      />

      <CalendarPickerSheet
        visible={calendarOpen}
        initialDate={selectedDate}
        accentColor={selectedPalette.primary}
        onClose={() => setCalendarOpen(false)}
        onSelect={(picked) => {
          setSelectedDate(picked);
          setSelectedPreset('CUSTOM');
          triggerPreviewPulse();
        }}
        onClear={() => {
          setSelectedDate(null);
          setSelectedPreset('NONE');
          triggerPreviewPulse();
        }}
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
    paddingBottom: 42,
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
    marginTop: -24,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontFamily: FontFamily.medium,
    fontSize: 13.5,
    color: Colors.textSecondary,
  },
  previewWrap: {
    marginHorizontal: 18,
    marginTop: -26,
    borderRadius: 24,
    shadowColor: '#0F172A',
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 6,
  },
  previewCard: {
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
  },
  geoCircleTop: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.1)',
    top: -48,
    right: -32,
  },
  geoCircleBottom: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: -36,
    left: -20,
  },
  previewTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  previewIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewDeadlineBadge: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  previewDeadlineText: {
    fontFamily: FontFamily.semibold,
    fontSize: 11.5,
    color: '#FFFFFF',
  },
  previewName: {
    fontFamily: FontFamily.semibold,
    fontSize: 14.5,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  previewTarget: {
    fontFamily: FontFamily.bold,
    fontSize: 27,
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginBottom: 14,
  },
  previewProgressTrack: {
    height: 7,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
    marginBottom: 8,
  },
  previewProgressFill: {
    height: 7,
    borderRadius: 99,
    backgroundColor: '#FFFFFF',
  },
  previewFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewFooterText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.88)',
  },
  previewFooterPct: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  softCard: {
    marginHorizontal: 18,
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    padding: 20,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 2,
  },
  stripDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
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
  subLabel: {
    fontFamily: FontFamily.semibold,
    fontSize: 12.5,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  colorOuterRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircle: {
    width: 31,
    height: 31,
    borderRadius: 15.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconScroll: {
    gap: 10,
  },
  iconOptionBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelWithCount: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  charCounter: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.textMuted,
  },
  nameInput: {
    backgroundColor: 'transparent',
    borderBottomWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 2,
    height: 46,
    fontFamily: FontFamily.semibold,
    fontSize: 15.5,
    color: Colors.textPrimary,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: '#F1F5F9',
  },
  resetBtnText: {
    fontFamily: FontFamily.semibold,
    fontSize: 11.5,
    color: Colors.textSecondary,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderBottomWidth: 2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 2,
    height: 56,
    gap: 10,
  },
  rpPrefix: {
    fontFamily: FontFamily.bold,
    fontSize: 21,
    color: Colors.textSecondary,
  },
  amountInput: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: 25,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  stepChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  stepChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepChipText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12.5,
    color: Colors.textPrimary,
  },
  accordionWrap: {
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 14,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  accordionTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
    color: Colors.textSecondary,
  },
  accordionBody: {
    marginTop: 12,
  },
  smallAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderBottomWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 2,
    height: 46,
    gap: 8,
  },
  smallRpPrefix: {
    fontFamily: FontFamily.bold,
    fontSize: 15.5,
    color: Colors.textSecondary,
  },
  smallAmountInput: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: 17,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  helperText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 8,
  },
  insufficientText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.expense,
    marginTop: 6,
  },
  sourceSegmentRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  sourceSegmentBtn: {
    flex: 1,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceSegmentText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12.5,
    color: Colors.textSecondary,
  },
  walletChipScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  walletPickChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 2,
  },
  walletPickName: {
    fontFamily: FontFamily.semibold,
    fontSize: 12.5,
    color: Colors.textPrimary,
  },
  walletPickBal: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.textMuted,
  },
  readonlyAmountBox: {
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 14,
    gap: 4,
  },
  readonlyLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.textMuted,
  },
  readonlyAmountValue: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetPill: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  calendarTriggerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 14,
    paddingBottom: 2,
    paddingHorizontal: 2,
    gap: 10,
  },
  calendarChangePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  calendarChangeText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12.5,
  },
  calendarTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  calendarIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarTriggerText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
    color: Colors.textPrimary,
    flex: 1,
  },
  calendarTriggerTextMuted: {
    fontFamily: FontFamily.medium,
    color: Colors.textMuted,
  },
  rhythmCard: {
    marginTop: 14,
    backgroundColor: '#F0F6FF',
    borderWidth: 1,
    borderColor: '#D6E6FF',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  rhythmHeading: {
    fontFamily: FontFamily.bold,
    fontSize: 12.5,
    color: '#1E40AF',
  },
  rhythmCols: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rhythmCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
    gap: 2,
  },
  rhythmDivider: {
    width: 1,
    height: 34,
    backgroundColor: '#BFDBFE',
  },
  rhythmLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  rhythmValue: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  rhythmUnit: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.textMuted,
  },
  rhythmFooter: {
    fontFamily: FontFamily.semibold,
    fontSize: 12,
    color: '#1D4ED8',
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
