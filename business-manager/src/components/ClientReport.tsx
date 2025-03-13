import React from 'react';
import { format } from 'date-fns';
import { Quote, Client, Tracking, settingsApi } from '../services/api';
import { useEffect, useState } from 'react';

interface ClientReportProps {
  client: Client;
  quotes: Quote[];
  shipments: Tracking[];
  startDate: string;
  endDate: string;
  selectedStatuses: string[];
}

const ClientReport: React.FC<ClientReportProps> = ({
  client,
  quotes,
  shipments,
  startDate,
  endDate,
  selectedStatuses
}) => {
  const [settings, setSettings] = useState<{
    companyName: string;
    email: string;
    phone: string;
    address: string;
    logoUrl?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchSettings = async () => {
      try {
        const response = await settingsApi.get();
        if (isMounted) {
          setSettings(response.data);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to fetch settings:', error);
          setError('Failed to load company settings');
          // Set default settings to allow report to render
          setSettings({
            companyName: 'Company Name',
            email: '',
            phone: '',
            address: '',
          });
        }
      }
    };

    fetchSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  // Calculate report metrics
  const metrics = {
    totalQuotes: quotes.length,
    totalShipments: shipments.length,
    totalCharged: quotes.reduce((sum, quote) => sum + quote.chargedAmount, 0),
    totalPaid: quotes.reduce((sum, quote) => sum + quote.amountPaid, 0) + 
               shipments.reduce((sum, shipment) => sum + (shipment.amountPaid || 0), 0),
    totalUnpaid: (quotes.reduce((sum, quote) => sum + quote.chargedAmount, 0) + 
                 shipments.reduce((sum, shipment) => sum + shipment.totalValue, 0)) - 
                 (quotes.reduce((sum, quote) => sum + quote.amountPaid, 0) + 
                 shipments.reduce((sum, shipment) => sum + (shipment.amountPaid || 0), 0)),
    totalShippingValue: shipments.reduce((sum, shipment) => sum + shipment.totalValue, 0),
    totalDeclaredValue: shipments.reduce((sum, shipment) => sum + shipment.declaredValue, 0),
    statusBreakdown: {
      ...quotes.reduce((acc, quote) => {
        acc[quote.status] = (acc[quote.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      shipment: shipments.length
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (!settings) {
    return (
      <div className="flex justify-center items-center h-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-2xl overflow-hidden">
      {/* Report Header with Company and Client Information */}
      <div className="px-6 py-5 border-b border-gray-200">
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-start gap-4">
            {/* Company Logo and Information */}
            <div>
              {settings.logoUrl && (
                <img 
                  src={settings.logoUrl} 
                  alt="Company Logo" 
                  className="h-16 w-auto mb-4"
                />
              )}
              <h3 className="text-lg font-semibold text-gray-900">{settings.companyName}</h3>
              <div className="mt-2 text-sm text-gray-600">
                <p>{settings.address}</p>
                <p>{settings.email}</p>
                <p>{settings.phone}</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-semibold text-gray-900">Client Report</h2>
            <p className="mt-1 text-sm text-gray-600">
              {format(new Date(startDate), 'MMM d, yyyy')} - {format(new Date(endDate), 'MMM d, yyyy')}
            </p>
          </div>
        </div>

        {/* Detailed Client Information */}
        <div className="mt-8 grid grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Client Information</h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Company:</span> {client.company}</p>
              <p><span className="font-medium">Contact:</span> {client.name}</p>
              <p><span className="font-medium">Email:</span> {client.email}</p>
              <p><span className="font-medium">Phone:</span> {client.phone}</p>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Business Details</h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Address:</span> {client.address}</p>
              <p><span className="font-medium">City:</span> {client.city}</p>
              <p><span className="font-medium">State/ZIP:</span> {client.state}, {client.zipCode}</p>
              <p><span className="font-medium">Tax ID:</span> {client.taxId || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Summary</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-600">Shipping Costs</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(metrics.totalShippingValue)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-600">Total Orders</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(metrics.totalCharged)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-600">Payments Received</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(metrics.totalPaid)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-600">Payments Due</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(metrics.totalUnpaid)}</p>
          </div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Status Breakdown</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Object.entries(metrics.statusBreakdown)
            .filter(([status]) => selectedStatuses.includes(status))
            .map(([status, count]) => (
              <div key={status} className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-600 capitalize">{status}</p>
                <p className="mt-1 text-xl font-semibold text-gray-900">{count}</p>
              </div>
            ))}
        </div>
      </div>

      {/* Quotes List */}
      {quotes.length > 0 && (
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quotes</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[80px]">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-auto">Product</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right w-[119px]">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right w-[119px]">Price</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right w-[119px]">Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {quotes.map((quote) => (
                  <tr key={quote.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{format(new Date(quote.createdAt), 'MMM d')}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{quote.product}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 capitalize text-right">{quote.status}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(quote.chargedAmount)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(quote.amountPaid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Shipments List */}
      {shipments.length > 0 && (
        <div className="px-6 py-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Shipments</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left w-[80px]">Date</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left w-auto">Tracking Number</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right w-[119px]">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right w-[119px]">Price</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right w-[119px]">Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {shipments.map((shipment) => (
                  <tr key={shipment.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{format(new Date(shipment.createdAt), 'MMM d')}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-left">{shipment.trackingNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 capitalize text-right">{shipment.status}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(shipment.totalValue)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(shipment.amountPaid || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientReport; 