import api from './api';

export interface DashboardMetrics {
  totalQuotes: number;
  revenue: number;
  pendingQuotes: number;
  conversionRate: number;
  previousTotalQuotes: number;
  previousRevenue: number;
  previousPendingQuotes: number;
  previousConversionRate: number;
}

export interface RevenueData {
  labels: string[];
  data: number[];
}

export interface QuoteStatusDistribution {
  labels: string[];
  data: number[];
}

export interface QuotesComparison {
  labels: string[];
  newQuotes: number[];
  completedQuotes: number[];
}

export interface Activity {
  id: number;
  client: string;
  type: string;
  amount: number;
  date: string;
  status: 'pending' | 'completed';
}

const dashboardService = {
  async getMetrics(): Promise<DashboardMetrics> {
    const { data } = await api.get<DashboardMetrics>('/dashboard/metrics');
    return data;
  },

  async getRevenueData(): Promise<RevenueData> {
    const { data } = await api.get<RevenueData>('/dashboard/revenue');
    return data;
  },

  async getQuoteStatusDistribution(): Promise<QuoteStatusDistribution> {
    const { data } = await api.get<QuoteStatusDistribution>('/dashboard/quote-status');
    return data;
  },

  async getQuotesComparison(): Promise<QuotesComparison> {
    const { data } = await api.get<QuotesComparison>('/dashboard/quotes-comparison');
    return data;
  },

  async getRecentActivity(): Promise<Activity[]> {
    const { data } = await api.get<Activity[]>('/dashboard/recent-activity');
    return data;
  },
};

export default dashboardService; 