import { apiRequest } from '@/lib/api-client';
import type {
  CreateTransactionPayload,
  Transaction,
  TransactionListResponseData,
  TransactionQuery,
  UpdateTransactionPayload,
  Wallet,
} from '@/types/api';

function buildQuery(params?: TransactionQuery): string {
  if (!params) return '';
  const search = new URLSearchParams();
  if (params.walletId) search.set('walletId', params.walletId);
  if (params.type) search.set('type', params.type);
  if (params.category) search.set('category', params.category);
  if (params.startDate) search.set('startDate', params.startDate);
  if (params.endDate) search.set('endDate', params.endDate);
  if (params.limit !== undefined) search.set('limit', String(params.limit));
  if (params.offset !== undefined) search.set('offset', String(params.offset));
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const transactionService = {
  getTransactions(query?: TransactionQuery) {
    return apiRequest<TransactionListResponseData>(`/api/transactions${buildQuery(query)}`);
  },

  getTransactionById(id: string) {
    return apiRequest<{ transaction: Transaction }>(`/api/transactions/${id}`);
  },

  createTransaction(payload: CreateTransactionPayload) {
    return apiRequest<{ transaction: Transaction; wallet: Wallet }>('/api/transactions', {
      method: 'POST',
      body: payload,
    });
  },

  updateTransaction(id: string, payload: UpdateTransactionPayload) {
    return apiRequest<{ transaction: Transaction }>(`/api/transactions/${id}`, {
      method: 'PATCH',
      body: payload,
    });
  },

  deleteTransaction(id: string) {
    return apiRequest<{ message: string }>(`/api/transactions/${id}`, {
      method: 'DELETE',
    });
  },
};
