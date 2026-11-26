import { apiRequest, tokenStorage } from '@/lib/api';

export interface BackendUser {
  id: string;
  name: string;
  email: string;
  currency: string;
  monthlyIncomeTarget: number | null;
  financialChallenge: string | null;
  budgetRule: string | null;
  hasCompletedSetup?: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  user: BackendUser;
}

export interface SetupBlueprintPayload {
  monthlyIncomeTarget: number | null;
  financialChallenge: string | null;
  budgetRule: string | null;
  wallets: Array<{
    name: string;
    type: 'CASH' | 'BANK' | 'EWALLET' | 'SAVINGS';
    initialBalance: number;
    color: string;
    accountNumber?: string | null;
  }>;
  budgets?: Array<{
    categoryId?: string;
    categoryName?: string;
    limitAmount: number;
    alertThresholdPct?: number;
  }>;
}

export const authService = {
  async login(payload: { email: string; password: string } | string, passwordArg?: string) {
    const email = typeof payload === 'string' ? payload : payload.email;
    const password = typeof payload === 'string' ? (passwordArg ?? '') : payload.password;

    const data = await apiRequest<AuthTokenResponse>('/auth/login', {
      method: 'POST',
      body: { email: email.trim(), password },
      skipAuth: true,
    });
    await tokenStorage.setTokens(data.accessToken, data.refreshToken);
    return data;
  },

  async register(
    payload: { name: string; email: string; password: string } | string,
    emailArg?: string,
    passwordArg?: string
  ) {
    const name = typeof payload === 'string' ? payload : payload.name;
    const email = typeof payload === 'string' ? (emailArg ?? '') : payload.email;
    const password = typeof payload === 'string' ? (passwordArg ?? '') : payload.password;

    const data = await apiRequest<AuthTokenResponse>('/auth/register', {
      method: 'POST',
      body: { name: name.trim(), email: email.trim(), password },
      skipAuth: true,
    });
    await tokenStorage.setTokens(data.accessToken, data.refreshToken);
    return data;
  },

  async logout() {
    const refreshToken = await tokenStorage.getRefreshToken();
    try {
      await apiRequest<null>('/auth/logout', {
        method: 'POST',
        body: refreshToken ? { refreshToken } : {},
      });
    } finally {
      await tokenStorage.clearTokens();
    }
  },

  getMe() {
    return apiRequest<BackendUser>('/auth/me');
  },

  me() {
    return apiRequest<BackendUser>('/auth/me').then((user) => ({ user }));
  },

  updateProfile(
    patch:
      | string
      | {
          name?: string;
          monthlyIncomeTarget?: number | null;
          financialChallenge?: string | null;
          budgetRule?: string | null;
          currentPassword?: string;
          newPassword?: string;
        }
  ) {
    const body = typeof patch === 'string' ? { name: patch.trim() } : patch;
    return apiRequest<BackendUser>('/auth/me', {
      method: 'PUT',
      body,
    });
  },

  setupBlueprint(payload: SetupBlueprintPayload) {
    return apiRequest<{
      user: BackendUser;
      wallets: unknown[];
      budgets: unknown[];
    }>('/auth/setup', {
      method: 'POST',
      body: payload,
    });
  },
};
