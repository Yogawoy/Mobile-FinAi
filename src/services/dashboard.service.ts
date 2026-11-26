import { apiRequest } from '@/lib/api';

export interface DashboardSummaryResponse {
  period: { month: number; year: number };
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  netCashflow: number;
  savingsRate: number;
  cashflowSeries: {
    monthly: Array<{
      month: number;
      year: number;
      label: string;
      income: number;
      expense: number;
      net: number;
    }>;
    daily: Array<{ day: number; income: number; expense: number }>;
  };
  categoryBreakdown: Array<{
    categoryId: string | null;
    name: string;
    icon: string;
    color: string;
    amount: number;
    percentage: number;
  }>;
  budgetOverview: {
    totalLimit: number;
    totalSpent: number;
    remaining: number;
    percentage: number;
    budgetCount: number;
  };
  recentTransactions: unknown[];
}

export const dashboardService = {
  getDashboardSummary(month?: number, year?: number) {
    const now = new Date();
    const m = month ?? now.getMonth() + 1;
    const y = year ?? now.getFullYear();
    return apiRequest<DashboardSummaryResponse>(
      `/dashboard/summary?month=${m}&year=${y}`
    );
  },
};
