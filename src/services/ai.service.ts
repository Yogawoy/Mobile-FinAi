import { apiRequest } from '@/lib/api';

export type SawClassification =
  | 'INSUFFICIENT_DATA'
  | 'Strong'
  | 'Stable'
  | 'Warning'
  | 'Critical';

export interface SawCriterionResult {
  key: 'C1' | 'C2' | 'C3' | 'C4';
  label: string;
  type: 'BENEFIT' | 'COST';
  weight: number;
  rawValue: number;
  normalizedScore: number;
  weightedScore: number;
}

export interface SawHealthResult {
  hasEnoughData: boolean;
  txCount: number;
  minTransactionsNeeded: number;
  healthScore: number | null;
  classification: SawClassification;
  statusLabel: string;
  criteria: {
    c1SavingsRate: SawCriterionResult;
    c2ExpenseControl: SawCriterionResult;
    c3BudgetAdherence: SawCriterionResult;
    c4LiquidityBuffer: SawCriterionResult;
  } | null;
}

export interface AiWalletOption {
  id: string;
  name: string;
  type: string;
  currentBalance: number;
  sufficient: boolean;
}

export interface AiFinancialPlanData {
  targetName: string;
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  durationMonths: number;
  durationDays?: number;
  durationLabel?: string;
  requiredMonthlySaving: number;
  requiredDailySaving?: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyNetCashFlow: number;
  requiredPercentageOfNet: number;
  feasibility: 'realistic' | 'tight' | 'unlikely' | 'insufficient_data';
  assumptions: string[];
  relatedGoalId?: string | null;
}

export interface AiSpendingBreakdownData {
  period: string;
  totalExpense: number;
  items: Array<{
    category: string;
    total: number;
    percentage: number;
  }>;
}

export interface AiSummaryCardData {
  period: string;
  income: number;
  expense: number;
  remaining: number;
  totalBalance: number;
  activeGoals: number;
  sawScore: number | null;
  sawStatus: string;
  sawClassification: SawClassification;
}

export interface AiGoalCardItem {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  percentage: number;
}

export interface AiTransactionCardData {
  intent?:
    | 'CREATE_TRANSACTION'
    | 'TRANSFER'
    | 'GOAL_CONTRIBUTE'
    | 'DELETE_GOAL'
    | 'UPSERT_BUDGET'
    | 'SET_BUDGET'
    | 'DELETE_BUDGET'
    | 'RESET_BUDGET'
    | 'FINANCIAL_ADVICE';
  transactionId?: string;
  goalId?: string;
  budgetId?: string;
  period?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  periodLabel?: string;
  limitAmount?: number;
  oldLimitAmount?: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  amount: number;
  note: string;
  categoryId?: string | null;
  categoryName?: string;
  walletId?: string;
  walletName?: string;
  destinationWalletId?: string | null;
  destinationWalletName?: string | null;
  currentWalletBalance?: number;
  projectedWalletBalance?: number;
  newWalletBalance?: number;
  wallets?: AiWalletOption[];
  totalBalance?: number;
  plan?: AiFinancialPlanData;
  spendingBreakdown?: AiSpendingBreakdownData;
  summary?: AiSummaryCardData;
  goals?: AiGoalCardItem[];
  budgets?: Array<{
    id: string;
    category: { name: string };
    limitAmount: number;
    spentAmount: number;
    percentage: number;
    status: string;
  }>;
}

export interface BackendForecastResponse {
  forecast: {
    id: string;
    month: number;
    year: number;
    totalIncomeMtd: number;
    totalExpenseMtd: number;
    dailyBurnRate: number;
    projectedExpense: number;
    projectedBalance: number;
    riskLevel: 'SAFE' | 'CAUTION' | 'DANGER' | 'INSUFFICIENT_DATA';
    calculatedAt: string;
  };
  anomalies: Array<{
    id: string;
    anomalyType: 'OVER_BUDGET' | 'CATEGORY_SPIKE' | 'OUTLIER_TX';
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    deviationPct: number;
    message: string;
    categoryId: string | null;
    categoryName: string | null;
    transactionId: string | null;
    isDismissed: boolean;
    detectedAt: string;
  }>;
  pacing: {
    elapsedDays: number;
    totalDaysInMonth: number;
    budgetUsedPct: number;
  };
  health?: SawHealthResult;
  trendPoints: Array<{
    day: number;
    actualExpense: number | null;
    projectedExpense: number;
    incomeLine: number;
  }>;
}

