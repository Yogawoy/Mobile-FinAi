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

export interface AiTransactionCardData {
  intent?: 'CREATE_TRANSACTION' | 'TRANSFER' | 'GOAL_CONTRIBUTE' | 'FINANCIAL_ADVICE';
  transactionId?: string;
  goalId?: string;
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

export interface BackendChatResponse {
  reply: string;
  intent?: 'CREATE_TRANSACTION' | 'TRANSFER' | 'GOAL_CONTRIBUTE' | 'FINANCIAL_ADVICE';
  actionExecuted?: boolean;
  pendingConfirmation?: boolean;
  cardType:
    | 'FORECAST'
    | 'ANOMALY'
    | 'RECOMMENDATION'
    | 'BUDGET'
    | 'WALLET_PICKER'
    | 'TRANSACTION_PREVIEW'
    | 'TRANSACTION_CREATED'
    | null;
  cardData: AiTransactionCardData | null;
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
