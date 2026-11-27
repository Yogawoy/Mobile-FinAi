import { apiRequest } from '@/lib/api';

export interface GoalMutationItem {
  id: string;
  goalId: string;
  type: 'CONTRIBUTE' | 'WITHDRAW';
  flowType: 'WALLET' | 'EXTERNAL';
  walletId?: string | null;
  walletName?: string | null;
  amount: number;
  note?: string | null;
  createdAt: string;
}

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
  mutations?: GoalMutationItem[];
}

export const goalService = {
  getGoals() {
    return apiRequest<BackendGoal[]>('/goals');
  },

  getGoalById(id: string) {
    return apiRequest<BackendGoal>(`/goals/${id}`);
  },

  createGoal(payload: {
    name: string;
    targetAmount: number;
    currentAmount?: number;
    initialSourceType?: 'WALLET' | 'EXTERNAL';
    initialWalletId?: string | null;
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
        ...(payload.initialSourceType
          ? { initialSourceType: payload.initialSourceType }
          : {}),
        ...(payload.initialWalletId
          ? { initialWalletId: payload.initialWalletId }
          : {}),
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
      sourceType?: 'WALLET' | 'EXTERNAL';
      walletId?: string | null;
      destinationWalletId?: string | null;
      note?: string;
    }
  ) {
    const sourceType =
      options?.sourceType ?? (options?.walletId ? 'WALLET' : 'EXTERNAL');
    return apiRequest<BackendGoal>(`/goals/${id}/contribute`, {
      method: 'POST',
      body: {
        amount,
        sourceType,
        ...(sourceType === 'WALLET' && options?.walletId
          ? { walletId: options.walletId }
          : { walletId: null }),
        ...(options?.destinationWalletId
          ? { destinationWalletId: options.destinationWalletId }
          : {}),
        ...(options?.note ? { note: options.note } : {}),
      },
    });
  },

  withdrawGoal(
    id: string,
    payload: {
      amount: number;
      destinationType: 'WALLET' | 'EXTERNAL';
      walletId?: string | null;
      note?: string;
    }
  ) {
    return apiRequest<BackendGoal>(`/goals/${id}/withdraw`, {
      method: 'POST',
      body: {
        amount: payload.amount,
        destinationType: payload.destinationType,
        ...(payload.destinationType === 'WALLET' && payload.walletId
          ? { walletId: payload.walletId }
          : { walletId: null }),
        ...(payload.note ? { note: payload.note } : {}),
      },
    });
  },

  addContribution(
    id: string,
    payload: { amount: number; sourceWalletId?: string; contributionDate?: string }
  ) {
    return apiRequest<BackendGoal>(`/goals/${id}/contribute`, {
      method: 'POST',
      body: {
        amount: payload.amount,
        sourceType: payload.sourceWalletId ? 'WALLET' : 'EXTERNAL',
        ...(payload.sourceWalletId ? { walletId: payload.sourceWalletId } : {}),
      },
    });
  },

  deleteGoal(id: string, refundToWalletId?: string) {
    const query = refundToWalletId
      ? `?refundToWalletId=${encodeURIComponent(refundToWalletId)}`
      : '';
    return apiRequest<{ deleted: boolean; goalId: string }>(
      `/goals/${id}${query}`,
      {
        method: 'DELETE',
      }
    );
  },
};
