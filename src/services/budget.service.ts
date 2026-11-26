import { apiRequest } from '@/lib/api';

export interface BackendBudget {
  id: string;
  userId: string;
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
  limitAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentage: number;
  alertThresholdPct: number;
  status: 'SAFE' | 'WARNING' | 'OVER_BUDGET';
}

export const budgetService = {
  getBudgets(month?: number, year?: number) {
    const now = new Date();
    const m = month ?? now.getMonth() + 1;
    const y = year ?? now.getFullYear();
    return apiRequest<BackendBudget[]>(`/budgets?month=${m}&year=${y}`);
  },

  upsertBudget(payload: {
    categoryId: string;
    month: number;
    year: number;
    limitAmount: number;
    alertThresholdPct?: number;
  }) {
    return apiRequest<BackendBudget>('/budgets', {
      method: 'POST',
      body: payload,
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
