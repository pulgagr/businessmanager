import axios from 'axios';

export interface Client {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: 'active' | 'inactive';
  idNumber: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  taxId: string;
}

export interface Quote {
  id: number;
  clientId: number;
  client: Client;
  product: string;
  platform: string;
  status: 'quote' | 'quoted' | 'purchase' | 'purchased' | 'received' | 'paid';
  cost: number;
  chargedAmount: number;
  amountPaid: number;
  paymentMethod: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateQuoteData extends Omit<Quote, 'id' | 'client' | 'createdAt' | 'updatedAt'> {
  charged?: number;
}

export interface Activity {
  id: number;
  quoteId: number;
  quote: Quote;
  type: string;
  amount: number;
  status: 'pending' | 'completed';
  createdAt: string;
}

export interface Settings {
  companyName: string;
  email: string;
  phone: string;
  address: string;
  taxRate: number;
  currency: string;
  defaultPlatformFee: number;
  notificationEmail: string;
  autoGenerateInvoices: boolean;
  platformOptions: string[];
  paymentOptions: string[];
}

export interface MonthlySummary {
  totalOrders: number;
  totalCost: number;
  totalRevenue: number;
  profit: number;
  statusBreakdown: Array<{
    status: string;
    _count: { id: number };
  }>;
}

const api = axios.create({
  baseURL: 'http://localhost:3001/api', // Update this with your actual backend URL
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Client API
export const clientApi = {
  getAll: () => api.get<Client[]>('/clients'),
  getById: (id: number) => api.get<Client>(`/clients/${id}`),
  create: (data: Omit<Client, 'id' | 'status'>) => api.post<Client>('/clients', data),
  update: (id: number, data: Partial<Client>) => api.put<Client>(`/clients/${id}`, data),
  delete: (id: number) => api.delete(`/clients/${id}`),
};

// Quote API
export const quoteApi = {
  getAll: () => api.get<Quote[]>('/quotes'),
  getMissing: () => api.get<Quote[]>('/quotes/missing'),
  getById: (id: number) => api.get<Quote>(`/quotes/${id}`),
  create: (data: CreateQuoteData) => 
    api.post<Quote>('/quotes', {
      ...data,
      chargedAmount: data.charged || data.chargedAmount || 0,
      status: data.status || 'purchased',
      amountPaid: data.amountPaid || 0,
      paymentMethod: data.paymentMethod || 'Bank Transfer'
    }),
  update: (id: number, data: Partial<Quote>) => api.put<Quote>(`/quotes/${id}`, data),
  delete: (id: number) => api.delete(`/quotes/${id}`),
};

// Sales API
export const salesApi = {
  getMonthlySales: (month?: string) => api.get<Quote[]>('/sales', { params: { month } }),
  getMonthlySummary: (month?: string) => api.get<MonthlySummary>('/sales/summary', { params: { month } }),
  updateOrder: (id: number, data: Partial<Quote>) => api.put<Quote>(`/sales/${id}`, data),
};

// Settings API
export const settingsApi = {
  get: () => api.get<Settings>('/settings'),
  update: (data: Partial<Settings>) => api.put<Settings>('/settings', data),
};

// Dashboard API
export const dashboardApi = {
  getMetrics: () => api.get<{
    totalQuotes: number;
    revenue: number;
    pendingQuotes: number;
    conversionRate: number;
    previousTotalQuotes: number;
    previousRevenue: number;
    previousPendingQuotes: number;
    previousConversionRate: number;
  }>('/dashboard/metrics'),
  getRevenueData: () => api.get<{
    labels: string[];
    data: number[];
  }>('/dashboard/revenue'),
  getQuoteStatusDistribution: () => api.get<{
    labels: string[];
    data: number[];
  }>('/dashboard/quote-status'),
  getQuotesComparison: () => api.get<{
    labels: string[];
    newQuotes: number[];
    completedQuotes: number[];
  }>('/dashboard/quotes-comparison'),
  getRecentActivity: () => api.get<Activity[]>('/dashboard/recent-activity'),
};

export default api; 