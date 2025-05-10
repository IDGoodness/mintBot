import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export const useWallet = () => {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            setAddress(accounts[0].address);
            setIsConnected(true);
            setError(null);
          }
        } catch (error) {
          console.error('Error checking wallet connection:', error);
          setError('Failed to check wallet connection');
        }
      }
    };

    checkConnection();

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          setIsConnected(true);
          setError(null);
        } else {
          setAddress(null);
          setIsConnected(false);
        }
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => {});
      }
    };
  }, []);

  const connect = async () => {
    if (!window.ethereum) {
      setError('Please install MetaMask to use this feature');
      throw new Error('Please install MetaMask to use this feature');
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        setIsConnected(true);
        setError(null);
      }
    } catch (error: any) {
      // Handle user rejection
      if (error.code === 4001) {
        setError('Please connect your wallet to continue');
      } else {
        setError('Failed to connect wallet');
      }
      console.error('Error connecting wallet:', error);
      throw error;
    }
  };

  return {
    address,
    isConnected,
    error,
    connect
  };
}; 