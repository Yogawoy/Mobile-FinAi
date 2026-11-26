import { apiRequest } from '@/lib/api-client';
import type {
  CreateGoalContributionPayload,
  CreateGoalPayload,
  Goal,
  GoalContribution,
  UpdateGoalPayload,
  Wallet,
} from '@/types/api';

export const goalService = {
  getGoals() {
    return apiRequest<{ goals: Goal[] }>('/api/goals');
  },

  getGoalById(id: string) {
    return apiRequest<{ goal: Goal }>(`/api/goals/${id}`);
  },

  createGoal(payload: CreateGoalPayload) {
    return apiRequest<{ goal: Goal }>('/api/goals', {
      method: 'POST',
      body: payload,
    });
  },

  updateGoal(id: string, payload: UpdateGoalPayload) {
    return apiRequest<{ goal: Goal }>(`/api/goals/${id}`, {
      method: 'PATCH',
      body: payload,
    });
  },

  deleteGoal(id: string) {
    return apiRequest<{ message: string }>(`/api/goals/${id}`, {
      method: 'DELETE',
    });
  },

  addContribution(goalId: string, payload: CreateGoalContributionPayload) {
    return apiRequest<{
      contribution: GoalContribution;
      goal: Goal;
      wallet: Wallet;
      message: string;
    }>(`/api/goals/${goalId}/contributions`, {
      method: 'POST',
      body: payload,
    });
  },
};
