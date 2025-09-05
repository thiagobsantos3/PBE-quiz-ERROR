import React from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

interface AlertMessageProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export function AlertMessage({
  type,
  title,
  message,
  dismissible = false,
  onDismiss,
  className = ''
}: AlertMessageProps) {
  const getAlertClasses = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const getIcon = () => {
    const iconClasses = 'h-5 w-5 flex-shrink-0';
    switch (type) {
      case 'success':
        return <CheckCircle className={`${iconClasses} text-green-600`} />;
      case 'error':
        return <AlertCircle className={`${iconClasses} text-red-600`} />;
      case 'warning':
        return <AlertTriangle className={`${iconClasses} text-yellow-600`} />;
      case 'info':
        return <Info className={`${iconClasses} text-blue-600`} />;
      default:
        return <Info className={`${iconClasses} text-gray-600`} />;
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getAlertClasses()} ${className}`}>
      <div className="flex items-start space-x-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className="text-sm font-medium mb-1">{title}</h3>
          )}
          <p className="text-sm">{message}</p>
        </div>
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}