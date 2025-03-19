import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  TruckIcon,
  CurrencyDollarIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
  QueueListIcon,
  ArrowPathIcon,
  InboxIcon,
  ClockIcon,
  ShoppingCartIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { trackingApi, quoteApi, clientApi, Tracking, Quote, Client } from '../services/api';
import FormModal from '../components/FormModal';
import { InputField, CurrencyField, SelectField } from '../components/FormFields';
import ConfirmationModal from '../components/ConfirmationModal';
import axios from 'axios';

interface TrackingForm {
  trackingNumber: string;
  clientId: string;
  quoteIds: number[];
  shippingCost: number;
  totalValue: number;
  declaredValue: number;
  amountPaid?: number;
  status: 'pending' | 'in_transit' | 'delivered' | 'received' | 'ready_to_ship' | 'held' | 'shipped' | 'paid';
}

// Define the response structure from the backend API
interface ApiResponse<T> {
  data: T;
}

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_transit: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  received: 'bg-purple-100 text-purple-800',
  ready_to_ship: 'bg-indigo-100 text-indigo-800',
  held: 'bg-orange-100 text-orange-800',
  shipped: 'bg-green-100 text-green-800',
  paid: 'bg-emerald-100 text-emerald-800'
};

const STATUS_LABELS = {
  pending: 'Pending',
  paid: 'Paid',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  received: 'Received',
  ready_to_ship: 'Ready to Ship',
  held: 'Holding Queue',
  shipped: 'Shipped'
};

