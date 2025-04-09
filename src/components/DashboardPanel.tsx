import React from 'react';

interface Props {
  status: string;
  contractAddress: string;
}

const DashboardPanel: React.FC<Props> = ({ status, contractAddress }) => {
  return (
    <div className="mt-8 w-full max-w-xl p-6 bg-gray-900 rounded-lg border border-gray-700">
      <h2 className="text-xl font-bold mb-4">Dashboard Panel</h2>

      {/* Contract Address */}
      <div className="mb-4">
        <p className="text-sm text-gray-400">Contract Address:</p>
        <p className="font-mono text-sm bg-gray-800 p-2 rounded">
          {contractAddress}
        </p>
      </div>

      {/* Description */}
      <textarea
        className="w-full h-24 p-3 bg-gray-800 border border-gray-600 rounded text-sm text-white resize-none"
        value="This is where the contract's description will show."
        readOnly
      />

      {/* Status Message */}
      <div className="mt-4 text-sm text-blue-400">
        Status: {status}
      </div>
    </div>
  );
};

export default DashboardPanel;