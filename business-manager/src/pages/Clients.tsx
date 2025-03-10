import { useState, useEffect, Fragment } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Dialog, Transition } from '@headlessui/react';
import { clientApi, Client } from '../services/api';

interface ApiResponse<T> {
  data: T;
}

type NewClient = Omit<Client, 'id' | 'status'>;

const Clients = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [newClient, setNewClient] = useState<NewClient>({
    name: '',
    email: '',
    phone: '',
    company: '',
    idNumber: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    taxId: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await clientApi.getAll() as ApiResponse<Client[]>;
      setClients(response.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  // Add new client
  const handleAddClient = async () => {
    try {
      const response = await clientApi.create(newClient) as ApiResponse<Client>;
      setClients([...clients, response.data]);
      setNewClient({ name: '', email: '', phone: '', company: '', idNumber: '', address: '', city: '', state: '', zipCode: '', country: '', taxId: '' });
      setIsAddModalOpen(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create client');
    }
  };

  // Form input handling
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewClient({ ...newClient, [name]: value });
  };

  // Delete client
  const handleDeleteClient = async (client: Client) => {
    try {
      await clientApi.delete(client.id);
      setClients(prev => prev.filter(c => c.id !== client.id));
      setDeletingClient(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete client');
    }
  };

  // Navigate to client detail page
  const handleClientClick = (clientId: number) => {
    navigate(`/clients/${clientId}`);
  };

  // Add handleEditChange function
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (editingClient) {
      setEditingClient({ ...editingClient, [name]: value });
    }
  };

  // Add handleUpdateClient function
  const handleUpdateClient = async () => {
    try {
      if (!editingClient) return;
      
      // Create an updated client object with all fields
      const updatedClient = {
        id: editingClient.id,
        name: editingClient.name,
        email: editingClient.email,
        phone: editingClient.phone,
        company: editingClient.company,
        status: editingClient.status,
        idNumber: editingClient.idNumber,
        address: editingClient.address,
        city: editingClient.city,
        state: editingClient.state,
        zipCode: editingClient.zipCode,
        country: editingClient.country,
        taxId: editingClient.taxId
      };

      const response = await clientApi.update(editingClient.id, updatedClient) as ApiResponse<Client>;
      
      // Update the clients list with the updated client
      setClients(prev => prev.map(client => 
        client.id === response.data.id ? response.data : client
      ));
      
      // Clear the editing state and error
      setEditingClient(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update client');
    }
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Clients</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all clients including their name, email, phone, and company.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Add Client
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
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

      {/* Add Client Modal */}
      <Transition.Root show={isAddModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={setIsAddModalOpen}>
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
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
                  {/* Close button */}
                  <div className="absolute right-0 top-0 pr-4 pt-4">
                    <button
                      type="button"
                      className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                      onClick={() => setIsAddModalOpen(false)}
                    >
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>

                  {/* Modal Header */}
                  <div className="mb-6">
                    <Dialog.Title as="h2" className="text-2xl font-semibold text-gray-900">
                      Add New Client
                    </Dialog.Title>
                    <Dialog.Description className="mt-2 text-base text-gray-600">
                      Fill in the client details to get started.
                    </Dialog.Description>
                  </div>

                  <div>
                    <div className="mt-6">
                      {/* Personal Information */}
                      <div className="mb-6">
                        <h4 className="text-base font-semibold text-gray-900 mb-4">Personal Information</h4>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label htmlFor="name" className="block text-base font-semibold text-gray-900 mb-2">
                              Full Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              name="name"
                              id="name"
                              value={newClient.name}
                              onChange={handleInputChange}
                              className="block w-full rounded-xl border border-gray-300 bg-white py-3 px-4 text-gray-900 shadow-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors duration-200"
                              required
                            />
                          </div>
                          <div>
                            <label htmlFor="email" className="block text-base font-semibold text-gray-900 mb-2">
                              Email Address <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="email"
                              name="email"
                              id="email"
                              value={newClient.email}
                              onChange={handleInputChange}
                              className="block w-full rounded-xl border border-gray-300 bg-white py-3 px-4 text-gray-900 shadow-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors duration-200"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      {/* Business Information */}
                      <div className="mb-6">
                        <h4 className="text-base font-semibold text-gray-900 mb-4">Business Information</h4>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label htmlFor="company" className="block text-base font-semibold text-gray-900 mb-2">
                              Company Name
                            </label>
                            <input
                              type="text"
                              name="company"
                              id="company"
                              value={newClient.company}
                              onChange={handleInputChange}
                              className="block w-full rounded-xl border border-gray-300 bg-white py-3 px-4 text-gray-900 shadow-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors duration-200"
                            />
                          </div>
                          <div>
                            <label htmlFor="phone" className="block text-base font-semibold text-gray-900 mb-2">
                              Phone Number
                            </label>
                            <input
                              type="tel"
                              name="phone"
                              id="phone"
                              value={newClient.phone}
                              onChange={handleInputChange}
                              className="block w-full rounded-xl border border-gray-300 bg-white py-3 px-4 text-gray-900 shadow-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors duration-200"
                            />
                          </div>
                          <div>
                            <label htmlFor="idNumber" className="block text-base font-semibold text-gray-900 mb-2">
                              ID Number
                            </label>
                            <input
                              type="text"
                              name="idNumber"
                              id="idNumber"
                              value={newClient.idNumber}
                              onChange={handleInputChange}
                              className="block w-full rounded-xl border border-gray-300 bg-white py-3 px-4 text-gray-900 shadow-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors duration-200"
                            />
                          </div>
                          <div>
                            <label htmlFor="taxId" className="block text-base font-semibold text-gray-900 mb-2">
                              Tax ID
                            </label>
                            <input
                              type="text"
                              name="taxId"
                              id="taxId"
                              value={newClient.taxId}
                              onChange={handleInputChange}
                              className="block w-full rounded-xl border border-gray-300 bg-white py-3 px-4 text-gray-900 shadow-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors duration-200"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Address Information */}
                      <div>
                        <h4 className="text-base font-semibold text-gray-900 mb-4">Address Information</h4>
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <label htmlFor="address" className="block text-base font-semibold text-gray-900 mb-2">
                              Street Address
                            </label>
                            <input
                              type="text"
                              name="address"
                              id="address"
                              value={newClient.address}
                              onChange={handleInputChange}
                              className="block w-full rounded-xl border border-gray-300 bg-white py-3 px-4 text-gray-900 shadow-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors duration-200"
                            />
                          </div>
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <label htmlFor="city" className="block text-base font-semibold text-gray-900 mb-2">
                                City
                              </label>
                              <input
                                type="text"
                                name="city"
                                id="city"
                                value={newClient.city}
                                onChange={handleInputChange}
                                className="block w-full rounded-xl border border-gray-300 bg-white py-3 px-4 text-gray-900 shadow-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors duration-200"
                              />
                            </div>
                            <div>
                              <label htmlFor="state" className="block text-base font-semibold text-gray-900 mb-2">
                                State/Province
                              </label>
                              <input
                                type="text"
                                name="state"
                                id="state"
                                value={newClient.state}
                                onChange={handleInputChange}
                                className="block w-full rounded-xl border border-gray-300 bg-white py-3 px-4 text-gray-900 shadow-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors duration-200"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <label htmlFor="zipCode" className="block text-base font-semibold text-gray-900 mb-2">
                                ZIP/Postal Code
                              </label>
                              <input
                                type="text"
                                name="zipCode"
                                id="zipCode"
                                value={newClient.zipCode}
                                onChange={handleInputChange}
                                className="block w-full rounded-xl border border-gray-300 bg-white py-3 px-4 text-gray-900 shadow-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors duration-200"
                              />
                            </div>
                            <div>
                              <label htmlFor="country" className="block text-base font-semibold text-gray-900 mb-2">
                                Country
                              </label>
                              <input
                                type="text"
                                name="country"
                                id="country"
                                value={newClient.country}
                                onChange={handleInputChange}
                                className="block w-full rounded-xl border border-gray-300 bg-white py-3 px-4 text-gray-900 shadow-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors duration-200"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="mt-8 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                      onClick={() => setIsAddModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-transparent bg-blue-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-blue-700"
                      onClick={handleAddClient}
                    >
                      Add Client
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Delete Confirmation Modal */}
      <Transition.Root show={deletingClient !== null} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setDeletingClient(null)}>
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
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md sm:p-6">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <TrashIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
              </div>
                    <Dialog.Title as="h3" className="mt-4 text-lg font-medium text-gray-900">
                      Delete Client
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete {deletingClient?.name}? This action cannot be undone and will delete all associated quotes and orders.
              </p>
            </div>
                  </div>
                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                    <button
                      type="button"
                      className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 sm:col-start-2"
                      onClick={() => handleDeleteClient(deletingClient!)}
                    >
                      Delete
                    </button>
              <button
                type="button"
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                onClick={() => setDeletingClient(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Edit Client Modal */}
      <Transition.Root show={editingClient !== null} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setEditingClient(null)}>
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
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
                  {/* Close button */}
                  <div className="absolute right-0 top-0 pr-4 pt-4">
                    <button
                      type="button"
                      className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                      onClick={() => setEditingClient(null)}
                    >
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>

                  {/* Modal Header */}
                  <div className="mb-6">
                    <Dialog.Title as="h2" className="text-2xl font-semibold text-gray-900">
                      Edit Client
                    </Dialog.Title>
                    <Dialog.Description className="mt-2 text-base text-gray-600">
                      Update the client details below.
                    </Dialog.Description>
                  </div>

                  <div>
                    <div className="mt-6">
                      {/* Personal Information */}
                      <div className="mb-6">
                        <h4 className="text-base font-semibold text-gray-900 mb-4">Personal Information</h4>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label htmlFor="edit-name" className="block text-base font-semibold text-gray-900 mb-2">
                              Full Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              name="name"
                              id="edit-name"
                              value={editingClient?.name || ''}
                              onChange={handleEditChange}
                              className="block w-full rounded-xl border border-gray-300 bg-white py-3 px-4 text-gray-900 shadow-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors duration-200"
                              required
                            />
                          </div>
                          <div>
                            <label htmlFor="edit-email" className="block text-base font-semibold text-gray-900 mb-2">
                              Email Address <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="email"
                              name="email"
                              id="edit-email"
                              value={editingClient?.email || ''}
                              onChange={handleEditChange}
                              className="block w-full rounded-xl border border-gray-300 bg-white py-3 px-4 text-gray-900 shadow-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors duration-200"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      {/* Business Information */}
                      <div className="mb-6">
                        <h4 className="text-base font-semibold text-gray-900 mb-4">Business Information</h4>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label htmlFor="edit-company" className="block text-base font-semibold text-gray-900 mb-2">
                              Company Name
                            </label>
                            <input
                              type="text"
                              name="company"
                              id="edit-company"
                              value={editingClient?.company || ''}
                              onChange={handleEditChange}
                              className="block w-full rounded-xl border border-gray-300 bg-white py-3 px-4 text-gray-900 shadow-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors duration-200"
                            />
                          </div>
                          <div>
                            <label htmlFor="edit-phone" className="block text-base font-semibold text-gray-900 mb-2">
                              Phone Number
                            </label>
                            <input
                              type="tel"
                              name="phone"
                              id="edit-phone"
                              value={editingClient?.phone || ''}
                              onChange={handleEditChange}
                              className="block w-full rounded-xl border border-gray-300 bg-white py-3 px-4 text-gray-900 shadow-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors duration-200"
                            />
                          </div>
                          <div>
                            <label htmlFor="edit-idNumber" className="block text-base font-semibold text-gray-900 mb-2">
                              ID Number
                            </label>
                            <input
                              type="text"
                              name="idNumber"
                              id="edit-idNumber"
                              value={editingClient?.idNumber || ''}
                              onChange={handleEditChange}
                              className="block w-full rounded-xl border border-gray-300 bg-white py-3 px-4 text-gray-900 shadow-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors duration-200"
                            />
                          </div>
                          <div>
                            <label htmlFor="edit-taxId" className="block text-base font-semibold text-gray-900 mb-2">
                              Tax ID
                            </label>
                            <input
                              type="text"
                              name="taxId"
                              id="edit-taxId"
                              value={editingClient?.taxId || ''}
                              onChange={handleEditChange}
                              className="block w-full rounded-xl border border-gray-300 bg-white py-3 px-4 text-gray-900 shadow-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors duration-200"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Address Information */}
                      <div>
                        <h4 className="text-base font-semibold text-gray-900 mb-4">Address Information</h4>
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <label htmlFor="edit-address" className="block text-base font-semibold text-gray-900 mb-2">
                              Street Address
                            </label>
                            <input
                              type="text"
                              name="address"
                              id="edit-address"
                              value={editingClient?.address || ''}
                              onChange={handleEditChange}
                              className="block w-full rounded-xl border border-gray-300 bg-white py-3 px-4 text-gray-900 shadow-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors duration-200"
                            />
                          </div>
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <label htmlFor="edit-city" className="block text-base font-semibold text-gray-900 mb-2">
                                City
                              </label>
                              <input
                                type="text"
                                name="city"
                                id="edit-city"
                                value={editingClient?.city || ''}
                                onChange={handleEditChange}
                                className="block w-full rounded-xl border border-gray-300 bg-white py-3 px-4 text-gray-900 shadow-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors duration-200"
                              />
                            </div>
                            <div>
                              <label htmlFor="edit-state" className="block text-base font-semibold text-gray-900 mb-2">
                                State/Province
                              </label>
                              <input
                                type="text"
                                name="state"
                                id="edit-state"
                                value={editingClient?.state || ''}
                                onChange={handleEditChange}
                                className="block w-full rounded-xl border border-gray-300 bg-white py-3 px-4 text-gray-900 shadow-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors duration-200"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <label htmlFor="edit-zipCode" className="block text-base font-semibold text-gray-900 mb-2">
                                ZIP/Postal Code
                              </label>
                              <input
                                type="text"
                                name="zipCode"
                                id="edit-zipCode"
                                value={editingClient?.zipCode || ''}
                                onChange={handleEditChange}
                                className="block w-full rounded-xl border border-gray-300 bg-white py-3 px-4 text-gray-900 shadow-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors duration-200"
                              />
                            </div>
                            <div>
                              <label htmlFor="edit-country" className="block text-base font-semibold text-gray-900 mb-2">
                                Country
                              </label>
                              <input
                                type="text"
                                name="country"
                                id="edit-country"
                                value={editingClient?.country || ''}
                                onChange={handleEditChange}
                                className="block w-full rounded-xl border border-gray-300 bg-white py-3 px-4 text-gray-900 shadow-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors duration-200"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="mt-8 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                      onClick={() => setEditingClient(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                      className="rounded-xl border border-transparent bg-blue-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-blue-700"
                      onClick={handleUpdateClient}
              >
                      Save Changes
              </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Name
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Email
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Phone
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Company
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td
                        className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 cursor-pointer"
                        onClick={() => handleClientClick(client.id)}
                      >
                        {client.name}
                      </td>
                      <td
                        className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 cursor-pointer"
                        onClick={() => handleClientClick(client.id)}
                      >
                        {client.email}
                      </td>
                      <td
                        className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 cursor-pointer"
                        onClick={() => handleClientClick(client.id)}
                      >
                        {client.phone}
                      </td>
                      <td
                        className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 cursor-pointer"
                        onClick={() => handleClientClick(client.id)}
                      >
                        {client.company}
                      </td>
                      <td
                        className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 cursor-pointer"
                        onClick={() => handleClientClick(client.id)}
                      >
                        <span
                          className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                            client.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {client.status}
                        </span>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => setEditingClient(client)}
                            className="inline-flex items-center rounded-md bg-white px-2.5 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                          >
                            <PencilIcon className="h-4 w-4 mr-1" aria-hidden="true" />
                            Edit
                          </button>
                          <button
                            onClick={() => setDeletingClient(client)}
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
    </div>
  );
};

export default Clients; 