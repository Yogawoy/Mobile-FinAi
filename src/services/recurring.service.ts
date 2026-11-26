import { apiRequest } from '@/lib/api';

export interface BackendRecurring {
  id: string;
  userId: string;
  walletId: string;
  categoryId: string | null;
  title: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  nextRunDate: string;
  isActive: boolean;
  wallet: {
    id: string;
    name: string;
    type: string;
    color: string;
  };
  category: {
    id: string;
    name: string;
    type: 'INCOME' | 'EXPENSE';
    icon: string;
    color: string;
  } | null;
}

export const recurringService = {
  getRecurring() {
    return apiRequest<BackendRecurring[]>('/recurring');
  },

  createRecurring(payload: {
    walletId: string;
    categoryId?: string | null;
    title: string;
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    nextRunDate?: string;
    isActive?: boolean;
  }) {
    return apiRequest<BackendRecurring>('/recurring', {
      method: 'POST',
      body: payload,
    });
  },

  updateRecurring(
    id: string,
    payload: {
      walletId?: string;
      categoryId?: string | null;
      title?: string;
      type?: 'INCOME' | 'EXPENSE';
      amount?: number;
      frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
      nextRunDate?: string;
      isActive?: boolean;
    }
  ) {
    return apiRequest<BackendRecurring>(`/recurring/${id}`, {
      method: 'PUT',
      body: payload,
    });
  },

  deleteRecurring(id: string) {
    return apiRequest<{ deleted: boolean; recurringId: string }>(
      `/recurring/${id}`,
      { method: 'DELETE' }
    );
  },

  executeRecurring(id: string) {
    return apiRequest<{
      transaction: { id: string; amount: number };
      recurring: BackendRecurring;
    }>(`/recurring/${id}/execute`, { method: 'POST' });
  },
};
