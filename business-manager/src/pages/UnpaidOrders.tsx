import { useState, useEffect, Fragment } from 'react';
import { format } from 'date-fns';
import { salesApi, Quote, trackingApi, Tracking } from '../services/api';
import { Dialog, Transition } from '@headlessui/react';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  BanknotesIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  XMarkIcon,
  CheckIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface ExtendedQuote extends Quote {
  paymentMethod: string;
}

interface UnpaidItem extends Omit<ExtendedQuote, 'chargedAmount'> {
  orderNumber: string;
  charged: number;
  daysOverdue: number;
  amountPaid: number;
  remainingAmount: number;
  itemType: 'order' | 'shipment';
  originalId: number;
}

interface Metrics {
  totalUnpaid: number;
  overdue30Days: number;
  averageDaysOverdue: number;
  criticalAmount: number;
  ordersCount: number;
  partiallyPaidCount: number;
  totalPartialPayments: number;
  totalAmountDue: number;
  avgDaysOverdue: number;
  topPlatform: string;
}

const UnpaidOrders = () => {
  const [orders, setOrders] = useState<UnpaidItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'daysOverdue' | 'charged'>('daysOverdue');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedOrder, setSelectedOrder] = useState<UnpaidItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<Quote['status']>('received');
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [metrics, setMetrics] = useState<Metrics>({
    totalUnpaid: 0,
    overdue30Days: 0,
    averageDaysOverdue: 0,
    criticalAmount: 0,
    ordersCount: 0,
    partiallyPaidCount: 0,
    totalPartialPayments: 0,
    totalAmountDue: 0,
    avgDaysOverdue: 0,
    topPlatform: '',
  });
  const [editingAmount, setEditingAmount] = useState<number>(0);

  useEffect(() => {
    fetchUnpaidOrders();
  }, []);

  const fetchUnpaidOrders = async () => {
    try {
      setLoading(true);
      
      // Fetch both quotes and shipments
      const [salesResponse, trackingsResponse] = await Promise.all([
        salesApi.getMonthlySales(),
        trackingApi.getAll()
      ]);
      
      // Process quotes
      const unpaidQuotes = salesResponse.data
        .filter(order => order.status !== 'paid' && (order.status as string) !== 'shipment')
        .map(order => ({
          ...order,
          orderNumber: order.id.toString(),
          paymentMethod: order.paymentMethod || 'Not specified',
          platform: order.platform || 'Not specified',
          charged: order.chargedAmount,
          daysOverdue: calculateDaysOverdue(order.createdAt),
          amountPaid: order.amountPaid || 0,
          remainingAmount: order.chargedAmount - (order.amountPaid || 0),
          itemType: 'order' as const,
          originalId: order.id
        }));
      
      // Process shipments - extract from nested response structure
      let unpaidShipments: UnpaidItem[] = [];
      if (trackingsResponse && trackingsResponse.data) {
        // Handle the response structure
        const trackingsData = trackingsResponse.data as any; // Using any to bypass type checking for complex structure
        const trackings = Array.isArray(trackingsData) ? 
          trackingsData : 
          trackingsData.data;
          
        if (trackings) {
          unpaidShipments = trackings
            .filter((tracking: Tracking) => tracking.status !== 'paid')
            .map((tracking: Tracking) => {
              // Create a client object with fallbacks in order of preference
              let client;
              
              // If tracking.client exists, use it directly
              if (tracking.client) {
                client = tracking.client;
              }
              // If clientName exists, create a minimal client object
              else if (tracking.clientName) {
                client = {
                  company: tracking.clientName,
                  name: tracking.clientName
                };
              }
              // Handle the case where clientId contains client data (legacy format)
              else if (typeof tracking.clientId === 'object' && tracking.clientId) {
                const clientObj = tracking.clientId as any;
                client = {
                  company: 'company' in clientObj ? clientObj.company : 'Unknown Company',
                  name: 'name' in clientObj ? clientObj.name : 'Unknown Client'
                };
              }
              // Default fallback
              else {
                client = {
                  company: 'Unknown Company',
                  name: 'Unknown Client'
                };
              }
              
              return {
                ...tracking,
                id: tracking.id,
                originalId: typeof tracking.id === 'string' ? parseInt(tracking.id) : tracking.id,
                itemType: 'shipment' as const,
                client,
                product: tracking.trackingNumber,
                platform: 'Shipment',
                status: 'shipment',
                cost: tracking.shippingCost,
                chargedAmount: tracking.totalValue,
                charged: tracking.totalValue,
                orderNumber: `S-${String(tracking.id)}`,
                paymentMethod: 'Shipping',
                notes: `Tracking: ${tracking.trackingNumber}`,
                daysOverdue: calculateDaysOverdue(tracking.createdAt),
                amountPaid: tracking.amountPaid || 0,
                remainingAmount: tracking.totalValue - (tracking.amountPaid || 0),
                createdAt: tracking.createdAt,
                updatedAt: tracking.updatedAt
              };
            });
        }
      }
      
      // Combine quotes and shipments
      const allUnpaidItems = [...unpaidQuotes, ...unpaidShipments];
      const sortedItems = sortOrders(allUnpaidItems);
      setOrders(sortedItems);
      calculateMetrics(sortedItems);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load unpaid orders');
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (orders: UnpaidItem[]) => {
    const totalUnpaid = orders.reduce((sum, order) => sum + order.remainingAmount, 0);
    const overdue30Days = orders.filter(order => order.daysOverdue > 30).length;
    const averageDaysOverdue = orders.reduce((sum, order) => sum + order.daysOverdue, 0) / orders.length || 0;
    const criticalAmount = orders
      .filter(order => order.daysOverdue > 30)
      .reduce((sum, order) => sum + order.remainingAmount, 0);
    const partiallyPaidOrders = orders.filter(order => order.amountPaid > 0);

    // Calculate the most common platform
    const platformCounts = orders.reduce((acc, order) => {
      const platform = order.platform || 'Not specified';
      acc[platform] = (acc[platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topPlatform = Object.entries(platformCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Not specified';

    setMetrics({
      totalUnpaid,
      overdue30Days,
      averageDaysOverdue,
      criticalAmount,
      ordersCount: orders.length,
      partiallyPaidCount: partiallyPaidOrders.length,
      totalPartialPayments: partiallyPaidOrders.reduce((sum, order) => sum + order.amountPaid, 0),
      totalAmountDue: orders.reduce((sum, order) => sum + order.charged, 0),
      avgDaysOverdue: averageDaysOverdue,
      topPlatform,
    });
  };

  const calculateDaysOverdue = (createdAt: string) => {
    const created = new Date(createdAt);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - created.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const sortOrders = (ordersToSort: UnpaidItem[]) => {
    return [...ordersToSort].sort((a, b) => {
      const multiplier = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'daysOverdue') {
        return (a.daysOverdue - b.daysOverdue) * multiplier;
      }
      return (a.charged - b.charged) * multiplier;
    });
  };

  const handleSort = (field: 'daysOverdue' | 'charged') => {
    if (sortBy === field) {
      setSortOrder(current => current === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setOrders(current => sortOrders(current));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const handleUpdateOrder = async () => {
    try {
      if (!selectedOrder) return;

      // Handle differently based on item type
      if (selectedOrder.itemType === 'order') {
        // Handle quote/order payment
        const updatedOrder = {
          ...selectedOrder,
          status: editingStatus,
          amountPaid: editingAmount
        };

        await salesApi.updateOrder(selectedOrder.originalId, updatedOrder);
      } else {
        // Handle shipment payment
        if (editingStatus === 'paid' || editingAmount >= selectedOrder.charged) {
          // Mark shipment as fully paid
          await trackingApi.updatePayment(selectedOrder.originalId.toString(), editingAmount, 'paid');
        } else {
          // Add partial payment
          await trackingApi.updatePayment(selectedOrder.originalId.toString(), editingAmount);
        }
      }
      
      await fetchUnpaidOrders(); // Refresh the orders list
      
      setShowSaveConfirmation(false);
      setIsEditModalOpen(false);
      setSelectedOrder(null);
      setEditingStatus('received');
      setEditingAmount(0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update payment');
    }
  };

  const handleRowClick = (order: UnpaidItem) => {
    setSelectedOrder(order);
    setEditingStatus(order.status);
    setEditingAmount(0); // Start with 0 for new payment
    setIsEditModalOpen(true);
  };

  const handleMarkAsPaid = () => {
    if (!selectedOrder) return;
    setEditingStatus('paid');
    setEditingAmount(selectedOrder.remainingAmount);
    setShowSaveConfirmation(true);
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading unpaid orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Unpaid Orders</h1>
          <p className="mt-2 text-sm text-gray-700">
            Track and manage all unpaid orders in one place
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Unpaid */}
        <div className="relative bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] p-6">
          <dt>
            <div className="absolute rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 p-3 shadow-lg shadow-indigo-200">
              <DocumentTextIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <p className="ml-16 truncate text-sm font-medium text-gray-600">Total Unpaid</p>
          </dt>
          <dd className="ml-16 flex items-baseline pt-1">
            <p className="text-2xl font-semibold text-gray-900">{formatCurrency(metrics.totalUnpaid)}</p>
          </dd>
        </div>

        {/* Total Amount Due */}
        <div className="relative bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] p-6">
          <dt>
            <div className="absolute rounded-xl bg-gradient-to-br from-red-500 to-red-600 p-3 shadow-lg shadow-red-200">
              <CurrencyDollarIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <p className="ml-16 truncate text-sm font-medium text-gray-600">Amount Due</p>
          </dt>
          <dd className="ml-16 flex items-baseline pt-1">
            <p className="text-2xl font-semibold text-gray-900">{formatCurrency(metrics.totalAmountDue)}</p>
          </dd>
        </div>

        {/* Average Days Overdue */}
        <div className="relative bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] p-6">
          <dt>
            <div className="absolute rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 p-3 shadow-lg shadow-amber-200">
              <ClockIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <p className="ml-16 truncate text-sm font-medium text-gray-600">Avg. Days Overdue</p>
          </dt>
          <dd className="ml-16 flex items-baseline pt-1">
            <p className="text-2xl font-semibold text-gray-900">{Math.round(metrics.avgDaysOverdue)}</p>
            <p className="ml-2 text-sm text-gray-600">days</p>
          </dd>
        </div>

        {/* Most Common Platform */}
        <div className="relative bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] p-6">
          <dt>
            <div className="absolute rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-3 shadow-lg shadow-blue-200">
              <ChartBarIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <p className="ml-16 truncate text-sm font-medium text-gray-600">Top Platform</p>
          </dt>
          <dd className="ml-16 flex items-baseline pt-1">
            <p className="text-2xl font-semibold text-gray-900">{metrics.topPlatform}</p>
          </dd>
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-200">
            <CheckIcon className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No Unpaid Orders</h3>
          <p className="mt-2 text-sm text-gray-500 text-center">
            Great job! All orders have been paid. Check back later for new unpaid orders.
          </p>
        </div>
      ) : (
        <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] ring-1 ring-black ring-opacity-5 md:rounded-2xl">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                        Client
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Product
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Type
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Amount Due
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Days Overdue
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {orders.map((order) => (
                      <tr 
                        key={order.id} 
                        onClick={() => handleRowClick(order)}
                        className={`${
                          order.daysOverdue > 30 
                            ? 'bg-red-50 hover:bg-red-100' 
                            : order.daysOverdue > 15
                            ? 'bg-yellow-50 hover:bg-yellow-100'
                            : 'hover:bg-gray-50'
                        } transition-colors duration-150 cursor-pointer`}
                      >
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {typeof order.client === 'string' ? order.client : order.client.company}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {order.product}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                            (order.status as string) === 'shipment' 
                              ? 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-gradient-to-r from-sky-50 to-sky-100 text-sky-800 border border-sky-200'
                          }`}>
                            {(order.status as string) === 'shipment' ? 'Shipment' : 'Order'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {formatCurrency(order.charged)}
                        </td>
                        <td className={`whitespace-nowrap px-3 py-4 text-sm ${
                          order.daysOverdue > 30 
                            ? 'text-red-600 font-medium' 
                            : order.daysOverdue > 15
                            ? 'text-yellow-600'
                            : 'text-gray-500'
                        }`}>
                          {order.daysOverdue} days
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <Transition.Root show={isEditModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsEditModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                  <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                    <button
                      type="button"
                      className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                      onClick={() => setIsEditModalOpen(false)}
                    >
                      <span className="sr-only">Close</span>
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                  <div>
                    <div className="mt-3 text-center sm:mt-5">
                      <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                        Update Payment
                      </Dialog.Title>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Order #{selectedOrder?.orderNumber} - {selectedOrder?.product}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Client: {typeof selectedOrder?.client === 'string' ? selectedOrder?.client : selectedOrder?.client.company}
                        </p>
                        <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-500">Total Amount</p>
                              <p className="text-lg font-semibold text-gray-900">{selectedOrder && formatCurrency(selectedOrder.charged)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Amount Paid</p>
                              <p className="text-lg font-semibold text-green-600">{selectedOrder && formatCurrency(selectedOrder.amountPaid)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Remaining</p>
                              <p className="text-lg font-semibold text-red-600">{selectedOrder && formatCurrency(selectedOrder.remainingAmount)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Days Overdue</p>
                              <p className="text-lg font-semibold text-gray-900">{selectedOrder?.daysOverdue} days</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <label htmlFor="payment" className="block text-sm font-medium text-gray-700">
                        Add Payment
                      </label>
                      <div className="relative mt-1 rounded-md shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                          type="number"
                          name="payment"
                          id="payment"
                          className="block w-full rounded-xl border border-gray-300 bg-white py-3 pl-8 pr-4 text-gray-900 shadow-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors duration-200"
                          placeholder="0.00"
                          value={editingAmount || ''}
                          onChange={(e) => setEditingAmount(parseFloat(e.target.value) || 0)}
                          max={selectedOrder?.remainingAmount}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-3 sm:gap-3">
                    <button
                      type="button"
                      className="inline-flex w-full justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:col-start-3"
                      onClick={handleMarkAsPaid}
                    >
                      Mark as Paid
                    </button>
                    <button
                      type="button"
                      className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:col-start-2"
                      onClick={() => setShowSaveConfirmation(true)}
                      disabled={Boolean(!editingAmount || editingAmount <= 0 || (selectedOrder && editingAmount > selectedOrder.remainingAmount))}
                    >
                      Add Payment
                    </button>
                    <button
                      type="button"
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                      onClick={() => {
                        setIsEditModalOpen(false);
                        setEditingAmount(0);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Save Confirmation Modal */}
      <Transition.Root show={showSaveConfirmation} as={Fragment}>
        <Dialog as="div" className="relative z-20" onClose={() => setShowSaveConfirmation(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-20 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                  <div className="text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                      <CheckIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
                    </div>
                    <Dialog.Title as="h3" className="mt-4 text-lg font-medium text-gray-900">
                      Save Changes
                    </Dialog.Title>
                    <Dialog.Description className="mt-2 text-sm text-gray-500">
                      Are you sure you want to save the changes to this order? Please review the details before confirming.
                    </Dialog.Description>

                    {/* Order Details Summary */}
                    <div className="mt-4 bg-gray-50 rounded-lg p-4 text-left">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Order Number</p>
                          <p className="font-medium">{selectedOrder?.orderNumber}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Status</p>
                          <p className="font-medium capitalize">{editingStatus}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Total Amount</p>
                          <p className="font-medium">{formatCurrency(selectedOrder?.charged || 0)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Amount Paid</p>
                          <p className="font-medium">{formatCurrency(editingAmount)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Remaining Amount</p>
                          <p className="font-medium">{formatCurrency((selectedOrder?.charged || 0) - editingAmount)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowSaveConfirmation(false)}
                      className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleUpdateOrder}
                      className="rounded-xl border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      Confirm & Save
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </div>
  );
};

export default UnpaidOrders; 