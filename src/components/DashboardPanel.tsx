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
  const [gasFee, setGasFee] = useState(100);
  const baseGasFee = 0.01;
  const adjustedGasFee = (baseGasFee * gasFee) / 100;
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
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-[#0f172a] overflow-hidden text-white p-6">
      {/* Glowing background orbs */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-100px] left-[-100px] w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
        <div className="absolute bottom-[-100px] right-[-100px] w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-2xl opacity-40 animate-pulse delay-200" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-4xl p-8 bg-white/10 text-white rounded-3xl shadow-2xl backdrop-blur-md border border-white/20">
        {/* Logo and Title */}
        <div className="flex flex-col items-center justify-center mb-6">
          <img src={logo} alt="Logo" className="w-24 mb-2" />
          <h1 className="text-4xl font-extrabold tracking-wide">MintworX</h1>
        </div>

        {/* Wallet Info */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white/80">Connected Wallet</h3>
          <p className="text-sm text-white/60">{walletAddress}</p>
        </div>

        {/* Contract Address Input */}
        <input
          type="text"
          className="text-sm font-mono bg-white/20 text-white p-4 rounded-xl w-full mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-white/60"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter smart contract address"
        />

        {/* Gas Fee Details */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white/80">Max Gas Fee (100%)</h3>
          <p className="text-3xl font-bold text-white text-center">{baseGasFee} ETH</p>
        </div>

        {/* Slider */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white/70 mb-1">
            Preferred Gas Fee Range (0% - 100%)
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={gasFee}
            onChange={(e) => setGasFee(Number(e.target.value))}
            className="w-full h-2 bg-white/30 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-white/60 mt-1">
            <span>0% Base Fee</span>
            <span>100% Max Sniping Fee</span>
          </div>
          <div className="mt-2 text-center text-white/80 text-sm">
            Selected: <span className="font-bold">{gasFee}%</span> = {adjustedGasFee.toFixed(6)} ETH
          </div>
        </div>

        {/* Confirm Button */}
        <button
          onClick={handleConfirm}
          className="w-full py-3 px-4 rounded-full text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-xl text-lg font-semibold"
        >
          Confirm & Proceed
        </button>

        {/* Status */}
        <div className="mt-4 text-sm text-blue-400 text-center">
          Status: {status}
        </div>
      </div>
    </div>
  );
};

export default DashboardPanel;
