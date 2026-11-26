export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'BUDGET_NOT_FOUND'
  | 'GOAL_NOT_FOUND'
  | 'WALLET_NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'EMAIL_ALREADY_EXISTS'
  | 'INVALID_CREDENTIALS'
  | 'SESSION_EXPIRED'
  | 'INSUFFICIENT_BALANCE'
  | 'WALLET_IN_USE'
  | 'BUDGET_IN_USE'
  | 'GOAL_IN_USE'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR';

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode | string;
    message: string;
    details?: Record<string, string[]>;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ---------------------------------------------------------------------------
// Auth & User
// ---------------------------------------------------------------------------

export interface SafeUser {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponseData {
  user: SafeUser;
  token?: string;
}

// ---------------------------------------------------------------------------
// Wallets & Transfers
// ---------------------------------------------------------------------------

export type WalletType = 'BANK' | 'E_WALLET' | 'CASH';

export interface Wallet {
  id: string;
  userId: string;
  name: string;
  type: WalletType;
  institution: string | null;
  accountLast4: string | null;
  balance: string;
  color: string | null;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWalletPayload {
  name: string;
  type: WalletType;
  institution?: string | null;
  accountLast4?: string | null;
  balance?: number;
  color?: string | null;
  icon?: string | null;
}

export interface UpdateWalletPayload {
  name?: string;
  type?: WalletType;
  institution?: string | null;
  accountLast4?: string | null;
  color?: string | null;
  icon?: string | null;
}

export interface TransferPayload {
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  date?: string;
  note?: string;
}

export interface TransferResponseData {
  fromWallet: Wallet;
  toWallet: Wallet;
  message: string;
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export type TransactionType = 'INCOME' | 'EXPENSE';

export type TransactionCategoryKey =
  | 'food'
  | 'transport'
  | 'shopping'
  | 'bills'
  | 'daily_needs'
  | 'housing'
  | 'entertainment'
  | 'health'
  | 'education'
  | 'social'
  | 'debt'
  | 'electronics'
  | 'salary'
  | 'freelance'
  | 'bonus'
  | 'business'
  | 'investment'
  | 'other';

export interface TransactionWalletSummary {
  id: string;
  name: string;
  type: WalletType;
  institution: string | null;
}

export interface Transaction {
  id: string;
  userId: string;
  walletId: string;
  type: TransactionType;
  amount: string;
  category: string;
  description: string;
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
  wallet?: TransactionWalletSummary;
}

export interface TransactionQuery {
  walletId?: string;
  type?: TransactionType;
  category?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface TransactionListResponseData {
  total: number;
  limit: number;
  offset: number;
  transactions: Transaction[];
}

export interface CreateTransactionPayload {
  walletId: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  transactionDate?: string;
}

export interface UpdateTransactionPayload {
  walletId?: string;
  type?: TransactionType;
  amount?: number;
  category?: string;
  description?: string;
  transactionDate?: string;
}

// ---------------------------------------------------------------------------
// Budgets
// ---------------------------------------------------------------------------

export type BudgetStatus = 'SAFE' | 'WARNING' | 'CRITICAL';

export interface Budget {
  id: string;
  userId: string;
  category: string;
  limitAmount: string;
  month: number;
  year: number;
  createdAt: string;
  updatedAt: string;
  usedAmount?: string;
  remainingAmount?: string;
  percentage?: number;
  status?: BudgetStatus;
}

export interface CreateBudgetPayload {
  category: string;
  limitAmount: number;
  month: number;
  year: number;
}

export interface UpdateBudgetPayload {
  category?: string;
  limitAmount?: number;
  month?: number;
  year?: number;
}

// ---------------------------------------------------------------------------
// Goals & Contributions
// ---------------------------------------------------------------------------

export type GoalFrequency = 'WEEKLY' | 'MONTHLY';

export type GoalCategoryKey =
  | 'laptop'
  | 'travel'
  | 'emergency'
  | 'vehicle'
  | 'course'
  | 'home'
  | 'wedding'
  | 'worship'
  | 'business'
  | 'other';

export interface GoalWalletSummary {
  id: string;
  name: string;
  type: WalletType;
  institution?: string | null;
}

export interface GoalContribution {
  id: string;
  goalId: string;
  sourceWalletId: string;
  amount: string;
  contributionDate: string;
  createdAt: string;
  sourceWallet?: GoalWalletSummary;
}

export interface Goal {
  id: string;
  userId: string;
  name: string;
  category: string;
  targetAmount: string;
  currentAmount: string;
  deadline: string;
  sourceWalletId: string | null;
  destinationWalletId: string | null;
  frequency: GoalFrequency | string;
  autoDeposit?: boolean;
  nextDueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  remainingAmount?: string;
  progressPercentage?: number;
  remainingMonths?: number;
  recommendedMonthlySaving?: string;
  sourceWallet?: GoalWalletSummary | null;
  destinationWallet?: GoalWalletSummary | null;
  contributions?: GoalContribution[];
}

export interface CreateGoalPayload {
  name: string;
  category: string;
  targetAmount: number;
  deadline: string;
  sourceWalletId?: string | null;
  destinationWalletId?: string | null;
  frequency?: GoalFrequency;
  autoDeposit?: boolean;
}

export interface UpdateGoalPayload {
  name?: string;
  category?: string;
  targetAmount?: number;
  deadline?: string;
  sourceWalletId?: string | null;
  destinationWalletId?: string | null;
  frequency?: GoalFrequency;
  autoDeposit?: boolean;
}

export interface CreateGoalContributionPayload {
  sourceWalletId: string;
  amount: number;
  contributionDate?: string;
}

// ---------------------------------------------------------------------------
// Settings & AI Chat
// ---------------------------------------------------------------------------

export interface UserSettings {
  id: string;
  userId: string;
  language: string;
  currency: string;
  numberFormat: string;
  defaultWalletId: string | null;
  defaultCategory: string | null;
  budgetReminder: boolean;
  goalReminder: boolean;
  financialSummary: boolean;
  aiPersonalization: boolean;
  aiActionConfirmation: boolean;
  animations: boolean;
  createdAt: string;
  updatedAt: string;
}

export type UpdateSettingsPayload = Partial<
  Omit<UserSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
>;

export interface AIChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIChatRequest {
  message: string;
  history?: AIChatHistoryItem[];
}

export type FinancialActionType =
  | 'create_transaction'
  | 'transfer'
  | 'goal_contribution'
  | 'create_budget'
  | 'create_goal';

export interface GrokFinancialActionPayload {
  transactionType?: TransactionType;
  amount: string;
  description?: string;
  category?: string;
  walletId?: string | null;
  walletName?: string | null;
  sourceWalletId?: string | null;
  sourceWalletName?: string | null;
  destinationWalletId?: string | null;
  destinationWalletName?: string | null;
  goalName?: string | null;
  goalId?: string | null;
  date?: string | null;
}

export type AIStructuredResponse =
  | { type: 'text'; message: string }
  | {
      type: 'financial_action';
      action: FinancialActionType;
      payload: GrokFinancialActionPayload;
      message: string;
      requiresConfirmation: true;
    }
  | {
      type: 'clarification';
      message: string;
      data?: {
        relatedGoalId?: string;
        newGoalHref?: string;
        newGoalLabel?: string;
        existingGoalName?: string;
      };
    }
  | { type: 'error'; message: string }
  | {
      type: 'budget';
      message: string;
      data: {
        category: string;
        limitAmount: string;
        usedAmount: string;
        remainingAmount: string;
        percentage: number;
        status?: string;
        period?: string;
      };
    }
  | {
      type: 'goal';
      message: string;
      data: {
        goalId?: string;
        name: string;
        targetAmount: string;
        currentAmount: string;
        remainingAmount: string;
        percentage: number;
        deadline?: string | null;
        category?: string;
      };
    }
  | {
      type: 'wallet';
      message: string;
      data: {
        wallets: { name: string; balance: string; type?: string }[];
        totalBalance: string;
      };
    }
  | {
      type: 'summary';
      message: string;
      data: {
        period?: string;
        income: string;
        expense: string;
        remaining: string;
        budgetPercentage?: number;
        activeGoals?: number;
      };
    }
  | {
      type: 'insight';
      message: string;
      data?: {
        title?: string;
        value?: string;
        change?: string;
        detail?: string;
      };
    }
  | {
      type: 'spending_breakdown';
      message: string;
      data: {
        items: { category: string; total: string; percentage?: number }[];
        period?: string;
      };
    }
  | {
      type: 'financial_plan';
      message: string;
      data: {
        targetName: string;
        targetAmount: string;
        currentAmount: string;
        remainingAmount: string;
        durationMonths?: number;
        requiredMonthlySaving: string;
        monthlyIncome: string;
        monthlyExpense: string;
        monthlyNetCashFlow: string;
        requiredPercentageOfNet: number;
        feasibility: 'realistic' | 'tight' | 'unlikely' | 'insufficient_data';
        assumptions: string[];
        relatedGoalId?: string | null;
      };
    };

export interface AIChatResponseData {
  response: AIStructuredResponse;
  meta: {
    provider: string;
    model: string;
    timestamp: string;
  };
}
