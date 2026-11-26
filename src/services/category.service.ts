import { apiRequest } from '@/lib/api';

export interface BackendCategory {
  id: string;
  userId: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  icon: string;
  color: string;
  isDefault: boolean;
  transactionCount: number;
}

export const categoryService = {
  getCategories(type?: 'INCOME' | 'EXPENSE') {
    const qs = type ? `?type=${type}` : '';
    return apiRequest<BackendCategory[]>(`/categories${qs}`);
  },

  createCategory(payload: {
    name: string;
    type: 'INCOME' | 'EXPENSE';
    icon: string;
    color: string;
  }) {
    return apiRequest<BackendCategory>('/categories', {
      method: 'POST',
      body: payload,
    });
  },

  updateCategory(
    id: string,
    payload: { name?: string; icon?: string; color?: string }
  ) {
    return apiRequest<BackendCategory>(`/categories/${id}`, {
      method: 'PUT',
      body: payload,
    });
  },

  deleteCategory(id: string) {
    return apiRequest<{ deleted: boolean; categoryId: string }>(
      `/categories/${id}`,
      { method: 'DELETE' }
    );
  },
};
