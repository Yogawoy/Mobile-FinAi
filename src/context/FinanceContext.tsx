import React, { createContext, useContext, useMemo, useState } from 'react';
import {
  INITIAL_SUMMARY,
  INITIAL_TRANSACTIONS,
  INITIAL_WALLETS,
  mockBudgets,
  mockGoals,
  type BudgetIconKey,
  type BudgetItem,
  type CategoryIconKey,
  type GoalItem,
  type TransactionItem,
  type WalletItem,
} from '@/lib/mockData';

export type BudgetRuleKey = '50_30_20' | '60_20_20' | '70_20_10';

export type FinancialChallengeKey =
  | 'leak_end_of_month'
  | 'scattered_wallets'
  | 'inconsistent_saving'
  | 'messy_records';

export const TODAY_DATE_GROUP = 'Hari Ini • 22 Nov 2026';

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

export type NewTransactionInput = Omit<TransactionItem, 'id'> & { id?: string };

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
}

export const INITIAL_MANAGED_CATEGORIES: ManagedCategory[] = [
  { id: 'cat-1', label: 'Makanan', type: 'EXPENSE', iconKey: 'utensils', iconBg: '#EBF2FF', iconColor: '#3B7AF5', isDefault: true },
  { id: 'cat-2', label: 'Transportasi', type: 'EXPENSE', iconKey: 'car', iconBg: '#FFFBEB', iconColor: '#F59E0B', isDefault: true },
  { id: 'cat-3', label: 'Belanja', type: 'EXPENSE', iconKey: 'shopping', iconBg: '#F0FDFA', iconColor: '#0D9488', isDefault: true },
  { id: 'cat-4', label: 'Tagihan', type: 'EXPENSE', iconKey: 'zap', iconBg: '#FEF2F2', iconColor: '#EF4444', isDefault: true },
  { id: 'cat-5', label: 'Ngopi & Harian', type: 'EXPENSE', iconKey: 'coffee', iconBg: '#F1F5F9', iconColor: '#475569', isDefault: false },
  { id: 'cat-6', label: 'Gaji / Proyek', type: 'INCOME', iconKey: 'briefcase', iconBg: '#ECFDF5', iconColor: '#10B981', isDefault: true },
  { id: 'cat-7', label: 'Bonus / Lainnya', type: 'INCOME', iconKey: 'wallet', iconBg: '#EBF2FF', iconColor: '#3B7AF5', isDefault: true },
  { id: 'cat-8', label: 'Dividen & Cashback', type: 'INCOME', iconKey: 'wallet', iconBg: '#ECFDF5', iconColor: '#059669', isDefault: false },
];

export const INITIAL_RECURRING_SCHEDULES: RecurringScheduleItem[] = [
  { id: 'rec-1', title: 'Bayar Kos', amount: 850_000, type: 'EXPENSE', frequency: 'Bulanan', nextDueDate: '28 Nov 2026', active: true, iconKey: 'home' },
  { id: 'rec-2', title: 'Server Cloud', amount: 150_000, type: 'EXPENSE', frequency: 'Bulanan', nextDueDate: '25 Nov 2026', active: true, iconKey: 'cloud' },
  { id: 'rec-3', title: 'WiFi & Kuota', amount: 120_000, type: 'EXPENSE', frequency: 'Bulanan', nextDueDate: '30 Nov 2026', active: true, iconKey: 'wifi' },
  { id: 'rec-4', title: 'Gaji / Uang Saku', amount: 3_500_000, type: 'INCOME', frequency: 'Bulanan', nextDueDate: '01 Des 2026', active: true, iconKey: 'briefcase' },
];

