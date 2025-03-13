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
  platformOptions: string[];
  paymentOptions: string[];
  logoUrl?: string;
  defaultPlatformFee: number;
  notificationEmail: string;
  autoGenerateInvoices: boolean;
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

export interface Tracking {
  id: string;
  trackingNumber: string;
  status: string;
  shippingCost: number;
  totalValue: number;
  declaredValue: number;
  amountPaid: number;
  createdAt: string;
  updatedAt: string;
  clientId: string;
}

export interface CreateTrackingData {
  trackingNumber: string;
  quoteIds: number[];
  clientId: number;
  status?: 'pending' | 'in_transit' | 'delivered';
  declaredValue: number;
  shippingCost: number;
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
  uploadLogo: async (file: File) => {
    return new Promise<{ data: { logoUrl: string } }>((resolve, reject) => {
      // Check file size (max 500KB)
      if (file.size > 500 * 1024) {
        reject(new Error('File size too large. Maximum size is 500KB'));
        return;
      }

      // Check file type
      if (!file.type.match(/^image\/(jpeg|png|gif)$/)) {
        reject(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed'));
        return;
      }

      const img = new Image();
      const reader = new FileReader();

      reader.onload = () => {
        img.src = reader.result as string;
        img.onload = () => {
          // Create canvas for resizing
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions (max 400x400)
          if (width > height) {
            if (width > 400) {
              height = Math.round((height * 400) / width);
              width = 400;
            }
          } else {
            if (height > 400) {
              width = Math.round((width * 400) / height);
              height = 400;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Draw resized image
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to process image'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64 with reduced quality
          const base64String = canvas.toDataURL('image/jpeg', 0.8);
          resolve({ data: { logoUrl: base64String } });
        };
        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    });
  },
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

// Tracking API
export const trackingApi = {
  getAll: () => api.get<Tracking[]>('/tracking'),
  getById: (id: number) => api.get<Tracking>(`/tracking/${id}`),
  create: (data: CreateTrackingData) => api.post<Tracking>('/tracking', data),
  update: (id: number, data: Partial<CreateTrackingData>) => api.put<Tracking>(`/tracking/${id}`, data),
  updateStatus: (id: number, status: 'pending' | 'in_transit' | 'delivered' | 'paid') => 
    api.patch<Tracking>(`/tracking/${id}/status`, { status }),
  updatePayment: (id: number, amountPaid: number, status?: string) => 
    api.patch<Tracking>(`/tracking/${id}/payment`, { amountPaid, status }),
  delete: (id: number) => api.delete(`/tracking/${id}`),
};

export default api; 