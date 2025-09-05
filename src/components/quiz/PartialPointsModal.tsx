import React from 'react';
import { Modal } from '../common/Modal';

interface PartialPointsModalProps {
  isOpen: boolean;
  questionPoints: number;
  selectedPoints: number;
  onPointsChange: (points: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
  themeClasses: any;
  isFullScreen: boolean;
}

export function PartialPointsModal({
  isOpen,
  questionPoints,
  selectedPoints,
  onPointsChange,
  onConfirm,
  onCancel,
  themeClasses,
  isFullScreen
}: PartialPointsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Partial Credit"
      themeClasses={themeClasses}
      isFullScreen={isFullScreen}
              footer={
          <>
            <button
              onClick={onCancel}
              className={`flex-1 px-4 py-2 border ${themeClasses.border} ${isFullScreen && window.innerWidth < 640 ? 'text-gray-900' : themeClasses.text} rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200`}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
            >
              Confirm
            </button>
          </>
        }
    >
      <p className={`${themeClasses.textSecondary || 'text-gray-600'} mb-6`}>
        This question is worth {questionPoints} points. How many points did you earn?
      </p>
      
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: questionPoints }, (_, i) => (
          <button
            key={i}
            onClick={() => onPointsChange(i)}
            className={`p-2 rounded-lg border-2 transition-colors duration-200 ${
              selectedPoints === i
                ? 'border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-200'
                : 'border-gray-200 hover:border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray dark:hover:border-gray-500'
            }`}
          >
            {i}
          </button>
        ))}
      </div>
    </Modal>
  );
}