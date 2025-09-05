import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface BaseFormFieldProps {
  label: string;
  id: string;
  error?: string;
  required?: boolean;
  className?: string;
  helpText?: string;
}

interface TextInputProps extends BaseFormFieldProps {
  type: 'text' | 'email' | 'number';
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  min?: number;
  max?: number;
  disabled?: boolean;
}

interface PasswordInputProps extends BaseFormFieldProps {
  type: 'password';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  showToggle?: boolean;
  disabled?: boolean;
}

interface TextareaProps extends BaseFormFieldProps {
  type: 'textarea';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}

interface SelectProps extends BaseFormFieldProps {
  type: 'select';
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}

type FormFieldProps = TextInputProps | PasswordInputProps | TextareaProps | SelectProps;

export function FormField(props: FormFieldProps) {
  const [showPassword, setShowPassword] = React.useState(false);

  const baseInputClasses = `w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200 ${
    props.error ? 'border-red-300 focus:ring-red-500' : ''
  } ${props.disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`;

  const renderInput = () => {
    switch (props.type) {
      case 'password':
        return (
          <div className="relative">
            <input
              id={props.id}
              type={showPassword ? 'text' : 'password'}
              value={props.value}
              onChange={(e) => props.onChange(e.target.value)}
              placeholder={props.placeholder}
              autoComplete={props.autoComplete}
              disabled={props.disabled}
              className={`${baseInputClasses} ${props.showToggle !== false ? 'pr-10' : ''}`}
            />
            {props.showToggle !== false && (
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
                disabled={props.disabled}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            )}
          </div>
        );

      case 'textarea':
        return (
          <textarea
            id={props.id}
            value={props.value}
            onChange={(e) => props.onChange(e.target.value)}
            placeholder={props.placeholder}
            rows={props.rows || 3}
            disabled={props.disabled}
            className={baseInputClasses}
          />
        );

      case 'select':
        return (
          <select
            id={props.id}
            value={props.value}
            onChange={(e) => props.onChange(e.target.value)}
            disabled={props.disabled}
            className={baseInputClasses}
          >
            {props.placeholder && (
              <option value="">{props.placeholder}</option>
            )}
            {props.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'number':
        return (
          <input
            id={props.id}
            type="number"
            value={props.value}
            onChange={(e) => props.onChange(e.target.value)}
            placeholder={props.placeholder}
            autoComplete={props.autoComplete}
            min={props.min}
            max={props.max}
            disabled={props.disabled}
            className={baseInputClasses}
          />
        );

      default:
        return (
          <input
            id={props.id}
            type={props.type}
            value={props.value}
            onChange={(e) => props.onChange(e.target.value)}
            placeholder={props.placeholder}
            autoComplete={props.autoComplete}
            disabled={props.disabled}
            className={baseInputClasses}
          />
        );
    }
  };

  return (
    <div className={props.className}>
      <label htmlFor={props.id} className="block text-sm font-medium text-gray-700 mb-2">
        {props.label}
        {props.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {renderInput()}
      {props.helpText && (
        <p className="mt-1 text-sm text-gray-500">{props.helpText}</p>
      )}
      {props.error && (
        <p className="mt-1 text-sm text-red-600">{props.error}</p>
      )}
    </div>
  );
}