import { useState, useEffect, useMemo } from 'react';
import { BanknotesIcon, CurrencyDollarIcon, ChartBarIcon, ArrowTrendingUpIcon, CheckIcon, TruckIcon } from '@heroicons/react/24/outline';
import { salesApi, Quote, settingsApi } from '../services/api';
import { format } from 'date-fns';
import FormModal from '../components/FormModal';
import { SelectField, InputField, CurrencyField, TextAreaField, StatusGroup } from '../components/FormFields';

// Define backend response types to accurately reflect API data structure
interface OrderResponse extends Omit<Quote, 'status'> {
  status: 'quote' | 'quoted' | 'purchase' | 'purchased' | 'received' | 'ready_to_ship' | 'held' | 'shipped' | 'paid' | 'shipment';
  orderNumber?: string;
  client: Quote['client'];
}

// Extend the Quote interface with additional fields needed for the monthly sales view
interface MonthlySalesOrder {
  id: number;
  createdAt: string;
  updatedAt: string;
  clientId: number;
  client: Quote['client'];
  product: string;
  platform: string;
  status: 'quote' | 'quoted' | 'purchase' | 'purchased' | 'received' | 'ready_to_ship' | 'held' | 'shipped' | 'paid' | 'shipment';
  cost: number;
  charged: number;
  chargedAmount: number;
  amountPaid: number;
  paymentMethod: string;
  notes?: string;
  trackingNumber?: string;
  orderNumber: string;
}

// Helper function to format client name
const formatClientName = (client: Quote['client']) => {
  return typeof client === 'string' ? client : client.company;
};

