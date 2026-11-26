import { apiRequest } from '@/lib/api';

export interface BackendTransaction {
  id: string;
  userId: string;
  walletId: string;
  destinationWalletId: string | null;
  categoryId: string | null;
  recurringId: string | null;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  amount: number;
  note: string | null;
  transactionDate: string;
  createdAt: string;
  wallet: {
    id: string;
    name: string;
    type: string;
    color: string;
  };
  destinationWallet: {
    id: string;
    name: string;
    type: string;
    color: string;
  } | null;
  category: {
    id: string;
    name: string;
    type: 'INCOME' | 'EXPENSE';
    icon: string;
    color: string;
  } | null;
}

export interface TransactionQueryParams {
  month?: number;
  year?: number;
  type?: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  walletId?: string;
  categoryId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const transactionService = {
  getTransactions(params: TransactionQueryParams = {}) {
    const search = new URLSearchParams();
    if (params.month) search.set('month', String(params.month));
    if (params.year) search.set('year', String(params.year));
    if (params.type) search.set('type', params.type);
    if (params.walletId) search.set('walletId', params.walletId);
    if (params.categoryId) search.set('categoryId', params.categoryId);
    if (params.search) search.set('search', params.search);
    if (params.page) search.set('page', String(params.page));
    if (params.limit) search.set('limit', String(params.limit));
    const qs = search.toString();

    return apiRequest<{
      items: BackendTransaction[];
      summary: {
        totalIncome: number;
        totalExpense: number;
        netCashflow: number;
      };
    }>(`/transactions${qs ? `?${qs}` : ''}`);
  },

  createTransaction(payload: {
    walletId: string;
    destinationWalletId?: string | null;
    categoryId?: string | null;
    category?: string;
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
    amount: number;
    note?: string | null;
    description?: string;
    transactionDate?: string;
  }) {
    return apiRequest<BackendTransaction>('/transactions', {
      method: 'POST',
      body: {
        walletId: payload.walletId,
        destinationWalletId: payload.destinationWalletId ?? null,
        categoryId: payload.categoryId ?? null,
        type: payload.type,
        amount: payload.amount,
        note: payload.note ?? payload.description ?? null,
        transactionDate: payload.transactionDate ?? new Date().toISOString(),
      },
    });
  },

  updateTransaction(
    id: string,
    payload: {
      walletId?: string;
      destinationWalletId?: string | null;
      categoryId?: string | null;
      category?: string;
      type?: 'INCOME' | 'EXPENSE' | 'TRANSFER';
      amount?: number;
      note?: string | null;
      description?: string;
      transactionDate?: string;
    }
  ) {
    return apiRequest<BackendTransaction>(`/transactions/${id}`, {
      method: 'PUT',
      body: {
        ...(payload.walletId !== undefined ? { walletId: payload.walletId } : {}),
        ...(payload.destinationWalletId !== undefined
          ? { destinationWalletId: payload.destinationWalletId }
          : {}),
        ...(payload.categoryId !== undefined ? { categoryId: payload.categoryId } : {}),
        ...(payload.type !== undefined ? { type: payload.type } : {}),
        ...(payload.amount !== undefined ? { amount: payload.amount } : {}),
        ...(payload.note !== undefined || payload.description !== undefined
          ? { note: payload.note ?? payload.description ?? null }
          : {}),
        ...(payload.transactionDate !== undefined
          ? { transactionDate: payload.transactionDate }
          : {}),
      },
    });
  },

  deleteTransaction(id: string) {
    return apiRequest<{ deleted: boolean; transactionId: string }>(
      `/transactions/${id}`,
      { method: 'DELETE' }
    );
  },
};
