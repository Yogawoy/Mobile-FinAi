import { setSessionExpiredHandler, tokenStorage } from '@/lib/api';
import {
  INITIAL_SUMMARY,
  type BudgetIconKey,
  type BudgetItem,
  type CategoryIconKey,
  type GoalItem,
  type TransactionItem,
  type WalletItem,
} from '@/lib/mockData';
import {
  loadGoalThemePrefs,
  saveGoalThemePref,
  type GoalThemePref,
} from '@/lib/goalTheme';
import {
  getWalletTheme,
  resolveWalletColorKey,
  type WalletColorKey,
  type WalletTypeKey,
} from '@/lib/walletTheme';
import {
  aiService,
  type BackendForecastResponse,
  type SawHealthResult,
} from '@/services/ai.service';
import { authService, type BackendUser } from '@/services/auth.service';
import { budgetService, type BackendBudget, type BackendBudgetSummary } from '@/services/budget.service';
import { categoryService, type BackendCategory } from '@/services/category.service';
import { goalService, type BackendGoal } from '@/services/goal.service';
import {
  notificationService,
  type BackendNotification,
} from '@/services/notification.service';
import {
  recurringService,
  type BackendRecurring,
} from '@/services/recurring.service';
import {
  transactionService,
  type BackendTransaction,
} from '@/services/transaction.service';
import { walletService, type BackendWallet } from '@/services/wallet.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
export type BudgetRuleKey = '50_30_20' | '60_20_20' | '70_20_10';

export type FinancialChallengeKey =
  | 'leak_end_of_month'
  | 'scattered_wallets'
  | 'inconsistent_saving'
  | 'messy_records';

export const TODAY_DATE_GROUP = 'Hari Ini';

export const BUDGET_RULE_META: Record<
  BudgetRuleKey,
  { label: string; needsPct: number; wantsPct: number; savingsPct: number }
> = {
  '50_30_20': { label: '50/30/20', needsPct: 50, wantsPct: 30, savingsPct: 20 },
  '60_20_20': { label: '60/20/20', needsPct: 60, wantsPct: 20, savingsPct: 20 },
  '70_20_10': { label: '70/20/10', needsPct: 70, wantsPct: 20, savingsPct: 10 },
};

export const FINANCIAL_CHALLENGE_META: Record<
  FinancialChallengeKey,
  { title: string; focusLabel: string; aiTip: string }
> = {
  leak_end_of_month: {
    title: 'Sering bocor di akhir bulan',
    focusLabel: 'Kontrol laju belanja harian',
    aiTip: 'Pantau terus batas aman harianmu supaya akhir bulan tetap surplus.',
  },
  scattered_wallets: {
    title: 'Saldo tersebar di banyak dompet',
    focusLabel: 'Konsolidasi bank & e-wallet',
    aiTip: 'Semua saldo bank, e-wallet, dan tunaimu kini terpantau dalam satu tempat.',
  },
  inconsistent_saving: {
    title: 'Susah konsisten menabung',
    focusLabel: 'Target tabungan otomatis',
    aiTip: 'Sisihkan porsi tabungan di awal gajian sebelum dipakai pos belanja lain.',
  },
  messy_records: {
    title: 'Belum punya catatan rapi',
    focusLabel: 'Kebiasaan catat cepat harian',
    aiTip: 'Gunakan tombol + Catat setiap selesai transaksi agar arus kas tetap rapi.',
  },
};

export interface UserProfileState {
  name: string;
  email: string;
  monthlyIncomeTarget: number;
  savingsTargetPct: number;
  focusGoal: string;
  financialChallenge: FinancialChallengeKey;
  budgetRule: BudgetRuleKey;
  safeDailyLimit: number;
  hideBalanceOnOpen: boolean;
}

export interface CompleteSetupPayload {
  monthlyIncomeTarget: number;
  savingsTargetPct: number;
  focusGoal: string;
  financialChallenge: FinancialChallengeKey;
  budgetRule: BudgetRuleKey;
  safeDailyLimit: number;
  wallets: WalletItem[];
  budgets: BudgetItem[];
}

export type NewTransactionInput = Omit<TransactionItem, 'id'> & {
  id?: string;
  categoryId?: string | null;
};

