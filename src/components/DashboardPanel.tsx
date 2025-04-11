// DashboardPanel.tsx
import React, { useState, useEffect } from 'react';

interface DashboardPanelProps {
  status: string;
  contractAddress: string;
}

const DashboardPanel: React.FC<DashboardPanelProps> = ({ status, contractAddress }) => {
  // Local state for the contract address and gas fee slider
  const [address, setAddress] = useState(contractAddress);
  const [gasFee, setGasFee] = useState(0);

  // Sync local state if the parent prop changes
  useEffect(() => {
    setAddress(contractAddress);
  }, [contractAddress]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#1E2761] via-[#408EC6] to-[#7A2048] text-white p-6">
      {/* Title */}
      <h1 className="text-5xl font-bold mb-6">mintBot</h1>

      {/* Main Panel */}
      <div className="w-full max-w-4xl p-6 bg-gray-900 rounded-lg border border-gray-700">
        <h2 className="text-2xl font-semibold mb-4">Dashboard Panel</h2>

        {/* Contract Address Input */}
        <input
          type="text"
          className="font-mono text-sm bg-gray-800 p-2 rounded w-full mb-4 focus:outline-none focus:ring-2 focus:ring-blue-600 text-gray-200"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter smart contract address"
        />

        {/* Gas Fee Slider */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Preferred Gas Fee Range (0% - 100%)
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={gasFee}
            onChange={(e) => setGasFee(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0% Base Fee</span>
            <span>100% Max Sniping Fee</span>
          </div>
          <div className="mt-2 text-center text-sm text-gray-200">
            Selected: {gasFee}%
          </div>
        </div>

        {/* Confirm Button */}
        <button className="bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 transition w-full">
          Confirm &amp; Proceed
        </button>

        {/* Status Message */}
        <div className="mt-4 text-sm text-blue-400">
          Status: {status}
        </div>
      </div>
    </div>
  );
};

export default DashboardPanel;
