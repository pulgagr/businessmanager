import React from 'react';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
}

interface InputFieldProps extends FormFieldProps {
  id: string;
  name: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}

interface SelectFieldProps extends FormFieldProps {
  id: string;
  name: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string | number; label: string }[];
  disabled?: boolean;
  placeholder?: string;
}

interface TextAreaFieldProps extends FormFieldProps {
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  placeholder?: string;
}

interface CurrencyFieldProps extends Omit<InputFieldProps, 'type'> {
  currency?: string;
  onPercentageSelect?: (percentage: number) => void;
  selectedPercentage?: number | null;
  cost?: number;
}

interface StatusGroupProps extends Omit<FormFieldProps, 'label'> {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  required,
  error,
  className = '',
  placeholder,
  ...props
}) => (
  <div className={className}>
    <label htmlFor={props.id} className="block text-base font-medium text-gray-900 mb-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      {...props}
      placeholder={placeholder}
      className="block w-full rounded-xl border border-gray-300 bg-white py-3 px-4 text-gray-900 shadow-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors duration-200"
    />
    {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
  </div>
);

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  required,
  error,
  options,
  className = '',
  placeholder = 'Select an option',
  ...props
}) => (
  <div className={className}>
    <label htmlFor={props.id} className="block text-base font-medium text-gray-900 mb-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <select
      {...props}
      className="block w-full rounded-xl border border-gray-300 bg-white py-3 px-4 text-gray-900 shadow-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors duration-200"
    >
      <option value="">{placeholder}</option>
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
  </div>
);

export const TextAreaField: React.FC<TextAreaFieldProps> = ({
  label,
  required,
  error,
  className = '',
  rows = 4,
  placeholder,
  ...props
}) => (
  <div className={className}>
    <label htmlFor={props.id} className="block text-base font-medium text-gray-900 mb-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <textarea
      {...props}
      rows={rows}
      placeholder={placeholder}
      className="block w-full rounded-xl border border-gray-300 bg-white py-3 px-4 text-gray-900 shadow-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors duration-200"
    />
    {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
  </div>
);

export const CurrencyField: React.FC<CurrencyFieldProps> = ({
  label,
  required,
  error,
  currency = 'USD',
  className = '',
  onPercentageSelect,
  selectedPercentage,
  cost,
  ...props
}) => {
  const calculateActualPercentage = () => {
    if (!cost || !props.value || cost === 0) return null;
    const currentValue = typeof props.value === 'string' ? parseFloat(props.value) : props.value;
    if (isNaN(currentValue)) return null;
    
    const percentage = ((currentValue / cost - 1) * 100).toFixed(0);
    return parseInt(percentage);
  };

  const actualPercentage = calculateActualPercentage();
  const availablePercentages = [10, 20, 30, 35, 40];
  
  const displayPercentages = [...availablePercentages];
  if (actualPercentage !== null && !availablePercentages.includes(actualPercentage)) {
    displayPercentages[displayPercentages.length - 1] = actualPercentage;
  }

  return (
    <div className={className}>
      <label htmlFor={props.id} className="block text-base font-medium text-gray-900 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <span className="text-gray-500 sm:text-sm">$</span>
        </div>
        <input
          {...props}
          type="text"
          inputMode="decimal"
          className="block w-full rounded-xl border border-gray-300 bg-white py-3 pl-7 pr-12 text-gray-900 shadow-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors duration-200"
        />
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <span className="text-gray-500 sm:text-sm">{currency}</span>
        </div>
      </div>
      {onPercentageSelect && (
        <div className="mt-3">
          <div className="bg-gray-100 rounded-xl p-1 flex">
            {displayPercentages.map((percentage) => (
              <button
                key={percentage}
                type="button"
                onClick={() => onPercentageSelect(percentage)}
                className={`
                  flex-1 py-2 px-3 text-sm font-medium rounded-lg whitespace-nowrap
                  ${(selectedPercentage === percentage || actualPercentage === percentage)
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                  }
                `}
              >
                {percentage}%
              </button>
            ))}
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export const StatusGroup: React.FC<StatusGroupProps> = ({
  value,
  onChange,
  options,
  className = '',
}) => (
  <div className={`${className} space-y-2`}>
    <div className="bg-gray-100 rounded-xl p-1 flex">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`
            flex-1 py-2 px-3 text-sm font-medium rounded-lg whitespace-nowrap
            ${value === option.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
            }
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  </div>
); 