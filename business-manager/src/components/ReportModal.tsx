import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon, ChartBarIcon, CalendarIcon } from '@heroicons/react/24/outline';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (startDate: string, endDate: string, selectedStatuses: string[]) => void;
  title?: string;
}

const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
  title = 'Generate Report'
}) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  const statusOptions = [
    { value: 'quote', label: 'Quote Needed' },
    { value: 'quoted', label: 'Quoted' },
    { value: 'purchase', label: 'Purchase Needed' },
    { value: 'purchased', label: 'Purchased' },
    { value: 'received', label: 'Received' },
    { value: 'paid', label: 'Paid' },
    { value: 'shipment', label: 'Shipment' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(startDate, endDate, selectedStatuses);
  };

  const toggleStatus = (value: string) => {
    setSelectedStatuses(prev => 
      prev.includes(value)
        ? prev.filter(s => s !== value)
        : [...prev, value]
    );
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                <div className="bg-white">
                  <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                    <button
                      type="button"
                      className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      onClick={onClose}
                    >
                      <span className="sr-only">Close</span>
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="px-8 py-6">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="flex-shrink-0">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                          <ChartBarIcon className="h-6 w-6 text-indigo-600" aria-hidden="true" />
                        </div>
                      </div>
                      <div>
                        <Dialog.Title as="h3" className="text-xl font-semibold text-gray-900">
                          {title}
                        </Dialog.Title>
                        <p className="mt-1 text-sm text-gray-500">
                          Select the date range and status types to include in your report.
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Date Range Section */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                          <CalendarIcon className="h-5 w-5 text-gray-400 mr-2" />
                          Date Range
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                              Start Date
                            </label>
                            <input
                              type="date"
                              id="startDate"
                              name="startDate"
                              required
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                            />
                          </div>
                          <div>
                            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                              End Date
                            </label>
                            <input
                              type="date"
                              id="endDate"
                              name="endDate"
                              required
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              min={startDate}
                              className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Status Selection Section */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Status Types to Include</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {statusOptions.map((status) => (
                            <button
                              key={status.value}
                              type="button"
                              onClick={() => toggleStatus(status.value)}
                              className={`${
                                selectedStatuses.includes(status.value)
                                  ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500'
                                  : 'bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50'
                              } px-3 py-2 rounded-lg text-sm font-medium focus:outline-none transition-all duration-200 ease-in-out`}
                            >
                              {status.label}
                            </button>
                          ))}
                        </div>
                        {selectedStatuses.length === 0 && (
                          <p className="mt-2 text-sm text-gray-500">
                            Select at least one status type to include in the report.
                          </p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-6 flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={onClose}
                          className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 border border-gray-300"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={selectedStatuses.length === 0}
                          className="rounded-lg px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Generate Report
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default ReportModal; 