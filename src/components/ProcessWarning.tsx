import React from 'react';
import { motion } from 'framer-motion';

interface ProcessWarningProps {
  isVisible: boolean;
}

const ProcessWarning: React.FC<ProcessWarningProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className="fixed top-0 left-0 right-0 bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-4 shadow-lg z-50"
      role="alert"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center space-x-4">
        <div className="flex-shrink-0">
          <svg className="h-8 w-8 animate-pulse" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex-1 text-center">
          <p className="text-lg font-bold tracking-wide">⚠️ Please Do Not Close This Page</p>
          <p className="text-sm opacity-90">Your transaction is in progress. Closing or refreshing may result in lost progress.</p>
        </div>
        <div className="flex-shrink-0">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProcessWarning; 