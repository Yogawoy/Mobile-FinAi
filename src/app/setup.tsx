import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
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
  ArrowRight,
  Check,
  CheckCircle2,
  Flame,
  Layers,
  PiggyBank,
  Plus,
  Receipt,
} from 'lucide-react-native';
import Animated, {
  Easing,
  FadeInLeft,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useToast } from '@/components/ui/ToastProvider';
import { BaseBottomSheet } from '@/components/ui/BaseBottomSheet';
import { WalletBrandLogo } from '@/components/ui/WalletBrandLogo';
import {
  BUDGET_RULE_META,
  FINANCIAL_CHALLENGE_META,
  type BudgetRuleKey,
  type FinancialChallengeKey,
  useFinance,
} from '@/context/FinanceContext';
import { formatIDR } from '@/lib/format';
import { type WalletItem } from '@/lib/mockData';
import { useResponsive } from '@/lib/responsive';
import {
  getWalletTheme,
  type WalletColorKey,
  type WalletTypeKey,
} from '@/lib/walletTheme';
import { FontFamily, Typography } from '@/theme/tokens';

type SetupStep = 1 | 2 | 3 | 4;

interface SetupWalletDraft {
  id: string;
  name: string;
  type: WalletTypeKey;
  typeLabel: string;
  colorKey: WalletColorKey;
  selected: boolean;
  balanceText: string;
}

const CARD_SHADOW = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.045,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

const CTA_SHADOW = {
  shadowColor: '#3B7AF5',
  shadowOpacity: 0.22,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 5 },
  elevation: 4,
} as const;

const CHALLENGE_OPTIONS: {
  key: FinancialChallengeKey;
  title: string;
  subtitle: string;
}[] = [
  {
    key: 'leak_end_of_month',
    title: 'Sering bocor di akhir bulan',
    subtitle: 'Fokus kontrol laju belanja harian',
  },
  {
    key: 'scattered_wallets',
    title: 'Saldo tersebar di banyak dompet',
    subtitle: 'Fokus konsolidasi bank & e-wallet',
  },
  {
    key: 'inconsistent_saving',
    title: 'Susah konsisten menabung',
    subtitle: 'Fokus target tabungan otomatis',
  },
  {
    key: 'messy_records',
    title: 'Belum punya catatan rapi',
    subtitle: 'Fokus kebiasaan catat cepat harian',
  },
];

const INCOME_PRESETS = [
  { amount: 1_500_000, label: '1,5jt' },
  { amount: 3_000_000, label: '3jt' },
  { amount: 5_000_000, label: '5jt' },
  { amount: 8_000_000, label: '8jt' },
];

const BUDGET_RULE_OPTIONS: {
  key: BudgetRuleKey;
  label: string;
  tag?: string;
  caption: string;
}[] = [
  { key: '50_30_20', label: '50/30/20', tag: 'Populer', caption: 'Seimbang' },
  { key: '60_20_20', label: '60/20/20', caption: 'Kebutuhan' },
  { key: '70_20_10', label: '70/20/10', caption: 'Ketat' },
];

const PRESET_WALLETS: SetupWalletDraft[] = [
  {
    id: 'bca',
    name: 'Bank BCA',
    type: 'BANK',
    typeLabel: 'Bank',
    colorKey: 'royal',
    selected: false,
    balanceText: '',
  },
  {
    id: 'bri',
    name: 'Bank BRI',
    type: 'BANK',
    typeLabel: 'Bank',
    colorKey: 'navy',
    selected: false,
    balanceText: '',
  },
  {
    id: 'mandiri',
    name: 'Bank Mandiri',
    type: 'BANK',
    typeLabel: 'Bank',
    colorKey: 'navy',
    selected: false,
    balanceText: '',
  },
  {
    id: 'bni',
    name: 'Bank BNI',
    type: 'BANK',
    typeLabel: 'Bank',
    colorKey: 'teal',
    selected: false,
    balanceText: '',
  },
  {
    id: 'bsi',
    name: 'BSI',
    type: 'BANK',
    typeLabel: 'Bank',
    colorKey: 'teal',
    selected: false,
    balanceText: '',
  },
  {
    id: 'cimb',
    name: 'CIMB Niaga',
    type: 'BANK',
    typeLabel: 'Bank',
    colorKey: 'slate',
    selected: false,
    balanceText: '',
  },
  {
    id: 'seabank',
    name: 'SeaBank',
    type: 'SAVINGS',
    typeLabel: 'Bank Digital',
    colorKey: 'royal',
    selected: false,
    balanceText: '',
  },
  {
    id: 'jago',
    name: 'Bank Jago',
    type: 'SAVINGS',
    typeLabel: 'Bank Digital',
    colorKey: 'royal',
    selected: false,
    balanceText: '',
  },
  {
    id: 'gopay',
    name: 'GoPay',
    type: 'EWALLET',
    typeLabel: 'E-Wallet',
    colorKey: 'teal',
    selected: false,
    balanceText: '',
  },
  {
    id: 'dana',
    name: 'DANA',
    type: 'EWALLET',
    typeLabel: 'E-Wallet',
    colorKey: 'royal',
    selected: false,
    balanceText: '',
  },
  {
    id: 'ovo',
    name: 'OVO',
    type: 'EWALLET',
    typeLabel: 'E-Wallet',
    colorKey: 'slate',
    selected: false,
    balanceText: '',
  },
  {
    id: 'shopeepay',
    name: 'ShopeePay',
    type: 'EWALLET',
    typeLabel: 'E-Wallet',
    colorKey: 'emerald',
    selected: false,
    balanceText: '',
  },
  {
    id: 'linkaja',
    name: 'LinkAja',
    type: 'EWALLET',
    typeLabel: 'E-Wallet',
    colorKey: 'slate',
    selected: false,
    balanceText: '',
  },
  {
    id: 'cash',
    name: 'Uang Tunai',
    type: 'CASH',
    typeLabel: 'Tunai',
    colorKey: 'emerald',
    selected: false,
    balanceText: '',
  },
];

type WalletFilterTab = 'ALL' | 'BANK' | 'EWALLET';

const WALLET_BALANCE_PRESETS = [
  { amount: 0, label: 'Rp 0' },
  { amount: 500_000, label: '500rb' },
  { amount: 1_000_000, label: '1jt' },
  { amount: 5_000_000, label: '5jt' },
];

