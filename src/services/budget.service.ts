import { apiRequest } from '@/lib/api-client';
import type {
  Budget,
  CreateBudgetPayload,
  UpdateBudgetPayload,
} from '@/types/api';

export const budgetService = {
  getBudgets(month?: number, year?: number) {
    const search = new URLSearchParams();
    if (month !== undefined) search.set('month', String(month));
    if (year !== undefined) search.set('year', String(year));
    const qs = search.toString();
    return apiRequest<{ budgets: Budget[] }>(`/api/budgets${qs ? `?${qs}` : ''}`);
  },

  createBudget(payload: CreateBudgetPayload) {
    return apiRequest<{ budget: Budget }>('/api/budgets', {
      method: 'POST',
      body: payload,
    });
  },

  updateBudget(id: string, payload: UpdateBudgetPayload) {
    return apiRequest<{ budget: Budget }>(`/api/budgets/${id}`, {
      method: 'PATCH',
      body: payload,
    });
  },

  deleteBudget(id: string) {
    return apiRequest<{ message: string }>(`/api/budgets/${id}`, {
      method: 'DELETE',
    });
  },
};
