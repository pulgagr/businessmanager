import React, { useEffect, useState } from 'react';
import InvoiceTemplate from '../components/InvoiceTemplate';
import { Quote, Client, Settings, settingsApi } from '../services/api';

const SampleInvoice: React.FC = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [invoiceData, setInvoiceData] = useState<{
    quote: Quote;
    client: Client;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
  } | null>(null);

  useEffect(() => {
    // Get data from sessionStorage
    const storedData = sessionStorage.getItem('invoiceData');
    if (storedData) {
      const parsedData = JSON.parse(storedData);
      setInvoiceData(parsedData);
      // Clear the data from sessionStorage
      sessionStorage.removeItem('invoiceData');
    }

    // Fetch settings
    const fetchSettings = async () => {
      try {
        const response = await settingsApi.get();
        setSettings(response.data);
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      }
    };
    fetchSettings();
  }, []);

  // Sample fallback data
  const sampleQuote: Quote = {
    id: 1,
    clientId: 1,
    product: "Website Development",
    platform: "WordPress",
    status: "paid",
    cost: 1500,
    chargedAmount: 2250,
    amountPaid: 1000,
    paymentMethod: "Bank Transfer",
    notes: "Including custom theme development and 1 year of hosting",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    client: {
      id: 1,
      name: "John Smith",
      email: "john@example.com",
      phone: "+1 (555) 123-4567",
      company: "Smith Enterprises",
      status: "active",
      idNumber: "ID123456",
      address: "123 Business Street",
      city: "San Francisco",
      state: "CA",
      zipCode: "94105",
      country: "United States",
      taxId: "TAX987654"
    }
  };


  if (!settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <InvoiceTemplate
        quote={invoiceData?.quote || sampleQuote}
        client={invoiceData?.quote?.client || sampleQuote.client}
        settings={settings}
        invoiceNumber={invoiceData?.invoiceNumber || "INV-2024-001"}
        invoiceDate={invoiceData ? new Date(invoiceData.invoiceDate) : new Date()}
        dueDate={invoiceData ? new Date(invoiceData.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}
      />
    </div>
  );
};

export default SampleInvoice; 