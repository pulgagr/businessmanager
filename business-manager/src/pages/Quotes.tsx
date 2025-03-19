import { useState, useEffect, Fragment, useMemo } from 'react';
import { format } from 'date-fns';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { Dialog, Transition } from '@headlessui/react';
import { quoteApi, clientApi, settingsApi, Quote, Client } from '../services/api';
import FormModal from '../components/FormModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { 
  SelectField, 
  InputField, 
  CurrencyField, 
  TextAreaField, 
  StatusGroup 
} from '../components/FormFields';

interface SimulatedChangeEvent {
  target: {
    name: string;
    value: string;
  };
}

const percentageOptions = [
  { value: 10, label: '10%' },
  { value: 20, label: '20%' },
  { value: 30, label: '30%' },
  { value: 35, label: '35%' },
  { value: 40, label: '40%' },
];

const calculateChargedAmount = (cost: number, percentage: number) => {
  // Calculate with higher precision first
  const amount = cost + (cost * (percentage / 100));
  // Round to 2 decimal places and ensure we don't lose precision
  return Number((Math.round(amount * 100) / 100).toFixed(2));
};

const Quotes = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [platformOptions, setPlatformOptions] = useState<string[]>([]);
  const [paymentOptions, setPaymentOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [deletingQuote, setDeletingQuote] = useState<Quote | null>(null);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [newQuote, setNewQuote] = useState<Partial<Quote>>({
    status: 'quote',
    cost: 0,
    chargedAmount: 0
  });
  const [selectedPercentage, setSelectedPercentage] = useState<number | null>(null);
  const [costInput, setCostInput] = useState<string>('0');
  const [chargedAmountInput, setChargedAmountInput] = useState<string>('0');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [quotesResponse, clientsResponse, settingsResponse] = await Promise.all([
        quoteApi.getAll(),
        clientApi.getAll(),
        settingsApi.get()
      ]);
      setQuotes(quotesResponse.data);
      setClients(clientsResponse.data);
      setPlatformOptions(settingsResponse.data.platformOptions);
      setPaymentOptions(settingsResponse.data.paymentOptions);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
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

  const formatCurrencyInput = (value: number): string => {
    // Ensure the value is rounded to 2 decimal places
    return Number(value.toFixed(2)).toString();
  };

  const parseCurrencyInput = (value: string): number => {
    // Allow empty or single dot input
    if (value === '' || value === '.') {
      return 0;
    }

    // Remove all non-numeric characters except decimal point
    let numericValue = value.replace(/[^0-9.]/g, '');
    
    // Handle multiple decimal points - keep only the first one
    const parts = numericValue.split('.');
    if (parts.length > 2) {
      numericValue = parts[0] + '.' + parts.slice(1).join('');
    }

    // Limit to 2 decimal places
    if (parts.length === 2 && parts[1].length > 2) {
      numericValue = parts[0] + '.' + parts[1].slice(0, 2);
    }
    
    // Parse the value and round to 2 decimal places
    let parsedValue = Number(Number(numericValue).toFixed(2));
    
    // Handle NaN case
    if (isNaN(parsedValue)) {
      parsedValue = 0;
    }
    
    return parsedValue;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | SimulatedChangeEvent) => {
    const { name, value } = e.target;
    if (name === 'cost') {
      // Only update if the input is valid (empty, single dot, or has max 2 decimal places)
      if (value === '' || value === '.' || /^\d*\.?\d{0,2}$/.test(value)) {
        setCostInput(value);
        const numericValue = parseCurrencyInput(value);
        setNewQuote(prev => ({
          ...prev,
          cost: numericValue
        }));
        
        // Update charged amount if percentage is selected
        if (selectedPercentage !== null) {
          const calculatedAmount = calculateChargedAmount(numericValue, selectedPercentage);
          setNewQuote(prev => ({
            ...prev,
            chargedAmount: calculatedAmount
          }));
          setChargedAmountInput(calculatedAmount.toString());
        }
      }
    } else if (name === 'chargedAmount') {
      // Only update if the input is valid (empty, single dot, or has max 2 decimal places)
      if (value === '' || value === '.' || /^\d*\.?\d{0,2}$/.test(value)) {
        setChargedAmountInput(value);
        const numericValue = parseCurrencyInput(value);
        setNewQuote(prev => ({
          ...prev,
          chargedAmount: numericValue
        }));
      }
    } else {
      setNewQuote(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | SimulatedChangeEvent) => {
    if (!editingQuote) return;
    
    const { name, value } = e.target;
    if (name === 'cost') {
      // Only update if the input is valid (empty, single dot, or has max 2 decimal places)
      if (value === '' || value === '.' || /^\d*\.?\d{0,2}$/.test(value)) {
        setCostInput(value);
        const numericValue = parseCurrencyInput(value);
        setEditingQuote(prev => ({
          ...prev!,
          cost: numericValue
        }));
        
        // Update charged amount if percentage is selected
        if (selectedPercentage !== null) {
          const calculatedAmount = calculateChargedAmount(numericValue, selectedPercentage);
          setEditingQuote(prev => ({
            ...prev!,
            chargedAmount: calculatedAmount
          }));
          setChargedAmountInput(calculatedAmount.toString());
        }
      }
    } else if (name === 'chargedAmount') {
      // Only update if the input is valid (empty, single dot, or has max 2 decimal places)
      if (value === '' || value === '.' || /^\d*\.?\d{0,2}$/.test(value)) {
        setChargedAmountInput(value);
        const numericValue = parseCurrencyInput(value);
        setEditingQuote(prev => ({
          ...prev!,
          chargedAmount: numericValue
        }));
      }
    } else {
      setEditingQuote(prev => ({
        ...prev!,
        [name]: value
      }));
    }
  };

  useEffect(() => {
    // Initialize input values when editing quote changes
    if (editingQuote) {
      setCostInput(editingQuote.cost.toString());
      setChargedAmountInput(editingQuote.chargedAmount.toString());
    } else {
      setCostInput(newQuote.cost?.toString() || '0');
      setChargedAmountInput(newQuote.chargedAmount?.toString() || '0');
    }
  }, [editingQuote, newQuote.cost, newQuote.chargedAmount]);

  const handleAddQuote = async () => {
    try {
      if (!newQuote.clientId || !newQuote.product) {
        setError('Please fill in all required fields');
        return;
      }

      // Only set default platform if none is provided
      const quoteData = {
        ...newQuote,
        platform: newQuote.platform || 'Other'
      };

      await quoteApi.create(quoteData as Omit<Quote, 'id' | 'client' | 'createdAt' | 'updatedAt'>);
      // Fetch all quotes again to get the complete data with client information
      const quotesResponse = await quoteApi.getAll();
      setQuotes(quotesResponse.data);
      
      setIsAddModalOpen(false);
      setNewQuote({
        status: 'quote',
        cost: 0,
        chargedAmount: 0
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create quote');
    }
  };

  const handleUpdateQuote = async () => {
    try {
      if (!editingQuote) return;

      await quoteApi.update(editingQuote.id, editingQuote);
      // Fetch all quotes again to get the complete data with client information
      const quotesResponse = await quoteApi.getAll();
      setQuotes(quotesResponse.data);
      
      setShowSaveConfirmation(false);
      setEditingQuote(null);
      setError(null);
    } catch (err) {
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

  const metrics = useMemo(() => {
    const totalQuotes = quotes.length;
    const completedQuotes = quotes.filter(quote => quote.status === 'paid').length;
    const totalRevenue = quotes.reduce((sum, quote) => sum + (quote.chargedAmount || 0), 0);
    const platformCounts = quotes.reduce((counts, quote) => {
      counts[quote.platform] = (counts[quote.platform] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    return {
      totalQuotes,
      completedQuotes,
      totalRevenue,
      platformCounts,
    };
  }, [quotes]);

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading quotes...</p>
        </div>
      </div>
    );
  }

  const filteredQuotes = quotes.filter(quote => quote.status === 'quoted');

  // Form content for both add and edit modals
  const renderFormContent = (isEditing: boolean) => {
    const currentQuote = isEditing ? editingQuote : newQuote;
    const handleChange = isEditing ? handleEditChange : handleInputChange;

    return (
      <div className="space-y-8">
        <div className="grid grid-cols-2 gap-6">
          <SelectField
            id="clientId"
            name="clientId"
            label="Client"
            value={currentQuote?.clientId || ''}
            onChange={handleChange}
            options={clients.map(client => ({
              value: client.id,
              label: client.company
            }))}
            placeholder="Select a client"
            required
          />

          <InputField
            id="product"
            name="product"
            label="Product"
            value={currentQuote?.product || ''}
            onChange={handleChange}
            placeholder="Enter product name"
            required
          />

          <SelectField
            id="platform"
            name="platform"
            label="Platform"
            value={currentQuote?.platform || ''}
            onChange={handleChange}
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
            value={currentQuote?.paymentMethod || ''}
            onChange={handleChange}
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
            value={currentQuote?.status || 'quote'}
            onChange={(value: string) => handleChange({ target: { name: 'status', value } })}
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
            value={costInput}
            onChange={handleChange}
          />

          <CurrencyField
            id="chargedAmount"
            name="chargedAmount"
            label="Charged Amount"
            value={chargedAmountInput}
            onChange={handleChange}
            onPercentageSelect={(percentage: number) => {
              const cost = isEditing ? editingQuote!.cost : newQuote.cost!;
              const calculatedAmount = calculateChargedAmount(cost, percentage);
              setSelectedPercentage(percentage);
              if (isEditing) {
                handleEditChange({
                  target: { name: 'chargedAmount', value: calculatedAmount.toString() }
                });
              } else {
                handleInputChange({
                  target: { name: 'chargedAmount', value: calculatedAmount.toString() }
                });
              }
            }}
            selectedPercentage={selectedPercentage}
            cost={isEditing ? editingQuote?.cost : newQuote.cost}
          />
        </div>

        <TextAreaField
          id="notes"
          name="notes"
          label="Notes"
          value={currentQuote?.notes || ''}
          onChange={handleChange}
          placeholder="Leave any notes here (optional)..."
          rows={2}
        />
      </div>
    );
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Quotes</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all quotes including their details and current status.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Add Quote
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Quotes */}
        <div className="relative bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] p-6">
          <dt>
            <div className="absolute rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 p-3 shadow-lg shadow-indigo-200">
              <DocumentTextIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <p className="ml-16 truncate text-sm font-medium text-gray-600">Total Quotes</p>
          </dt>
          <dd className="ml-16 flex items-baseline pt-1">
            <p className="text-2xl font-semibold text-gray-900">{metrics.totalQuotes}</p>
          </dd>
        </div>

        {/* Completed Quotes */}
        <div className="relative bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] p-6">
          <dt>
            <div className="absolute rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 shadow-lg shadow-emerald-200">
              <CheckCircleIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <p className="ml-16 truncate text-sm font-medium text-gray-600">Completed</p>
          </dt>
          <dd className="ml-16 flex items-baseline pt-1">
            <p className="text-2xl font-semibold text-gray-900">{metrics.completedQuotes}</p>
            <p className="ml-2 text-sm text-gray-600">
              ({((metrics.completedQuotes / metrics.totalQuotes) * 100).toFixed(1)}%)
            </p>
          </dd>
        </div>

        {/* Total Revenue */}
        <div className="relative bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] p-6">
          <dt>
            <div className="absolute rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-3 shadow-lg shadow-blue-200">
              <CurrencyDollarIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <p className="ml-16 truncate text-sm font-medium text-gray-600">Total Revenue</p>
          </dt>
          <dd className="ml-16 flex items-baseline pt-1">
            <p className="text-2xl font-semibold text-gray-900">{formatCurrency(metrics.totalRevenue)}</p>
          </dd>
        </div>

        {/* Average Quote Value */}
        <div className="relative bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] p-6">
          <dt>
            <div className="absolute rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 p-3 shadow-lg shadow-amber-200">
              <ChartBarIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <p className="ml-16 truncate text-sm font-medium text-gray-600">Avg. Quote Value</p>
          </dt>
          <dd className="ml-16 flex items-baseline pt-1">
            <p className="text-2xl font-semibold text-gray-900">{formatCurrency(metrics.totalRevenue / metrics.totalQuotes)}</p>
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
            <CheckCircleIcon className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No Quotes Found</h3>
          <p className="mt-2 text-sm text-gray-500 text-center">
            There are no quotes matching your current filters. Try adjusting your search criteria.
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredQuotes.map((quote) => (
                      <tr 
                        key={quote.id}
                        onClick={() => setEditingQuote(quote)}
                        className="cursor-pointer hover:bg-gray-50"
                      >
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {quote.client.company}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {quote.product}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {quote.platform}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <span
                            className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                              quote.status === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : quote.status === 'quoted' || quote.status === 'purchased'
                                ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-gradient-to-r from-green-50 to-green-100 text-green-800 border border-green-200'
                            }`}
                          >
                            {quote.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {format(new Date(quote.createdAt), 'MMM d, yyyy')}
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

      {/* Add/Edit Quote Modal */}
      <FormModal
        isOpen={isAddModalOpen || editingQuote !== null}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingQuote(null);
        }}
        onSubmit={() => {
          if (editingQuote) {
            setShowSaveConfirmation(true);
          } else {
            handleAddQuote();
          }
        }}
        title={editingQuote ? 'Edit Quote' : 'Create a new quote'}
        description={editingQuote ? 'Update the quote details below.' : 'Fill in the quote details to get started.'}
        submitLabel={editingQuote ? 'Save Changes' : 'Create quote'}
        showDeleteButton={!!editingQuote}
        onDelete={() => setDeletingQuote(editingQuote)}
      >
        {renderFormContent(!!editingQuote)}
      </FormModal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deletingQuote}
        onClose={() => setDeletingQuote(null)}
        onConfirm={() => handleDeleteQuote(deletingQuote!)}
        title="Delete Quote"
        description={`Are you sure you want to delete this quote for ${deletingQuote?.client.company}? This action cannot be undone.`}
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

export default Quotes; 