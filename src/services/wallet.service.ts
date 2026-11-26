import { apiRequest } from '@/lib/api';

export interface BackendWallet {
  id: string;
  userId: string;
  name: string;
  type: 'CASH' | 'BANK' | 'EWALLET' | 'SAVINGS';
  initialBalance: number;
  currentBalance: number;
  color: string;
  accountNumber: string | null;
  isArchived: boolean;
  allocationPercentage: number;
}

export const walletService = {
  getWallets(includeArchived = false) {
    const qs = includeArchived ? '?includeArchived=true' : '';
    return apiRequest<{
      totalActiveBalance: number;
      wallets: BackendWallet[];
    }>(`/wallets${qs}`);
  },

  createWallet(payload: {
    name: string;
    type: 'CASH' | 'BANK' | 'EWALLET' | 'SAVINGS' | 'E_WALLET';
    initialBalance?: number;
    balance?: number;
    color?: string;
    accountNumber?: string | null;
    accountLast4?: string | null;
    institution?: string | null;
    icon?: string;
  }) {
    const normalizedType =
      payload.type === 'E_WALLET' ? 'EWALLET' : payload.type;
    return apiRequest<BackendWallet>('/wallets', {
      method: 'POST',
      body: {
        name: payload.name,
        type: normalizedType,
        initialBalance: payload.initialBalance ?? payload.balance ?? 0,
        color: payload.color ?? '#3B7AF5',
        accountNumber: payload.accountNumber ?? payload.accountLast4 ?? null,
      },
    });
  },

  updateWallet(
    id: string,
    payload: {
      name?: string;
      type?: 'CASH' | 'BANK' | 'EWALLET' | 'SAVINGS' | 'E_WALLET';
      color?: string;
      accountNumber?: string | null;
      accountLast4?: string | null;
      institution?: string | null;
      icon?: string;
      isArchived?: boolean;
    }
  ) {
    const normalizedType =
      payload.type === 'E_WALLET' ? 'EWALLET' : payload.type;
    return apiRequest<BackendWallet>(`/wallets/${id}`, {
      method: 'PUT',
      body: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(normalizedType !== undefined ? { type: normalizedType } : {}),
        ...(payload.color !== undefined ? { color: payload.color } : {}),
        ...(payload.accountNumber !== undefined || payload.accountLast4 !== undefined
          ? { accountNumber: payload.accountNumber ?? payload.accountLast4 ?? null }
          : {}),
        ...(payload.isArchived !== undefined ? { isArchived: payload.isArchived } : {}),
      },
    });
  },

  archiveWallet(id: string) {
    return apiRequest<{
      archived: boolean;
      deleted: boolean;
      wallet?: BackendWallet;
      walletId?: string;
    }>(`/wallets/${id}`, {
      method: 'DELETE',
    });
  },

  transfer(payload: {
    fromWalletId: string;
    toWalletId: string;
    amount: number;
    date?: string;
    note?: string;
  }) {
    return apiRequest<unknown>('/transactions', {
      method: 'POST',
      body: {
        walletId: payload.fromWalletId,
        destinationWalletId: payload.toWalletId,
        type: 'TRANSFER',
        amount: payload.amount,
        note: payload.note,
        transactionDate: payload.date ?? new Date().toISOString(),
      },
    });
  },
};
