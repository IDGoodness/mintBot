import React, { useState, useEffect } from 'react';
import { MonitoredContract } from '../services/ContractMonitorService';
import { estimateContractDeploymentTime } from '../utils/contractIntegration';
import nftFallback from '../assets/nft5.png';

interface MonitoringCardProps {
  contract: MonitoredContract;
  onUnmonitor: (address: string) => void;
}

const MonitoringCard: React.FC<MonitoringCardProps> = ({ contract, onUnmonitor }) => {
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('Calculating...');
  const [progress, setProgress] = useState(0);

  // Format the time remaining in a human-readable format
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return 'Imminent';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `~${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `~${minutes}m`;
    } else {
      return 'Less than a minute';
    }
  };

  // Get estimated time on mount
  useEffect(() => {
    const getEstimate = async () => {
      try {
        const estimate = await estimateContractDeploymentTime(contract.contractAddress);
        setEstimatedTime(estimate);
        
        if (estimate === null && contract.status !== 'error') {
          setTimeRemaining('Unknown');
        }
      } catch (error) {
        console.error('Error getting deployment estimate:', error);
        setTimeRemaining('Unavailable');
      }
    };
    
    getEstimate();
  }, [contract.contractAddress, contract.status]);

  // Update the countdown timer
  useEffect(() => {
    // Don't proceed if estimatedTime is null or contract has error status
    if (estimatedTime === null || contract.status === 'error') return;
    
    const startTime = Date.now() / 1000;
    const endTime = startTime + estimatedTime;
    
    const intervalId = setInterval(() => {
      const now = Date.now() / 1000;
      const remaining = Math.max(0, endTime - now);
      const elapsed = now - startTime;
      const totalDuration = endTime - startTime;
      
      // Calculate progress percentage (0-100)
      const progressPercent = Math.min(100, (elapsed / totalDuration) * 100);
      
      setTimeRemaining(formatTimeRemaining(remaining));
      setProgress(progressPercent);
      
      if (remaining <= 0) {
        clearInterval(intervalId);
        setTimeRemaining('Imminent');
        setProgress(100);
      }
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [estimatedTime, contract.status]);

  // Format address for display
  const shortenAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden border border-blue-900/50">
      <div className="h-32 bg-gradient-to-r from-blue-900 to-purple-900 relative overflow-hidden">
        <img 
          src={nftFallback} 
          alt="NFT" 
          className="w-full h-full object-cover opacity-50 mix-blend-overlay"
        />
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-white font-bold text-xl">{contract.name}</p>
            <p className="text-blue-300 text-sm">{shortenAddress(contract.contractAddress)}</p>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        {contract.status === 'error' ? (
          <div className="mb-4 p-3 bg-red-500/20 rounded-lg">
            <p className="text-red-400 text-center font-medium">
              Error: Contract not deployed at this address
            </p>
            <p className="text-gray-400 text-xs text-center mt-1">
              Please verify the contract address and try again
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-300 text-sm">Deployment Estimate:</span>
              <span className="text-white font-mono">{timeRemaining}</span>
            </div>
            
            {/* Progress bar */}
            <div className="h-2 w-full bg-gray-700 rounded-full mb-4">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </>
        )}
        
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-300 text-sm">Status:</span>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-900 text-blue-200">
            {contract.status === 'pending' ? (
              <>
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-1 animate-pulse"></span>
                Monitoring
              </>
            ) : contract.status === 'deployed' ? (
              <>
                <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                Deployed
              </>
            ) : (
              <>
                <span className="w-2 h-2 bg-red-400 rounded-full mr-1"></span>
                Error
              </>
            )}
          </span>
        </div>
        
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-300 text-sm">Last Checked:</span>
          <span className="text-gray-200 text-xs">
            {new Date(contract.lastChecked).toLocaleTimeString()}
          </span>
        </div>
        
        <button
          onClick={() => onUnmonitor(contract.contractAddress)}
          className="w-full py-2 px-4 bg-red-600/70 hover:bg-red-700 text-white rounded transition-colors duration-200"
        >
          Stop Monitoring
        </button>
      </div>
    </div>
  );
};

export default MonitoringCard; 