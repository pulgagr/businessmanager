import { useState, useEffect, Fragment } from 'react';
import { format, differenceInDays } from 'date-fns';
import {
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ChartBarIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { Dialog, Transition } from '@headlessui/react';
import { quoteApi, Quote, clientApi, settingsApi } from '../services/api';
import { SelectField, InputField, CurrencyField, TextAreaField, StatusGroup } from '../components/FormFields';
import FormModal from '../components/FormModal';
import ConfirmationModal from '../components/ConfirmationModal';

const MissingQuotes = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingQuote, setDeletingQuote] = useState<Quote | null>(null);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [clients, setClients] = useState<Array<{ id: number; name: string }>>([]);
  const [platformOptions, setPlatformOptions] = useState<string[]>([]);
  const [paymentOptions, setPaymentOptions] = useState<string[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [quotesResponse, clientsResponse, settingsResponse] = await Promise.all([
        quoteApi.getMissing(),
        clientApi.getAll(),
        settingsApi.get()
      ]);
      // Filter quotes to only show those with status 'quote'
      const filteredQuotes = quotesResponse.data.filter(quote => quote.status === 'quote');
      setQuotes(filteredQuotes);
      setClients(clientsResponse.data);
      setPlatformOptions(settingsResponse.data.platformOptions);
      setPaymentOptions(settingsResponse.data.paymentOptions);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
      setLoadingClients(false);
      setLoadingSettings(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const parseCurrencyInput = (value: string): number => {
    // Remove all non-numeric characters except decimal point
    let numericValue = value.replace(/[^0-9.]/g, '');
    
    // Handle multiple decimal points - keep only the first one
    const parts = numericValue.split('.');
    if (parts.length > 2) {
      numericValue = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Parse the value
    let parsedValue = parseFloat(numericValue);
    
    // Handle NaN case
    if (isNaN(parsedValue)) {
      parsedValue = 0;
    }
    
    return parsedValue;
  };

  const handleEditQuote = (quote: Quote) => {
    setEditingQuote({ ...quote });
  };

  const handleInputChange = (field: keyof Quote, value: string | number) => {
    if (!editingQuote) return;
    
    if (field === 'cost' || field === 'chargedAmount') {
      const numericValue = typeof value === 'string' ? parseCurrencyInput(value) : value;
      setEditingQuote(prev => ({
        ...prev!,
        [field]: numericValue
      }));
    } else if (field === 'clientId') {
      setEditingQuote(prev => ({
        ...prev!,
        clientId: typeof value === 'string' ? parseInt(value, 10) : value
      }));
    } else {
      console.log(`Setting ${field} to:`, value);
      setEditingQuote(prev => ({
        ...prev!,
        [field]: value
      }));
    }
  };

  const handleUpdateQuote = async () => {
    try {
      if (!editingQuote) return;

      const quoteData = {
        clientId: editingQuote.clientId,
        product: editingQuote.product,
        platform: editingQuote.platform,
        status: editingQuote.status,
        cost: editingQuote.cost || 0,
        chargedAmount: editingQuote.chargedAmount || 0,
        paymentMethod: editingQuote.paymentMethod || undefined,
        notes: editingQuote.notes || undefined
      };

      console.log('Updating quote with data:', quoteData);
      console.log('Payment method value:', editingQuote.paymentMethod);

      await quoteApi.update(editingQuote.id, quoteData);
      
      // Fetch all quotes again to get the complete data
      const quotesResponse = await quoteApi.getMissing();
      // Filter quotes to only show those with status 'quote'
      const filteredQuotes = quotesResponse.data.filter(quote => quote.status === 'quote');
      
      console.log('Updated quote response:', quotesResponse.data.find(q => q.id === editingQuote.id));
      
      setQuotes(filteredQuotes);
      setShowSaveConfirmation(false);
      setEditingQuote(null);
      setError(null);
    } catch (err) {
      console.error('Error updating quote:', err);
      setError(err instanceof Error ? err.message : 'Failed to update quote');
    }
  };

  const handleDeleteQuote = async (quote: Quote) => {
    try {
      await quoteApi.delete(quote.id);
      setQuotes(prev => prev.filter(q => q.id !== quote.id));
      setDeletingQuote(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete quote');
    }
  };

  // Transform clients data for SelectField
  const clientOptions = clients.map(client => ({
    value: client.id,
    label: client.name
  }));

  // Transform platform options for SelectField
  const platformSelectOptions = platformOptions.map(platform => ({
    value: platform,
    label: platform
  }));

  // Transform payment options for SelectField
  const paymentMethodOptions = paymentOptions.map(method => ({
    value: method,
    label: method
  }));

  // Status options for SelectField
  const statusOptions = [
    { value: 'quote', label: 'Quote Needed' },
    { value: 'quoted', label: 'Quoted' },
    { value: 'purchase', label: 'Purchase Needed' },
    { value: 'purchased', label: 'Purchased' },
    { value: 'received', label: 'Received' },
    { value: 'paid', label: 'Paid' }
  ];

  // Calculate metrics for widgets
  const calculateMetrics = () => {
    const totalMissing = quotes.length;
    
    // Calculate average time in missing status (handle empty case)
    const avgTimeInMissing = totalMissing === 0 ? 0 : quotes.reduce((acc, quote) => {
      const daysInMissing = differenceInDays(new Date(), new Date(quote.createdAt));
      return acc + daysInMissing;
    }, 0) / totalMissing;

    // Calculate potential revenue (handle empty case)
    const potentialRevenue = quotes.reduce((acc, quote) => acc + (quote.chargedAmount || 0), 0);

    // Calculate quotes by platform (handle empty case)
    const platformCounts = quotes.reduce((acc, quote) => {
      acc[quote.platform] = (acc[quote.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get top platform (handle empty case)
    const topPlatform = Object.entries(platformCounts).length > 0
      ? Object.entries(platformCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0]
      : 'None';

    return {
      totalMissing,
      avgTimeInMissing,
      potentialRevenue,
      platformCounts,
      topPlatform
    };
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading missing quotes...</p>
        </div>
      </div>
    );
  }

  const metrics = calculateMetrics();

  // Form content for edit modal
  const renderFormContent = () => {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-2 gap-6">
          <SelectField
            id="clientId"
            name="clientId"
            label="Client"
            value={editingQuote?.clientId || ''}
            onChange={(e) => handleInputChange('clientId', e.target.value)}
            options={clients.map(client => ({
              value: client.id,
              label: client.name
            }))}
            placeholder="Select a client"
            required
          />

          <InputField
            id="product"
            name="product"
            label="Product"
            value={editingQuote?.product || ''}
            onChange={(e) => handleInputChange('product', e.target.value)}
            placeholder="Enter product name"
            required
          />

          <SelectField
            id="platform"
            name="platform"
            label="Platform"
            value={editingQuote?.platform || ''}
            onChange={(e) => handleInputChange('platform', e.target.value)}
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
            value={editingQuote?.paymentMethod || ''}
            onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
            options={paymentOptions.map(method => ({
              value: method,
              label: method
            }))}
            placeholder="Select payment method"
          />
        </div>

        <div>
          <label className="block text-base font-medium text-gray-900 mb-2">
            Status
          </label>
          <StatusGroup
            value={editingQuote?.status || 'quote'}
            onChange={(value: string) => handleInputChange('status', value)}
            options={[
              { value: 'quote', label: 'Quote Needed' },
              { value: 'quoted', label: 'Quoted' },
              { value: 'purchase', label: 'Purchase Needed' },
              { value: 'purchased', label: 'Purchased' },
              { value: 'received', label: 'Received' },
              { value: 'paid', label: 'Paid' }
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <CurrencyField
            id="cost"
            name="cost"
            label="Cost"
            value={editingQuote?.cost || 0}
            onChange={(value) => handleInputChange('cost', Number(value))}
          />

          <CurrencyField
            id="chargedAmount"
            name="chargedAmount"
            label="Charged Amount"
            value={editingQuote?.chargedAmount || 0}
            onChange={(value) => handleInputChange('chargedAmount', Number(value))}
            onPercentageSelect={(percentage: number) => {
              const cost = editingQuote?.cost || 0;
              const calculatedAmount = (cost * (1 + percentage / 100));
              handleInputChange('chargedAmount', calculatedAmount);
            }}
          />
        </div>

        <TextAreaField
          id="notes"
          name="notes"
          label="Notes"
          value={editingQuote?.notes || ''}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          placeholder="Leave any notes here (optional)..."
        />
      </div>
    );
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Quotes Needed</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all quotes that need to be quoted.
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Missing Quotes */}
        <div className="relative bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] p-6">
          <dt>
            <div className="absolute rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 p-3 shadow-lg shadow-indigo-200">
              <DocumentTextIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <p className="ml-16 truncate text-sm font-medium text-gray-600">Total Missing</p>
          </dt>
          <dd className="ml-16 flex items-baseline pt-1">
            <p className="text-2xl font-semibold text-gray-900">{metrics.totalMissing}</p>
          </dd>
        </div>

        {/* Average Time in Missing Status */}
        <div className="relative bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] p-6">
          <dt>
            <div className="absolute rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 p-3 shadow-lg shadow-amber-200">
              <ClockIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <p className="ml-16 truncate text-sm font-medium text-gray-600">Avg. Days Missing</p>
          </dt>
          <dd className="ml-16 flex items-baseline pt-1">
            <p className="text-2xl font-semibold text-gray-900">
              {metrics.totalMissing === 0 ? '0' : Math.round(metrics.avgTimeInMissing)}
            </p>
            <p className="ml-2 text-sm text-gray-600">days</p>
          </dd>
        </div>

        {/* Potential Revenue */}
        <div className="relative bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] p-6">
          <dt>
            <div className="absolute rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 shadow-lg shadow-emerald-200">
              <CurrencyDollarIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <p className="ml-16 truncate text-sm font-medium text-gray-600">Potential Revenue</p>
          </dt>
          <dd className="ml-16 flex items-baseline pt-1">
            <p className="text-2xl font-semibold text-gray-900">{formatCurrency(metrics.potentialRevenue)}</p>
          </dd>
        </div>

        {/* Platform Distribution */}
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

      {quotes.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-200">
            <CheckIcon className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No Missing Quotes</h3>
          <p className="mt-2 text-sm text-gray-500 text-center">
            Great job! All quotes have been processed. Check back later for new quotes that need attention.
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
                        Platform
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Date
                      </th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {quotes.map((quote) => (
                      <tr key={quote.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {quote.client.name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {quote.product}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {quote.platform}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <span className="inline-flex rounded-full bg-yellow-100 px-2 text-xs font-semibold leading-5 text-yellow-800">
                            {quote.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {format(new Date(quote.createdAt), 'MMM d, yyyy')}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleEditQuote(quote)}
                              className="inline-flex items-center rounded-md bg-white px-2.5 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            >
                              <PencilIcon className="h-4 w-4 mr-1" aria-hidden="true" />
                              Edit
                            </button>
                            <button
                              onClick={() => setDeletingQuote(quote)}
                              className="inline-flex items-center rounded-md bg-white px-2.5 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                            >
                              <TrashIcon className="h-4 w-4 mr-1" aria-hidden="true" />
                              Delete
                            </button>
                          </div>
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

      {/* Edit Quote Modal */}
      <FormModal
        isOpen={!!editingQuote}
        onClose={() => setEditingQuote(null)}
        onSubmit={() => setShowSaveConfirmation(true)}
        title="Edit Quote"
        description="Update the quote details below."
        submitLabel="Save Changes"
        showDeleteButton={true}
        onDelete={() => setDeletingQuote(editingQuote)}
      >
        {renderFormContent()}
      </FormModal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deletingQuote}
        onClose={() => setDeletingQuote(null)}
        onConfirm={() => handleDeleteQuote(deletingQuote!)}
        title="Delete Quote"
        description={`Are you sure you want to delete this quote for ${deletingQuote?.client.name}? This action cannot be undone.`}
        type="delete"
      />

      {/* Save Changes Confirmation Modal */}
      <ConfirmationModal
        isOpen={showSaveConfirmation}
        onClose={() => setShowSaveConfirmation(false)}
        onConfirm={handleUpdateQuote}
        title="Save Changes"
        description="Are you sure you want to save the changes to this quote? Please review the details before confirming."
        type="save"
      />
    </div>
  );
};

export default MissingQuotes; 