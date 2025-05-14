import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { MintifyService, UpcomingNFT } from '../services/MintifyService';
import { setupSniperTarget, depositToSniper, isContractDeployed, deployNFTSniperIfNeeded, isTargetContractDeployed, NFT_SNIPER_ADDRESS } from '../utils/contractIntegration';
import { getNFTContractInfo } from '../utils/nftDetection';
import contractMonitorService from '../services/ContractMonitorService';
import fallbackImg from '../assets/nft3.png';
import { NFTSniper } from './NFTSniper';

interface DropDetailsProps {
  drop: UpcomingNFT | null;
  onBack: () => void;
  walletAddress: string | null;
}

export const DropDetails: React.FC<DropDetailsProps> = ({ 
  drop, 
  onBack,
  walletAddress
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [contractInfo, setContractInfo] = useState<any>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [maxGasPrice, setMaxGasPrice] = useState<number>(100); // in Gwei
  const [setupStatus, setSetupStatus] = useState<string>('');
  const [contractDeployed, setContractDeployed] = useState<boolean | null>(null);
  const [targetContractDeployed, setTargetContractDeployed] = useState<boolean | null>(null);
  const [isUpcoming, setIsUpcoming] = useState<boolean>(false);
  const [networkInfo, setNetworkInfo] = useState<{ name: string, chainId: string } | null>(null);
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [nftInfo, setNftInfo] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'details' | 'sniper'>('details');
  
  const mintifyService = new MintifyService();
  console.log(contractInfo)
  
  useEffect(() => {
    if (drop) {
      fetchContractInfo();
      checkContractDeployment();
      checkTargetContractDeployment();
      getNetworkInfo();
      checkMonitoringStatus();
      
      // Check if this is an upcoming drop
      const launchTime = drop.launchTime || 0;
      const now = Math.floor(Date.now() / 1000);
      setIsUpcoming(launchTime > now);
    }
    
    // Check for contract deployment every 15 seconds
    const intervalId = setInterval(() => {
      if (drop && (targetContractDeployed === null || targetContractDeployed === false)) {
        checkTargetContractDeployment();
        if (drop.contractAddress && contractMonitorService.isMonitoring(drop.contractAddress)) {
          contractMonitorService.forceCheckAll();
        }
      }
    }, 15000);
    
    return () => clearInterval(intervalId);
  }, [drop]);
  
  const checkMonitoringStatus = () => {
    if (!drop) return;
    setIsMonitoring(contractMonitorService.isMonitoring(drop.contractAddress));
  };
  
  const getNetworkInfo = async () => {
    if (!window.ethereum) return;
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      setNetworkInfo({
        name: network.name,
        chainId: network.chainId.toString()
      });
      
      console.log("Connected to network:", network.name, "Chain ID:", network.chainId.toString());
    } catch (err) {
      console.error('Error getting network info:', err);
    }
  };
  
  const checkContractDeployment = async () => {
    if (!window.ethereum) return;
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const deployed = await isContractDeployed(provider);
      setContractDeployed(deployed);
      console.log("NFTSniper contract deployed:", deployed);
      
      if (!deployed) {
        // Try to get the code at the address to see what's there
        const code = await provider.getCode(NFT_SNIPER_ADDRESS);
        console.log("Code at NFTSniper address:", code);
      }
    } catch (err) {
      console.error('Error checking contract deployment:', err);
      setContractDeployed(false);
    }
  };
  
  const checkTargetContractDeployment = async () => {
    if (!window.ethereum || !drop) return;
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const deployed = await isTargetContractDeployed(provider, drop.contractAddress);
      setTargetContractDeployed(deployed);
      console.log("Target NFT contract deployed:", deployed);
      
      if (deployed) {
        // If now deployed but wasn't before, get the NFT info
        try {
          const info = await getNFTContractInfo(provider, drop.contractAddress);
          setNftInfo(info);
          console.log("NFT Contract Info:", info);
        } catch (error) {
          console.error("Error getting NFT info:", error);
        }
      } else {
        // Try to get the code at the address to see what's there
        const code = await provider.getCode(drop.contractAddress);
        console.log("Code at target NFT address:", code);
      }
    } catch (err) {
      console.error('Error checking target contract deployment:', err);
      setTargetContractDeployed(false);
    }
  };
  
  const fetchContractInfo = async () => {
    if (!drop) return;
    
    setLoading(true);
    try {
      // If the contract isn't deployed yet, we won't be able to get on-chain info
      const provider = new ethers.BrowserProvider(window.ethereum);
      const deployed = await isTargetContractDeployed(provider, drop.contractAddress);
      
      if (deployed) {
        // First try to get info from our own detection tools
        try {
          const info = await getNFTContractInfo(provider, drop.contractAddress);
          if (info) {
            setContractInfo({
              name: info.name || drop.name,
              contractAddress: drop.contractAddress,
              mintPrice: drop.mintPrice,
              launchTime: drop.launchTime,
              status: 'deployed',
              mintFunctions: info.mintFunctions,
              isERC721: info.isERC721
            });
            
            setNftInfo(info);
            return;
          }
        } catch (error) {
          console.warn("Error using on-chain detection, falling back to API:", error);
        }
        
        // Fall back to Mintify API
        const info = await mintifyService.getContractInfo(drop.contractAddress);
        setContractInfo({
          ...info,
          status: 'deployed'
        });
      } else {
        // For upcoming NFTs, we'll just use the info from Mintify
        setContractInfo({
          name: drop.name,
          contractAddress: drop.contractAddress,
          mintPrice: drop.mintPrice,
          launchTime: drop.launchTime,
          status: 'upcoming'
        });
      }
    } catch (err) {
      console.error('Error fetching contract info:', err);
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
  
  const formatTimeUntilLaunch = (timestamp: number) => {
    const now = Math.floor(Date.now() / 1000);
    const secondsUntilLaunch = timestamp - now;
    
    if (secondsUntilLaunch <= 0) {
      return 'Launching soon';
    }
    
    const days = Math.floor(secondsUntilLaunch / 86400);
    const hours = Math.floor((secondsUntilLaunch % 86400) / 3600);
    const minutes = Math.floor((secondsUntilLaunch % 3600) / 60);
    
    return `${days} days, ${hours} hours, ${minutes} minutes`;
  };
  
  const handleSetupSniper = async () => {
    if (!drop || !walletAddress) {
      alert('Please connect your wallet first');
      return;
    }
    
    setSetupStatus('Setting up sniper...');
    setLoading(true);
    
    try {
      // Check network first
      if (!window.ethereum) {
        throw new Error('Ethereum provider not available');
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      console.log("Current network:", network.name, "Chain ID:", network.chainId.toString());
      
      // Check if the NFTSniper contract is deployed and deploy it if needed
      try {
        // This will throw an error if the contract is not deployed
        if (contractDeployed === false) {
          setSetupStatus('NFTSniper contract not deployed. Attempting to deploy...');
          await deployNFTSniperIfNeeded(provider);
          // If we reached here, the contract was deployed successfully
          setContractDeployed(true);
        }
      } catch (error) {
        // Handle deployment error
        console.error('Contract deployment error:', error);
        throw new Error(
          error instanceof Error 
            ? error.message 
            : 'Failed to deploy NFTSniper contract. Please deploy it manually.'
        );
      }
      
      // If target contract isn't deployed yet, set up monitoring
      let setupResult;
      if (targetContractDeployed === false) {
        setSetupStatus('Target NFT contract not deployed yet. Setting up monitoring...');
        
        // Set up monitoring through our service
        const monitoringSuccess = await contractMonitorService.monitorContract(
          drop.contractAddress,
          drop.name,
          drop.mintPrice,
          drop.launchTime,
          15000 // Check every 15 seconds
        );
        
        if (!monitoringSuccess) {
          throw new Error('Failed to set up monitoring for the NFT contract');
        }
        
        setIsMonitoring(true);
        
        // Also monitor through Mintify API for redundancy
        await mintifyService.monitorContract(drop.contractAddress);
        
        // Set up the target in the NFTSniper contract for when it deploys
        setupResult = await setupSniperTarget(
          provider,
          drop.contractAddress,
          drop.name,
          maxGasPrice,
          drop.mintPrice,
          drop.launchTime
        );
        
        if (setupResult && setupResult.status === 'monitoring') {
          setSetupStatus(`Successfully set up monitoring for ${drop.name}. We'll attempt to mint as soon as it launches.`);
        }
      } else {
        // Set up the target immediately since the contract is deployed
        setupResult = await setupSniperTarget(
          provider,
          drop.contractAddress,
          drop.name,
          maxGasPrice,
          drop.mintPrice,
          drop.launchTime
        );
        
        if (setupResult && setupResult.status === 'ready') {
          setSetupStatus(`Target ${drop.name} set up successfully!`);
        }
      }
      
      // 3. Deposit ETH to cover the mint cost plus a buffer
      const mintCostEth = parseFloat(drop.mintPrice) * quantity;
      // Add 20% buffer for gas costs
      const depositAmount = (mintCostEth * 1.2).toString();
      
      // Deposit ETH to the sniper contract
      const txDeposit = await depositToSniper(provider, depositAmount);
      console.log("Deposit transaction:", txDeposit);
      
      if (setupResult && setupResult.status === 'ready') {
        setSetupStatus(`Sniper set up and funded successfully! Ready to mint ${drop.name} when available.`);
      } else {
        setSetupStatus(`Monitoring set up and funded successfully! Will automatically mint ${drop.name} once deployed.`);
      }
    } catch (err) {
      console.error('Error setting up sniper:', err);
      setSetupStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  if (!drop) {
    return <div className="p-4 text-center">No drop selected</div>;
  }
  
  // Switch to NFTSniper component if in sniper mode
  if (viewMode === 'sniper') {
    return <NFTSniper drop={drop} walletAddress={walletAddress} onBack={() => setViewMode('details')} />;
  }
  
  return (
    <div className="p-4">
      <button 
        onClick={onBack}
        className="mb-4 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
      >
        ← Back to Drops
      </button>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="relative h-64 md:h-80 bg-gray-100">
          <img 
            src={drop.imageUrl || fallbackImg} 
            alt={drop.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = fallbackImg;
            }}
          />
          <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm">
            {drop.launchStatus}
          </div>
          
          {isMonitoring && (
            <div className="absolute top-4 left-4 bg-green-600 bg-opacity-90 text-white px-3 py-1 rounded-full text-sm">
              Monitoring
            </div>
          )}
          
          {isUpcoming && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent text-white p-4">
              <div className="text-lg font-semibold">Launching in: {formatTimeUntilLaunch(drop.launchTime)}</div>
              <div className="text-sm">Mint date: {formatLaunchTime(drop.launchTime)}</div>
            </div>
          )}
        </div>
        
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">{drop.name}</h1>
            
            <button
              onClick={() => setViewMode('sniper')}
              className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              🎯 Advanced Sniper
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Drop Details</h3>
              <p className="text-gray-700 mb-1"><span className="font-medium">Launch:</span> {formatLaunchTime(drop.launchTime)}</p>
              <p className="text-gray-700 mb-1"><span className="font-medium">Price:</span> {formatPrice(drop.mintPrice)}</p>
              <p className="text-gray-700 mb-1"><span className="font-medium">Blockchain:</span> {drop.blockchain}</p>
              <p className="text-gray-700 mb-1">
                <span className="font-medium">Contract:</span> {`${drop.contractAddress.slice(0, 6)}...${drop.contractAddress.slice(-4)}`}
                {targetContractDeployed === false && (
                  <span className="ml-2 text-yellow-500 text-xs">(Not deployed yet)</span>
                )}
                {targetContractDeployed === true && (
                  <span className="ml-2 text-green-500 text-xs">(Deployed)</span>
                )}
              </p>
              {drop.tokenSupply && (
                <p className="text-gray-700 mb-1"><span className="font-medium">Supply:</span> {drop.tokenSupply}</p>
              )}
              {drop.maxMintPerWallet && (
                <p className="text-gray-700 mb-1"><span className="font-medium">Max Per Wallet:</span> {drop.maxMintPerWallet}</p>
              )}
              
              {nftInfo && nftInfo.mintFunctions && nftInfo.mintFunctions.length > 0 && (
                <div className="mt-3">
                  <p className="font-medium text-gray-700">Detected Mint Functions:</p>
                  <ul className="text-xs text-gray-600 mt-1 ml-4 list-disc">
                    {nftInfo.mintFunctions.map((func: any, index: number) => (
                      <li key={index}>{func.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Description</h3>
              <p className="text-gray-700">{drop.description || 'No description available.'}</p>
              
              {networkInfo && (
                <div className="mt-4 text-sm text-gray-500">
                  <p>Connected to: {networkInfo.name} (Chain ID: {networkInfo.chainId})</p>
                  <p className="mt-1">
                    NFTSniper contract: {contractDeployed === true ? '✅ Deployed' : contractDeployed === false ? '❌ Not Deployed' : '⏳ Checking...'}
                  </p>
                  <p className="mt-1">
                    Target contract: {targetContractDeployed === true ? '✅ Deployed' : targetContractDeployed === false ? '❌ Not Deployed Yet' : '⏳ Checking...'}
                  </p>
                  <p className="mt-1">
                    Monitoring: {isMonitoring ? '✅ Active' : '❌ Inactive'}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-medium mb-4">Set Up NFT Sniper</h3>
            
            {contractDeployed === false && (
              <div className="mb-4 bg-yellow-50 border border-yellow-200 p-3 rounded-md">
                <p className="text-yellow-700 mb-2">
                  <span className="font-medium">Note:</span> The NFTSniper contract is not deployed yet.
                </p>
                <p className="text-sm text-yellow-600">
                  When you click "Set Up Sniper", we'll attempt to deploy the contract automatically.
                </p>
              </div>
            )}
            
            {targetContractDeployed === false && (
              <div className="mb-4 bg-blue-50 border border-blue-200 p-3 rounded-md">
                <p className="text-blue-700 font-medium mb-1">
                  Upcoming NFT Launch
                </p>
                <p className="text-sm text-blue-600">
                  This NFT contract is not deployed yet, but we'll set up our sniper to monitor and mint as soon as it launches.
                </p>
                {drop.launchTime > 0 && (
                  <p className="text-sm text-blue-600 mt-1">
                    Expected launch: {formatLaunchTime(drop.launchTime)} (in {formatTimeUntilLaunch(drop.launchTime)})
                  </p>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to Mint</label>
                <input 
                  type="number" 
                  min="1" 
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Gas Price (Gwei)</label>
                <input 
                  type="number" 
                  min="1" 
                  value={maxGasPrice}
                  onChange={(e) => setMaxGasPrice(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  Total Cost: ~{formatPrice((parseFloat(drop.mintPrice) * quantity).toString())}
                </p>
                <p className="text-xs text-gray-500">
                  (Plus gas fees)
                </p>
              </div>
              
              <button
                onClick={handleSetupSniper}
                disabled={loading || !walletAddress}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                {loading ? 'Setting up...' : targetContractDeployed ? 'Set Up Sniper' : 'Set Up Monitoring'}
              </button>
            </div>
            
            {setupStatus && (
              <p className={`mt-4 text-sm ${setupStatus.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                {setupStatus}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 