import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
  themeClasses?: {
    background?: string;
    card?: string;
    text?: string;
    textSecondary?: string;
    border?: string;
  };
  isFullScreen?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'md',
  themeClasses,
  isFullScreen = false
}: ModalProps) {
  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl'
  };

  // Use theme classes if provided (for quiz modals), otherwise use default styling
  // Ensure modal has a solid background even in dark mode
  const modalBg = themeClasses?.card === 'bg-transparent' 
    ? (themeClasses?.text?.includes('text-white') ? 'bg-gray-900' : 'bg-white')
    : (themeClasses?.card || 'bg-white');
  const titleColor = themeClasses?.text || 'text-gray-900';
  const borderColor = themeClasses?.border || 'border-gray-200';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${modalBg} rounded-xl p-6 w-full ${maxWidthClasses[maxWidth]} max-h-[90vh] overflow-y-auto ${isFullScreen ? '' : 'border ' + borderColor}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-lg font-semibold ${titleColor}`}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className={`${themeClasses?.textSecondary || 'text-gray-400'} hover:${themeClasses?.text || 'text-gray-600'} transition-colors duration-200`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="mb-6">
          {children}
        </div>
        
        {footer && (
          <div className="flex items-center justify-end space-x-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}