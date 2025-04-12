import React from 'react';
import { useLocation } from 'react-router-dom';

const SuccessPage: React.FC = () => {
  const location = useLocation();
  const { status } = location.state || { status: 'Unknown' };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#1E2761] via-[#408EC6] to-[#7A2048] text-white p-6">
      <div className="w-full max-w-4xl p-6 bg-gray-900 rounded-lg border border-gray-700">
        <h2 className="text-3xl font-semibold mb-4">Transaction {status}</h2>
        <p className="text-lg">Your transaction has been successfully completed!</p>
      </div>
    </div>
  );
};

export default SuccessPage;