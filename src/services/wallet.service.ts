import { apiRequest } from '@/lib/api-client';
import { computeTotalBalance } from '@/lib/format';
import type {
  CreateWalletPayload,
  TransferPayload,
  TransferResponseData,
  UpdateWalletPayload,
  Wallet,
} from '@/types/api';

export { computeTotalBalance };

export const walletService = {
  async getWallets() {
    const data = await apiRequest<{ wallets: Wallet[] }>('/api/wallets');
    return {
      wallets: data.wallets,
      totalBalance: computeTotalBalance(data.wallets),
    };
  },

  getWalletById(id: string) {
    return apiRequest<{ wallet: Wallet }>(`/api/wallets/${id}`);
  },

  createWallet(payload: CreateWalletPayload) {
    return apiRequest<{ wallet: Wallet }>('/api/wallets', {
      method: 'POST',
      body: payload,
    });
  },

  updateWallet(id: string, payload: UpdateWalletPayload) {
    return apiRequest<{ wallet: Wallet }>(`/api/wallets/${id}`, {
      method: 'PATCH',
      body: payload,
    });
  },

  deleteWallet(id: string) {
    return apiRequest<{ message: string }>(`/api/wallets/${id}`, {
      method: 'DELETE',
    });
  },

  transfer(payload: TransferPayload) {
    return apiRequest<TransferResponseData>('/api/transfers', {
      method: 'POST',
      body: payload,
    });
  },
};