export interface TutorialTargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
  padding?: number;
  borderRadius?: number;
  isCircle?: boolean;
}

export interface ManagedCategory {
  id: string;
  label: string;
  type: 'EXPENSE' | 'INCOME';
  iconKey: CategoryIconKey;
  iconBg: string;
  iconColor: string;
  isDefault: boolean;
  transactionCount?: number;
}

export type RecurringFrequency = 'Bulanan' | 'Mingguan';
export type RecurringIconKey = 'home' | 'cloud' | 'wifi' | 'briefcase';

export interface RecurringScheduleItem {
  id: string;
  title: string;
  amount: number;
  type: 'EXPENSE' | 'INCOME';
  frequency: RecurringFrequency;
  nextDueDate: string;
  active: boolean;
  iconKey: RecurringIconKey;
  walletId?: string;
  categoryId?: string | null;
}

export const INITIAL_MANAGED_CATEGORIES: ManagedCategory[] = [];
export const INITIAL_RECURRING_SCHEDULES: RecurringScheduleItem[] = [];

interface FinanceContextValue {
  userProfile: UserProfileState;
  wallets: WalletItem[];
  budgets: BudgetItem[];
  budgetMonthlySummary: BackendBudgetSummary | null;
  transactions: TransactionItem[];
  goals: GoalItem[];
  categories: ManagedCategory[];
  recurringSchedules: RecurringScheduleItem[];
  forecastData: BackendForecastResponse | null;
  sawHealth: SawHealthResult | null;
  apiNotifications: BackendNotification[];
  unreadNotificationCount: number;
  isLoadingData: boolean;
  isBootstrapping: boolean;
  isAuthenticated: boolean;
  currentUserId: string | null;
  hasCompletedSetup: boolean;
  hasSeenTutorial: boolean;
  tutorialVisible: boolean;
  tutorialStep: number;
  tutorialTargetRect: TutorialTargetRect | null;
  aiButtonRect: TutorialTargetRect | null;
  monthlyIncomeActual: number;
  monthlyExpenseActual: number;
  todayExpenseActual: number;
  remainingDailySafeLimit: number;
  setWallets: React.Dispatch<React.SetStateAction<WalletItem[]>>;
  setBudgets: React.Dispatch<React.SetStateAction<BudgetItem[]>>;
  setTransactions: React.Dispatch<React.SetStateAction<TransactionItem[]>>;
  setGoals: React.Dispatch<React.SetStateAction<GoalItem[]>>;
  updateGoalTheme: (goalId: string, pref: GoalThemePref) => Promise<void>;
  setCategories: React.Dispatch<React.SetStateAction<ManagedCategory[]>>;
  setRecurringSchedules: React.Dispatch<React.SetStateAction<RecurringScheduleItem[]>>;
  refreshAllData: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<boolean>;
  registerWithEmail: (name: string, email: string, password: string) => Promise<void>;
  loginAsDemo: () => Promise<void>;
  logoutAccount: () => Promise<void>;
  updateUserProfile: (patch: Partial<UserProfileState>) => void;
  setPendingRegistration: (name: string, email: string) => void;
  completeAccountSetup: (payload: CompleteSetupPayload) => Promise<void>;
  startTutorial: () => void;
  completeTutorial: () => void;
  setTutorialVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setTutorialStep: React.Dispatch<React.SetStateAction<number>>;
  setTutorialTargetRect: React.Dispatch<React.SetStateAction<TutorialTargetRect | null>>;
  registerAiButtonRect: (rect: TutorialTargetRect) => void;
  recordTransaction: (input: NewTransactionInput) => TransactionItem;
  updateTransaction: (updated: TransactionItem) => void;
  deleteTransaction: (txId: string) => void;
  dismissAnomalyById: (id: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  resetDemoData: () => void;
}

const DEFAULT_PROFILE: UserProfileState = {
  name: 'Pengguna FinAI',
  email: 'user@finai.id',
  monthlyIncomeTarget: INITIAL_SUMMARY.income,
  savingsTargetPct: 20,
  focusGoal: 'Kontrol Pemborosan',
  financialChallenge: 'leak_end_of_month',
  budgetRule: '50_30_20',
  safeDailyLimit: Math.round((INITIAL_SUMMARY.income * 0.8) / 30),
  hideBalanceOnOpen: false,
};

function toCategoryIconKey(icon?: string | null): CategoryIconKey {
  switch (icon) {
    case 'utensils':
    case 'car':
    case 'shopping':
    case 'zap':
    case 'briefcase':
    case 'coffee':
    case 'wallet':
      return icon;
    default:
      return 'wallet';
  }
}

function toBudgetIconKey(icon?: string | null): BudgetIconKey {
  switch (icon) {
    case 'utensils':
    case 'coffee':
      return 'utensils';
    case 'zap':
      return 'cloud';
    case 'car':
      return 'car';
    case 'shopping':
      return 'shopping';
    default:
      return 'gamepad';
  }
}

function softBgFromHex(color: string): string {
  switch (color.toUpperCase()) {
    case '#10B981':
    case '#059669':
      return '#ECFDF5';
    case '#F59E0B':
      return '#FFFBEB';
    case '#EF4444':
      return '#FEF2F2';
    case '#0D9488':
      return '#F0FDFA';
    case '#64748B':
      return '#F1F5F9';
    default:
      return '#EBF2FF';
  }
}

function formatDateGroupLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const formatted = d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  if (isToday) return `Hari Ini ${formatted}`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return `Kemarin ${formatted}`;
  return formatted;
}

