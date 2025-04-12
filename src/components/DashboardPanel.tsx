import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from "../assets/logo-remove.png";

interface DashboardPanelProps {
  status: string;
  contractAddress: string;
  walletAddress: string;
}

const DashboardPanel: React.FC<DashboardPanelProps> = ({ status, contractAddress, walletAddress }) => {
  const [address, setAddress] = useState(contractAddress);
  const [gasFee, setGasFee] = useState(100); // Default to 100%
  const baseGasFee = 0.01; // Static base gas fee (100% is 0.01 ETH)
  const adjustedGasFee = (baseGasFee * gasFee) / 100; // Adjusted gas fee based on slider percentage
  const navigate = useNavigate();

  useEffect(() => {
    setAddress(contractAddress);
  }, [contractAddress]);

  const handleConfirm = () => {
    navigate('/confirmation', {
      state: { gasFeePercentage: gasFee, ethCost: adjustedGasFee },
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#1E2761] via-[#408EC6] to-[#7A2048] text-white p-6">
      {/* Title */}
      <div className="flex items-center justify-center mb-4">
        <img src={logo} alt="Logo" className="w-28" />
        <h1 className="text-4xl font-bold">MintworX</h1>
      </div>

      {/* Main Panel */}
      <div className="w-full max-w-4xl p-6 bg-[#f5f5f5] rounded-3xl shadow-xl neumorphism backdrop-blur-md">
        {/* Wallet address display */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Connected Wallet</h3>
          <p className="text-sm text-gray-600">{walletAddress}</p>
        </div>

        {/* CA Input */}
        <input
          type="text"
          className="font-mono text-sm bg-[#e0e0e0] p-4 rounded-lg w-full mb-4 focus:outline-none focus:ring-2 focus:ring-blue-600 text-gray-800 neumorphism"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter smart contract address"
        />

        {/* max gas fee display */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Max Gas Fee (100%)</h3>
          <p>{baseGasFee} ETH</p>
        </div>

        {/* gas fee slider */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Gas Fee Range (0% - 100%)</label>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={gasFee}
            onChange={(e) => setGasFee(Number(e.target.value))}
            className="w-full h-2 bg-[#d0d0d0] rounded-lg appearance-none cursor-pointer neumorphism"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0% Base Fee</span>
            <span>100% Max Sniping Fee</span>
          </div>
          <div className="mt-2 text-center text-sm text-gray-700">
            Selected: {gasFee}% = {adjustedGasFee.toFixed(6)} ETH
          </div>
        </div>

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          className="bg-[#6c63ff] text-white py-2 px-4 rounded-xl hover:bg-[#5a52e5] focus:ring-4 focus:ring-[#6c63ff] transition w-full neumorphism"
        >
          Confirm & Proceed
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