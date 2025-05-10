import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface Network {
  chainId: string;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  currency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

const SUPPORTED_NETWORKS: Network[] = [
  {
    chainId: '0x1',
    name: 'Ethereum',
    rpcUrl: 'https://mainnet.infura.io/v3/',
    blockExplorer: 'https://etherscan.io',
    currency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    }
  },
  {
    chainId: '0x89',
    name: 'Polygon',
    rpcUrl: 'https://polygon-rpc.com',
    blockExplorer: 'https://polygonscan.com',
    currency: {
      name: 'Matic',
      symbol: 'MATIC',
      decimals: 18
    }
  },
  {
    chainId: '0x38',
    name: 'BSC',
    rpcUrl: 'https://bsc-dataseed.binance.org',
    blockExplorer: 'https://bscscan.com',
    currency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18
    }
  },
  {
    chainId: '0xA',
    name: 'Optimism',
    rpcUrl: 'https://mainnet.optimism.io',
    blockExplorer: 'https://optimistic.etherscan.io',
    currency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    }
  },
  {
    chainId: '0xA4B1',
    name: 'Arbitrum',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    blockExplorer: 'https://arbiscan.io',
    currency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    }
  }
];

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
          params: [{ chainId: network.chainId }],
        });
      } catch (switchError: any) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: network.chainId,
              chainName: network.name,
              nativeCurrency: network.currency,
              rpcUrls: [network.rpcUrl],
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
          {SUPPORTED_NETWORKS.map((network) => (
            <button
              key={network.chainId}
              onClick={() => switchNetwork(network)}
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