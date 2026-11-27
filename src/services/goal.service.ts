import { apiRequest } from '@/lib/api';

export interface BackendGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  percentage: number;
  deadline: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

export const goalService = {
  getGoals() {
    return apiRequest<BackendGoal[]>('/goals');
  },

  createGoal(payload: {
    name: string;
    targetAmount: number;
    currentAmount?: number;
    deadline: string;
    category?: string;
    frequency?: string;
  }) {
    return apiRequest<BackendGoal>('/goals', {
      method: 'POST',
      body: {
        name: payload.name,
        targetAmount: payload.targetAmount,
        currentAmount: payload.currentAmount ?? 0,
        deadline: payload.deadline,
      },
    });
  },

  updateGoal(
    id: string,
    payload: {
      name?: string;
      targetAmount?: number;
      deadline?: string;
      status?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    }
  ) {
    return apiRequest<BackendGoal>(`/goals/${id}`, {
      method: 'PUT',
      body: payload,
    });
  },

  contributeGoal(
    id: string,
    amount: number,
    options?: {
      walletId?: string | null;
      destinationWalletId?: string | null;
      note?: string;
    }
  ) {
    return apiRequest<BackendGoal>(`/goals/${id}/contribute`, {
      method: 'PATCH',
      body: {
        amount,
        ...(options?.walletId ? { walletId: options.walletId } : {}),
        ...(options?.destinationWalletId
          ? { destinationWalletId: options.destinationWalletId }
          : {}),
        ...(options?.note ? { note: options.note } : {}),
      },
    });
  },

  addContribution(
    id: string,
    payload: { amount: number; sourceWalletId?: string; contributionDate?: string }
  ) {
    return apiRequest<BackendGoal>(`/goals/${id}/contribute`, {
      method: 'PATCH',
      body: { amount: payload.amount },
    });
  },

  deleteGoal(id: string) {
    return apiRequest<{ deleted: boolean; goalId: string }>(`/goals/${id}`, {
      method: 'DELETE',
    });
  },
};