function mapWallet(w: BackendWallet): WalletItem {
  const mappedType: WalletTypeKey =
    w.type === 'EWALLET'
      ? 'EWALLET'
      : w.type === 'BANK'
        ? 'BANK'
        : w.type === 'SAVINGS'
          ? 'SAVINGS'
          : 'CASH';

  const colorKey: WalletColorKey = resolveWalletColorKey(w.color, mappedType);

  const theme = getWalletTheme(mappedType, colorKey);

  return {
    id: w.id,
    name: w.name,
    shortName: w.name,
    type: mappedType,
    balance: Number(w.currentBalance),
    last4: w.accountNumber || '••••',
    colorKey,
    isArchived: w.isArchived,
    dotColor: theme.dotColor,
    gradient: theme.gradient,
  };
}

function mapCategory(c: BackendCategory): ManagedCategory {
  return {
    id: c.id,
    label: c.name,
    type: c.type,
    iconKey: toCategoryIconKey(c.icon),
    iconBg: softBgFromHex(c.color),
    iconColor: c.color,
    isDefault: c.isDefault,
    transactionCount: c.transactionCount,
  };
}

function mapTransaction(tx: BackendTransaction): TransactionItem {
  const d = new Date(tx.transactionDate);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const color = tx.category?.color ?? '#3B7AF5';

  return {
    id: tx.id,
    title:
      tx.note ||
      tx.category?.name ||
      (tx.type === 'TRANSFER' ? 'Transfer Antar Dompet' : 'Transaksi'),
    categoryKey: toCategoryIconKey(tx.category?.icon),
    categoryLabel:
      tx.category?.name || (tx.type === 'TRANSFER' ? 'Transfer' : 'Lainnya'),
    walletId: tx.walletId,
    walletName: tx.wallet.name,
    targetWalletId: tx.destinationWalletId ?? undefined,
    targetWalletName: tx.destinationWallet?.name,
    dateLabel: `${hh}:${mm}`,
    dateGroup: formatDateGroupLabel(tx.transactionDate),
    transactionDate: tx.transactionDate,
    recurringId: tx.recurringId,
    amount: Number(tx.amount),
    type: tx.type,
    note: tx.note ?? undefined,
    iconBg: softBgFromHex(color),
    iconColor: color,
  };
}

function mapBudget(b: BackendBudget): BudgetItem {
  const customName = b.name?.trim() || null;
  return {
    id: b.id,
    name: customName || b.category.name,
    customName,
    categoryName: b.category.name,
    limit: Number(b.limitAmount),
    spent: Number(b.spentAmount),
    iconKey: toBudgetIconKey(b.category.icon),
    alertThresholdPct: b.alertThresholdPct ?? 80,
    period: b.period ?? 'MONTHLY',
    periodLabel: b.periodLabel,
    monthlyEquivalentLimit: b.monthlyEquivalentLimit,
  };
}

