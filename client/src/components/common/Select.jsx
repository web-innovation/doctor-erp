import { forwardRef } from 'react';
import ReactSelect from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { Controller } from 'react-hook-form';

// Custom styles for react-select to match Tailwind design
const customStyles = {
  control: (provided, state) => ({
    ...provided,
    minHeight: '42px',
    borderRadius: '0.5rem',
    borderColor: state.isFocused
      ? '#3b82f6'
      : state.selectProps.error
      ? '#fca5a5'
      : '#d1d5db',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.2)' : 'none',
    '&:hover': {
      borderColor: state.isFocused ? '#3b82f6' : '#9ca3af',
    },
    backgroundColor: state.isDisabled ? '#f3f4f6' : '#ffffff',
  }),
  valueContainer: (provided) => ({
    ...provided,
    padding: '2px 12px',
  }),
  input: (provided) => ({
    ...provided,
    margin: '0',
    padding: '0',
  }),
  placeholder: (provided) => ({
    ...provided,
    color: '#9ca3af',
  }),
  singleValue: (provided) => ({
    ...provided,
    color: '#111827',
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: '#eff6ff',
    borderRadius: '0.375rem',
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: '#1d4ed8',
    fontSize: '0.875rem',
    padding: '2px 6px',
  }),
  multiValueRemove: (provided) => ({
    ...provided,
    color: '#1d4ed8',
    '&:hover': {
      backgroundColor: '#dbeafe',
      color: '#1e40af',
    },
  }),
  menu: (provided) => ({
    ...provided,
    borderRadius: '0.5rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e5e7eb',
    zIndex: 50,
  }),
  menuList: (provided) => ({
    ...provided,
    padding: '4px',
  }),
  option: (provided, state) => ({
    ...provided,
    borderRadius: '0.375rem',
    padding: '8px 12px',
    backgroundColor: state.isSelected
      ? '#3b82f6'
      : state.isFocused
      ? '#eff6ff'
      : 'transparent',
    color: state.isSelected ? '#ffffff' : '#374151',
    '&:active': {
      backgroundColor: state.isSelected ? '#3b82f6' : '#dbeafe',
    },
  }),
  indicatorSeparator: () => ({
    display: 'none',
  }),
  dropdownIndicator: (provided, state) => ({
    ...provided,
    color: '#6b7280',
    '&:hover': {
      color: '#374151',
    },
    transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : null,
    transition: 'transform 0.2s ease',
  }),
  clearIndicator: (provided) => ({
    ...provided,
    color: '#6b7280',
    '&:hover': {
      color: '#ef4444',
    },
  }),
  loadingIndicator: (provided) => ({
    ...provided,
    color: '#3b82f6',
  }),
};

// Native select for simple use cases
const NativeSelect = forwardRef(
  (
    {
      label,
      error,
      helperText,
      options = [],
      placeholder = 'Select...',
      className = '',
      selectClassName = '',
      labelClassName = '',
      required = false,
      disabled = false,
      ...props
    },
    ref
  ) => {
    const baseSelectClasses = `
      block w-full rounded-lg border bg-white px-4 py-2.5
      text-gray-900 appearance-none
      transition-colors duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-0
      disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500
      bg-no-repeat bg-right
    `;

    const selectStateClasses = error
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500';

    return (
      <div className={className}>
        {label && (
          <label
            className={`block text-sm font-medium text-gray-700 mb-1.5 ${labelClassName}`}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            disabled={disabled}
            className={`
              ${baseSelectClasses}
              ${selectStateClasses}
              ${selectClassName}
            `}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          
          {/* Custom dropdown arrow */}
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3">
            <svg
              className="h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>

        {(error || helperText) && (
          <p
            className={`mt-1.5 text-sm ${
              error ? 'text-red-600' : 'text-gray-500'
            }`}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

NativeSelect.displayName = 'NativeSelect';

// Internal select component (without Controller)
const SelectInternal = forwardRef(
  (
    {
      label,
      error,
      helperText,
      options = [],
      placeholder = 'Select...',
      className = '',
      labelClassName = '',
      required = false,
      disabled = false,
      isMulti = false,
      isSearchable = true,
      isClearable = true,
      isLoading = false,
      creatable = false,
      onChange,
      value,
      ...props
    },
    ref
  ) => {
    const SelectComponent = creatable ? CreatableSelect : ReactSelect;

    // Convert value to react-select format if needed
    const getValue = () => {
      if (!value) return isMulti ? [] : null;
      
      if (isMulti) {
        if (Array.isArray(value)) {
          return value.map((v) =>
            typeof v === 'object' && v !== null ? v : options.find((opt) => opt.value === v)
          ).filter(Boolean);
        }
        return [];
      }
      
      // If it's already a react-select option object, return as is
      if (typeof value === 'object' && value !== null && 'value' in value && 'label' in value) {
        return value;
      }
      // Find option by value
      return options.find((opt) => opt.value === value) || null;
    };

    // Handle change to provide the full option object
    const handleChange = (selected) => {
      if (!onChange) return;

      if (isMulti) {
        onChange(selected || []);
      } else {
        onChange(selected || null);
      }
    };

    return (
      <div className={className}>
        {label && (
          <label
            className={`block text-sm font-medium text-gray-700 mb-1.5 ${labelClassName}`}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <SelectComponent
          ref={ref}
          options={options}
          placeholder={placeholder}
          isDisabled={disabled}
          isMulti={isMulti}
          isSearchable={isSearchable}
          isClearable={isClearable}
          isLoading={isLoading}
          value={getValue()}
          onChange={handleChange}
          styles={customStyles}
          error={error}
          classNamePrefix="select"
          {...props}
        />

        {(error || helperText) && (
          <p
            className={`mt-1.5 text-sm ${
              error ? 'text-red-600' : 'text-gray-500'
            }`}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

SelectInternal.displayName = 'SelectInternal';

// Main Select component with optional react-hook-form Controller support
const Select = forwardRef(
  (
    {
      control,
      name,
      rules,
      ...props
    },
    ref
  ) => {
    // If control is provided, wrap in Controller for react-hook-form
    if (control && name) {
      return (
        <Controller
          name={name}
          control={control}
          rules={rules}
          render={({ field: { onChange, value, ref: fieldRef }, fieldState: { error } }) => (
            <SelectInternal
              {...props}
              ref={fieldRef}
              value={value}
              onChange={onChange}
              error={props.error || error?.message}
            />
          )}
        />
      );
    }

    // Otherwise, render without Controller
    return <SelectInternal ref={ref} {...props} />;
  }
);

Select.displayName = 'Select';

// Export both components
Select.Native = NativeSelect;

export default Select;
