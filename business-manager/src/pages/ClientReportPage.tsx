import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ClientReport from '../components/ClientReport';
import { Quote, Client, Tracking, settingsApi } from '../services/api';
import { format } from 'date-fns';

const ClientReportPage: React.FC = () => {
  const location = useLocation();
  const [reportData, setReportData] = useState<{
    client: Client;
    quotes: Quote[];
    shipments: Tracking[];
    startDate: string;
    endDate: string;
    selectedStatuses: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>('');

  useEffect(() => {
    // Fetch company settings
    const fetchSettings = async () => {
      try {
        const response = await settingsApi.get();
        setCompanyName(response.data.companyName);
      } catch (err) {
        console.error('Failed to fetch company settings:', err);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const loadReportData = () => {
      try {
        // Get timestamp from URL
        const searchParams = new URLSearchParams(location.search);
        const timestamp = searchParams.get('t');
        
        if (!timestamp) {
          setError('No report timestamp found');
          return;
        }

        // Get data from sessionStorage using timestamp key
        const storageKey = `reportData_${timestamp}`;
        const storedData = sessionStorage.getItem(storageKey);
        
        if (!storedData) {
          setError('No report data found. Please try generating the report again.');
          return;
        }

        try {
          const parsedData = JSON.parse(storedData);
          
          // Validate the parsed data
          if (!parsedData.client || !parsedData.quotes || !parsedData.shipments || !parsedData.startDate || !parsedData.endDate || !parsedData.selectedStatuses) {
            setError('Invalid report data format');
            return;
          }

          setReportData(parsedData);

          // Update page title
          const startDate = format(new Date(parsedData.startDate), 'MMM d, yyyy');
          const endDate = format(new Date(parsedData.endDate), 'MMM d, yyyy');
          document.title = `${companyName} - Report ${parsedData.client.company} - ${startDate} to ${endDate}`;

          // Clear the data from sessionStorage only after successful parsing
          sessionStorage.removeItem(storageKey);
        } catch (parseError) {
          console.error('Error parsing report data:', parseError);
          setError('Error parsing report data');
        }
      } catch (err) {
        console.error('Error loading report data:', err);
        setError('Failed to load report data');
      }
    };

    // Add a small delay to ensure sessionStorage is populated
    const timer = setTimeout(loadReportData, 100);
    return () => {
      clearTimeout(timer);
      // Reset title when component unmounts
      document.title = companyName || 'Business Manager';
    };
  }, [location.search, companyName]);

  if (error) {
    return (
      <div className="min-h-screen w-full bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <button
            onClick={() => window.close()}
            className="text-blue-600 hover:text-blue-800"
          >
            Close Window
          </button>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="min-h-screen w-full bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-00">
      <div className="w-full py-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <ClientReport
            client={reportData.client}
            quotes={reportData.quotes}
            shipments={reportData.shipments}
            startDate={reportData.startDate}
            endDate={reportData.endDate}
            selectedStatuses={reportData.selectedStatuses}
          />
        </div>
      </div>
    </div>
  );
};

export default ClientReportPage; 