function mapGoal(
  g: BackendGoal,
  themePrefs?: Record<string, GoalThemePref>
): GoalItem {
  const deadline = new Date(g.deadline);
  const pref = themePrefs?.[g.id];
  return {
    id: g.id,
    name: g.name,
    iconKey: pref?.iconKey ?? 'target',
    colorKey: pref?.colorKey ?? 'royal',
    target: Number(g.targetAmount),
    current: Number(g.currentAmount),
    deadline:
      deadline.getFullYear() >= 2090
        ? 'Tanpa Batas'
        : deadline.toLocaleDateString('id-ID', {
            month: 'short',
            year: 'numeric',
          }),
    isRealized: g.status === 'COMPLETED',
    mutations: g.mutations ?? [],
  };
}

function mapRecurring(r: BackendRecurring): RecurringScheduleItem {
  const d = new Date(r.nextRunDate);
  return {
    id: r.id,
    title: r.title,
    amount: Number(r.amount),
    type: r.type,
    frequency: r.frequency === 'WEEKLY' ? 'Mingguan' : 'Bulanan',
    nextDueDate: d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    active: r.isActive,
    iconKey: r.type === 'INCOME' ? 'briefcase' : 'home',
    walletId: r.walletId,
    categoryId: r.categoryId,
  };
}

function parseBudgetRule(raw?: string | null): BudgetRuleKey {
  if (raw === '60-20-20' || raw === '60_20_20') return '60_20_20';
  if (raw === '70-20-10' || raw === '70_20_10') return '70_20_10';
  return '50_30_20';
}

function parseChallenge(raw?: string | null): FinancialChallengeKey {
  if (
    raw === 'leak_end_of_month' ||
    raw === 'scattered_wallets' ||
    raw === 'inconsistent_saving' ||
    raw === 'messy_records'
  ) {
    return raw;
  }
  return 'leak_end_of_month';
}

