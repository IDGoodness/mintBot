import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { SUPPORTED_NETWORKS } from '../config/networks';

interface Network {
  chainId: number;
  name: string;
  rpcUrls: string[];
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

interface NetworkSwitcherProps {
  onNetworkChange: (network: Network) => void;
  currentNetwork: Network | null;
}

const NetworkSwitcher: React.FC<NetworkSwitcherProps> = ({ onNetworkChange, currentNetwork }) => {
  const [isOpen, setIsOpen] = useState(false);

  const switchNetwork = async (network: Network) => {
    try {
      if (!window.ethereum) {
        throw new Error('Please install MetaMask');
      }

      try {
        // Try to switch to the network
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${network.chainId.toString(16)}` }],
        });
      } catch (switchError: any) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${network.chainId.toString(16)}`,
              chainName: network.name,
              nativeCurrency: network.nativeCurrency,
              rpcUrls: network.rpcUrls,
              blockExplorerUrls: [network.blockExplorer]
            }],
          });
        } else {
          throw switchError;
        }
      }

      onNetworkChange(network);
      setIsOpen(false);
    } catch (error) {
      console.error('Error switching network:', error);
      // You might want to show an error notification here
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all"
      >
        <div className="w-3 h-3 rounded-full bg-green-500"></div>
        <span>{currentNetwork?.name || 'Select Network'}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-full left-0 mt-2 w-48 bg-[#1a1f2e] rounded-lg shadow-xl border border-white/10 overflow-hidden z-50"
        >
          {Object.values(SUPPORTED_NETWORKS).map((network) => (
            <button
              key={network.chainId}
              onClick={() => switchNetwork(network as any)}
              className={`w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-center space-x-2 ${
                currentNetwork?.chainId === network.chainId ? 'bg-white/10' : ''
              }`}
            >
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>{network.name}</span>
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default NetworkSwitcher; 