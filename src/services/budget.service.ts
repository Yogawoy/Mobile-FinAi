import { apiRequest } from '@/lib/api';

export type BudgetPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface BackendBudget {
  id: string;
  userId: string;
  name?: string | null;
  categoryId: string;
  category: {
    id: string;
    name: string;
    type: 'INCOME' | 'EXPENSE';
    icon: string;
    color: string;
  };
  month: number;
  year: number;
  period: BudgetPeriod;
  periodLabel?: string;
  limitAmount: number;
  monthlyEquivalentLimit?: number;
  spentAmount: number;
  remainingAmount: number;
  percentage: number;
  alertThresholdPct: number;
  status: 'SAFE' | 'WARNING' | 'OVER_BUDGET';
}

export interface BackendBudgetSummary {
  totalMonthlyEquivalentLimit: number;
  totalMonthlySpent: number;
  percentage: number;
}

export interface BackendBudgetsResponse {
  items: BackendBudget[];
  summary: BackendBudgetSummary;
}

export const budgetService = {
  async getBudgets(month?: number, year?: number, period?: BudgetPeriod): Promise<BackendBudgetsResponse> {
    const now = new Date();
    const m = month ?? now.getMonth() + 1;
    const y = year ?? now.getFullYear();
    const periodParam = period ? `&period=${period}` : '';
    const res = await apiRequest<BackendBudgetsResponse | BackendBudget[]>(
      `/budgets?month=${m}&year=${y}${periodParam}`
    );
    if (Array.isArray(res)) {
      const totalMonthlyEquivalentLimit = res.reduce(
        (s, b) => s + Number(b.monthlyEquivalentLimit ?? b.limitAmount),
        0
      );
      const totalMonthlySpent = res.reduce((s, b) => s + Number(b.spentAmount), 0);
      return {
        items: res,
        summary: {
          totalMonthlyEquivalentLimit,
          totalMonthlySpent,
          percentage:
            totalMonthlyEquivalentLimit > 0
              ? Math.round((totalMonthlySpent / totalMonthlyEquivalentLimit) * 1000) / 10
              : 0,
        },
      };
    }
    return res;
  },

  upsertBudget(payload: {
    name?: string | null;
    categoryId?: string | null;
    categoryName?: string;
    month: number;
    year: number;
    period?: BudgetPeriod;
    limitAmount: number;
    alertThresholdPct?: number;
  }) {
    return apiRequest<BackendBudget>('/budgets', {
      method: 'POST',
      body: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.categoryId ? { categoryId: payload.categoryId } : {}),
        ...(payload.categoryName ? { categoryName: payload.categoryName } : {}),
        month: payload.month,
        year: payload.year,
        ...(payload.period ? { period: payload.period } : {}),
        limitAmount: payload.limitAmount,
        ...(payload.alertThresholdPct !== undefined
          ? { alertThresholdPct: payload.alertThresholdPct }
          : {}),
      },
    });
  },

  createBudget(payload: {
    category: string;
    limitAmount: number;
    month: number;
    year: number;
  }) {
    return apiRequest<BackendBudget>('/budgets', {
      method: 'POST',
      body: {
        categoryId: payload.category,
        limitAmount: payload.limitAmount,
        month: payload.month,
        year: payload.year,
      },
    });
  },

  updateBudget(
    _id: string,
    payload: { category: string; limitAmount: number; month?: number; year?: number }
  ) {
    const now = new Date();
    return apiRequest<BackendBudget>('/budgets', {
      method: 'POST',
      body: {
        categoryId: payload.category,
        limitAmount: payload.limitAmount,
        month: payload.month ?? now.getMonth() + 1,
        year: payload.year ?? now.getFullYear(),
      },
    });
  },

  deleteBudget(id: string) {
    return apiRequest<{ deleted: boolean; budgetId: string }>(`/budgets/${id}`, {
      method: 'DELETE',
    });
  },
};
