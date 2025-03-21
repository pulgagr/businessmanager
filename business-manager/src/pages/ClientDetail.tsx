import { useState, useEffect, Fragment } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon, UserCircleIcon, PhoneIcon, EnvelopeIcon, BuildingOfficeIcon, PlusIcon, ChevronDownIcon, PencilIcon, XMarkIcon, DocumentTextIcon, ChartBarIcon, TruckIcon } from '@heroicons/react/24/outline';
import { clientApi, quoteApi, settingsApi, trackingApi } from '../services/api';
import { Dialog, Transition } from '@headlessui/react';
import FormModal from '../components/FormModal';
import ConfirmationModal from '../components/ConfirmationModal';
import ReportModal from '../components/ReportModal';
import ClientReport from '../components/ClientReport';
import { 
  SelectField, 
  InputField, 
  CurrencyField, 
  TextAreaField,
  StatusGroup 
} from '../components/FormFields';

interface ClientResponse {
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
  quotes?: Quote[];
  trackings?: Tracking[];
}

interface Client extends ClientResponse {
  quotes: Quote[];
  trackings: Tracking[];
}

interface Quote {
  id: number;
  clientId: number;
  client: Omit<ClientResponse, 'quotes' | 'trackings'>;
  product: string;
  platform: string;
  status: 'quote' | 'quoted' | 'purchase' | 'purchased' | 'received' | 'ready_to_ship' | 'held' | 'shipped' | 'paid';
  cost: number;
  chargedAmount: number;
  amountPaid: number;
  paymentMethod: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface Tracking {
  id: string;
  trackingNumber: string;
  quotes: Quote[];
  clientId: string;
  status: string;
  declaredValue: number;
  shippingCost: number;
  totalValue: number;
  amountPaid: number;
  createdAt: string;
  updatedAt: string;
}

interface NewQuoteForm {
  product: string;
  platform: string;
  status: Quote['status'];
  cost: number;
  chargedAmount: number;
  amountPaid: number;
  paymentMethod: string;
  notes?: string;
}

const ClientDetail = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [clientQuotes, setClientQuotes] = useState<Quote[]>([]);
  const [showStatusDropdown, setShowStatusDropdown] = useState<number | null>(null);
  const [newQuote, setNewQuote] = useState<boolean>(false);
  const [editingQuoteId, setEditingQuoteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [editClientForm, setEditClientForm] = useState<Partial<Client>>({});
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [newQuoteForm, setNewQuoteForm] = useState<NewQuoteForm>({
    product: '',
    platform: '',
    status: 'quote',
    cost: 0,
    chargedAmount: 0,
    amountPaid: 0,
    paymentMethod: 'Bank Transfer',
    notes: ''
  });
  const [editQuoteForm, setEditQuoteForm] = useState<NewQuoteForm>({
    product: '',
    platform: '',
    status: 'quote',
    cost: 0,
    chargedAmount: 0,
    amountPaid: 0,
    paymentMethod: 'Bank Transfer',
    notes: ''
  });
  const [platformOptions, setPlatformOptions] = useState<string[]>([]);
  const [paymentOptions, setPaymentOptions] = useState<string[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState<{
    startDate: string;
    endDate: string;
    quotes: Quote[];
    shipments: Tracking[];
    selectedStatuses: string[];
  } | null>(null);
  const [selectedTracking, setSelectedTracking] = useState<Tracking | null>(null);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [showDeleteTrackingModal, setShowDeleteTrackingModal] = useState(false);
  const [deletingTrackingId, setDeletingTrackingId] = useState<string | null>(null);

  // Status options for the dropdown
  const statusOptions = [
    { value: 'quote', label: 'Quote Needed' },
    { value: 'quoted', label: 'Quoted' },
    { value: 'purchase', label: 'Purchase Needed' },
    { value: 'purchased', label: 'Purchased' },
    { value: 'received', label: 'Received' },
    { value: 'ready_to_ship', label: 'Ready to Ship' },
    { value: 'held', label: 'Held' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'paid', label: 'Paid' },
  ];

  // Load client, quotes, and settings on component mount
  useEffect(() => {
    const fetchData = async () => {
      if (!clientId) return;

      try {
        setLoading(true);
        setLoadingSettings(true);
        const [clientResponse, quotesResponse, settingsResponse] = await Promise.all([
          clientApi.getById(parseInt(clientId)),
          quoteApi.getAll(),
          settingsApi.get()
        ]);
        
        // Set client with quotes and trackings
        const clientResponseData = clientResponse.data as ClientResponse;
        const clientData: Client = {
          ...clientResponseData,
          quotes: clientResponseData.quotes || [],
          trackings: clientResponseData.trackings || []
        };
        setClient(clientData);
        
        // Filter quotes for this client
        setClientQuotes(quotesResponse.data.filter(quote => quote.clientId === parseInt(clientId)));
        setPlatformOptions(settingsResponse.data.platformOptions);
        setPaymentOptions(settingsResponse.data.paymentOptions);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setClient(null);
      } finally {
        setLoading(false);
        setLoadingSettings(false);
      }
    };

    fetchData();
  }, [clientId]);

  // Helper function to get status label
  const getStatusLabel = (status: string) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option ? option.label : status;
  };

  // Handle status change
  const handleStatusChange = async (quoteId: number, newStatus: Quote['status']) => {
    try {
      const response = await quoteApi.update(quoteId, { status: newStatus });
      setClientQuotes(quotes => quotes.map(q => q.id === quoteId ? response.data : q));
      setShowStatusDropdown(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update quote status');
    }
  };

  // Add new quote
  const addNewQuoteRow = () => {
    setNewQuote(true);
  };

  // Cancel adding a new quote
  const cancelNewQuote = () => {
    setNewQuote(false);
  };

  const handleNewQuoteChange = (field: keyof NewQuoteForm, value: string | number) => {
    setNewQuoteForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveNewQuote = async () => {
    try {
      if (!clientId) return;

      const newQuoteData = {
        clientId: parseInt(clientId),
        product: newQuoteForm.product,
        platform: newQuoteForm.platform,
        cost: newQuoteForm.cost,
        chargedAmount: newQuoteForm.chargedAmount,
        amountPaid: newQuoteForm.amountPaid,
        status: newQuoteForm.status,
        paymentMethod: newQuoteForm.paymentMethod,
        notes: newQuoteForm.notes
      };

      const response = await quoteApi.create(newQuoteData);
      setClientQuotes(prev => [...prev, response.data]);
      setNewQuote(false);
      setNewQuoteForm({
        product: '',
        platform: '',
        status: 'quote',
        cost: 0,
        chargedAmount: 0,
        amountPaid: 0,
        paymentMethod: 'Bank Transfer',
        notes: ''
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create quote');
    }
  };

  const handleEditQuoteChange = (field: keyof NewQuoteForm, value: string | number) => {
    setEditQuoteForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEditQuote = (quote: Quote) => {
    setEditingQuoteId(quote.id);
    setEditQuoteForm({
      product: quote.product,
      platform: quote.platform,
      status: quote.status,
      cost: quote.cost,
      chargedAmount: quote.chargedAmount,
      amountPaid: quote.amountPaid,
      paymentMethod: quote.paymentMethod || 'Bank Transfer',
      notes: quote.notes || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editingQuoteId) return;

    try {
      const response = await quoteApi.update(editingQuoteId, editQuoteForm);
      setClientQuotes(prev => prev.map(quote => 
        quote.id === editingQuoteId ? response.data : quote
      ));
      setEditingQuoteId(null);
      setEditQuoteForm({
        product: '',
        platform: '',
        status: 'quote',
        cost: 0,
        chargedAmount: 0,
        amountPaid: 0,
        paymentMethod: 'Bank Transfer',
        notes: ''
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update quote');
    }
  };

  // Add new function to handle invoice export
  const handleExportInvoice = (quote: Quote) => {
    // Open in new window/tab
    const win = window.open('/sample-invoice', '_blank');
    if (win) {
      // Pass data through sessionStorage
      sessionStorage.setItem('invoiceData', JSON.stringify({
        quote,
        client,
        invoiceNumber: `INV-${new Date().getFullYear()}-${quote.id.toString().padStart(3, '0')}`,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      }));
      win.focus();
    }
  };

  const handleGenerateReport = async (startDateStr: string, endDateStr: string, selectedStatuses: string[]) => {
    if (!client) return;

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // Filter quotes based on date range and selected statuses
    const filteredQuotes = client.quotes?.filter(quote => {
      const quoteDate = new Date(quote.createdAt);
      return (
        quoteDate >= startDate &&
        quoteDate <= endDate &&
        selectedStatuses.includes(quote.status)
      );
    }) || [];

    // Filter shipments based on date range if 'shipment' status is selected
    const filteredShipments = selectedStatuses.includes('shipment')
      ? (client.trackings?.filter(shipment => {
          const shipmentDate = new Date(shipment.createdAt);
          return shipmentDate >= startDate && shipmentDate <= endDate;
        }) || [])
      : [];

    // Generate unique timestamp for report
    const timestamp = Date.now();

    // Store report data in sessionStorage
    const reportData = {
      client,
      quotes: filteredQuotes,
      shipments: filteredShipments,
      startDate: startDateStr,
      endDate: endDateStr,
      selectedStatuses,
      timestamp
    };

    try {
      sessionStorage.setItem(`reportData_${timestamp}`, JSON.stringify(reportData));
      window.open(`/client-report?t=${timestamp}`, '_blank');
      setShowReportModal(false);
    } catch (error) {
      console.error('Failed to store report data:', error);
      // Handle error (e.g., show error message to user)
    }
  };

  // Form content for add/edit quote modal
  const renderFormContent = (isEdit: boolean) => {
    const form = isEdit ? editQuoteForm : newQuoteForm;
    const handleChange = isEdit ? handleEditQuoteChange : handleNewQuoteChange;

    return (
      <div className="space-y-8">
        <div className="grid grid-cols-2 gap-6">
          <InputField
            id="product"
            name="product"
            label="Product"
            value={form.product}
            onChange={(e) => handleChange('product', e.target.value)}
            placeholder="Product description"
            required
          />

          <SelectField
            id="platform"
            name="platform"
            label="Platform"
            value={form.platform || ''}
            onChange={(e) => handleChange('platform', e.target.value)}
            options={platformOptions.map(platform => ({
              value: platform,
              label: platform
            }))}
            placeholder="Select Platform"
            required
          />

          <SelectField
            id="paymentMethod"
            name="paymentMethod"
            label="Payment Method"
            value={form.paymentMethod || ''}
            onChange={(e) => handleChange('paymentMethod', e.target.value)}
            options={paymentOptions.map(method => ({
              value: method,
              label: method
            }))}
            placeholder="Select Payment Method"
          />
        </div>

        <div>
          <label className="block text-base font-medium text-gray-900 mb-2">
            Status
          </label>
          <StatusGroup
            value={form.status || 'quote'}
            onChange={(value: string) => handleChange('status', value)}
            options={statusOptions.map(option => ({
              value: option.value,
              label: option.label
            }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <CurrencyField
            id="cost"
            name="cost"
            label="Cost"
            value={form.cost?.toString() || ''}
            onChange={(value) => handleChange('cost', Number(value))}
          />

          <CurrencyField
            id="chargedAmount"
            name="chargedAmount"
            label="Charged Amount"
            value={form.chargedAmount?.toString() || ''}
            onChange={(value) => handleChange('chargedAmount', Number(value))}
            onPercentageSelect={(percentage: number) => {
              const cost = form.cost || 0;
              const calculatedAmount = Number((cost * (1 + percentage / 100)).toFixed(2));
              handleChange('chargedAmount', calculatedAmount.toString());
            }}
            selectedPercentage={null}
            cost={form.cost}
          />
        </div>

        <TextAreaField
          id="notes"
          name="notes"
          label="Notes"
          value={form.notes || ''}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Leave any notes here (optional)..."
        />
      </div>
    );
  };

  // Add function to handle tracking row click
  const handleTrackingRowClick = (tracking: Tracking) => {
    setSelectedTracking(tracking);
    setShowTrackingModal(true);
  };

  // Add function to handle tracking deletion
  const handleDeleteTracking = async () => {
    if (!deletingTrackingId) return;
    
    try {
      await trackingApi.delete(deletingTrackingId);
      
      // Update client state to remove the deleted tracking
      if (client) {
        setClient({
          ...client,
          trackings: client.trackings.filter(t => t.id !== deletingTrackingId)
        });
      }
      
      setShowDeleteTrackingModal(false);
      setDeletingTrackingId(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete shipment');
    }
  };

  // Toggle client status between active and inactive
  const handleToggleClientStatus = async () => {
    if (!client || statusUpdating) return;
    
    const newStatus = client.status === 'active' ? 'inactive' : 'active';
    
    try {
      setStatusUpdating(true);
      const response = await clientApi.update(client.id, { status: newStatus });
      
      // Update client in state with new status
      setClient({
        ...client,
        status: newStatus
      });
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update client status');
    } finally {
      setStatusUpdating(false);
    }
  };

  // Open edit client modal with current client data
  const handleEditClient = () => {
    if (!client) return;
    
    setEditClientForm({
      name: client.name,
      email: client.email,
      phone: client.phone,
      company: client.company,
      idNumber: client.idNumber,
      address: client.address,
      city: client.city,
      state: client.state,
      zipCode: client.zipCode,
      country: client.country,
      taxId: client.taxId
    });
    
    setShowEditClientModal(true);
  };

  // Handle edit client form field changes
  const handleEditClientChange = (field: keyof Client, value: string) => {
    setEditClientForm({
      ...editClientForm,
      [field]: value
    });
  };

  // Save client edits
  const handleSaveClientEdit = async () => {
    if (!client) return;
    
    try {
      const response = await clientApi.update(client.id, editClientForm);
      
      // Update client in state with updated data
      setClient({
        ...client,
        ...editClientForm
      });
      
      setShowEditClientModal(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update client information');
    }
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading client details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-xl font-semibold text-gray-900">Error Loading Client</p>
          <p className="mt-2 text-gray-600">{error}</p>
          <Link 
            to="/clients" 
            className="mt-4 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            <ArrowLeftIcon className="mr-1 h-5 w-5" aria-hidden="true" />
            Back to Clients
          </Link>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold text-gray-900">Client Not Found</p>
          <Link 
            to="/clients" 
            className="mt-4 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            <ArrowLeftIcon className="mr-1 h-5 w-5" aria-hidden="true" />
            Back to Clients
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header with back button */}
      <div className="mb-6">
        <Link 
          to="/clients" 
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="mr-1 h-5 w-5" aria-hidden="true" />
          Back to Clients
        </Link>
      </div>

      {/* Client details card */}
      <div className="bg-white shadow-lg rounded-2xl overflow-hidden mb-8">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <UserCircleIcon className="h-10 w-10 text-gray-400" />
              <div className="ml-4">
                <h3 className="text-2xl font-semibold text-gray-900">{client?.name}</h3>
                <p className="mt-1 text-base text-gray-600">{client?.company}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleToggleClientStatus}
                disabled={statusUpdating}
                className={`px-4 py-2 inline-flex text-sm font-semibold rounded-full transition-colors duration-150 ${
                  client?.status === 'active' 
                  ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                  : 'bg-red-100 text-red-800 hover:bg-red-200'
                }`}
              >
                {statusUpdating ? 'Updating...' : (client?.status === 'active' ? 'Active' : 'Inactive')}
              </button>
              <button
                type="button"
                onClick={handleEditClient}
                className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <PencilIcon className="-ml-1 mr-2 h-5 w-5 text-gray-400" aria-hidden="true" />
                Edit Client
              </button>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Contact Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Contact Details</h4>
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                  <span className="text-gray-900">{client?.email}</span>
                </div>
                <div className="flex items-center text-sm">
                  <PhoneIcon className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                  <span className="text-gray-900">{client?.phone}</span>
                </div>
              </div>
            </div>

            {/* Business Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Business Details</h4>
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                  <span className="text-gray-900">{client?.company}</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-gray-500 w-24">Tax ID:</span>
                  <span className="text-gray-900">{client?.taxId || '-'}</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-gray-500 w-24">ID Number:</span>
                  <span className="text-gray-900">{client?.idNumber || '-'}</span>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Address</h4>
              <div className="space-y-2 text-sm">
                <p className="text-gray-900">{client?.address}</p>
                <p className="text-gray-900">
                  {[client?.city, client?.state, client?.zipCode].filter(Boolean).join(', ')}
                </p>
                <p className="text-gray-900">{client?.country}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Client quotes section */}
      <div className="bg-white shadow-lg rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Client Quotes</h2>
              <p className="mt-1 text-sm text-gray-600">Manage and track all quotes for this client.</p>
            </div>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <ChartBarIcon className="-ml-1 mr-2 h-5 w-5 text-gray-400" aria-hidden="true" />
                Report
              </button>
              <button
                type="button"
                onClick={addNewQuoteRow}
                className="inline-flex items-center rounded-xl border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                Add Quote
              </button>
            </div>
          </div>
        </div>
        
        {/* Quotes table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                  Date
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
                  Notes
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Cost
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Charged
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Payment Method
                </th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {clientQuotes.length > 0 ? (
                clientQuotes.map((quote) => (
                  <tr 
                    key={quote.id} 
                    className={editingQuoteId === quote.id ? 'bg-gray-50' : undefined}
                    onClick={() => handleEditQuote(quote)}
                  >
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                      <div className="font-medium text-gray-900">
                        {new Date(quote.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {quote.product}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {quote.platform}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <div className="relative">
                        <button
                          type="button"
                          className="group inline-flex items-center justify-between w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowStatusDropdown(showStatusDropdown === quote.id ? null : quote.id);
                          }}
                        >
                          {getStatusLabel(quote.status)}
                          <ChevronDownIcon className="ml-2 h-5 w-5 text-gray-400" aria-hidden="true" />
                        </button>
                        {showStatusDropdown === quote.id && (
                          <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                            <div className="p-1" role="menu" aria-orientation="vertical">
                              {statusOptions.map((option) => (
                                <button
                                  key={option.value}
                                  className="block w-full rounded-md px-4 py-2 text-left text-sm hover:bg-gray-100"
                                  role="menuitem"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(quote.id, option.value as Quote['status']);
                                  }}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {quote.notes}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      ${quote.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      ${quote.chargedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {quote.paymentMethod}
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <div className="flex justify-end space-x-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportInvoice(quote);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="Export Invoice"
                        >
                          <DocumentTextIcon className="h-5 w-5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditQuote(quote);
                          }}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <PencilIcon className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                    No quotes found for this client. Add one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Client shipments section */}
      <div className="mt-8 bg-white shadow-lg rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Client Shipments</h2>
              <p className="mt-1 text-sm text-gray-600">View all shipments for this client.</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                  Date
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Shipment Number
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
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {client?.trackings && client.trackings.length > 0 ? (
                client.trackings.map((tracking) => (
                  <tr 
                    key={tracking.id.toString()} 
                    onClick={() => handleTrackingRowClick(tracking)}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                      <div className="font-medium text-gray-900">
                        {new Date(tracking.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {tracking.trackingNumber}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        tracking.status === 'delivered'
                          ? 'bg-gradient-to-r from-green-50 to-green-100 text-green-800 border border-green-200'
                          : tracking.status === 'in_transit'
                          ? 'bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-800 border border-indigo-200'
                          : 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {tracking.status === 'delivered'
                          ? 'Delivered'
                          : tracking.status === 'in_transit'
                          ? 'In Transit'
                          : tracking.status === 'paid'
                          ? 'Paid'
                          : 'Pending'}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500">
                      <div className="max-w-md truncate">
                        {tracking.quotes.map(q => q.product).join(', ')}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      ${tracking.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-200">
                        <TruckIcon className="h-6 w-6 text-white" aria-hidden="true" />
                      </div>
                      <h3 className="mt-4 text-lg font-medium text-gray-900">No Shipments Found</h3>
                      <p className="mt-2 text-sm text-gray-500 text-center">
                        This client has no shipments yet.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Quote Modal */}
      <FormModal
        isOpen={newQuote}
        onClose={() => setNewQuote(false)}
        onSubmit={handleSaveNewQuote}
        title="Add New Quote"
        description="Fill in the quote details below."
        submitLabel="Add Quote"
      >
        {renderFormContent(false)}
      </FormModal>

      {/* Edit Quote Modal */}
      <FormModal
        isOpen={editingQuoteId !== null}
        onClose={() => setEditingQuoteId(null)}
        onSubmit={handleSaveEdit}
        title="Edit Quote"
        description="Update the quote details below."
        submitLabel="Save Changes"
        showDeleteButton={true}
        onDelete={async () => {
          if (editingQuoteId) {
            try {
              await quoteApi.delete(editingQuoteId);
              setClientQuotes(prev => prev.filter(q => q.id !== editingQuoteId));
              setEditingQuoteId(null);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Failed to delete quote');
            }
          }
        }}
      >
        {renderFormContent(true)}
      </FormModal>

      {/* Report Modal */}
      {showReportModal && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          onGenerate={handleGenerateReport}
          title={`Generate Report for ${client?.company || 'Client'}`}
        />
      )}

      {/* Report Display */}
      {reportData && (
        <div className="mt-8">
          <ClientReport
            client={client!}
            quotes={reportData.quotes}
            shipments={reportData.shipments}
            startDate={reportData.startDate}
            endDate={reportData.endDate}
            selectedStatuses={reportData.selectedStatuses}
          />
        </div>
      )}

      {/* Tracking details modal */}
      <Dialog
        as="div"
        className="relative z-10"
        open={showTrackingModal}
        onClose={() => setShowTrackingModal(false)}
      >
        <div className="fixed inset-0 bg-black bg-opacity-25" />
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
              <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                Shipment Details
              </Dialog.Title>
              {selectedTracking && (
                <div className="mt-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Tracking Number</p>
                      <p className="text-base font-medium text-gray-900">{selectedTracking.trackingNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Status</p>
                      <p className="text-base font-medium text-gray-900">{selectedTracking.status}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Shipping Cost</p>
                      <p className="text-base font-medium text-gray-900">
                        ${selectedTracking.shippingCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total Value</p>
                      <p className="text-base font-medium text-gray-900">
                        ${selectedTracking.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Created Date</p>
                      <p className="text-base font-medium text-gray-900">
                        {new Date(selectedTracking.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Declared Value</p>
                      <p className="text-base font-medium text-gray-900">
                        ${selectedTracking.declaredValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-500 mb-2">Items</p>
                    <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                      {selectedTracking.quotes.length > 0 ? (
                        <ul className="divide-y divide-gray-200">
                          {selectedTracking.quotes.map(quote => (
                            <li key={quote.id} className="py-2">
                              <div className="flex justify-between">
                                <span className="text-sm font-medium text-gray-900">{quote.product}</span>
                                <span className="text-sm text-gray-500">
                                  ${quote.chargedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500">No items associated with this shipment</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      onClick={() => setShowTrackingModal(false)}
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      onClick={() => {
                        setShowTrackingModal(false);
                        setDeletingTrackingId(selectedTracking.id);
                        setShowDeleteTrackingModal(true);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </Dialog.Panel>
          </div>
        </div>
      </Dialog>

      {/* Deletion confirmation modal */}
      <ConfirmationModal
        isOpen={showDeleteTrackingModal}
        onClose={() => {
          setShowDeleteTrackingModal(false);
          setDeletingTrackingId(null);
        }}
        onConfirm={handleDeleteTracking}
        title="Delete Shipment"
        description="Are you sure you want to delete this shipment? This action cannot be undone."
        type="delete"
      />

      {/* Edit Client Modal */}
      <FormModal
        isOpen={showEditClientModal}
        onClose={() => setShowEditClientModal(false)}
        onSubmit={handleSaveClientEdit}
        title="Edit Client Information"
        description="Update the client's contact and business details."
        submitLabel="Save Changes"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <InputField
              id="name"
              name="name"
              label="Full Name"
              value={editClientForm.name || ''}
              onChange={(e) => handleEditClientChange('name', e.target.value)}
              placeholder="Enter client's full name"
              required
            />
            <InputField
              id="company"
              name="company"
              label="Company Name"
              value={editClientForm.company || ''}
              onChange={(e) => handleEditClientChange('company', e.target.value)}
              placeholder="Enter company name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <InputField
              id="email"
              name="email"
              label="Email Address"
              type="email"
              value={editClientForm.email || ''}
              onChange={(e) => handleEditClientChange('email', e.target.value)}
              placeholder="client@example.com"
              required
            />
            <InputField
              id="phone"
              name="phone"
              label="Phone Number"
              value={editClientForm.phone || ''}
              onChange={(e) => handleEditClientChange('phone', e.target.value)}
              placeholder="Enter phone number"
              required
            />
          </div>

          <InputField
            id="address"
            name="address"
            label="Address"
            value={editClientForm.address || ''}
            onChange={(e) => handleEditClientChange('address', e.target.value)}
            placeholder="Enter street address"
          />

          <div className="grid grid-cols-3 gap-6">
            <InputField
              id="city"
              name="city"
              label="City"
              value={editClientForm.city || ''}
              onChange={(e) => handleEditClientChange('city', e.target.value)}
              placeholder="Enter city"
            />
            <InputField
              id="state"
              name="state"
              label="State/Province"
              value={editClientForm.state || ''}
              onChange={(e) => handleEditClientChange('state', e.target.value)}
              placeholder="Enter state/province"
            />
            <InputField
              id="zipCode"
              name="zipCode"
              label="ZIP/Postal Code"
              value={editClientForm.zipCode || ''}
              onChange={(e) => handleEditClientChange('zipCode', e.target.value)}
              placeholder="Enter ZIP code"
            />
          </div>

          <InputField
            id="country"
            name="country"
            label="Country"
            value={editClientForm.country || ''}
            onChange={(e) => handleEditClientChange('country', e.target.value)}
            placeholder="Enter country"
          />

          <div className="grid grid-cols-2 gap-6">
            <InputField
              id="taxId"
              name="taxId"
              label="Tax ID"
              value={editClientForm.taxId || ''}
              onChange={(e) => handleEditClientChange('taxId', e.target.value)}
              placeholder="Enter tax ID"
            />
            <InputField
              id="idNumber"
              name="idNumber"
              label="ID Number"
              value={editClientForm.idNumber || ''}
              onChange={(e) => handleEditClientChange('idNumber', e.target.value)}
              placeholder="Enter ID number"
            />
          </div>
        </div>
      </FormModal>
    </div>
  );
};

export default ClientDetail; 