const TrackingPage: React.FC = () => {
  const [trackings, setTrackings] = useState<Tracking[]>([]);
  const [availableQuotes, setAvailableQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBatchShipModal, setShowBatchShipModal] = useState(false);
  const [editingTracking, setEditingTracking] = useState<Tracking | null>(null);
  const [deletingTracking, setDeletingTracking] = useState<Tracking | null>(null);
  const [selectedItems, setSelectedItems] = useState<Quote[]>([]);
  const [form, setForm] = useState<TrackingForm>({
    trackingNumber: '',
    clientId: '',
    quoteIds: [],
    shippingCost: 0,
    totalValue: 0,
    declaredValue: 0,
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
      
      // Filter quotes to include those with relevant statuses and not already in a tracking
      const existingQuoteIds = trackings.flatMap(t => t.quotes.map(q => q.id));
      const relevantQuotes = quotesResponse.data.filter(
        quote => (
          ['purchased', 'received', 'ready_to_ship', 'held'].includes(quote.status) &&
          !existingQuoteIds.includes(quote.id)
        )
      );

      setAvailableQuotes(relevantQuotes);
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
    // Handle number conversions properly to avoid NaN values
    if (field === 'shippingCost' || field === 'declaredValue' || field === 'amountPaid') {
      // Convert to number and ensure it's not NaN
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      setForm({
        ...form,
        [field]: isNaN(numValue) ? 0 : numValue
      });
    } else if (field === 'quoteIds') {
      // Ensure quoteIds is always an array of numbers
      const idsArray = Array.isArray(value) ? value : [value];
      setForm({
        ...form,
        quoteIds: idsArray.map(id => typeof id === 'string' ? parseInt(id, 10) : id)
      });
    } else {
      // Handle other fields normally
      setForm({
        ...form,
        [field]: value
      });
    }
  };

  const handleSubmit = async () => {
    try {
      console.log('Form data being submitted:', JSON.stringify(form, null, 2));
      
      // Make sure all required fields are present and properly formatted
      const trackingData = {
        ...form,
        // Calculate totalValue as the sum of shipping cost + declared value
        totalValue: (form.shippingCost || 0) + (form.declaredValue || 0)
      };

      console.log('Processed tracking data:', JSON.stringify(trackingData, null, 2));
      
      if (editingTracking) {
        const response = await trackingApi.update(editingTracking.id, trackingData);
        console.log('Update response:', response);
      } else {
        const response = await trackingApi.create(trackingData);
        console.log('Create response:', response);
      }
      
      await fetchData();
      handleCloseModal();
    } catch (err) {
      console.error('API Error details:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save tracking';
      setError(errorMessage);
      
      // Log additional error details to help debugging
      if (err && typeof err === 'object' && 'response' in err) {
        console.error('API Response data:', (err as any).response?.data);
      }
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

  const handleUpdateStatus = async (trackingId: string, status: 'pending' | 'in_transit' | 'delivered' | 'received' | 'ready_to_ship' | 'held' | 'shipped' | 'paid') => {
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
      clientId: '',
      quoteIds: [],
      shippingCost: 0,
      totalValue: 0,
      declaredValue: 0,
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
    switch (status) {
      case 'pending':
        return 'bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-800 border border-yellow-200';
      case 'in_transit':
        return 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 border border-blue-200';
      case 'delivered':
        return 'bg-gradient-to-r from-green-50 to-green-100 text-green-800 border border-green-200';
      case 'ready_to_ship':
        return 'bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-800 border border-indigo-200';
      case 'held':
        return 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-800 border border-orange-200';
      case 'received':
        return 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-800 border border-purple-200';
      case 'shipped':
        return 'bg-gradient-to-r from-sky-50 to-sky-100 text-sky-800 border border-sky-200';
      case 'paid':
        return 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-800 border border-emerald-200';
      default:
        return 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    return STATUS_LABELS[status as keyof typeof STATUS_LABELS] || 'Unknown';
  };

  // When client changes, reset the quotes selection
  const handleClientChange = (clientId: string) => {
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
    
    const clientIdNum = parseInt(form.clientId);
    return availableQuotes.filter(
      quote => quote.clientId === clientIdNum && !existingQuoteIds.includes(quote.id)
    );
  };

  // Set the status for the form
  const handleStatusChange = (status: 'pending' | 'in_transit' | 'delivered' | 'received' | 'ready_to_ship' | 'held' | 'shipped' | 'paid') => {
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
      totalValue: tracking.totalValue,
      status: tracking.status as 'pending' | 'in_transit' | 'delivered' | 'received' | 'ready_to_ship' | 'held' | 'shipped' | 'paid'
    });
    setShowAddModal(true);
  };

  // Group quotes by client for dashboard view
  const quotesByClient = React.useMemo(() => {
    const grouped: Record<string, {
      client: Client,
      quotes: {
        readyToShip: Quote[],
        holding: Quote[],
        received: Quote[]
      }
    }> = {};

    // Initialize with clients that have quotes
    clients.forEach(client => {
      grouped[client.id] = {
        client,
        quotes: {
          readyToShip: [],
          holding: [],
          received: []
        }
      };
    });

    // Filter quotes by status and group by client
    availableQuotes.forEach(quote => {
      if (quote.status === 'ready_to_ship' && grouped[quote.clientId]) {
        grouped[quote.clientId].quotes.readyToShip.push(quote);
      } else if (quote.status === 'held' && grouped[quote.clientId]) {
        grouped[quote.clientId].quotes.holding.push(quote);
      } else if (quote.status === 'received' && grouped[quote.clientId]) {
        grouped[quote.clientId].quotes.received.push(quote);
      }
    });

    // Filter out clients with no quotes in any category
    return Object.values(grouped).filter(group => 
      group.quotes.readyToShip.length > 0 || 
      group.quotes.holding.length > 0 || 
      group.quotes.received.length > 0
    );
  }, [availableQuotes, clients]);

  // Handle selecting items for batch shipment
  const handleSelectItem = (item: Quote) => {
    setSelectedItems(prev => {
      const isSelected = prev.some(q => q.id === item.id);
      if (isSelected) {
        return prev.filter(q => q.id !== item.id);
      } else {
        // Only allow selection of items from the same client
        if (prev.length === 0 || prev[0].clientId === item.clientId) {
          return [...prev, item];
        }
        // If trying to select from different client, show error and don't select
        setError('Can only select items from the same client for batch shipment');
        return prev;
      }
    });
  };

  // Open batch ship modal
  const handleOpenBatchShipModal = () => {
    if (selectedItems.length === 0) {
      setError('Please select at least one item to create a shipment');
      return;
    }

    // Initialize form with selected items
    setForm({
      trackingNumber: '',
      quoteIds: selectedItems.map(item => item.id),
      clientId: selectedItems[0].clientId.toString(),
      declaredValue: selectedItems.reduce((sum, item) => sum + item.chargedAmount, 0),
      shippingCost: 0,
      totalValue: 0, // This will be calculated at submission time
      status: 'in_transit'
    });

    setShowBatchShipModal(true);
  };

  // Handle creating a batch shipment
  const handleCreateBatchShipment = async () => {
    try {
      console.log('Batch shipment form data:', JSON.stringify(form, null, 2));
      
      // Make sure all required fields are present and properly formatted
      const trackingData = {
        ...form,
        // Calculate totalValue as the sum of shipping cost + declared value
        totalValue: (form.shippingCost || 0) + (form.declaredValue || 0)
      };
      
      console.log('Processed batch tracking data:', JSON.stringify(trackingData, null, 2));
      
      const response = await trackingApi.create(trackingData);
      console.log('Batch create response:', response);
      
      

      // Update the status of each quote to shipped
      await Promise.all(selectedItems.map(item => 
        quoteApi.update(item.id, { status: 'shipped' })
      ));
      

      await fetchData();
      setSelectedItems([]);
      setShowBatchShipModal(false);
    } catch (err) {
      console.error('API Error details:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create batch shipment';
      setError(errorMessage);

      
      
      // Log additional error details to help debugging
      if (err && typeof err === 'object' && 'response' in err) {
        console.error('API Response data:', (err as any).response?.data);
      }
    }
  };

  // Handle updating a quote's status
  const handleUpdateQuoteStatus = async (quote: Quote, newStatus: 'received' | 'ready_to_ship' | 'held') => {
    try {
      await quoteApi.update(quote.id, { status: newStatus });
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to update status to ${newStatus}`);
    }
  };

  // Add metrics calculation for the summary cards
  const metrics = useMemo(() => {
    if (trackings.length === 0) return {
      totalShipments: 0,
      totalValue: 0,
      pendingShipments: 0,
      completedShipments: 0,
      declaredValue: 0,
      shippingCost: 0
    };

    return {
      totalShipments: trackings.length,
      totalValue: trackings.reduce((sum, t) => sum + t.totalValue, 0),
      pendingShipments: trackings.filter(t => ['pending', 'in_transit'].includes(t.status)).length,
      completedShipments: trackings.filter(t => ['delivered', 'paid'].includes(t.status)).length,
      declaredValue: trackings.reduce((sum, t) => sum + (t.declaredValue || 0), 0),
      shippingCost: trackings.reduce((sum, t) => sum + t.shippingCost, 0)
    };
  }, [trackings]);

  // Calculate order metrics for the dashboard
  const orderMetrics = useMemo(() => {
    return {
      readyToShip: availableQuotes.filter(q => q.status === 'ready_to_ship').length,
      inHolding: availableQuotes.filter(q => q.status === 'held').length,
      received: availableQuotes.filter(q => q.status === 'received').length,
    };
  }, [availableQuotes]);

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
          <h1 className="text-2xl font-semibold text-gray-900">Shipments Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage orders and shipments with a streamlined workflow.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex sm:space-x-3">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <PlusIcon className="h-5 w-5 mr-2 -ml-1" />
            Add Shipment
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-800 rounded-md p-4">
          <p>{error}</p>
          <button
            className="mt-2 text-sm text-red-600 underline"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Metrics Dashboard */}
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Shipments */}
        <div className="relative bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] p-6">
          <dt>
            <div className="absolute rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 p-3 shadow-lg shadow-indigo-200">
              <TruckIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <p className="ml-16 truncate text-sm font-medium text-gray-600">Total Shipments</p>
          </dt>
          <dd className="ml-16 flex items-baseline pt-1">
            <p className="text-2xl font-semibold text-gray-900">{metrics.totalShipments}</p>
          </dd>
        </div>

        {/* Total Value */}
        <div className="relative bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] p-6">
          <dt>
            <div className="absolute rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 shadow-lg shadow-emerald-200">
              <CurrencyDollarIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <p className="ml-16 truncate text-sm font-medium text-gray-600">Total Value</p>
          </dt>
          <dd className="ml-16 flex items-baseline pt-1">
            <p className="text-2xl font-semibold text-gray-900">{formatCurrency(metrics.totalValue)}</p>
          </dd>
        </div>

        {/* Pending Shipments */}
        <div className="relative bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] p-6">
          <dt>
            <div className="absolute rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 p-3 shadow-lg shadow-yellow-200">
              <ClockIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <p className="ml-16 truncate text-sm font-medium text-gray-600">Pending Shipments</p>
          </dt>
          <dd className="ml-16 flex items-baseline pt-1">
            <p className="text-2xl font-semibold text-gray-900">{metrics.pendingShipments}</p>
          </dd>
        </div>

        {/* Completed Shipments */}
        <div className="relative bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] p-6">
          <dt>
            <div className="absolute rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-3 shadow-lg shadow-blue-200">
              <CheckIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <p className="ml-16 truncate text-sm font-medium text-gray-600">Completed</p>
          </dt>
          <dd className="ml-16 flex items-baseline pt-1">
            <p className="text-2xl font-semibold text-gray-900">{metrics.completedShipments}</p>
          </dd>
        </div>
      </div>

      {/* Order Metrics - Only show in dashboard view */}
      {quotesByClient.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {/* Ready to Ship */}
          <div className="relative bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] p-6">
            <dt>
              <div className="absolute rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-500 p-3 shadow-lg shadow-indigo-200">
                <TruckIcon className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-600">Ready to Ship</p>
            </dt>
            <dd className="ml-16 flex items-baseline pt-1">
              <p className="text-2xl font-semibold text-gray-900">{orderMetrics.readyToShip}</p>
            </dd>
          </div>

          {/* Holding Queue */}
          <div className="relative bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] p-6">
            <dt>
              <div className="absolute rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 p-3 shadow-lg shadow-orange-200">
                <QueueListIcon className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-600">Holding Queue</p>
            </dt>
            <dd className="ml-16 flex items-baseline pt-1">
              <p className="text-2xl font-semibold text-gray-900">{orderMetrics.inHolding}</p>
            </dd>
          </div>

          {/* Received */}
          <div className="relative bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] p-6">
            <dt>
              <div className="absolute rounded-xl bg-gradient-to-br from-purple-400 to-purple-500 p-3 shadow-lg shadow-purple-200">
                <InboxIcon className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-600">Received</p>
            </dt>
            <dd className="ml-16 flex items-baseline pt-1">
              <p className="text-2xl font-semibold text-gray-900">{orderMetrics.received}</p>
            </dd>
          </div>
        </div>
      )}

      <div className="mt-8">
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-5">
            <h3 className="text-lg font-semibold text-gray-900">Order Management Dashboard</h3>
            <p className="mt-1 text-sm text-gray-500">Manage your items and create shipments</p>
          </div>
          <div className="p-6">
            <div>
              {/* Orders Ready for Shipment */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Orders Ready for Shipment</h3>
                  {selectedItems.length !== 0 && (
  <button
    type="button"
    onClick={handleOpenBatchShipModal}
    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
  >
    <DocumentDuplicateIcon className="h-5 w-5 mr-2" />
    Create Batch Shipment
  </button>
)}

                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  {availableQuotes.filter(q => q.status === 'ready_to_ship' || q.status === 'held' || q.status === 'received').length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <input
                                type="checkbox"
                                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                onChange={e => {
                                  const isChecked = e.target.checked;
                                  setSelectedItems(isChecked ? availableQuotes.filter(q => 
                                    q.status === 'ready_to_ship' || q.status === 'held' || q.status === 'received'
                                  ) : []);
                                }}
                                checked={selectedItems.length > 0 && selectedItems.length === availableQuotes.filter(q => 
                                  q.status === 'ready_to_ship' || q.status === 'held' || q.status === 'received'
                                ).length}
                              />
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th scope="col" className="relative px-6 py-3">
                              <span className="sr-only">Actions</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {availableQuotes
                            .filter(q => q.status === 'ready_to_ship' || q.status === 'held' || q.status === 'received')
                            .map(quote => (
                              <tr key={quote.id} className="hover:bg-gray-50 transition-colors duration-150">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                    checked={selectedItems.some(item => item.id === quote.id)}
                                    onChange={() => handleSelectItem(quote)}
                                  />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {quote.product}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {quote.client.company || quote.client.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(quote.status)}`}>
                                    {getStatusLabel(quote.status)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {formatCurrency(quote.chargedAmount)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {format(new Date(quote.createdAt), 'MMM d, yyyy')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  {quote.status === 'received' && (
                                    <>
                                      <button
                                        onClick={() => handleUpdateQuoteStatus(quote, 'ready_to_ship')}
                                        className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                      >
                                        <TruckIcon className="h-4 w-4 mr-1" />
                                        Ready to Ship
                                      </button>
                                      <button
                                        onClick={() => handleUpdateQuoteStatus(quote, 'held')}
                                        className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-orange-700 bg-orange-100 hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                                      >
                                        <QueueListIcon className="h-4 w-4 mr-1" />
                                        Hold
                                      </button>
                                    </>
                                  )}
                                  {quote.status === 'held' && (
                                    <button
                                      onClick={() => handleUpdateQuoteStatus(quote, 'ready_to_ship')}
                                      className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                      <TruckIcon className="h-4 w-4 mr-1" />
                                      Ready to Ship
                                    </button>
                                  )}
                                  {quote.status === 'ready_to_ship' && (
                                    <button
                                      onClick={() => handleUpdateQuoteStatus(quote, 'held')}
                                      className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-orange-700 bg-orange-100 hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                                    >
                                      <QueueListIcon className="h-4 w-4 mr-1" />
                                      Hold
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-12 flex flex-col items-center justify-center">
                      <ShoppingCartIcon className="h-12 w-12 text-gray-300 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900">No orders ready for shipment</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        When orders are ready for shipment, they will appear here
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Shipments */}
              
            </div>
          </div>
        </div>
      </div>

      {/* Add Tracking Modal */}
      <FormModal
        isOpen={showAddModal}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        title={editingTracking ? 'Edit Shipment' : 'Add Shipment'}
        description="Enter the shipment details below."
      >
        <div className="space-y-4">
          <SelectField
            label="Client"
            id="clientId"
            name="clientId"
            value={form.clientId || ''}
            onChange={(e) => handleClientChange(e.target.value)}
            options={clients.map(client => ({
              value: client.id,
              label: client.company || client.name
            }))}
            required
          />

          <InputField
            label="Tracking Number"
            id="trackingNumber"
            name="trackingNumber"
            type="text"
            value={form.trackingNumber}
            onChange={(e) => handleInputChange('trackingNumber', e.target.value)}
            placeholder="Enter tracking number"
            required
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CurrencyField
              label="Shipping Cost"
              id="shippingCost"
              name="shippingCost"
              value={form.shippingCost}
              onChange={(e) => handleInputChange('shippingCost', parseFloat(e.target.value))}
              placeholder="0.00"
              required
            />

            <CurrencyField
              label="Declared Value"
              id="declaredValue"
              name="declaredValue"
              value={form.declaredValue}
              onChange={(e) => handleInputChange('declaredValue', parseFloat(e.target.value))}
              placeholder="0.00"
              required
            />
          </div>

          <SelectField
            label="Status"
            id="status"
            name="status"
            value={form.status}
            onChange={(e) => handleStatusChange(e.target.value as 'pending' | 'in_transit' | 'delivered' | 'received' | 'ready_to_ship' | 'held' | 'shipped' | 'paid')}
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'in_transit', label: 'In Transit' },
              { value: 'delivered', label: 'Delivered' }
            ]}
            required
          />
        </div>
      </FormModal>

      {/* Batch Ship Modal */}
      <FormModal
        isOpen={showBatchShipModal}
        onClose={() => setShowBatchShipModal(false)}
        onSubmit={handleCreateBatchShipment}
        title="Create Batch Shipment"
        description={`Creating shipment with ${selectedItems.length} selected items.`}
      >
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Items:</h3>
            <div className="text-sm text-gray-600 space-y-1 max-h-40 overflow-y-auto">
              {selectedItems.map(item => (
                <div key={item.id} className="flex justify-between">
                  <span>{item.product}</span>
                  <span>{formatCurrency(item.chargedAmount)}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between text-sm font-medium">
              <span>Total Value:</span>
              <span>{formatCurrency(selectedItems.reduce((sum, item) => sum + item.chargedAmount, 0))}</span>
            </div>
          </div>

          <InputField
            label="Tracking Number"
            id="trackingNumber"
            name="trackingNumber"
            type="text"
            value={form.trackingNumber}
            onChange={(e) => handleInputChange('trackingNumber', e.target.value)}
            placeholder="Enter tracking number"
            required
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CurrencyField
              label="Shipping Cost"
              id="shippingCost"
              name="shippingCost"
              value={form.shippingCost}
              onChange={(e) => handleInputChange('shippingCost', parseFloat(e.target.value))}
              placeholder="0.00"
              required
            />

            <CurrencyField
              label="Declared Value"
              id="declaredValue"
              name="declaredValue"
              value={form.declaredValue}
              onChange={(e) => handleInputChange('declaredValue', parseFloat(e.target.value))}
              placeholder="0.00"
              required
            />
          </div>
        </div>
      </FormModal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal && !!deletingTracking}
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