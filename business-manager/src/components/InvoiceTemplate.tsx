import React from 'react';
import { Quote, Client, Settings } from '../services/api';
import { format } from 'date-fns';

interface InvoiceTemplateProps {
  quote: Quote;
  client: Client;
  settings: Settings;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
}

const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({
  quote,
  client,
  settings,
  invoiceNumber,
  invoiceDate,
  dueDate,
}) => {
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: settings.currency || 'USD',
    }).format(amount);
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-start gap-4">
          {/* Company Logo */}
          <div className="w-32 h-32 bg-gray-100 rounded flex items-center justify-center">
            {settings.logoUrl ? (
              <img 
                src={settings.logoUrl} 
                alt="Company Logo" 
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="text-gray-400 text-sm text-center">Logo</div>
            )}
          </div>
          {/* Company Information */}
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{settings.companyName}</h1>
            <p className="text-gray-600">{settings.address}</p>
            <p className="text-gray-600">{settings.email}</p>
            <p className="text-gray-600">{settings.phone}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-gray-800">INVOICE</h2>
          <p className="text-gray-600">#{invoiceNumber}</p>
          <p className="text-gray-600">Date: {format(invoiceDate, 'MMM dd, yyyy')}</p>
          <p className="text-gray-600">Due Date: {format(dueDate, 'MMM dd, yyyy')}</p>
        </div>
      </div>

      {/* Client Information */}
      <div className="border-t border-b border-gray-200 py-4 mb-8">
        <h3 className="text-lg font-semibold mb-2">Bill To:</h3>
        <p className="text-gray-800 font-medium">{client.name}</p>
        <p className="text-gray-600">{client.company}</p>
        <p className="text-gray-600">{client.address}</p>
        <p className="text-gray-600">{client.city}, {client.state} {client.zipCode}</p>
        <p className="text-gray-600">{client.country}</p>
        <p className="text-gray-600">Email: {client.email}</p>
        <p className="text-gray-600">Phone: {client.phone}</p>
        {client.taxId && <p className="text-gray-600">Tax ID: {client.taxId}</p>}
      </div>

      {/* Invoice Items */}
      <table className="w-full mb-8">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left py-2 px-4">Description</th>
            <th className="text-right py-2 px-4">Price</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-200">
            <td className="py-4 px-4">{quote.product}</td>
            <td className="py-4 px-4 text-right">{formatCurrency(quote.chargedAmount)}</td>
          </tr>
          {/* Add space for additional items if needed */}
          <tr className="h-10"></tr>
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-64">
          <div className="flex justify-between py-2 font-bold">
            <span>Total:</span>
            <span>{formatCurrency(quote.chargedAmount)}</span>
          </div>
          <div className="flex justify-between py-2 text-gray-600">
            <span>Amount Paid:</span>
            <span>{formatCurrency(quote.amountPaid)}</span>
          </div>
          <div className="flex justify-between py-2 font-bold text-blue-600">
            <span>Balance Due:</span>
            <span>{formatCurrency(quote.chargedAmount - quote.amountPaid)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-gray-500 text-sm">
        <p>Thank you for your business!</p>
        <p>Please include the invoice number with your payment.</p>
      </div>
    </div>
  );
};

export default InvoiceTemplate; 