interface FinanceContextValue {
  userProfile: UserProfileState;
  wallets: WalletItem[];
  budgets: BudgetItem[];
  transactions: TransactionItem[];
  goals: GoalItem[];
  categories: ManagedCategory[];
  recurringSchedules: RecurringScheduleItem[];
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
  setCategories: React.Dispatch<React.SetStateAction<ManagedCategory[]>>;
  setRecurringSchedules: React.Dispatch<React.SetStateAction<RecurringScheduleItem[]>>;
  updateUserProfile: (patch: Partial<UserProfileState>) => void;
  setPendingRegistration: (name: string, email: string) => void;
  completeAccountSetup: (payload: CompleteSetupPayload) => void;
  startTutorial: () => void;
  completeTutorial: () => void;
  setTutorialVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setTutorialStep: React.Dispatch<React.SetStateAction<number>>;
  setTutorialTargetRect: React.Dispatch<React.SetStateAction<TutorialTargetRect | null>>;
  registerAiButtonRect: (rect: TutorialTargetRect) => void;
  recordTransaction: (input: NewTransactionInput) => TransactionItem;
  updateTransaction: (updated: TransactionItem) => void;
  deleteTransaction: (txId: string) => void;
  resetDemoData: () => void;
}

const DEFAULT_PROFILE: UserProfileState = {
  name: 'Yoga Saputra',
  email: 'yoga@smartfinance.id',
  monthlyIncomeTarget: INITIAL_SUMMARY.income,
  savingsTargetPct: 20,
  focusGoal: 'Kontrol Pemborosan',
  financialChallenge: 'leak_end_of_month',
  budgetRule: '50_30_20',
  safeDailyLimit: Math.round((INITIAL_SUMMARY.income * 0.8) / 30),
  hideBalanceOnOpen: false,
};

const INITIAL_DEMO_INCOME = INITIAL_TRANSACTIONS.reduce(
  (s, tx) => (tx.type === 'INCOME' ? s + tx.amount : s),
  0
);
const INITIAL_DEMO_EXPENSE = INITIAL_TRANSACTIONS.reduce(
  (s, tx) => (tx.type === 'EXPENSE' ? s + tx.amount : s),
  0
);

