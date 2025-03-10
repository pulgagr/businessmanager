import { Fragment, ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title: string;
  description?: string;
  submitLabel?: string;
  cancelLabel?: string;
  children: ReactNode;
  showCloseButton?: boolean;
  showDeleteButton?: boolean;
  onDelete?: () => void;
  deleteLabel?: string;
}

const FormModal = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  description,
  submitLabel = 'Save Changes',
  cancelLabel = 'Cancel',
  children,
  showCloseButton = true,
  showDeleteButton = false,
  onDelete,
  deleteLabel = 'Delete'
}: FormModalProps) => {
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
              <Dialog.Panel className="relative transform overflow-hidden rounded-xl bg-white px-8 pb-8 pt-6 text-left shadow-xl transition-all w-full max-w-2xl">
                {/* Close button */}
                {showCloseButton && (
                  <div className="absolute right-0 top-0 pr-4 pt-4">
                    <button
                      type="button"
                      className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                      onClick={onClose}
                    >
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>
                )}

                {/* Modal Header */}
                <div className="mb-8">
                  <Dialog.Title as="h2" className="text-2xl font-semibold text-gray-900">
                    {title}
                  </Dialog.Title>
                  {description && (
                    <Dialog.Description className="mt-2 text-base text-gray-600">
                      {description}
                    </Dialog.Description>
                  )}
                </div>

                {/* Form Content */}
                <div className="space-y-8">
                  {children}
                </div>

                {/* Form Actions */}
                <div className="mt-8 flex justify-between">
                  {showDeleteButton && (
                    <button
                      type="button"
                      onClick={onDelete}
                      className="rounded-xl border border-red-300 bg-white px-6 py-3 text-base font-medium text-red-700 shadow-sm hover:bg-red-50"
                    >
                      {deleteLabel}
                    </button>
                  )}
                  <div className={`flex space-x-3 ${!showDeleteButton && 'ml-auto'}`}>
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                    >
                      {cancelLabel}
                    </button>
                    <button
                      type="button"
                      onClick={onSubmit}
                      className="rounded-xl border border-transparent bg-blue-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-blue-700"
                    >
                      {submitLabel}
                    </button>
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

export default FormModal; 