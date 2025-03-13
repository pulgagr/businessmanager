import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  TruckIcon,
  CurrencyDollarIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { trackingApi, quoteApi, clientApi, Tracking, Quote, Client } from '../services/api';
import FormModal from '../components/FormModal';
import { InputField, CurrencyField, SelectField } from '../components/FormFields';
import ConfirmationModal from '../components/ConfirmationModal';
import axios from 'axios';

interface TrackingForm {
  trackingNumber: string;
  quoteIds: number[];
  clientId: number;
  declaredValue: number;
  shippingCost: number;
  status?: 'pending' | 'in_transit' | 'delivered';
}

// Define the response structure from the backend API
interface ApiResponse<T> {
  data: T;
}

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_transit: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800'
};

const STATUS_LABELS = {
  pending: 'Pending',
  paid: 'Paid',
  in_transit: 'In Transit',
  delivered: 'Delivered'
};

const TrackingPage: React.FC = () => {
  const [trackings, setTrackings] = useState<Tracking[]>([]);
  const [availableQuotes, setAvailableQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingTracking, setEditingTracking] = useState<Tracking | null>(null);
  const [deletingTracking, setDeletingTracking] = useState<Tracking | null>(null);
  const [form, setForm] = useState<TrackingForm>({
    trackingNumber: '',
    quoteIds: [],
    clientId: 0,
    declaredValue: 0,
    shippingCost: 0,
    status: 'pending'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [trackingsResponse, quotesResponse, clientsResponse] = await Promise.all([
        trackingApi.getAll(),
        quoteApi.getAll(),
        clientApi.getAll()
      ]);

      console.log('Trackings Response:', trackingsResponse);

      // Set trackings from response - properly extract from nested data structure
      if (trackingsResponse && trackingsResponse.data) {
        // Use type assertion to handle the nested response structure
        const apiResponse = trackingsResponse as unknown as ApiResponse<ApiResponse<Tracking[]>>;
        if (apiResponse.data.data) {
          setTrackings(apiResponse.data.data);
        } else {
          console.error('Missing data property in tracking response:', trackingsResponse);
          setTrackings([]);
        }
      } else {
        // Fallback to an empty array if the data structure is not as expected
        console.error('Unexpected response structure from tracking API:', trackingsResponse);
        setTrackings([]);
      }
      
      // Set clients
      setClients(clientsResponse.data);
      
      // Filter quotes to only show those with status 'purchased' or 'received'
      // and are not already in a tracking
      const existingQuoteIds = trackings.flatMap(t => t.quotes.map(q => q.id));
      const purchasedQuotes = quotesResponse.data.filter(
        quote => (quote.status === 'purchased' || quote.status === 'received') &&
          !existingQuoteIds.includes(quote.id)
      );

      setAvailableQuotes(purchasedQuotes);
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setTrackings([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof TrackingForm, value: any) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      if (editingTracking) {
        await trackingApi.update(editingTracking.id, form);
      } else {
        await trackingApi.create(form);
      }
      await fetchData();
      handleCloseModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tracking');
    }
  };

  const handleDelete = async () => {
    if (!deletingTracking) return;
    try {
      await trackingApi.delete(deletingTracking.id);
      await fetchData();
      setShowDeleteModal(false);
      setDeletingTracking(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tracking');
    }
  };

  const handleUpdateStatus = async (trackingId: number, status: 'pending' | 'in_transit' | 'delivered') => {
    try {
      await trackingApi.updateStatus(trackingId, status);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingTracking(null);
    setForm({
      trackingNumber: '',
      quoteIds: [],
      clientId: 0,
      declaredValue: 0,
      shippingCost: 0,
      status: 'pending'
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const getStatusBadgeClass = (status: string) => {
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    return STATUS_LABELS[status as keyof typeof STATUS_LABELS] || 'Unknown';
  };

  // When client changes, reset the quotes selection
  const handleClientChange = (clientId: number) => {
    setForm(prev => ({
      ...prev,
      clientId,
      quoteIds: []
    }));
  };

  // Get available quotes for the selected client
  const getAvailableQuotesForClient = () => {
    if (!form.clientId) return [];
    
    const existingQuoteIds = trackings
      .filter(t => t.id !== editingTracking?.id) // Don't filter out quotes from current tracking when editing
      .flatMap(t => t.quotes.map(q => q.id));
    
    return availableQuotes.filter(
      quote => quote.clientId === form.clientId && !existingQuoteIds.includes(quote.id)
    );
  };

  // Set the status for the form
  const handleStatusChange = (status: 'pending' | 'in_transit' | 'delivered') => {
    setForm(prev => ({
      ...prev,
      status
    }));
  };

  // Handle clicking on a row to edit
  const handleRowClick = (tracking: Tracking) => {
    setEditingTracking(tracking);
    setForm({
      trackingNumber: tracking.trackingNumber,
      clientId: tracking.clientId,
      quoteIds: tracking.quotes.map(q => q.id),
      declaredValue: tracking.declaredValue,
      shippingCost: tracking.shippingCost,
      status: tracking.status as 'pending' | 'in_transit' | 'delivered'
    });
    setShowAddModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tracking data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Shipments</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage shipments and their associated tracking numbers.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Shipment
          </button>
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

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] ring-1 ring-black ring-opacity-5 md:rounded-2xl">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Shipment Number
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Client
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Items Shipped
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Total
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
                  {trackings.map((tracking) => (
                    <tr 
                      key={tracking.id} 
                      onClick={() => handleRowClick(tracking)}
                      className="cursor-pointer hover:bg-gray-50 transition-colors duration-150"
                    >
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {tracking.trackingNumber}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {tracking.clientName}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(tracking.status)}`}>
                          {getStatusLabel(tracking.status)}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-500">
                        <div className="max-w-md truncate">
                          {tracking.quotes.map(q => q.product).join(', ')}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {formatCurrency(tracking.totalValue)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {format(new Date(tracking.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        {/* Only show Delivered button when status is pending */}
                        {tracking.status === 'pending' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent row click
                              handleUpdateStatus(tracking.id, 'delivered');
                            }}
                            className="inline-flex items-center rounded-md bg-white px-2.5 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                            title="Mark as Delivered"
                          >
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            Delivered
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <FormModal
        isOpen={showAddModal}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        title={editingTracking ? 'Edit Shipment' : 'Add Shipment'}
        description="Enter the shipment details below."
      >
        <div className="space-y-6">
          <InputField
            id="trackingNumber"
            name="trackingNumber"
            label="Shipment Number"
            value={form.trackingNumber}
            onChange={(e) => handleInputChange('trackingNumber', e.target.value)}
            required
          />

          {/* Client Selection */}
          <div className="form-group">
            <label htmlFor="clientId" className="block text-base font-medium text-gray-900 mb-2">
              Client <span className="text-red-500">*</span>
            </label>
            <select
              id="clientId"
              name="clientId"
              className="block w-full rounded-xl border border-gray-300 bg-white py-3 px-4 text-gray-900 shadow-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors duration-200"
              value={form.clientId}
              onChange={(e) => handleClientChange(Number(e.target.value))}
              required
            >
              <option value="">Select a client...</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name} ({client.company || 'No Company'})
                </option>
              ))}
            </select>
          </div>

          {/* Associated Purchases - Improved UI & simplified presentation */}
          <div className="form-group">
            <label className="block text-base font-medium text-gray-900 mb-2">
              Associated Purchases <span className="text-red-500">*</span>
            </label>
            
            {!form.clientId && (
              <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-xl border border-gray-200">
                Please select a client first to see available purchases
              </div>
            )}
            
            {form.clientId && getAvailableQuotesForClient().length === 0 && (
              <div className="text-sm text-amber-600 p-4 bg-amber-50 rounded-xl border border-amber-200">
                No available purchases for this client. All purchases are already assigned to shipments.
              </div>
            )}
            
            {form.clientId && getAvailableQuotesForClient().length > 0 && (
              <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-xl divide-y divide-gray-200">
                {getAvailableQuotesForClient().map(quote => (
                  <div 
                    key={quote.id} 
                    className={`p-3 hover:bg-gray-50 cursor-pointer flex items-center ${form.quoteIds.includes(quote.id) ? 'bg-indigo-50' : ''}`}
                    onClick={() => {
                      const newQuoteIds = form.quoteIds.includes(quote.id)
                        ? form.quoteIds.filter(id => id !== quote.id)
                        : [...form.quoteIds, quote.id];
                      handleInputChange('quoteIds', newQuoteIds);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={form.quoteIds.includes(quote.id)}
                      onChange={() => {}}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-900">{quote.product}</span>
                        <span className="font-semibold text-gray-700">{formatCurrency(quote.chargedAmount)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {form.clientId && form.quoteIds.length > 0 && (
              <div className="mt-2 text-sm text-gray-500">
                {form.quoteIds.length} item{form.quoteIds.length > 1 ? 's' : ''} selected
              </div>
            )}
          </div>

          {/* Status Buttons */}
          <div className="form-group">
            <label className="block text-base font-medium text-gray-900 mb-2">
              Status
            </label>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => handleStatusChange('in_transit')}
                className={`flex-1 inline-flex items-center justify-center rounded-md border ${
                  form.status === 'in_transit' 
                    ? 'bg-blue-100 border-blue-300 text-blue-800 font-medium' 
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                } px-4 py-2 text-sm`}
              >
                <TruckIcon className="h-4 w-4 mr-2" />
                In Transit
              </button>
              
              <button
                type="button"
                onClick={() => handleStatusChange('delivered')}
                className={`flex-1 inline-flex items-center justify-center rounded-md border ${
                  form.status === 'delivered' 
                    ? 'bg-green-100 border-green-300 text-green-800 font-medium' 
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                } px-4 py-2 text-sm`}
              >
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Delivered
              </button>
            </div>
            
            <div className="mt-2 text-xs text-gray-500">
              {form.status === 'pending' && "Current status: Pending"}
              {form.status === 'in_transit' && "Current status: In Transit"}
              {form.status === 'delivered' && "Current status: Delivered"}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <CurrencyField
              id="declaredValue"
              name="declaredValue"
              label="Declared Value"
              value={form.declaredValue.toString()}
              onChange={(e) => handleInputChange('declaredValue', parseFloat(e.target.value) || 0)}
              required
            />

            <CurrencyField
              id="shippingCost"
              name="shippingCost"
              label="Shipping Cost"
              value={form.shippingCost.toString()}
              onChange={(e) => handleInputChange('shippingCost', parseFloat(e.target.value) || 0)}
              required
            />
          </div>
        </div>
      </FormModal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Shipment"
        description={`Are you sure you want to delete shipment number ${deletingTracking?.trackingNumber}? This action cannot be undone.`}
        type="delete"
      />
    </div>
  );
};

export default TrackingPage; 