function mapCategoryToBudgetIconKey(key: CategoryIconKey): BudgetIconKey {
  switch (key) {
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

function applyWalletDelta(
  walletList: WalletItem[],
  tx: Pick<TransactionItem, 'type' | 'amount' | 'walletId' | 'targetWalletId'>,
  sign: 1 | -1
): WalletItem[] {
  return walletList.map((w) => {
    if (tx.type === 'INCOME' && w.id === tx.walletId) {
      return { ...w, balance: Math.max(0, w.balance + tx.amount * sign) };
    }
    if (tx.type === 'EXPENSE' && w.id === tx.walletId) {
      return { ...w, balance: Math.max(0, w.balance - tx.amount * sign) };
    }
    if (tx.type === 'TRANSFER') {
      if (w.id === tx.walletId) {
        return { ...w, balance: Math.max(0, w.balance - tx.amount * sign) };
      }
      if (tx.targetWalletId && w.id === tx.targetWalletId) {
        return { ...w, balance: Math.max(0, w.balance + tx.amount * sign) };
      }
    }
    return w;
  });
}

function applyBudgetDelta(
  budgetList: BudgetItem[],
  tx: Pick<TransactionItem, 'type' | 'amount' | 'categoryKey' | 'categoryLabel'>,
  sign: 1 | -1
): BudgetItem[] {
  if (tx.type !== 'EXPENSE') return budgetList;
  const targetIcon = mapCategoryToBudgetIconKey(tx.categoryKey);
  const labelLower = tx.categoryLabel.toLowerCase();

  let matched = false;
  const next = budgetList.map((b) => {
    if (
      !matched &&
      (b.iconKey === targetIcon || b.name.toLowerCase().includes(labelLower))
    ) {
      matched = true;
      return { ...b, spent: Math.max(0, b.spent + tx.amount * sign) };
    }
    return b;
  });
  return next;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [userProfile, setUserProfile] = useState<UserProfileState>(DEFAULT_PROFILE);
  const [wallets, setWallets] = useState<WalletItem[]>(INITIAL_WALLETS);
  const [budgets, setBudgets] = useState<BudgetItem[]>(mockBudgets);
  const [transactions, setTransactions] = useState<TransactionItem[]>(INITIAL_TRANSACTIONS);
  const [goals, setGoals] = useState<GoalItem[]>(mockGoals);
  const [categories, setCategories] = useState<ManagedCategory[]>(INITIAL_MANAGED_CATEGORIES);
  const [recurringSchedules, setRecurringSchedules] = useState<RecurringScheduleItem[]>(
    INITIAL_RECURRING_SCHEDULES
  );
  const [hasCompletedSetup, setHasCompletedSetup] = useState(false);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(true);
  const [tutorialVisible, setTutorialVisible] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialTargetRect, setTutorialTargetRect] = useState<TutorialTargetRect | null>(null);
  const [aiButtonRect, setAiButtonRect] = useState<TutorialTargetRect | null>(null);

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

    const incomeActual = hasCompletedSetup
      ? txIncome
      : Math.max(0, INITIAL_SUMMARY.income + (txIncome - INITIAL_DEMO_INCOME));
    const expenseActual = hasCompletedSetup
      ? txExpense
      : Math.max(0, INITIAL_SUMMARY.expense + (txExpense - INITIAL_DEMO_EXPENSE));

    return {
      monthlyIncomeActual: incomeActual,
      monthlyExpenseActual: expenseActual,
      todayExpenseActual: todayExp,
      remainingDailySafeLimit: userProfile.safeDailyLimit - todayExp,
    };
  }, [transactions, hasCompletedSetup, userProfile.safeDailyLimit]);

  const updateUserProfile = (patch: Partial<UserProfileState>) => {
    setUserProfile((prev) => ({ ...prev, ...patch }));
  };

  const setPendingRegistration = (name: string, email: string) => {
    setUserProfile((prev) => ({
      ...prev,
      name,
      email,
    }));
  };

  const completeAccountSetup = (payload: CompleteSetupPayload) => {
    setUserProfile((prev) => ({
      ...prev,
      monthlyIncomeTarget: payload.monthlyIncomeTarget,
      savingsTargetPct: payload.savingsTargetPct,
      focusGoal: payload.focusGoal,
      financialChallenge: payload.financialChallenge,
      budgetRule: payload.budgetRule,
      safeDailyLimit: payload.safeDailyLimit,
    }));
    setWallets(payload.wallets);
    setBudgets(payload.budgets);
    setTransactions([]);
    setGoals([]);
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
    const newTx: TransactionItem = {
      ...input,
      id: input.id || `tx-${Date.now()}`,
      dateGroup: input.dateGroup || TODAY_DATE_GROUP,
    };
    setTransactions((prev) => [newTx, ...prev]);
    setWallets((prev) => applyWalletDelta(prev, newTx, 1));
    setBudgets((prev) => applyBudgetDelta(prev, newTx, 1));
    return newTx;
  };

  const updateTransaction = (updated: TransactionItem) => {
    const existing = transactions.find((t) => t.id === updated.id);
    if (!existing) return;

    setTransactions((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    );
    setWallets((prev) => {
      const reverted = applyWalletDelta(prev, existing, -1);
      return applyWalletDelta(reverted, updated, 1);
    });
    setBudgets((prev) => {
      const reverted = applyBudgetDelta(prev, existing, -1);
      return applyBudgetDelta(reverted, updated, 1);
    });
  };

  const deleteTransaction = (txId: string) => {
    const existing = transactions.find((t) => t.id === txId);
    if (!existing) return;

    setTransactions((prev) => prev.filter((t) => t.id !== txId));
    setWallets((prev) => applyWalletDelta(prev, existing, -1));
    setBudgets((prev) => applyBudgetDelta(prev, existing, -1));
  };

  const resetDemoData = () => {
    setUserProfile(DEFAULT_PROFILE);
    setWallets(INITIAL_WALLETS);
    setBudgets(mockBudgets);
    setTransactions(INITIAL_TRANSACTIONS);
    setGoals(mockGoals);
    setCategories(INITIAL_MANAGED_CATEGORIES);
    setRecurringSchedules(INITIAL_RECURRING_SCHEDULES);
    setHasCompletedSetup(false);
    setHasSeenTutorial(true);
  };

  return (
    <FinanceContext.Provider
      value={{
        userProfile,
        wallets,
        budgets,
        transactions,
        goals,
        categories,
        recurringSchedules,
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
        setCategories,
        setRecurringSchedules,
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
    throw new Error('useFinance must be used within FinanceProvider');
  }
  return ctx;
}
