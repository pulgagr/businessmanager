import { useState, useEffect } from 'react';
import { CheckIcon, XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { settingsApi, Settings as SettingsType } from '../services/api';

interface ExtendedSettings extends SettingsType {
  platformOptions: string[];
  paymentOptions: string[];
}

const Settings = () => {
  const [settings, setSettings] = useState<ExtendedSettings>({
    companyName: '',
    email: '',
    phone: '',
    address: '',
    taxRate: 0,
    currency: 'USD',
    defaultPlatformFee: 0,
    notificationEmail: '',
    autoGenerateInvoices: false,
    platformOptions: [],
    paymentOptions: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSettings, setEditedSettings] = useState<ExtendedSettings | null>(null);

  // New state for adding options
  const [newPlatform, setNewPlatform] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await settingsApi.get();
      setSettings(response.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditedSettings({ ...settings });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedSettings(null);
    setIsEditing(false);
    setError(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editedSettings) return;

    const { name, value, type, checked } = e.target;
    setEditedSettings(prev => ({
      ...prev!,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) : value
    }));
  };

  const handleAddPlatform = () => {
    if (!editedSettings || !newPlatform.trim()) return;
    setEditedSettings(prev => ({
      ...prev!,
      platformOptions: [...prev!.platformOptions, newPlatform.trim()]
    }));
    setNewPlatform('');
  };

  const handleAddPaymentMethod = () => {
    if (!editedSettings || !newPaymentMethod.trim()) return;
    setEditedSettings(prev => ({
      ...prev!,
      paymentOptions: [...prev!.paymentOptions, newPaymentMethod.trim()]
    }));
    setNewPaymentMethod('');
  };

  const handleRemovePlatform = (platform: string) => {
    if (!editedSettings) return;
    setEditedSettings(prev => ({
      ...prev!,
      platformOptions: prev!.platformOptions.filter(p => p !== platform)
    }));
  };

  const handleRemovePaymentMethod = (method: string) => {
    if (!editedSettings) return;
    setEditedSettings(prev => ({
      ...prev!,
      paymentOptions: prev!.paymentOptions.filter(p => p !== method)
    }));
  };

  const handleSave = async () => {
    if (!editedSettings) return;

    try {
      const response = await settingsApi.update(editedSettings);
      setSettings(response.data);
      setIsEditing(false);
      setEditedSettings(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    }
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your business settings and preferences.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          {!isEditing ? (
            <button
              type="button"
              onClick={handleEdit}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
            >
              Edit Settings
            </button>
          ) : (
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:w-auto"
              >
                <CheckIcon className="h-4 w-4 mr-1.5" />
                Save
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
              >
                <XMarkIcon className="h-4 w-4 mr-1.5" />
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <XMarkIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckIcon className="h-5 w-5 text-green-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">Settings saved successfully!</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 space-y-6">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Business Information</h3>
            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                  Company Name
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="companyName"
                    id="companyName"
                    value={isEditing ? editedSettings?.companyName : settings.companyName}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="mt-1">
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={isEditing ? editedSettings?.email : settings.email}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <div className="mt-1">
                  <input
                    type="tel"
                    name="phone"
                    id="phone"
                    value={isEditing ? editedSettings?.phone : settings.phone}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
              </div>

              <div className="sm:col-span-6">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="address"
                    id="address"
                    value={isEditing ? editedSettings?.address : settings.address}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Financial Settings</h3>
            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-2">
                <label htmlFor="taxRate" className="block text-sm font-medium text-gray-700">
                  Tax Rate (%)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    name="taxRate"
                    id="taxRate"
                    step="0.01"
                    value={isEditing ? editedSettings?.taxRate : settings.taxRate}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
                  Currency
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="currency"
                    id="currency"
                    value={isEditing ? editedSettings?.currency : settings.currency}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="defaultPlatformFee" className="block text-sm font-medium text-gray-700">
                  Default Platform Fee (%)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    name="defaultPlatformFee"
                    id="defaultPlatformFee"
                    step="0.01"
                    value={isEditing ? editedSettings?.defaultPlatformFee : settings.defaultPlatformFee}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Notifications</h3>
            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="notificationEmail" className="block text-sm font-medium text-gray-700">
                  Notification Email
                </label>
                <div className="mt-1">
                  <input
                    type="email"
                    name="notificationEmail"
                    id="notificationEmail"
                    value={isEditing ? editedSettings?.notificationEmail : settings.notificationEmail}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <div className="flex items-center h-full">
                  <div className="relative flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        name="autoGenerateInvoices"
                        id="autoGenerateInvoices"
                        checked={isEditing ? editedSettings?.autoGenerateInvoices : settings.autoGenerateInvoices}
                        onChange={handleChange}
                        disabled={!isEditing}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="autoGenerateInvoices" className="font-medium text-gray-700">
                        Auto-generate Invoices
                      </label>
                      <p className="text-gray-500">Automatically generate invoices when orders are marked as completed.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Options Section */}
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Platform Options</h3>
            <div className="mt-6">
              <div className="flex space-x-3 mb-4">
                <input
                  type="text"
                  value={newPlatform}
                  onChange={(e) => setNewPlatform(e.target.value)}
                  placeholder="Add new platform"
                  disabled={!isEditing}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
                />
                <button
                  type="button"
                  onClick={handleAddPlatform}
                  disabled={!isEditing}
                  className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-300"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                  Add
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {(isEditing ? editedSettings?.platformOptions : settings.platformOptions)?.map((platform) => (
                  <div
                    key={platform}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                  >
                    <span>{platform}</span>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => handleRemovePlatform(platform)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods Section */}
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Payment Methods</h3>
            <div className="mt-6">
              <div className="flex space-x-3 mb-4">
                <input
                  type="text"
                  value={newPaymentMethod}
                  onChange={(e) => setNewPaymentMethod(e.target.value)}
                  placeholder="Add new payment method"
                  disabled={!isEditing}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
                />
                <button
                  type="button"
                  onClick={handleAddPaymentMethod}
                  disabled={!isEditing}
                  className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-300"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                  Add
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {(isEditing ? editedSettings?.paymentOptions : settings.paymentOptions)?.map((method) => (
                  <div
                    key={method}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                  >
                    <span>{method}</span>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => handleRemovePaymentMethod(method)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex justify-end space-x-3">
        {!isEditing ? (
          <button
            type="button"
            onClick={handleEdit}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
          >
            Edit Settings
          </button>
        ) : (
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:w-auto"
            >
              <CheckIcon className="h-4 w-4 mr-1.5" />
              Save
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
            >
              <XMarkIcon className="h-4 w-4 mr-1.5" />
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings; 