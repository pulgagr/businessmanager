import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { TrashIcon, CheckIcon } from '@heroicons/react/24/outline';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  type?: 'delete' | 'save';
  confirmLabel?: string;
  cancelLabel?: string;
}

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  type = 'save',
  confirmLabel = type === 'delete' ? 'Delete' : 'Confirm & Save',
  cancelLabel = 'Cancel'
}: ConfirmationModalProps) => {
  const isDelete = type === 'delete';

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-20" onClose={onClose}>
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

        <div className="fixed inset-0 z-20 overflow-y-auto">
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
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="text-center">
                  <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
                    isDelete ? 'bg-red-100' : 'bg-blue-100'
                  }`}>
                    {isDelete ? (
                      <TrashIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                    ) : (
                      <CheckIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
                    )}
                  </div>
                  <Dialog.Title as="h3" className="mt-4 text-lg font-medium text-gray-900">
                    {title}
                  </Dialog.Title>
                  <Dialog.Description className="mt-2 text-sm text-gray-500">
                    {description}
                  </Dialog.Description>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    {cancelLabel}
                  </button>
                  <button
                    type="button"
                    onClick={onConfirm}
                    className={`rounded-xl border border-transparent px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      isDelete 
                        ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                        : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                    }`}
                  >
                    {confirmLabel}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default ConfirmationModal; 