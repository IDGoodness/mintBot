import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { MintifyService, UpcomingNFT } from '../services/MintifyService';
import contractMonitorService from '../services/ContractMonitorService';
import { setupSniperTarget, isTargetContractDeployed } from '../utils/contractIntegration';
import fallbackImg from '../assets/nft3.png';

interface UpcomingDropsProps {
  onSelectDrop: (drop: UpcomingNFT) => void;
  walletAddress: string | null;
  onSnipe?: (drop: UpcomingNFT) => void; // Optional prop for direct sniping
}

export const UpcomingDrops: React.FC<UpcomingDropsProps> = ({ 
  onSelectDrop,
  walletAddress,
  onSnipe 
}) => {
  const [upcomingDrops, setUpcomingDrops] = useState<UpcomingNFT[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [monitoredContracts, setMonitoredContracts] = useState<Set<string>>(new Set());
  
  const mintifyService = new MintifyService();
  
  useEffect(() => {
    const fetchDrops = async () => {
      setLoading(true);
      try {
        const drops = await mintifyService.getUpcomingDrops();
        setUpcomingDrops(drops);
        
        // Update which contracts are already being monitored
        const monitored = new Set<string>();
        contractMonitorService.getMonitoredContracts().forEach(contract => {
          monitored.add(contract.contractAddress);
        });
        setMonitoredContracts(monitored);
        
        setError(null);
      } catch (err) {
        setError('Failed to fetch upcoming drops. Please try again later.');
        console.error('Error fetching drops:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDrops();
    
    // Check for contract deployment every 30 seconds
    const intervalId = setInterval(() => {
      contractMonitorService.forceCheckAll();
      
      // Update monitored contracts
      const monitored = new Set<string>();
      contractMonitorService.getMonitoredContracts().forEach(contract => {
        monitored.add(contract.contractAddress);
      });
      setMonitoredContracts(monitored);
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  const handleMonitor = async (drop: UpcomingNFT) => {
    if (!walletAddress) {
      alert('Please connect your wallet first');
      return;
    }
    
    try {
      setLoading(true);
      
      // First, check if the contract is already deployed
      if (!window.ethereum) {
        throw new Error('No Ethereum provider detected');
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const deployed = await isTargetContractDeployed(provider, drop.contractAddress);
      
      if (deployed) {
        // If deployed, set up the NFT sniper directly
        const result = await setupSniperTarget(
          provider,
          drop.contractAddress,
          drop.name,
          100, // Default max gas price (Gwei)
          drop.mintPrice,
          drop.launchTime
        );
        
        alert(`${drop.name} is already deployed! Setting up the sniper directly.`);
        console.log('Sniper setup result:', result);
      } else {
        // If not deployed, set up monitoring
        const success = await contractMonitorService.monitorContract(
          drop.contractAddress,
          drop.name,
          drop.mintPrice,
          drop.launchTime
        );
        
        if (success) {
          // Also register with Mintify for redundancy
          await mintifyService.monitorContract(drop.contractAddress);
          
          // Update the local state to show this contract is being monitored
          setMonitoredContracts(prev => new Set([...prev, drop.contractAddress]));
          
          alert(`Now monitoring ${drop.name}! You will be notified when it launches.`);
        } else {
          alert('Failed to monitor this drop. Please try again.');
        }
      }
    } catch (err) {
      console.error('Error monitoring drop:', err);
      alert(`An error occurred: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  const formatLaunchTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };
  
  const formatPrice = (price: string) => {
    const ethPrice = parseFloat(price);
    return `${ethPrice.toFixed(3)} ETH`;
  };
  
  const isBeingMonitored = (contractAddress: string) => {
    return monitoredContracts.has(contractAddress);
  };
  
  if (loading) {
    return <div className="p-4 text-center">Loading upcoming drops...</div>;
  }
  
  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }
  
  if (upcomingDrops.length === 0) {
    return <div className="p-4 text-center">No upcoming drops found.</div>;
  }
  
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Upcoming NFT Drops</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {upcomingDrops.map((drop) => (
          <div 
            key={drop.id}
            className="border border-gray-200 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
          >
            <div className="relative h-48 bg-gray-100">
              <img 
                src={drop.imageUrl || fallbackImg} 
                alt={drop.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = fallbackImg;
                }}
              />
              <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                {drop.launchStatus}
              </div>
              {isBeingMonitored(drop.contractAddress) && (
                <div className="absolute top-2 left-2 bg-green-600 bg-opacity-90 text-white px-2 py-1 rounded text-xs">
                  Monitoring
                </div>
              )}
            </div>
            
            <div className="p-4">
              <h3 className="font-bold text-lg truncate">{drop.name}</h3>
              <p className="text-gray-600 text-sm mb-2">Launch: {formatLaunchTime(drop.launchTime)}</p>
              <p className="font-medium">Price: {formatPrice(drop.mintPrice)}</p>
              
              <div className="mt-4 flex justify-between">
                <button
                  onClick={() => onSelectDrop(drop)}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Details
                </button>
                
                <div className="flex gap-2">
                  {onSnipe && (
                    <button
                      onClick={() => onSnipe(drop)}
                      className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                      title="Use advanced sniping tools"
                    >
                      🎯 Snipe
                    </button>
                  )}
                
                  <button
                    onClick={() => handleMonitor(drop)}
                    disabled={isBeingMonitored(drop.contractAddress)}
                    className={`px-3 py-1 rounded ${
                      isBeingMonitored(drop.contractAddress) 
                        ? 'bg-gray-400 text-white cursor-not-allowed' 
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {isBeingMonitored(drop.contractAddress) ? 'Monitoring' : 'Monitor'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 