export interface BackendAdvisorResponse {
  id: string;
  month: number;
  year: number;
  healthScore: number;
  statusLabel: string;
  advice: {
    health_score: number;
    status_label: string;
    executive_summary: string;
    waste_highlights: string[];
    actionable_recommendations: Array<{
      title: string;
      detail: string;
      estimated_saving: string;
    }>;
  };
  modelUsed: string;
  generatedAt: string;
}

export interface ChatActionCard {
  type: 'ACTION_CARD';
  badge: string;
  accent: 'blue' | 'green' | 'red' | 'amber';
  title: string;
  amount: number;
  rows: Array<{ label: string; value: string }>;
  detailRoute?: { type: 'transaction' | 'budget' | 'goal'; id: string };
}

export interface ChatSummaryCard {
  type: 'SUMMARY_CARD';
  title: string;
  metrics: Array<{
    label: string;
    value: string;
    tone?: 'default' | 'green' | 'red' | 'blue';
  }>;
  items?: Array<{
    id?: string;
    label: string;
    value: string;
    status?: string;
    periodLabel?: 'Harian' | 'Mingguan' | 'Bulanan' | string;
    usableText?: string;
    usageText?: string;
    tone?: 'green' | 'amber' | 'red';
    isExceeded?: boolean;
  }>;
  tip?: string;
}

export interface ChatChoiceCard {
  type: 'CHOICE_CARD';
  title: string;
  options: Array<{ label: string; sublabel?: string; messageToSend: string }>;
}

export type ChatStructuredCard =
  | ChatActionCard
  | ChatSummaryCard
  | ChatChoiceCard;

export interface BackendChatResponse {
  reply: string;
  intent?:
    | 'CREATE_TRANSACTION'
    | 'TRANSFER'
    | 'CREATE_GOAL'
    | 'GOAL_CONTRIBUTE'
    | 'DELETE_GOAL'
    | 'UPSERT_BUDGET'
    | 'SET_BUDGET'
    | 'DELETE_BUDGET'
    | 'RESET_BUDGET'
    | 'FINANCIAL_ADVICE';
  actionExecuted?: boolean;
  pendingConfirmation?: boolean;
  cardType:
    | 'FORECAST'
    | 'ANOMALY'
    | 'RECOMMENDATION'
    | 'BUDGET'
    | 'BUDGET_SET'
    | 'BUDGET_UPDATED'
    | 'BUDGET_DELETED'
    | 'BUDGET_RESET'
    | 'SPENDING_BREAKDOWN'
    | 'SUMMARY'
    | 'GOAL'
    | 'WALLET'
    | 'FINANCIAL_PLAN'
    | 'WALLET_PICKER'
    | 'TRANSACTION_PREVIEW'
    | 'TRANSACTION_CREATED'
    | null;
  cardData: AiTransactionCardData | null;
  card?: ChatStructuredCard | null;
}

export const aiService = {
  getForecast(month?: number, year?: number) {
    const now = new Date();
    const m = month ?? now.getMonth() + 1;
    const y = year ?? now.getFullYear();
    return apiRequest<BackendForecastResponse>(
      `/ai/forecast?month=${m}&year=${y}`
    );
  },

  dismissAnomaly(id: string) {
    return apiRequest<{ id: string; isDismissed: boolean }>(
      `/ai/anomalies/${id}/dismiss`,
      { method: 'PATCH' }
    );
  },

  getAdvisor(month?: number, year?: number) {
    const now = new Date();
    const m = month ?? now.getMonth() + 1;
    const y = year ?? now.getFullYear();
    return apiRequest<BackendAdvisorResponse | null>(
      `/ai/advisor?month=${m}&year=${y}`
    );
  },

  generateAdvisor(month?: number, year?: number) {
    const now = new Date();
    return apiRequest<BackendAdvisorResponse>('/ai/advisor/generate', {
      method: 'POST',
      body: {
        month: month ?? now.getMonth() + 1,
        year: year ?? now.getFullYear(),
      },
      timeoutMs: 30000,
    });
  },

  sendAiChat(payload: {
    message: string;
    month?: number;
    year?: number;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  }) {
    return apiRequest<BackendChatResponse>('/ai/chat', {
      method: 'POST',
      body: payload,
      timeoutMs: 30000,
    });
  },
};
