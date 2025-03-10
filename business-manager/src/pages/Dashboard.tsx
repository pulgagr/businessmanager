import { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import dashboardService, {
  DashboardMetrics,
  RevenueData,
  QuoteStatusDistribution,
  QuotesComparison,
  Activity,
} from '../services/dashboardService';

// Import Chart.js
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface DashboardMetric {
  name: string;
  stat: string | number;
  previousStat: string | number;
  change: number;
  changeType: 'increase' | 'decrease';
  icon: any;
}

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [quoteStatus, setQuoteStatus] = useState<QuoteStatusDistribution | null>(null);
  const [quotesComparison, setQuotesComparison] = useState<QuotesComparison | null>(null);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchDashboardData = async () => {
    try {
      setError(null);

      const [
        metricsData,
        revenueData,
        statusData,
        comparisonData,
        activityData,
      ] = await Promise.all([
        dashboardService.getMetrics(),
        dashboardService.getRevenueData(),
        dashboardService.getQuoteStatusDistribution(),
        dashboardService.getQuotesComparison(),
        dashboardService.getRecentActivity(),
      ]);

      setMetrics(metricsData);
      setRevenueData(revenueData);
      setQuoteStatus(statusData);
      setQuotesComparison(comparisonData);
      setRecentActivity(activityData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Manual refresh function
  const handleRefresh = () => {
    setLoading(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <div className="rounded-full h-12 w-12 bg-red-100 flex items-center justify-center mx-auto">
            <ExclamationCircleIcon className="h-6 w-6 text-red-600" />
          </div>
          <p className="mt-4 text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const dashboardMetrics = [
    {
      name: 'Total Quotes',
      stat: metrics?.totalQuotes.toString() || '0',
      previousStat: metrics?.previousTotalQuotes || 0,
      change: calculatePercentageChange(metrics?.totalQuotes || 0, metrics?.previousTotalQuotes || 0),
      changeType: (metrics?.totalQuotes || 0) >= (metrics?.previousTotalQuotes || 0) ? 'increase' : 'decrease',
      icon: DocumentTextIcon,
    },
    {
      name: 'Revenue',
      stat: formatCurrency(metrics?.revenue || 0),
      previousStat: metrics?.previousRevenue || 0,
      change: calculatePercentageChange(metrics?.revenue || 0, metrics?.previousRevenue || 0),
      changeType: (metrics?.revenue || 0) >= (metrics?.previousRevenue || 0) ? 'increase' : 'decrease',
      icon: CurrencyDollarIcon,
    },
    {
      name: 'Pending Quotes',
      stat: metrics?.pendingQuotes.toString() || '0',
      previousStat: metrics?.previousPendingQuotes || 0,
      change: calculatePercentageChange(metrics?.pendingQuotes || 0, metrics?.previousPendingQuotes || 0),
      changeType: (metrics?.pendingQuotes || 0) <= (metrics?.previousPendingQuotes || 0) ? 'increase' : 'decrease',
      icon: ClockIcon,
    },
    {
      name: 'Conversion Rate',
      stat: formatPercentage(metrics?.conversionRate || 0),
      previousStat: metrics?.previousConversionRate || 0,
      change: calculatePercentageChange(metrics?.conversionRate || 0, metrics?.previousConversionRate || 0),
      changeType: (metrics?.conversionRate || 0) >= (metrics?.previousConversionRate || 0) ? 'increase' : 'decrease',
      icon: ChartBarIcon,
    },
  ];

  const chartRevenueData = {
    labels: revenueData?.labels || [],
    datasets: [
      {
        label: 'Revenue',
        data: revenueData?.data || [],
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
      },
    ],
  };

  const chartQuoteStatusData = {
    labels: quoteStatus?.labels || [],
    datasets: [
      {
        data: quoteStatus?.data || [],
        backgroundColor: [
          'rgba(99, 102, 241, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartQuotesComparisonData = {
    labels: quotesComparison?.labels || [],
    datasets: [
      {
        label: 'New Quotes',
        data: quotesComparison?.newQuotes || [],
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        barThickness: 20,
        borderRadius: 4,
      },
      {
        label: 'Completed',
        data: quotesComparison?.completedQuotes || [],
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        barThickness: 20,
        borderRadius: 4,
      },
    ],
  };

  return (
    <div className="min-h-full">
      <div className="bg-white px-4 py-5 border-b border-gray-200 sm:px-6">
        <div className="-ml-4 -mt-2 flex items-center justify-between flex-wrap sm:flex-nowrap">
          <div className="ml-4 mt-2">
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          </div>
          <div className="ml-4 mt-2 flex-shrink-0 flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              Last updated: {format(lastUpdated, 'MMM d, yyyy HH:mm')}
            </span>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 px-4 sm:px-6">
        {dashboardMetrics.map((metric) => (
          <div key={metric.name} className="relative bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] p-6">
            <dt>
              <div className="absolute rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 p-3 shadow-lg shadow-indigo-200">
                <metric.icon className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-600">{metric.name}</p>
            </dt>
            <dd className="ml-16 flex items-baseline pt-1">
              <p className="text-2xl font-semibold text-gray-900">{metric.stat}</p>
              <p
                className={`ml-2 flex items-baseline text-sm font-medium ${
                  metric.changeType === 'increase' ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {metric.changeType === 'increase' ? (
                  <ArrowUpIcon className="h-4 w-4 flex-shrink-0 self-center text-emerald-500" aria-hidden="true" />
                ) : (
                  <ArrowDownIcon className="h-4 w-4 flex-shrink-0 self-center text-rose-500" aria-hidden="true" />
                )}
                <span className="ml-1">{metric.change}%</span>
              </p>
            </dd>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2 px-4 sm:px-6">
        {/* Revenue Trend */}
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h2>
          <div className="h-80">
            <Line
              data={chartRevenueData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top' as const,
                    labels: {
                      boxWidth: 8,
                      usePointStyle: true,
                      pointStyle: 'circle',
                    }
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: 'rgba(0,0,0,0.05)',
                    },
                    ticks: {
                      callback: function(tickValue: number | string) {
                        if (typeof tickValue === 'number') {
                          return formatCurrency(tickValue);
                        }
                        return tickValue;
                      },
                    },
                  },
                  x: {
                    grid: {
                      display: false,
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Quote Status Distribution */}
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quote Status Distribution</h2>
          <div className="h-80">
            <Doughnut
              data={chartQuoteStatusData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'right' as const,
                    labels: {
                      boxWidth: 8,
                      usePointStyle: true,
                      pointStyle: 'circle',
                    }
                  },
                },
                cutout: '70%',
              }}
            />
          </div>
        </div>

        {/* Monthly Quotes Comparison */}
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Quotes Comparison</h2>
          <div className="h-80">
            <Bar
              data={chartQuotesComparisonData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top' as const,
                    labels: {
                      boxWidth: 8,
                      usePointStyle: true,
                      pointStyle: 'circle',
                    }
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: 'rgba(0,0,0,0.05)',
                    },
                  },
                  x: {
                    grid: {
                      display: false,
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
            <div className="flow-root">
              <ul role="list" className="-mb-8">
                {recentActivity.map((activity, activityIdx) => (
                  <li key={activity.id}>
                    <div className="relative pb-8">
                      {activityIdx !== recentActivity.length - 1 ? (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-100" aria-hidden="true" />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span
                            className={`h-8 w-8 rounded-xl flex items-center justify-center ring-4 ring-white ${
                              activity.status === 'completed' 
                                ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-200' 
                                : 'bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-200'
                            }`}
                          >
                            {activity.status === 'completed' ? (
                              <CheckIcon className="h-5 w-5 text-white" aria-hidden="true" />
                            ) : (
                              <ClockIcon className="h-5 w-5 text-white" aria-hidden="true" />
                            )}
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                          <div>
                            <p className="text-sm text-gray-600">
                              {activity.type} <span className="font-medium text-gray-900">{activity.client}</span>
                            </p>
                          </div>
                          <div className="whitespace-nowrap text-right text-sm">
                            <div className="font-medium text-gray-900">{formatCurrency(activity.amount)}</div>
                            <time className="text-gray-500" dateTime={activity.date}>
                              {format(new Date(activity.date), 'MMM d, yyyy')}
                            </time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CheckIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const ExclamationIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return 0;
  return Number(((current - previous) / previous * 100).toFixed(2));
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

export default Dashboard; 