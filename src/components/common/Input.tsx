import { ReactNode } from 'react';

interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: ReactNode;
  containerClassName?: string;
}

export function Input({
  label,
  error,
  helperText,
  icon,
  containerClassName,
  className,
  ...props
}: InputProps) {
  return (
    <div className={containerClassName}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          className={`w-full px-4 py-2 ${icon ? 'pl-10' : ''} border ${
            error ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
          } rounded-lg focus:outline-none focus:ring-1 ${
            error ? 'focus:ring-red-500' : 'focus:ring-blue-500'
          } text-gray-900 placeholder-gray-400 transition-colors ${className || ''}`}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
}
