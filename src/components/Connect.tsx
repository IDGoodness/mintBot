/// <reference types="vite/client" />

declare global {
  interface Window {
    ethereum: any; // You can refine this with more specific types if you need
  }
}

import React, { useState } from 'react';
import { ethers } from 'ethers';

interface ConnectProps {
  onConnect: (address: string) => void;
}

const Connect: React.FC<ConnectProps> = ({ onConnect }) => {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string>('');

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('MetaMask not detected');
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const addr = accounts[0];

      setConnected(true);
      setAddress(addr);
      onConnect(addr);
    } catch (error) {
      console.error('Wallet connection failed:', error);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={connectWallet}
        className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-500"
      >
        {connected ? 'Connected' : 'Connect Wallet'}
      </button>

      {connected && (
        <p className="mt-2 text-sm text-green-400">
          Connected: {address.slice(0, 6)}...{address.slice(-4)}
        </p>
      )}
    </div>
  );
};

export default Connect;

