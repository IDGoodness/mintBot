import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface NFTSniperStatusProps {
  contractAddress: string;
  walletAddress: string;
  sniperActive: boolean;
  gasFeePercentage: number;
}

const NFTSniperStatus: React.FC<NFTSniperStatusProps> = ({ 
  contractAddress, 
  walletAddress,
  sniperActive,
  gasFeePercentage
}) => {
  const [sniperStatus, setSniperStatus] = useState<string>('Initializing...');
  const [ethBalance, setEthBalance] = useState<string>('0');
  const [isReady, setIsReady] = useState<boolean>(false);
  const [statusColor, setStatusColor] = useState<string>('text-yellow-400');

  useEffect(() => {
    const checkSniperStatus = async () => {
      if (!walletAddress || !contractAddress) {
        setSniperStatus('Waiting for wallet and contract...');
        setStatusColor('text-yellow-400');
        setIsReady(false);
        return;
      }

      if (!window.ethereum) {
        setSniperStatus('Metamask not detected');
        setStatusColor('text-red-500');
        setIsReady(false);
        return;
      }

      try {
        // Get wallet ETH balance
        const provider = new ethers.BrowserProvider(window.ethereum);
        const balance = await provider.getBalance(walletAddress);
        setEthBalance(ethers.formatEther(balance).substring(0, 6));

        // Check if NFT Sniper contracts are loaded
        if (!window.mintContracts) {
          setSniperStatus('Contracts not initialized');
          setStatusColor('text-yellow-400');
          setIsReady(false);
          return;
        }

        // Check if contract is valid by checking its code size
        const codeSize = await provider.getCode(contractAddress);
        if (codeSize === '0x') {
          setSniperStatus('Invalid NFT contract address');
          setStatusColor('text-red-500');
          setIsReady(false);
          return;
        }

        if (sniperActive) {
          setSniperStatus('Sniping active - Watching for mint events');
          setStatusColor('text-green-500');
        } else {
          setSniperStatus('Ready - Waiting for activation');
          setStatusColor('text-blue-400');
        }
        
        setIsReady(true);
      } catch (err) {
        console.error('Error checking sniper status:', err);
        setSniperStatus('Error checking status');
        setStatusColor('text-red-500');
        setIsReady(false);
      }
    };

    // Check status initially and then every 5 seconds
    checkSniperStatus();
    const interval = setInterval(checkSniperStatus, 5000);

    return () => clearInterval(interval);
  }, [walletAddress, contractAddress, sniperActive]);

  return (
    <div className="p-4 border border-gray-700 rounded-lg bg-gray-800/50 backdrop-blur-sm">
      <h3 className="text-lg font-medium text-white mb-2">NFT Sniper Status</h3>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Status:</span>
          <span className={`font-medium ${statusColor}`}>{sniperStatus}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Wallet:</span>
          <span className="font-mono text-white">
            {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Not connected'}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-400">ETH Balance:</span>
          <span className="text-white">{ethBalance} ETH</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Gas Fee:</span>
          <span className="text-white">{gasFeePercentage}%</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Target:</span>
          <span className="font-mono text-xs text-white truncate max-w-[200px]">
            {contractAddress || 'Not set'}
          </span>
        </div>
      </div>
      
      {isReady && (
        <div className="mt-3 bg-green-500/10 border border-green-500/20 rounded p-2">
          <p className="text-center text-green-400 text-sm">
            System ready for minting
          </p>
        </div>
      )}
    </div>
  );
};

export default NFTSniperStatus; 