const MonthlySales = () => {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [orders, setOrders] = useState<MonthlySalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<MonthlySalesOrder | null>(null);
  const [platformOptions, setPlatformOptions] = useState<string[]>([]);
  const [paymentOptions, setPaymentOptions] = useState<string[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

  // Memoize formatting functions
  const formatters = useMemo(() => ({
    date: (dateString: string) => {
      const date = new Date(dateString);
      return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    },
    currency: (value: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value);
    }
  }), []);

  // Memoize calculations
  const totals = useMemo(() => {
    const charged = orders.reduce((sum, order) => sum + order.charged, 0);
    
    // Updated calculation using string type checking to avoid linter errors
    const cost = orders.reduce((sum, order) => {
      // Check the status as a string to avoid TypeScript errors
      const isShipment = String(order.status) === 'shipment';
      if (isShipment) {
        return sum + order.charged; // For shipments, use totalValue (in charged field)
      }
      return sum + order.cost; // For regular orders, use cost
    }, 0);
    
    const profit = charged - cost;
    const margin = cost > 0 ? (profit / cost) * 100 : 0;

    return {
      totalCharged: charged,
      totalCost: cost,
      profit,
      profitMargin: margin
    };
  }, [orders]);

  // Status display configuration
  const statusConfig = useMemo(() => ({
    quote: { label: 'Quote', classes: 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 border border-blue-200' },
  quoted: { label: 'Quoted', classes: 'bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-800 border border-indigo-200' },
  purchase: { label: 'Purchase', classes: 'bg-gradient-to-r from-teal-50 to-teal-100 text-teal-800 border border-teal-200' },
  purchased: { label: 'Purchased', classes: 'bg-gradient-to-r from-green-50 to-green-100 text-green-800 border border-green-200' },
  received: { label: 'Received', classes: 'bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-800 border border-yellow-200' },
  ready_to_ship: { label: 'Ready to Ship', classes: 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 border border-amber-200' },
  held: { label: 'Held', classes: 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-800 border border-orange-200' },
  shipped: { label: 'Shipped', classes: 'bg-gradient-to-r from-cyan-50 to-cyan-100 text-cyan-800 border border-cyan-200' },
  paid: { label: 'Paid', classes: 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-800 border border-emerald-200' },
  shipment: { label: 'Shipment', classes: 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-800 border border-purple-200' }

  }), []);

  useEffect(() => {
    fetchOrders();
    fetchSettings();
  }, [selectedMonth]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await salesApi.getMonthlySales(selectedMonth);
      
      // Cast the response data to include potential shipment status
      const ordersData = response.data as OrderResponse[];
      
      const formattedOrders = ordersData.map(order => {
        // Create proper MonthlySalesOrder from response
        const formattedOrder: MonthlySalesOrder = {
          ...order,
          charged: order.chargedAmount,
          orderNumber: order.status === 'shipment' ? order.orderNumber || order.id.toString() : order.id.toString(),
          paymentMethod: order.paymentMethod || 'Not specified',
          trackingNumber: order.status === 'shipment' ? order.orderNumber : undefined
        };
        return formattedOrder;
      });
      
      setOrders(formattedOrders);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await settingsApi.get();
      setPlatformOptions(response.data.platformOptions);
      setPaymentOptions(response.data.paymentOptions);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMonth = e.target.value;
    if (newMonth && newMonth !== selectedMonth) {
      setSelectedMonth(newMonth);
    }
  };

  const handleRowClick = (order: MonthlySalesOrder) => {
    setEditingOrder(order);
  };

  const handleEditChange = (field: keyof MonthlySalesOrder, value: string | number) => {
    if (!editingOrder) return;

    setEditingOrder(prev => {
      if (!prev) return prev;
      
      if (field === 'cost' || field === 'charged') {
        const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
        return { ...prev, [field]: numValue };
      }
      
      return { ...prev, [field]: value };
    });
  };

  const handleSaveEdit = async () => {
    if (!editingOrder) return;
    setShowSaveConfirmation(true);
  };

  const handleConfirmSave = async () => {
    if (!editingOrder) return;

    try {
      setIsSaving(true);
      setError(null);

      // Check for shipment status using a string comparison to avoid type errors
      const isShipment = editingOrder.status === 'shipment' as string;

      if (isShipment) {
        // For now, show a message that this feature is coming soon
        // In a future update, implement the trackingApi integration
        setError('Editing shipment details directly will be supported in a future update');
        
        // Do not close modal so user can see the error
        setIsSaving(false);
        return;
      }

      // Now we know it's not a shipment, so we can safely use the status
      const updatedOrder = await salesApi.updateOrder(editingOrder.id, {
        product: editingOrder.product,
        platform: editingOrder.platform,
        status: editingOrder.status,
        cost: editingOrder.cost,
        chargedAmount: editingOrder.charged,
        paymentMethod: editingOrder.paymentMethod,
        notes: editingOrder.notes
      });

      setOrders(prev => 
        prev.map(order => 
          order.id === editingOrder.id 
            ? { 
                ...updatedOrder.data,
                orderNumber: updatedOrder.data.id.toString(),
                charged: updatedOrder.data.chargedAmount,
                paymentMethod: updatedOrder.data.paymentMethod || 'Not specified',
                status: editingOrder.status // Keep original status
              } 
            : order
        )
      );

      setEditingOrder(null);
      setShowSaveConfirmation(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingOrder(null);
    setShowSaveConfirmation(false);
  };

  if (loading || loadingSettings) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Monthly Sales</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all orders for the selected month.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <input
            type="month"
            value={selectedMonth}
            onChange={handleMonthChange}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
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

      {/* Sales summary */}
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Sales */}
        <div className="relative bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] p-6">
          <dt>
            <div className="absolute rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 p-3 shadow-lg shadow-indigo-200">
              <BanknotesIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <p className="ml-16 truncate text-sm font-medium text-gray-600">Total Sales</p>
          </dt>
          <dd className="ml-16 flex items-baseline pt-1">
            <p className="text-2xl font-semibold text-gray-900">{formatters.currency(totals.totalCharged)}</p>
          </dd>
        </div>

        {/* Total Cost */}
        <div className="relative bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] p-6">
          <dt>
            <div className="absolute rounded-xl bg-gradient-to-br from-red-500 to-red-600 p-3 shadow-lg shadow-red-200">
              <CurrencyDollarIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <p className="ml-16 truncate text-sm font-medium text-gray-600">Total Cost</p>
          </dt>
          <dd className="ml-16 flex items-baseline pt-1">
            <p className="text-2xl font-semibold text-gray-900">{formatters.currency(totals.totalCost)}</p>
          </dd>
        </div>

        {/* Profit */}
        <div className="relative bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] p-6">
          <dt>
            <div className="absolute rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 shadow-lg shadow-emerald-200">
              <ChartBarIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <p className="ml-16 truncate text-sm font-medium text-gray-600">Profit</p>
          </dt>
          <dd className="ml-16 flex items-baseline pt-1">
            <p className="text-2xl font-semibold text-gray-900">{formatters.currency(totals.profit)}</p>
          </dd>
        </div>

        {/* Profit Margin */}
        <div className="relative bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] p-6">
          <dt>
            <div className="absolute rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 p-3 shadow-lg shadow-amber-200">
              <ArrowTrendingUpIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <p className="ml-16 truncate text-sm font-medium text-gray-600">Profit Margin</p>
          </dt>
          <dd className="ml-16 flex items-baseline pt-1">
            <p className="text-2xl font-semibold text-gray-900">{totals.profitMargin.toFixed(1)}%</p>
          </dd>
        </div>
      </div>

      {/* Edit Modal */}
      <FormModal
        isOpen={!!editingOrder && !showSaveConfirmation}
        onClose={handleCancelEdit}
        onSubmit={handleSaveEdit}
        title="Edit Order"
        description="Update the order details below."
        submitLabel="Save Changes"
      >
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <InputField
              id="product"
              name="product"
              label="Product"
              value={editingOrder?.product || ''}
              onChange={(e) => handleEditChange('product', e.target.value)}
              placeholder="Enter product name"
              required
              className={`${(editingOrder?.status as string) === 'shipment' ? 'col-span-2' : ''}`}
            />

            {(editingOrder?.status as string) !== 'shipment' && (
              <>
                <SelectField
                  id="platform"
                  name="platform"
                  label="Platform"
                  value={editingOrder?.platform || ''}
                  onChange={(e) => handleEditChange('platform', e.target.value)}
                  options={platformOptions.map(platform => ({
                    value: platform,
                    label: platform
                  }))}
                  placeholder="Select platform"
                  required
                />

                <SelectField
                  id="paymentMethod"
                  name="paymentMethod"
                  label="Payment Method"
                  value={editingOrder?.paymentMethod || ''}
                  onChange={(e) => handleEditChange('paymentMethod', e.target.value)}
                  options={paymentOptions.map(method => ({
                    value: method,
                    label: method
                  }))}
                  placeholder="Select payment method"
                  required
                />
              </>
            )}
          </div>

          <div>
            <label className="block text-base font-medium text-gray-900 mb-2">
              Status
            </label>
            <StatusGroup
              value={editingOrder?.status || 'purchased'}
              onChange={(value: string) => handleEditChange('status', value)}
              options={
                (editingOrder?.status as string) === 'shipment' 
                ? [
                  { value: 'shipment', label: 'Shipment' }
                ]
                : [
                   
                    { value: 'purchase', label: 'Purchase Needed' },
                    { value: 'purchased', label: 'Purchased' },
                    { value: 'received', label: 'Received' },
                    { value: 'shipped', label: 'Shipped' },
                    { value: 'paid', label: 'Paid' }
                  ]
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            {(editingOrder?.status as string) === 'shipment' ? (
              <>
                <CurrencyField
                  id="shippingCost"
                  name="shippingCost"
                  label="Shipping Cost"
                  value={editingOrder?.cost.toString() || ''}
                  onChange={(e) => handleEditChange('cost', e.target.value)}
                />
                <CurrencyField
                  id="declaredValue"
                  name="declaredValue"
                  label="Declared Value"
                  value={(editingOrder ? editingOrder.charged - (editingOrder.cost || 0) : 0).toString() || ''}
                  onChange={(e) => {
                    // Calculate new charged value (total) based on declared value + shipping cost
                    const declaredValue = parseFloat(e.target.value) || 0;
                    const shippingCost = editingOrder?.cost || 0;
                    const totalValue = declaredValue + shippingCost;
                    handleEditChange('charged', totalValue);
                  }}
                />
              </>
            ) : (
              <>
                <CurrencyField
                  id="cost"
                  name="cost"
                  label="Cost"
                  value={editingOrder?.cost.toString() || ''}
                  onChange={(e) => handleEditChange('cost', e.target.value)}
                />
                <CurrencyField
                  id="chargedAmount"
                  name="chargedAmount"
                  label="Charged Amount"
                  value={editingOrder?.charged.toString() || ''}
                  onChange={(e) => handleEditChange('charged', e.target.value)}
                  onPercentageSelect={(percentage: number) => {
                    const cost = editingOrder?.cost || 0;
                    const calculatedAmount = Number((cost * (1 + percentage / 100)).toFixed(2));
                    handleEditChange('charged', calculatedAmount);
                  }}
                  selectedPercentage={null}
                  cost={editingOrder?.cost}
                />
              </>
            )}
          </div>

          <TextAreaField
            id="notes"
            name="notes"
            label="Notes"
            value={editingOrder?.notes || ''}
            onChange={(e) => handleEditChange('notes', e.target.value)}
            placeholder="Leave any notes here (optional)..."
            rows={3}
          />
        </div>
      </FormModal>

      {/* Save Confirmation Modal */}
      <FormModal
        isOpen={showSaveConfirmation}
        onClose={() => setShowSaveConfirmation(false)}
        onSubmit={handleConfirmSave}
        title="Confirm Changes"
        description="Are you sure you want to save these changes?"
        submitLabel={isSaving ? 'Saving...' : 'Yes, Save Changes'}
        cancelLabel="Cancel"
      >
        <div className="space-y-4">
          <div className="text-sm text-gray-500">
            <p>You are about to update the following order:</p>
            <ul className="mt-2 list-disc list-inside">
              <li>Product: {editingOrder?.product}</li>
              {(editingOrder?.status as string) !== 'shipment' && (
                <li>Platform: {editingOrder?.platform}</li>
              )}
              <li>Status: {statusConfig[editingOrder?.status || 'purchased']?.label || editingOrder?.status}</li>
              
              {(editingOrder?.status as string) === 'shipment' ? (
                <>
                  <li>Shipping Cost: {formatters.currency(editingOrder?.cost || 0)}</li>
                  <li>Declared Value: {formatters.currency((editingOrder?.charged || 0) - (editingOrder?.cost || 0))}</li>
                  <li>Total Value: {formatters.currency(editingOrder?.charged || 0)}</li>
                </>
              ) : (
                <>
                  <li>Cost: {formatters.currency(editingOrder?.cost || 0)}</li>
                  <li>Charged Amount: {formatters.currency(editingOrder?.charged || 0)}</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </FormModal>

      {/* Loading Modal */}
      <FormModal
        isOpen={isSaving}
        onClose={() => {}}
        onSubmit={() => {}}
        title="Saving Changes"
        description="Please wait while we save your changes..."
        showCloseButton={false}
      >
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </FormModal>

      {/* Orders table */}
      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] ring-1 ring-black ring-opacity-5 md:rounded-2xl">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Date
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Product
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Who
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Cost
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Charged
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {orders.map((order) => (
                    <tr 
                      key={order.id} 
                      onClick={() => handleRowClick(order)}
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500 sm:pl-6">
                        {formatters.date(order.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {order.status === 'shipment' ? (
                          <span className="flex items-center">
                            <TruckIcon className="h-4 w-4 mr-1 text-gray-400" aria-hidden="true" />
                            {order.trackingNumber || order.orderNumber}
                          </span>
                        ) : (
                          order.product
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {formatClientName(order.client)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          statusConfig[order.status]?.classes || 'bg-gray-100 text-gray-800'
                        }`}>
                          {statusConfig[order.status]?.label || order.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {order.status === 'shipment' ? (
                          <div>
                            <div className="font-medium">{formatters.currency(order.charged)}</div>
                          
                          </div>
                        ) : (
                          formatters.currency(order.cost)
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {formatters.currency(order.charged)}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-500">
                        {order.notes}
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={7}>
                        <div className="flex flex-col items-center justify-center py-12">
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-200">
                            <CheckIcon className="h-6 w-6 text-white" aria-hidden="true" />
                          </div>
                          <h3 className="mt-4 text-lg font-medium text-gray-900">No Sales Found</h3>
                          <p className="mt-2 text-sm text-gray-500 text-center">
                            No sales data found for this period. Only quotes with status "purchase" or above are shown here.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlySales; 