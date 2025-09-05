import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ 
  size = 'md', 
  text, 
  className = '',
  fullScreen = false 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className={`animate-spin rounded-full border-b-2 border-indigo-600 mx-auto mb-4 ${sizeClasses[size]}`}>
            <Loader2 className={`${sizeClasses[size]} text-transparent`} />
          </div>
          {text && (
            <p className={`text-gray-600 ${textSizeClasses[size]}`}>{text}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="text-center">
        <div className={`animate-spin rounded-full border-b-2 border-indigo-600 mx-auto ${text ? 'mb-4' : ''} ${sizeClasses[size]}`}>
          <Loader2 className={`${sizeClasses[size]} text-transparent`} />
        </div>
        {text && (
          <p className={`text-gray-600 ${textSizeClasses[size]}`}>{text}</p>
        )}
      </div>
    </div>
  );
}

// Inline loading spinner for buttons
interface InlineLoadingProps {
  size?: 'sm' | 'md';
  className?: string;
}

export function InlineLoading({ size = 'sm', className = '' }: InlineLoadingProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5'
  };

  return (
    <div className={`animate-spin rounded-full border-b-2 border-current ${sizeClasses[size]} ${className}`} />
  );
}