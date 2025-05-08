import React, { useEffect } from 'react';

type NotificationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'loading';
};

const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type
}) => {
  // Add auto-close for loading modals after a timeout
  useEffect(() => {
    // If this is a loading modal, set a max timeout so it doesn't get stuck
    if (isOpen && type === 'loading') {
      const timeout = setTimeout(() => {
        onClose();
      }, 30000); // 30 seconds max for loading modals

      return () => clearTimeout(timeout);
    }
  }, [isOpen, type, onClose]);

  if (!isOpen) return null;

  const getIconAndColor = () => {
    switch (type) {
      case 'success':
        return {
          bgColor: 'bg-green-50',
          borderColor: 'border-green-500',
          titleColor: 'text-green-800',
          msgColor: 'text-green-700',
          icon: (
            <svg className="w-12 h-12 text-green-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )
        };
      case 'error':
        return {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-500',
          titleColor: 'text-red-800',
          msgColor: 'text-red-700',
          icon: (
            <svg className="w-12 h-12 text-red-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )
        };
      case 'loading':
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-500',
          titleColor: 'text-blue-800',
          msgColor: 'text-blue-700',
          icon: (
            <div className="flex justify-center items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )
        };
      default:
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-500',
          titleColor: 'text-blue-800',
          msgColor: 'text-blue-700',
          icon: (
            <svg className="w-12 h-12 text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
            </svg>
          )
        };
    }
  };

  const { bgColor, borderColor, titleColor, msgColor, icon } = getIconAndColor();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className={`max-w-md w-full rounded-lg shadow-lg ${bgColor} border-2 ${borderColor}`}>
        <div className="flex flex-col items-center p-6">
          <div className="mb-4">
            {icon}
          </div>
          <h3 className={`text-lg font-bold mb-2 ${titleColor}`}>{title}</h3>
          <p className={`text-center ${msgColor}`}>{message}</p>
          {type !== 'loading' && (
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
            >
              Close
            </button>
          )}
          {type === 'loading' && (
            <p className="mt-4 text-xs text-blue-600">
              This will automatically close when complete...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationModal; 