const STEP_HEADERS: Record<SetupStep, { title: string; subtitle: string }> = {
  1: {
    title: 'Apa tantangan keuanganmu saat ini?',
    subtitle: 'Membantu Smart Finance menyesuaikan pengingat & saran AI untukmu.',
  },
  2: {
    title: 'Atur penghasilan & pola anggaran',
    subtitle: 'Kami otomatis menghitungkan batas aman belanja harianmu.',
  },
  3: {
    title: 'Dompet apa saja yang kamu pakai?',
    subtitle: 'Pilih rekening & e-wallet harianmu agar saldo langsung sinkron.',
  },
  4: {
    title: 'Rencana keuanganmu sudah siap!',
    subtitle: 'Disusun otomatis berdasarkan profil dan penghasilanmu.',
  },
};

function formatThousands(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parseAmount(text: string): number {
  const n = Number(text.replace(/[^0-9]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function renderChallengeIcon(key: FinancialChallengeKey, active: boolean) {
  const color = active ? '#3B7AF5' : '#64748B';
  switch (key) {
    case 'leak_end_of_month':
      return <Flame size={19} color={color} strokeWidth={1.9} />;
    case 'scattered_wallets':
      return <Layers size={19} color={color} strokeWidth={1.9} />;
    case 'inconsistent_saving':
      return <PiggyBank size={19} color={color} strokeWidth={1.9} />;
    case 'messy_records':
      return <Receipt size={19} color={color} strokeWidth={1.9} />;
  }
}

function AnimatedHeaderSegment({
  filled,
  active,
}: {
  filled: boolean;
  active: boolean;
}) {
  const flexVal = useSharedValue(active ? 1.55 : 1);

  useEffect(() => {
    flexVal.value = withTiming(active ? 1.55 : 1, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [active, flexVal]);

  const animStyle = useAnimatedStyle(() => ({
    flex: flexVal.value,
  }));

  return (
    <Animated.View
      style={[
        styles.progressSegment,
        active
          ? styles.progressSegmentCurrent
          : filled
            ? styles.progressSegmentDone
            : styles.progressSegmentIdle,
        animStyle,
      ]}
    />
  );
}

function AnimatedAllocationBar({
  needsPct,
  wantsPct,
  savingsPct,
}: {
  needsPct: number;
  wantsPct: number;
  savingsPct: number;
}) {
  const needsFlex = useSharedValue(needsPct);
  const wantsFlex = useSharedValue(wantsPct);
  const savingsFlex = useSharedValue(savingsPct);

  useEffect(() => {
    const cfg = { duration: 320, easing: Easing.out(Easing.cubic) };
    needsFlex.value = withTiming(needsPct, cfg);
    wantsFlex.value = withTiming(wantsPct, cfg);
    savingsFlex.value = withTiming(savingsPct, cfg);
  }, [needsPct, wantsPct, savingsPct, needsFlex, wantsFlex, savingsFlex]);

  const needsStyle = useAnimatedStyle(() => ({ flex: needsFlex.value }));
  const wantsStyle = useAnimatedStyle(() => ({ flex: wantsFlex.value }));
  const savingsStyle = useAnimatedStyle(() => ({ flex: savingsFlex.value }));

  return (
    <View style={styles.splitBarWrap}>
      <View style={styles.splitBarPctRow}>
        <Text style={[styles.splitBarPctText, Typography.tabularNums, { color: '#2563EB' }]}>
          {needsPct}% Kebutuhan
        </Text>
        <Text style={[styles.splitBarPctText, Typography.tabularNums, { color: '#64748B' }]}>
          {wantsPct}% Keinginan
        </Text>
        <Text style={[styles.splitBarPctText, Typography.tabularNums, { color: '#059669' }]}>
          {savingsPct}% Tabungan
        </Text>
      </View>

      <View style={styles.splitBarTrack}>
        <Animated.View style={[styles.splitBarPill, needsStyle]}>
          <LinearGradient
            colors={['#4B89FF', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.splitBarFill}
          />
        </Animated.View>

        <Animated.View style={[styles.splitBarPill, wantsStyle]}>
          <LinearGradient
            colors={['#94A3B8', '#64748B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.splitBarFill}
          />
        </Animated.View>

        <Animated.View style={[styles.splitBarPill, savingsStyle]}>
          <LinearGradient
            colors={['#34D399', '#10B981']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.splitBarFill}
          />
        </Animated.View>
      </View>
    </View>
  );
}

interface TactilePressableProps {
  onPress: () => void;
  pressedScale?: number;
  style?: any;
  accessibilityRole?: 'button' | 'radio' | 'checkbox';
  accessibilityLabel?: string;
  children: React.ReactNode;
}

function TactilePressable({
  onPress,
  pressedScale = 0.985,
  style,
  accessibilityRole = 'button',
  accessibilityLabel,
  children,
}: TactilePressableProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(pressedScale, {
          duration: 110,
          easing: Easing.out(Easing.cubic),
        });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, {
          duration: 160,
          easing: Easing.out(Easing.cubic),
        });
      }}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={[style, animStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

export default function SetupWizardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, isSmallWidth, horizontalPadding } = useResponsive();
  const { showToast } = useToast();
  const {
    userProfile,
    wallets,
    hasCompletedSetup,
    completeAccountSetup,
  } = useFinance();

  const [step, setStep] = useState<SetupStep>(1);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  // Step 1 — Tantangan Keuangan
  const [challenge, setChallenge] = useState<FinancialChallengeKey>(
    hasCompletedSetup ? userProfile.financialChallenge : 'leak_end_of_month'
  );

  // Step 2 — Penghasilan & Pola Alokasi
  const [incomeText, setIncomeText] = useState(
    hasCompletedSetup && userProfile.monthlyIncomeTarget > 0
      ? formatThousands(String(userProfile.monthlyIncomeTarget))
      : '5.000.000'
  );
  const [budgetRule, setBudgetRule] = useState<BudgetRuleKey>(
    hasCompletedSetup ? userProfile.budgetRule : '50_30_20'
  );

  // Step 3 — Dompet & Saldo Awal
  const [walletFilter, setWalletFilter] = useState<WalletFilterTab>('ALL');
  const [walletDrafts, setWalletDrafts] = useState<SetupWalletDraft[]>(() => {
    if (!hasCompletedSetup) return PRESET_WALLETS;
    const savedMap = new Map(wallets.map((w) => [w.id, w]));
    const presetIds = new Set(PRESET_WALLETS.map((p) => p.id));
    const mergedPresets = PRESET_WALLETS.map((preset) => {
      const saved = savedMap.get(preset.id);
      if (!saved) return preset;
      return {
        ...preset,
        selected: true,
        balanceText: saved.balance > 0 ? formatThousands(String(saved.balance)) : '',
      };
    });
    const extraWallets: SetupWalletDraft[] = wallets
      .filter((w) => !presetIds.has(w.id) && !w.isArchived)
      .map((w) => ({
        id: w.id,
        name: w.name,
        type: w.type,
        typeLabel:
          w.type === 'CASH'
            ? 'Tunai'
            : w.type === 'EWALLET' || w.type === 'E_WALLET'
              ? 'E-Wallet'
              : w.type === 'SAVINGS'
                ? 'Tabungan'
                : 'Bank',
        colorKey: w.colorKey ?? 'royal',
        selected: true,
        balanceText: w.balance > 0 ? formatThousands(String(w.balance)) : '',
      }));
    return [...mergedPresets, ...extraWallets];
  });

  // Mini Bottom Sheet untuk edit saldo dompet
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
  const [draftBalanceText, setDraftBalanceText] = useState('');

  // Modal Tambah Dompet Baru
  const [showCustomWalletModal, setShowCustomWalletModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customType, setCustomType] = useState<WalletTypeKey>('BANK');
  const [customBalanceText, setCustomBalanceText] = useState('');

  const incomeNum = parseAmount(incomeText);
  const ruleMeta = BUDGET_RULE_META[budgetRule];

  const needsAmount = Math.round((incomeNum * ruleMeta.needsPct) / 100);
  const wantsAmount = Math.round((incomeNum * ruleMeta.wantsPct) / 100);
  const savingsAmount = Math.max(0, incomeNum - needsAmount - wantsAmount);
  const spendableBudget = needsAmount + wantsAmount;
  const safeDailyLimit = Math.round(spendableBudget / 30);

  const selectedWallets = useMemo(
    () => walletDrafts.filter((w) => w.selected),
    [walletDrafts]
  );

  const totalInitialBalance = useMemo(
    () => selectedWallets.reduce((sum, w) => sum + parseAmount(w.balanceText), 0),
    [selectedWallets]
  );

  const filteredWallets = useMemo(() => {
    if (walletFilter === 'ALL') return walletDrafts;
    if (walletFilter === 'BANK') {
      return walletDrafts.filter((w) => w.type === 'BANK' || w.type === 'SAVINGS');
    }
    return walletDrafts.filter(
      (w) => w.type === 'EWALLET' || w.type === 'E_WALLET' || w.type === 'CASH'
    );
  }, [walletDrafts, walletFilter]);

  const editingWallet = useMemo(
    () => walletDrafts.find((w) => w.id === editingWalletId) ?? null,
    [walletDrafts, editingWalletId]
  );

  const openWalletBalanceSheet = (wallet: SetupWalletDraft) => {
    setEditingWalletId(wallet.id);
    setDraftBalanceText(wallet.balanceText);
  };

  const handleSaveWalletBalance = () => {
    if (!editingWalletId) return;
    setWalletDrafts((prev) =>
      prev.map((w) =>
        w.id === editingWalletId
          ? { ...w, selected: true, balanceText: draftBalanceText }
          : w
      )
    );
    setEditingWalletId(null);
  };

  const handleDeactivateOrRemoveWallet = () => {
    if (!editingWallet) return;
    if (editingWallet.id.startsWith('custom-')) {
      setWalletDrafts((prev) => prev.filter((w) => w.id !== editingWallet.id));
      showToast(`${editingWallet.name} dihapus`);
    } else {
      setWalletDrafts((prev) =>
        prev.map((w) =>
          w.id === editingWallet.id
            ? { ...w, selected: false, balanceText: '' }
            : w
        )
      );
    }
    setEditingWalletId(null);
  };

  const handleAddCustomWallet = () => {
    const trimmed = customName.trim();
    if (!trimmed) {
      showToast('Masukkan nama dompet terlebih dahulu', 'error');
      return;
    }

    const colorMap: Record<WalletTypeKey, WalletColorKey> = {
      BANK: 'royal',
      EWALLET: 'teal',
      E_WALLET: 'teal',
      SAVINGS: 'navy',
      CASH: 'slate',
    };
    const typeLabelMap: Record<WalletTypeKey, string> = {
      BANK: 'Bank',
      EWALLET: 'E-Wallet',
      E_WALLET: 'E-Wallet',
      SAVINGS: 'Tabungan',
      CASH: 'Tunai',
    };

    const nextWallet: SetupWalletDraft = {
      id: `custom-${Date.now()}`,
      name: trimmed,
      type: customType,
      typeLabel: typeLabelMap[customType],
      colorKey: colorMap[customType],
      selected: true,
      balanceText: formatThousands(customBalanceText),
    };

    setWalletDrafts((prev) => [...prev, nextWallet]);
    setCustomName('');
    setCustomBalanceText('');
    setShowCustomWalletModal(false);
    showToast(`${trimmed} ditambahkan`);
  };

  const handleBack = () => {
    if (step === 1) return;
    setDirection('back');
    setStep((prev) => (prev - 1) as SetupStep);
  };

  const handleNext = () => {
    if (step === 1) {
      setDirection('forward');
      setStep(2);
      return;
    }

    if (step === 2) {
      if (incomeNum <= 0) {
        showToast('Masukkan penghasilan bulanan lebih dari Rp 0', 'error');
        return;
      }
      setDirection('forward');
      setStep(3);
      return;
    }

    if (step === 3) {
      if (selectedWallets.length === 0) {
        showToast('Pilih minimal 1 dompet untuk mulai mencatat', 'error');
        return;
      }
      setDirection('forward');
      setStep(4);
      return;
    }

    const builtWallets: WalletItem[] = selectedWallets.map((draft, idx) => {
      const theme = getWalletTheme(draft.type, draft.colorKey);
      return {
        id: draft.id,
        name: draft.name,
        shortName: draft.name,
        type: draft.type,
        last4:
          draft.type === 'CASH'
            ? 'Dompet Fisik'
            : `•••• ${String(4100 + idx * 173).slice(0, 4)}`,
        balance: parseAmount(draft.balanceText),
        colorKey: draft.colorKey,
        isArchived: false,
        dotColor: theme.dotColor,
        gradient: theme.gradient,
      };
    });

    completeAccountSetup({
      monthlyIncomeTarget: incomeNum,
      savingsTargetPct: ruleMeta.savingsPct,
      focusGoal: FINANCIAL_CHALLENGE_META[challenge].focusLabel,
      financialChallenge: challenge,
      budgetRule,
      safeDailyLimit,
      wallets: builtWallets,
      budgets: [],
    });

    showToast('Blueprint keuangan aktif & siap digunakan!');
    router.replace('/(tabs)');
  };

  const stepEntering =
    direction === 'forward'
      ? FadeInRight.duration(260).easing(Easing.out(Easing.cubic))
      : FadeInLeft.duration(260).easing(Easing.out(Easing.cubic));

  const headerInfo = STEP_HEADERS[step];

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {/* HEADER GRADIEN BIRU PRESISI */}
          <LinearGradient
            colors={['#4B89FF', '#3B7AF5', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.blueHeader,
              {
                paddingTop: Math.max(insets.top, 12) + 4,
                paddingHorizontal: horizontalPadding,
              },
            ]}
          >
            <Svg
              width={width}
              height={145}
              viewBox={`0 0 ${width} 145`}
              style={styles.headerWave}
              pointerEvents="none"
            >
              <Path
                d={`M0,105 C${width * 0.34},45 ${width * 0.72},140 ${width},70 L${width},145 L0,145 Z`}
                fill="#FFFFFF"
                fillOpacity={0.08}
              />
            </Svg>

            <View style={styles.headerTopRow}>
              {step > 1 ? (
                <Pressable
                  onPress={handleBack}
                  accessibilityRole="button"
                  accessibilityLabel="Kembali"
                  style={({ pressed }) => [
                    styles.backBtn,
                    pressed && { opacity: 0.72 },
                  ]}
                >
                  <ArrowLeft size={21} color="#FFFFFF" strokeWidth={2.1} />
                </Pressable>
              ) : (
                <View style={styles.backPlaceholder} />
              )}

              <Text style={[styles.stepCounterText, Typography.tabularNums]}>
                Langkah {step} dari 4
              </Text>
            </View>

            <View style={styles.progressBarRow}>
              {[1, 2, 3, 4].map((s) => (
                <AnimatedHeaderSegment
                  key={s}
                  filled={s < step}
                  active={s === step}
                />
              ))}
            </View>

            <Text
              style={[
                styles.headerTitle,
                isSmallWidth && { fontSize: 19, lineHeight: 25 },
              ]}
            >
              {headerInfo.title}
            </Text>
            <Text style={styles.headerSubtitle}>{headerInfo.subtitle}</Text>
          </LinearGradient>

          {/* LANGKAH 1 — TANTANGAN KEUANGAN UTAMA */}
          {step === 1 ? (
            <Animated.View
              key="step-1"
              entering={stepEntering}
              style={[
                styles.overlapContainer,
                { paddingHorizontal: horizontalPadding },
              ]}
            >
              {CHALLENGE_OPTIONS.map((item) => {
                const active = challenge === item.key;
                return (
                  <TactilePressable
                    key={item.key}
                    onPress={() => setChallenge(item.key)}
                    accessibilityRole="radio"
                    accessibilityLabel={item.title}
                    style={[
                      styles.challengeCard,
                      active && styles.cardActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.challengeIconBox,
                        active && styles.challengeIconBoxActive,
                      ]}
                    >
                      {renderChallengeIcon(item.key, active)}
                    </View>

                    <View style={styles.challengeTextCol}>
                      <Text
                        style={styles.challengeTitle}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.86}
                      >
                        {item.title}
                      </Text>
                      <Text style={styles.challengeSubtitle} numberOfLines={1}>
                        {item.subtitle}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.radioCircle,
                        active && styles.radioCircleActive,
                      ]}
                    >
                      {active ? (
                        <Check size={12} color="#FFFFFF" strokeWidth={3} />
                      ) : null}
                    </View>
                  </TactilePressable>
                );
              })}

              <Text style={styles.calmFootnote}>
                Pilihan ini dapat diubah kapan saja melalui menu Profil.
              </Text>
            </Animated.View>
          ) : null}

          {/* LANGKAH 2 — PENGHASILAN & POLA ALOKASI (RAPI, RINGKAS, INPUT LEBIH KECIL) */}
          {step === 2 ? (
            <Animated.View
              key="step-2"
              entering={stepEntering}
              style={[
                styles.overlapContainerSpacious,
                { paddingHorizontal: horizontalPadding },
              ]}
            >
              {/* Kartu 1: Penghasilan Bulanan */}
              <View style={styles.step2Card}>
                <Text style={styles.microLabel}>PENGHASILAN BULANAN</Text>

                <View style={styles.incomeInputWell}>
                  <Text style={styles.incomePrefix}>Rp</Text>
                  <TextInput
                    style={[
                      styles.incomeInput,
                      Typography.tabularNums,
                      isSmallWidth && { fontSize: 20 },
                    ]}
                    value={incomeText}
                    onChangeText={(val) => setIncomeText(formatThousands(val))}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    accessibilityLabel="Penghasilan Bulanan"
                  />
                </View>

                <View style={styles.presetRow}>
                  {INCOME_PRESETS.map((preset) => {
                    const active = incomeNum === preset.amount;
                    return (
                      <Pressable
                        key={preset.amount}
                        onPress={() =>
                          setIncomeText(formatThousands(String(preset.amount)))
                        }
                        style={({ pressed }) => [
                          styles.presetChip,
                          active && styles.presetChipActive,
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.presetChipText,
                            Typography.tabularNums,
                            active && styles.presetChipTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {preset.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Kartu 2: Pola Alokasi & Estimasi */}
              <View style={styles.step2Card}>
                <Text style={styles.microLabel}>POLA ALOKASI ANGGARAN</Text>

                <View style={styles.ruleRow}>
                  {BUDGET_RULE_OPTIONS.map((opt) => {
                    const active = budgetRule === opt.key;
                    return (
                      <View key={opt.key} style={styles.ruleItemWrap}>
                        <TactilePressable
                          onPress={() => setBudgetRule(opt.key)}
                          accessibilityRole="radio"
                          accessibilityLabel={`Pola ${opt.label} ${opt.caption}`}
                          style={[
                            styles.ruleCard,
                            active && styles.ruleCardActive,
                          ]}
                        >
                          <View style={styles.ruleTopMeta}>
                            {opt.tag ? (
                              <View style={styles.popularPill}>
                                <Text style={styles.popularPillText}>
                                  {opt.tag}
                                </Text>
                              </View>
                            ) : (
                              <View style={styles.popularSpacer} />
                            )}
                            {active ? (
                              <View style={styles.miniCheckCircle}>
                                <Check size={9} color="#FFFFFF" strokeWidth={3} />
                              </View>
                            ) : null}
                          </View>

                          <Text
                            style={[
                              styles.ruleLabel,
                              Typography.tabularNums,
                              active && styles.ruleLabelActive,
                            ]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.85}
                          >
                            {opt.label}
                          </Text>

                          <Text
                            style={styles.ruleCaption}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.85}
                          >
                            {opt.caption}
                          </Text>
                        </TactilePressable>
                      </View>
                    );
                  })}
                </View>

                <AnimatedAllocationBar
                  needsPct={ruleMeta.needsPct}
                  wantsPct={ruleMeta.wantsPct}
                  savingsPct={ruleMeta.savingsPct}
                />

                <View style={styles.allocationRows}>
                  <View style={styles.allocationRow}>
                    <Text style={[styles.allocationLabel, { color: '#2563EB' }]}>
                      Kebutuhan ({ruleMeta.needsPct}%)
                    </Text>
                    <Text
                      style={[styles.allocationAmount, Typography.tabularNums]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.82}
                    >
                      {formatIDR(needsAmount)}
                    </Text>
                  </View>

                  <View style={styles.allocationRow}>
                    <Text style={styles.allocationLabel}>
                      Keinginan ({ruleMeta.wantsPct}%)
                    </Text>
                    <Text
                      style={[styles.allocationAmount, Typography.tabularNums]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.82}
                    >
                      {formatIDR(wantsAmount)}
                    </Text>
                  </View>

                  <View style={styles.allocationRow}>
                    <Text style={[styles.allocationLabel, { color: '#047857' }]}>
                      Tabungan ({ruleMeta.savingsPct}%)
                    </Text>
                    <Text
                      style={[
                        styles.allocationAmount,
                        Typography.tabularNums,
                        { color: '#10B981' },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.82}
                    >
                      {formatIDR(savingsAmount)}
                    </Text>
                  </View>
                </View>

                <View style={styles.hairlineDivider} />

                <View style={styles.allocationRow}>
                  <Text style={styles.allocationLabel}>Estimasi batas harian</Text>
                  <Text
                    style={[
                      styles.allocationAmount,
                      Typography.tabularNums,
                      { color: '#2563EB' },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.82}
                  >
                    {formatIDR(safeDailyLimit)}/hari
                  </Text>
                </View>
              </View>
            </Animated.View>
          ) : null}

          {/* LANGKAH 3 — FILTER KATEGORI + GRID 2 KOLOM + MINI BOTTOM SHEET SALDO */}
          {step === 3 ? (
            <Animated.View
              key="step-3"
              entering={stepEntering}
              style={[
                styles.overlapContainer,
                { paddingHorizontal: horizontalPadding },
              ]}
            >
              {/* Overlapping Total Saldo Card Kompak */}
              <View style={styles.totalSaldoCard}>
                <View style={styles.totalSaldoCol}>
                  <Text style={styles.microLabel}>TOTAL SALDO AWAL</Text>
                  <Text
                    style={[
                      styles.totalSaldoAmount,
                      Typography.tabularNums,
                      isSmallWidth && { fontSize: 21 },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.78}
                  >
                    {formatIDR(totalInitialBalance)}
                  </Text>
                </View>

                <View style={styles.walletCountPill}>
                  <Text
                    style={[styles.walletCountText, Typography.tabularNums]}
                    numberOfLines={1}
                  >
                    {selectedWallets.length} Aktif
                  </Text>
                </View>
              </View>

              {/* Filter Kategori Ringkas */}
              <View style={styles.filterTabRow}>
                {(
                  [
                    { key: 'ALL', label: 'Semua' },
                    { key: 'BANK', label: 'Bank' },
                    { key: 'EWALLET', label: 'E-Wallet & Tunai' },
                  ] as { key: WalletFilterTab; label: string }[]
                ).map((tab) => {
                  const active = walletFilter === tab.key;
                  return (
                    <Pressable
                      key={tab.key}
                      onPress={() => setWalletFilter(tab.key)}
                      style={[
                        styles.filterTabBtn,
                        active && styles.filterTabBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterTabText,
                          active && styles.filterTabTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {tab.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Grid 2 Kolom Kompak (Tap langsung isi saldo via Bottom Sheet) */}
              <View style={styles.walletGrid}>
                {filteredWallets.map((w) => {
                  const balanceNum = parseAmount(w.balanceText);
                  return (
                    <View key={w.id} style={styles.walletGridItem}>
                      <TactilePressable
                        onPress={() => openWalletBalanceSheet(w)}
                        accessibilityRole="button"
                        accessibilityLabel={`${w.name} ${w.selected ? formatIDR(balanceNum) : w.typeLabel}`}
                        style={[
                          styles.walletTile,
                          w.selected && styles.walletTileActive,
                        ]}
                      >
                        <WalletBrandLogo
                          walletId={w.id}
                          walletName={w.name}
                          type={w.type}
                          size={32}
                        />

                        <View style={styles.walletTileTextCol}>
                          <Text
                            style={styles.walletTileName}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.82}
                          >
                            {w.name}
                          </Text>
                          {w.selected ? (
                            <Text
                              style={[
                                styles.walletTileBalance,
                                Typography.tabularNums,
                              ]}
                              numberOfLines={1}
                              adjustsFontSizeToFit
                              minimumFontScale={0.8}
                            >
                              {formatIDR(balanceNum)}
                            </Text>
                          ) : (
                            <Text style={styles.walletTileType} numberOfLines={1}>
                              {w.typeLabel}
                            </Text>
                          )}
                        </View>

                        <View
                          style={[
                            styles.miniRadioCircle,
                            w.selected && styles.radioCircleActive,
                          ]}
                        >
                          {w.selected ? (
                            <Check size={10} color="#FFFFFF" strokeWidth={3} />
                          ) : null}
                        </View>
                      </TactilePressable>
                    </View>
                  );
                })}
              </View>

              <Text style={styles.calmFootnote}>
                Ketuk dompet untuk mengaktifkan dan mengatur saldo awalnya.
              </Text>

              {/* Tambah Dompet Lainnya Kompak */}
              <TactilePressable
                onPress={() => setShowCustomWalletModal(true)}
                accessibilityRole="button"
                accessibilityLabel="Tambah Dompet Lainnya"
                style={styles.addWalletDashedBtn}
              >
                <Plus size={16} color="#3B7AF5" strokeWidth={2.2} />
                <Text style={styles.addWalletDashedText}>
                  Tambah Dompet Lainnya
                </Text>
              </TactilePressable>
            </Animated.View>
          ) : null}

          {/* LANGKAH 4 — PAYOFF ULTRA-BERSIH & RINGKAS */}
          {step === 4 ? (
            <Animated.View
              key="step-4"
              entering={stepEntering}
              style={[
                styles.overlapContainerSpacious,
                { paddingHorizontal: horizontalPadding },
              ]}
            >
              <View style={styles.blueprintCard}>
                <View style={styles.blueprintPillRow}>
                  <View style={styles.blueprintStatusPill}>
                    <CheckCircle2 size={14} color="#10B981" strokeWidth={2.3} />
                    <Text style={styles.blueprintStatusText}>
                      Blueprint Aktif • Pola {ruleMeta.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.blueprintHeroBlock}>
                  <Text style={styles.microLabel}>BATAS AMAN HARIAN</Text>
                  <Text
                    style={[
                      styles.blueprintHeroAmount,
                      Typography.tabularNums,
                      isSmallWidth && { fontSize: 28 },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.74}
                  >
                    {formatIDR(safeDailyLimit)}
                    <Text style={styles.blueprintHeroUnit}> /hari</Text>
                  </Text>
                </View>

                <View style={styles.hairlineDivider} />

                <View style={styles.summaryRows}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryRowLabel}>Target Tabungan</Text>
                    <Text
                      style={[
                        styles.summaryRowValue,
                        Typography.tabularNums,
                        { color: '#10B981' },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.82}
                    >
                      {formatIDR(savingsAmount)}
                    </Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryRowLabel}>Anggaran Bulanan</Text>
                    <Text
                      style={[styles.summaryRowValue, Typography.tabularNums]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.82}
                    >
                      {formatIDR(spendableBudget)}
                    </Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryRowLabel}>Saldo Awal</Text>
                    <Text
                      style={[styles.summaryRowValue, Typography.tabularNums]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.82}
                    >
                      {formatIDR(totalInitialBalance)} ({selectedWallets.length} Dompet)
                    </Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryRowLabel}>Fokus Utama</Text>
                    <Text
                      style={styles.summaryRowValue}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.82}
                    >
                      {FINANCIAL_CHALLENGE_META[challenge].focusLabel}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.calmFootnote}>
                Pengaturan ini dapat diubah kapan saja melalui menu Profil.
              </Text>
            </Animated.View>
          ) : null}
        </ScrollView>

        {/* STICKY BOTTOM ACTION BAR BERSIH */}
        <View
          style={[
            styles.stickyFooter,
            {
              paddingHorizontal: horizontalPadding,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <TactilePressable
            onPress={handleNext}
            pressedScale={0.98}
            accessibilityRole="button"
            accessibilityLabel={
              step === 4 ? 'Mulai Pakai Smart Finance' : 'Lanjut'
            }
            style={styles.ctaButton}
          >
            <Text style={styles.ctaButtonText} numberOfLines={1}>
              {step === 4 ? 'Mulai Pakai Smart Finance' : 'Lanjut'}
            </Text>
            <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.2} />
          </TactilePressable>
        </View>
      </KeyboardAvoidingView>

      {/* MINI BOTTOM SHEET: ATUR SALDO DOMPET */}
      <BaseBottomSheet
        visible={Boolean(editingWallet)}
        title={editingWallet ? `Saldo ${editingWallet.name}` : 'Saldo Dompet'}
        onClose={() => setEditingWalletId(null)}
        footer={
          <View style={styles.sheetFooterRow}>
            {editingWallet?.selected ? (
              <Pressable
                onPress={handleDeactivateOrRemoveWallet}
                style={({ pressed }) => [
                  styles.sheetSecondaryBtn,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={styles.sheetSecondaryText}>
                  {editingWallet.id.startsWith('custom-')
                    ? 'Hapus'
                    : 'Nonaktifkan'}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={handleSaveWalletBalance}
              style={({ pressed }) => [
                styles.sheetPrimaryBtn,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={styles.sheetPrimaryText}>Simpan Saldo</Text>
            </Pressable>
          </View>
        }
      >
        {editingWallet ? (
          <View style={styles.sheetBodyGap}>
            <View style={styles.sheetWalletPreview}>
              <WalletBrandLogo
                walletId={editingWallet.id}
                walletName={editingWallet.name}
                type={editingWallet.type}
                size={40}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetWalletName}>{editingWallet.name}</Text>
                <Text style={styles.sheetWalletType}>
                  {editingWallet.typeLabel}
                </Text>
              </View>
            </View>

            <Text style={styles.microLabel}>SALDO SAAT INI</Text>
            <View style={styles.sheetBalanceWell}>
              <Text style={styles.sheetRpPrefix}>Rp</Text>
              <TextInput
                style={[styles.sheetBalanceInput, Typography.tabularNums]}
                value={draftBalanceText}
                onChangeText={(val) => setDraftBalanceText(formatThousands(val))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#94A3B8"
                autoFocus
                accessibilityLabel={`Input saldo ${editingWallet.name}`}
              />
            </View>

            <View style={styles.presetRow}>
              {WALLET_BALANCE_PRESETS.map((preset) => {
                const active = parseAmount(draftBalanceText) === preset.amount;
                return (
                  <Pressable
                    key={preset.amount}
                    onPress={() =>
                      setDraftBalanceText(
                        preset.amount === 0
                          ? ''
                          : formatThousands(String(preset.amount))
                      )
                    }
                    style={[
                      styles.presetChip,
                      active && styles.presetChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        Typography.tabularNums,
                        active && styles.presetChipTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {preset.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
      </BaseBottomSheet>

      {/* BOTTOM SHEET: TAMBAH DOMPET LAINNYA */}
      <BaseBottomSheet
        visible={showCustomWalletModal}
        title="Tambah Dompet Baru"
        onClose={() => setShowCustomWalletModal(false)}
        footer={
          <View style={styles.sheetFooterRow}>
            <Pressable
              onPress={() => setShowCustomWalletModal(false)}
              style={styles.sheetSecondaryBtn}
            >
              <Text style={styles.sheetSecondaryText}>Batal</Text>
            </Pressable>
            <Pressable
              onPress={handleAddCustomWallet}
              style={styles.sheetPrimaryBtn}
            >
              <Text style={styles.sheetPrimaryText}>Tambahkan Dompet</Text>
            </Pressable>
          </View>
        }
      >
        <View style={styles.sheetBodyGap}>
          <Text style={styles.microLabel}>NAMA DOMPET / REKENING</Text>
          <TextInput
            style={styles.customNameInput}
            placeholder="Contoh: Blu BCA, Allo Bank, Kas Kantor"
            placeholderTextColor="#94A3B8"
            value={customName}
            onChangeText={setCustomName}
            autoFocus
          />

          <Text style={styles.microLabel}>JENIS AKUN</Text>
          <View style={styles.customTypeRow}>
            {(
              [
                { key: 'BANK', label: 'Bank' },
                { key: 'EWALLET', label: 'E-Wallet' },
                { key: 'SAVINGS', label: 'Tabungan' },
                { key: 'CASH', label: 'Tunai' },
              ] as { key: WalletTypeKey; label: string }[]
            ).map((t) => {
              const active = customType === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setCustomType(t.key)}
                  style={[
                    styles.customTypeChip,
                    active && styles.presetChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.customTypeText,
                      active && styles.presetChipTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.microLabel}>SALDO AWAL (OPSIONAL)</Text>
          <View style={styles.walletInputWell}>
            <Text style={styles.walletInputPrefix}>Rp</Text>
            <TextInput
              style={[styles.walletInput, Typography.tabularNums]}
              placeholder="0"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={customBalanceText}
              onChangeText={(val) =>
                setCustomBalanceText(formatThousands(val))
              }
            />
          </View>
        </View>
      </BaseBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  flex: {
    flex: 1,
  },

  /* Header Gradien Biru */
  blueHeader: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingBottom: 34,
    overflow: 'hidden',
  },
  headerWave: {
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    marginLeft: -10,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPlaceholder: {
    width: 44,
    height: 44,
  },
  stepCounterText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.92)',
  },
  progressBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  progressSegment: {
    height: 5,
    borderRadius: 99,
  },
  progressSegmentCurrent: {
    height: 6,
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.45,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  progressSegmentDone: {
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  progressSegmentIdle: {
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 21,
    lineHeight: 27,
    letterSpacing: -0.4,
    color: '#FFFFFF',
  },
  headerSubtitle: {
    marginTop: 4,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.88)',
  },

  /* Container Overlapping */
  overlapContainer: {
    marginTop: -20,
    gap: 12,
  },
  overlapContainerSpacious: {
    marginTop: -20,
    gap: 14,
  },

  /* Shared Cards */
  cardActive: {
    borderColor: '#3B7AF5',
    borderWidth: 1.5,
  },
  hairlineDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  microLabel: {
    fontFamily: FontFamily.semibold,
    fontSize: 10.5,
    letterSpacing: 0.7,
    color: '#64748B',
  },

  /* Step 1: Challenge Cards */
  challengeCard: {
    minHeight: 68,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...CARD_SHADOW,
  },
  challengeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeIconBoxActive: {
    backgroundColor: '#EBF2FF',
  },
  challengeTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  challengeTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 14.5,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  challengeSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 12.5,
    color: '#64748B',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  miniRadioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  radioCircleActive: {
    borderColor: '#3B7AF5',
    backgroundColor: '#3B7AF5',
  },
  calmFootnote: {
    marginTop: 2,
    textAlign: 'center',
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: '#64748B',
  },

  /* Step 2: Sleek & Compact Income + Allocation */
  step2Card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    padding: 16,
    gap: 12,
    ...CARD_SHADOW,
  },
  incomeInputWell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 46,
    gap: 8,
  },
  incomePrefix: {
    fontFamily: FontFamily.semibold,
    fontSize: 15,
    color: '#64748B',
  },
  incomeInput: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: 22,
    color: '#0F172A',
    paddingVertical: 0,
    letterSpacing: -0.3,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetChip: {
    flex: 1,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipActive: {
    backgroundColor: '#EBF2FF',
    borderColor: '#3B7AF5',
  },
  presetChipText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12,
    color: '#475569',
  },
  presetChipTextActive: {
    color: '#3B7AF5',
  },
  ruleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ruleItemWrap: {
    flex: 1,
  },
  ruleCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 3,
  },
  ruleCardActive: {
    backgroundColor: '#EBF2FF',
    borderColor: '#3B7AF5',
    borderWidth: 1.5,
  },
  ruleTopMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 16,
    marginBottom: 1,
  },
  popularPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 99,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  popularPillText: {
    fontFamily: FontFamily.semibold,
    fontSize: 9.5,
    color: '#3B7AF5',
  },
  popularSpacer: {
    height: 15,
  },
  miniCheckCircle: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#3B7AF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  ruleLabelActive: {
    color: '#2563EB',
  },
  ruleCaption: {
    fontFamily: FontFamily.medium,
    fontSize: 10.5,
    color: '#64748B',
  },
  splitBarWrap: {
    gap: 6,
  },
  splitBarPctRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  splitBarPctText: {
    fontFamily: FontFamily.semibold,
    fontSize: 11,
  },
  splitBarTrack: {
    height: 14,
    borderRadius: 99,
    padding: 2,
    flexDirection: 'row',
    gap: 3,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  splitBarPill: {
    height: '100%',
    borderRadius: 99,
    overflow: 'hidden',
  },
  splitBarFill: {
    flex: 1,
    borderRadius: 99,
  },
  allocationRows: {
    gap: 8,
  },
  allocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  allocationLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: '#64748B',
  },
  allocationAmount: {
    flexShrink: 1,
    textAlign: 'right',
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
    color: '#0F172A',
  },

  /* Step 3: Compact 2-Col Everyday Wallets */
  totalSaldoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    ...CARD_SHADOW,
  },
  totalSaldoCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  totalSaldoAmount: {
    fontFamily: FontFamily.bold,
    fontSize: 23,
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  walletCountPill: {
    backgroundColor: '#EBF2FF',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  walletCountText: {
    fontFamily: FontFamily.semibold,
    fontSize: 11.5,
    color: '#3B7AF5',
  },
  walletGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 7,
  },
  walletGridItem: {
    width: '48.8%',
  },
  walletTile: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 52,
    ...CARD_SHADOW,
  },
  walletTileActive: {
    borderColor: '#3B7AF5',
    borderWidth: 1.5,
    backgroundColor: '#FAFCFF',
  },
  walletTileTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  walletTileName: {
    fontFamily: FontFamily.semibold,
    fontSize: 12.5,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  walletTileType: {
    fontFamily: FontFamily.regular,
    fontSize: 10.5,
    color: '#64748B',
  },
  walletTileBalance: {
    fontFamily: FontFamily.semibold,
    fontSize: 11.5,
    color: '#3B7AF5',
  },
  filterTabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTabBtn: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 99,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabBtnActive: {
    backgroundColor: '#EBF2FF',
    borderColor: '#3B7AF5',
  },
  filterTabText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: '#64748B',
  },
  filterTabTextActive: {
    fontFamily: FontFamily.semibold,
    color: '#3B7AF5',
  },
  sheetBodyGap: {
    gap: 12,
  },
  sheetWalletPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
  },
  sheetWalletName: {
    fontFamily: FontFamily.semibold,
    fontSize: 15,
    color: '#0F172A',
  },
  sheetWalletType: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  sheetBalanceWell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 52,
    gap: 8,
  },
  sheetRpPrefix: {
    fontFamily: FontFamily.semibold,
    fontSize: 16,
    color: '#64748B',
  },
  sheetBalanceInput: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: 22,
    color: '#0F172A',
    paddingVertical: 0,
  },
  sheetFooterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sheetSecondaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 13,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSecondaryText: {
    fontFamily: FontFamily.semibold,
    fontSize: 14,
    color: '#EF4444',
  },
  sheetPrimaryBtn: {
    flex: 2,
    height: 46,
    borderRadius: 13,
    backgroundColor: '#3B7AF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetPrimaryText: {
    fontFamily: FontFamily.semibold,
    fontSize: 14.5,
    color: '#FFFFFF',
  },
  selectedBalancesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    padding: 14,
    gap: 10,
    ...CARD_SHADOW,
  },
  selectedBalanceList: {
    gap: 8,
  },
  selectedBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  selectedBalanceDivider: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  selectedBalanceLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedBalanceName: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: '#0F172A',
  },
  compactRpWell: {
    width: 140,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    gap: 4,
  },
  compactRpPrefix: {
    fontFamily: FontFamily.semibold,
    fontSize: 12,
    color: '#64748B',
  },
  compactRpInput: {
    flex: 1,
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
    color: '#0F172A',
    paddingVertical: 0,
    textAlign: 'right',
  },
  walletInputWell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  walletInputPrefix: {
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
    color: '#64748B',
  },
  walletInput: {
    flex: 1,
    fontFamily: FontFamily.semibold,
    fontSize: 15,
    color: '#0F172A',
    paddingVertical: 0,
  },
  addWalletDashedBtn: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addWalletDashedText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: '#3B7AF5',
  },
  customWalletCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    padding: 16,
    gap: 10,
    ...CARD_SHADOW,
  },
  customWalletHeading: {
    fontFamily: FontFamily.semibold,
    fontSize: 14.5,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  customNameInput: {
    height: 42,
    backgroundColor: '#F8FAFC',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    fontFamily: FontFamily.medium,
    fontSize: 13.5,
    color: '#0F172A',
  },
  customTypeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  customTypeChip: {
    flex: 1,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  customTypeText: {
    fontFamily: FontFamily.medium,
    fontSize: 11.5,
    color: '#475569',
  },
  customActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  customCancelBtn: {
    flex: 1,
    height: 40,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customCancelText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: '#64748B',
  },
  customSaveBtn: {
    flex: 1,
    height: 40,
    borderRadius: 11,
    backgroundColor: '#3B7AF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customSaveText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: '#FFFFFF',
  },

  /* Step 4: Blueprint Payoff */
  blueprintCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    padding: 22,
    gap: 18,
    ...CARD_SHADOW,
  },
  blueprintPillRow: {
    flexDirection: 'row',
  },
  blueprintStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  blueprintStatusText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12,
    color: '#047857',
  },
  blueprintHeroBlock: {
    gap: 6,
  },
  blueprintHeroAmount: {
    fontFamily: FontFamily.bold,
    fontSize: 32,
    color: '#2563EB',
    letterSpacing: -0.4,
  },
  blueprintHeroUnit: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    color: '#64748B',
  },
  summaryRows: {
    gap: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryRowLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: '#64748B',
  },
  summaryRowValue: {
    flexShrink: 1,
    textAlign: 'right',
    fontFamily: FontFamily.semibold,
    fontSize: 15,
    color: '#0F172A',
  },

  /* Sticky Bottom Bar */
  stickyFooter: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
    paddingTop: 12,
  },
  ctaButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#3B7AF5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...CTA_SHADOW,
  },
  ctaButtonText: {
    fontFamily: FontFamily.semibold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});