function applyUserToProfile(user: BackendUser, prev: UserProfileState): UserProfileState {
  const incomeTarget = user.monthlyIncomeTarget ?? prev.monthlyIncomeTarget;
  const rule = parseBudgetRule(user.budgetRule);
  const ruleMeta = BUDGET_RULE_META[rule];
  return {
    ...prev,
    name: user.name,
    email: user.email,
    monthlyIncomeTarget: incomeTarget,
    budgetRule: rule,
    savingsTargetPct: ruleMeta.savingsPct,
    financialChallenge: parseChallenge(user.financialChallenge),
    safeDailyLimit: Math.round((incomeTarget * (1 - ruleMeta.savingsPct / 100)) / 30),
  };
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [userProfile, setUserProfile] = useState<UserProfileState>(DEFAULT_PROFILE);
  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [budgetMonthlySummary, setBudgetMonthlySummary] =
    useState<BackendBudgetSummary | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [categories, setCategories] = useState<ManagedCategory[]>([]);
  const [recurringSchedules, setRecurringSchedules] = useState<RecurringScheduleItem[]>([]);
  const [forecastData, setForecastData] = useState<BackendForecastResponse | null>(null);
  const [apiNotifications, setApiNotifications] = useState<BackendNotification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hasCompletedSetup, setHasCompletedSetup] = useState(false);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(true);
  const [tutorialVisible, setTutorialVisible] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialTargetRect, setTutorialTargetRect] =
    useState<TutorialTargetRect | null>(null);
  const [aiButtonRect, setAiButtonRect] = useState<TutorialTargetRect | null>(null);

  const clearLocalState = useCallback(() => {
    setIsAuthenticated(false);
    setCurrentUserId(null);
    setHasCompletedSetup(false);
    setWallets([]);
    setBudgets([]);
    setBudgetMonthlySummary(null);
    setTransactions([]);
    setGoals([]);
    setCategories([]);
    setRecurringSchedules([]);
    setForecastData(null);
    setApiNotifications([]);
    setUnreadNotificationCount(0);
    setUserProfile(DEFAULT_PROFILE);
  }, []);

  const refreshAllData = useCallback(async () => {
    const token = await tokenStorage.getAccessToken();
    if (!token) {
      setIsAuthenticated(false);
      return;
    }

    setIsLoadingData(true);
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const [
        meRes,
        walletsRes,
        catsRes,
        txRes,
        budgetsRes,
        goalsRes,
        recurringRes,
        notifRes,
        forecastRes,
      ] = await Promise.allSettled([
        authService.getMe(),
        walletService.getWallets(true),
        categoryService.getCategories(),
        transactionService.getTransactions({ limit: 50 }),
        budgetService.getBudgets(month, year),
        goalService.getGoals(),
        recurringService.getRecurring(),
        notificationService.getNotifications(),
        aiService.getForecast(month, year),
      ]);

      if (meRes.status === 'fulfilled') {
        setUserProfile((prev) => applyUserToProfile(meRes.value, prev));
        setCurrentUserId(meRes.value.id);
        setIsAuthenticated(true);
        const completed = Boolean(meRes.value.hasCompletedSetup);
        setHasCompletedSetup(completed);
        await tokenStorage.setHasCompletedSetup(completed);
      }

      if (walletsRes.status === 'fulfilled') {
        setWallets(walletsRes.value.wallets.map(mapWallet));
      }

      if (catsRes.status === 'fulfilled') {
        setCategories(catsRes.value.map(mapCategory));
      }

      if (txRes.status === 'fulfilled') {
        setTransactions(txRes.value.items.map(mapTransaction));
      }

      if (budgetsRes.status === 'fulfilled') {
        setBudgets(budgetsRes.value.items.map(mapBudget));
        setBudgetMonthlySummary(budgetsRes.value.summary);
      }

      if (goalsRes.status === 'fulfilled') {
        const themePrefs = await loadGoalThemePrefs();
        setGoals(goalsRes.value.map((g) => mapGoal(g, themePrefs)));
      }

      if (recurringRes.status === 'fulfilled') {
        setRecurringSchedules(recurringRes.value.map(mapRecurring));
      }

      if (notifRes.status === 'fulfilled') {
        setApiNotifications(notifRes.value.items);
        setUnreadNotificationCount(notifRes.value.unreadCount);
      }

      if (forecastRes.status === 'fulfilled') {
        setForecastData(forecastRes.value);
      }
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(async () => {
      clearLocalState();
      router.replace('/login');
    });

    (async () => {
      try {
        const [token, setupDone] = await Promise.all([
          tokenStorage.getAccessToken(),
          tokenStorage.getHasCompletedSetup(),
        ]);
        setHasCompletedSetup(setupDone);
        if (token) {
          setIsAuthenticated(true);
          await refreshAllData();
        }
      } finally {
        setIsBootstrapping(false);
      }
    })();

    return () => {
      setSessionExpiredHandler(null);
    };
  }, [clearLocalState, refreshAllData, router]);

  const {
    monthlyIncomeActual,
    monthlyExpenseActual,
    todayExpenseActual,
    remainingDailySafeLimit,
  } = useMemo(() => {
    let txIncome = 0;
    let txExpense = 0;
    let todayExp = 0;

    for (const tx of transactions) {
      if (tx.type === 'INCOME') {
        txIncome += tx.amount;
      } else if (tx.type === 'EXPENSE') {
        txExpense += tx.amount;
        if (!tx.dateGroup || tx.dateGroup.startsWith('Hari Ini')) {
          todayExp += tx.amount;
        }
      }
    }

    return {
      monthlyIncomeActual: forecastData?.forecast.totalIncomeMtd ?? txIncome,
      monthlyExpenseActual: forecastData?.forecast.totalExpenseMtd ?? txExpense,
      todayExpenseActual: todayExp,
      remainingDailySafeLimit: userProfile.safeDailyLimit - todayExp,
    };
  }, [transactions, forecastData, userProfile.safeDailyLimit]);

  const loginWithEmail = async (email: string, password: string): Promise<boolean> => {
    const res = await authService.login({ email, password });
    setUserProfile((prev) => applyUserToProfile(res.user, prev));
    setCurrentUserId(res.user.id);
    setIsAuthenticated(true);
    const completed = Boolean(res.user.hasCompletedSetup);
    await tokenStorage.setHasCompletedSetup(completed);
    setHasCompletedSetup(completed);
    await refreshAllData();
    return completed;
  };

  const registerWithEmail = async (name: string, email: string, password: string) => {
    const res = await authService.register({ name, email, password });
    setUserProfile((prev) => applyUserToProfile(res.user, prev));
    setCurrentUserId(res.user.id);
    setIsAuthenticated(true);
    await tokenStorage.setHasCompletedSetup(false);
    setHasCompletedSetup(false);
    await refreshAllData();
  };

  const loginAsDemo = async () => {
    await loginWithEmail('yoga@smartfinance.id', 'Password123!');
  };

  const logoutAccount = async () => {
    const uid = currentUserId;
    try {
      await authService.logout();
    } catch {
      await tokenStorage.clearTokens();
    }
    if (uid) {
      await AsyncStorage.removeItem(`setup_draft_${uid}`).catch(() => { });
    }
    clearLocalState();
  };

  const updateUserProfile = (patch: Partial<UserProfileState>) => {
    setUserProfile((prev) => ({ ...prev, ...patch }));
    if (isAuthenticated) {
      void authService
        .updateProfile({
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.monthlyIncomeTarget !== undefined
            ? { monthlyIncomeTarget: patch.monthlyIncomeTarget }
            : {}),
          ...(patch.financialChallenge !== undefined
            ? { financialChallenge: patch.financialChallenge }
            : {}),
          ...(patch.budgetRule !== undefined
            ? { budgetRule: patch.budgetRule }
            : {}),
        })
        .catch(() => { });
    }
  };

  const setPendingRegistration = (name: string, email: string) => {
    setUserProfile((prev) => ({ ...prev, name, email }));
  };

  const completeAccountSetup = async (payload: CompleteSetupPayload) => {
    setUserProfile((prev) => ({
      ...prev,
      monthlyIncomeTarget: payload.monthlyIncomeTarget,
      savingsTargetPct: payload.savingsTargetPct,
      focusGoal: payload.focusGoal,
      financialChallenge: payload.financialChallenge,
      budgetRule: payload.budgetRule,
      safeDailyLimit: payload.safeDailyLimit,
    }));

    if (isAuthenticated) {
      await authService.setupBlueprint({
        monthlyIncomeTarget: payload.monthlyIncomeTarget,
        financialChallenge: payload.financialChallenge,
        budgetRule: payload.budgetRule,
        wallets: payload.wallets.map((w) => ({
          name: w.name,
          type:
            w.type === 'E_WALLET'
              ? 'EWALLET'
              : w.type === 'BANK'
                ? 'BANK'
                : w.type === 'SAVINGS'
                  ? 'SAVINGS'
                  : 'CASH',
          initialBalance: w.balance,
          color: '#3B7AF5',
          accountNumber: w.last4 && w.last4 !== '••••' ? w.last4 : null,
        })),
        budgets: payload.budgets.map((b) => ({
          categoryName: b.name,
          limitAmount: b.limit,
        })),
      });
      await refreshAllData();
    } else {
      setWallets(payload.wallets);
      setBudgets(payload.budgets);
      setTransactions([]);
      setGoals([]);
    }

    if (currentUserId) {
      await AsyncStorage.removeItem(`setup_draft_${currentUserId}`).catch(() => { });
    }
    await tokenStorage.setHasCompletedSetup(true);
    setHasCompletedSetup(true);
    setHasSeenTutorial(false);
  };

  const startTutorial = () => {
    setHasSeenTutorial(false);
  };

  const completeTutorial = () => {
    setTutorialVisible(false);
    setTutorialTargetRect(null);
    setHasSeenTutorial(true);
  };

  const registerAiButtonRect = (rect: TutorialTargetRect) => {
    setAiButtonRect((prev) => {
      if (
        prev &&
        Math.abs(prev.x - rect.x) < 1 &&
        Math.abs(prev.y - rect.y) < 1 &&
        Math.abs(prev.width - rect.width) < 1 &&
        Math.abs(prev.height - rect.height) < 1
      ) {
        return prev;
      }
      return rect;
    });
  };

  const recordTransaction = (input: NewTransactionInput): TransactionItem => {
    const tempId = input.id || `tx-${Date.now()}`;
    const optimistic: TransactionItem = {
      ...input,
      id: tempId,
      dateGroup: input.dateGroup || TODAY_DATE_GROUP,
    };

    setTransactions((prev) => [optimistic, ...prev]);

    if (isAuthenticated) {
      const matchedCategory = categories.find(
        (c) =>
          c.id === input.categoryId ||
          c.label.toLowerCase() === input.categoryLabel.toLowerCase()
      );

      void transactionService
        .createTransaction({
          walletId: input.walletId,
          destinationWalletId: input.targetWalletId ?? null,
          categoryId:
            input.type === 'TRANSFER' ? null : (matchedCategory?.id ?? null),
          type: input.type,
          amount: input.amount,
          note: input.note || input.title,
          transactionDate: new Date().toISOString(),
        })
        .then(() => refreshAllData())
        .catch(() => refreshAllData());
    }

    return optimistic;
  };

  const updateTransaction = (updated: TransactionItem) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    );

    if (isAuthenticated) {
      const matchedCategory = categories.find(
        (c) => c.label.toLowerCase() === updated.categoryLabel.toLowerCase()
      );
      void transactionService
        .updateTransaction(updated.id, {
          walletId: updated.walletId,
          destinationWalletId: updated.targetWalletId ?? null,
          categoryId:
            updated.type === 'TRANSFER' ? null : (matchedCategory?.id ?? null),
          type: updated.type,
          amount: updated.amount,
          note: updated.note || updated.title,
        })
        .then(() => refreshAllData())
        .catch(() => refreshAllData());
    }
  };

  const deleteTransaction = (txId: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== txId));
    if (isAuthenticated) {
      void transactionService
        .deleteTransaction(txId)
        .then(() => refreshAllData())
        .catch(() => refreshAllData());
    }
  };

  const dismissAnomalyById = async (id: string) => {
    await aiService.dismissAnomaly(id);
    setForecastData((prev) =>
      prev
        ? {
          ...prev,
          anomalies: prev.anomalies.filter((a) => a.id !== id),
        }
        : prev
    );
  };

  const markNotificationRead = async (id: string) => {
    await notificationService.markAsRead(id);
    setApiNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadNotificationCount((c) => Math.max(0, c - 1));
  };

  const markAllNotificationsRead = async () => {
    await notificationService.markAllRead();
    setApiNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadNotificationCount(0);
  };

  const updateGoalTheme = useCallback(async (goalId: string, pref: GoalThemePref) => {
    await saveGoalThemePref(goalId, pref);
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goalId
          ? { ...g, iconKey: pref.iconKey, colorKey: pref.colorKey }
          : g
      )
    );
  }, []);

  const resetDemoData = () => {
    void loginAsDemo().catch(() => { });
  };

  const sawHealth = forecastData?.health ?? null;

  return (
    <FinanceContext.Provider
      value={{
        userProfile,
        wallets,
        budgets,
        budgetMonthlySummary,
        transactions,
        goals,
        categories,
        recurringSchedules,
        forecastData,
        sawHealth,
        apiNotifications,
        unreadNotificationCount,
        isLoadingData,
        isBootstrapping,
        isAuthenticated,
        currentUserId,
        hasCompletedSetup,
        hasSeenTutorial,
        tutorialVisible,
        tutorialStep,
        tutorialTargetRect,
        aiButtonRect,
        monthlyIncomeActual,
        monthlyExpenseActual,
        todayExpenseActual,
        remainingDailySafeLimit,
        setWallets,
        setBudgets,
        setTransactions,
        setGoals,
        updateGoalTheme,
        setCategories,
        setRecurringSchedules,
        refreshAllData,
        loginWithEmail,
        registerWithEmail,
        loginAsDemo,
        logoutAccount,
        updateUserProfile,
        setPendingRegistration,
        completeAccountSetup,
        startTutorial,
        completeTutorial,
        setTutorialVisible,
        setTutorialStep,
        setTutorialTargetRect,
        registerAiButtonRect,
        recordTransaction,
        updateTransaction,
        deleteTransaction,
        dismissAnomalyById,
        markNotificationRead,
        markAllNotificationsRead,
        resetDemoData,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) {
    throw new Error('useFinance harus digunakan di dalam FinanceProvider');
  }
  return ctx;
}
