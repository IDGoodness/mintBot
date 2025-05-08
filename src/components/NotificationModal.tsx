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
  // Auto-close for loading modals
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    // If this is a loading modal, set a max timeout so it doesn't get stuck
    if (isOpen && type === 'loading') {
      timeoutId = setTimeout(() => {
        onClose();
      }, 30000); // 30 seconds max for loading modals
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isOpen, type, onClose]);

  // Don't render anything if not open
  if (!isOpen) return null;

  const getIconAndColor = () => {
    switch (type) {
      case 'success':
        return {
          bgColor: 'bg-green-100',
          titleColor: 'text-green-800',
          msgColor: 'text-green-700',
          icon: (
            <svg className="w-10 h-10 text-green-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )
        };
      case 'error':
        return {
          bgColor: 'bg-red-100',
          titleColor: 'text-red-800',
          msgColor: 'text-red-700',
          icon: (
            <svg className="w-10 h-10 text-red-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )
        };
      case 'loading':
        return {
          bgColor: 'bg-blue-100',
          titleColor: 'text-blue-800',
          msgColor: 'text-blue-700',
          icon: (
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          )
        };
      default:
        return {
          bgColor: 'bg-blue-100',
          titleColor: 'text-blue-800',
          msgColor: 'text-blue-700',
          icon: (
            <svg className="w-10 h-10 text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
            </svg>
          )
        };
    }
  };

  const { bgColor, titleColor, msgColor, icon } = getIconAndColor();

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60"
      onClick={(e) => {
        // Only allow closing by backdrop click for non-loading modals
        if (e.target === e.currentTarget && type !== 'loading') {
          onClose();
        }
      }}
    >
      <div 
        className={`w-full max-w-lg p-6 mx-4 rounded-lg shadow-lg ${bgColor}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center">
          <div className="mb-4">
            {icon}
          </div>
          <h3 className={`text-xl font-bold mb-2 ${titleColor}`}>{title}</h3>
          <p className={`text-center ${msgColor} mb-4`}>{message}</p>
          
          {type !== 'loading' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="px-5 py-2 mt-2 font-medium text-white bg-gray-800 rounded-md hover:bg-gray-900 focus:outline-none"
            >
              Close
            </button>
          )}
          
          {type === 'loading' && (
            <p className="mt-2 text-xs text-blue-600">
              Please wait...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationModal; 