import { forwardRef, useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const Input = forwardRef(
  (
    {
      label,
      error,
      helperText,
      icon: Icon,
      type = 'text',
      className = '',
      inputClassName = '',
      labelClassName = '',
      required = false,
      disabled = false,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);

    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;

    const baseInputClasses = `
      block w-full rounded-lg border bg-white px-4 py-2.5
      text-gray-900 placeholder-gray-400
      transition-colors duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-0
      disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500
    `;

    const inputStateClasses = error
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500';

    const iconPadding = Icon ? 'pl-10' : '';
    const passwordPadding = isPassword ? 'pr-10' : '';

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
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon className={`h-5 w-5 ${error ? 'text-red-400' : 'text-gray-400'}`} />
            </div>
          )}

          <input
            ref={ref}
            type={inputType}
            disabled={disabled}
            className={`
              ${baseInputClasses}
              ${inputStateClasses}
              ${iconPadding}
              ${passwordPadding}
              ${inputClassName}
            `}
            {...props}
          />

          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              ) : (
                <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          )}
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

Input.displayName = 'Input';

// Textarea component
const Textarea = forwardRef(
  (
    {
      label,
      error,
      helperText,
      className = '',
      inputClassName = '',
      labelClassName = '',
      required = false,
      disabled = false,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const baseTextareaClasses = `
      block w-full rounded-lg border bg-white px-4 py-2.5
      text-gray-900 placeholder-gray-400
      transition-colors duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-0
      disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500
      resize-none
    `;

    const textareaStateClasses = error
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

        <textarea
          ref={ref}
          rows={rows}
          disabled={disabled}
          className={`
            ${baseTextareaClasses}
            ${textareaStateClasses}
            ${inputClassName}
          `}
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

Textarea.displayName = 'Textarea';

// Input Group for grouped inputs
const InputGroup = ({ children, className = '' }) => (
  <div className={`flex rounded-lg shadow-sm ${className}`}>
    {children}
  </div>
);

// Addon for input groups
const InputAddon = ({ children, position = 'left', className = '' }) => (
  <span
    className={`
      inline-flex items-center px-3 border border-gray-300 bg-gray-50 text-gray-500 text-sm
      ${position === 'left' ? 'rounded-l-lg border-r-0' : 'rounded-r-lg border-l-0'}
      ${className}
    `}
  >
    {children}
  </span>
);

// Field wrapper for form layout
const Field = ({ children, className = '' }) => (
  <div className={`mb-4 ${className}`}>{children}</div>
);

Input.Textarea = Textarea;
Input.Group = InputGroup;
Input.Addon = InputAddon;
Input.Field = Field;

export default Input;
