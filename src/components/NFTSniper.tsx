import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { UpcomingNFT } from '../services/MintifyService';
import { detectMintFunctions, watchForMintActivation, isMintFunctionAccessible } from '../utils/nftDetection';
import { isTargetContractDeployed } from '../utils/contractIntegration';
import fallbackImg from '../assets/nft3.png';

interface NFTSniperProps {
  drop: UpcomingNFT;
  walletAddress: string | null;
  onBack: () => void;
  onLog: (message: string) => void;
  onSuccess: (tokenId?: number) => void;
  onError: (error: string) => void;
  isActive: boolean;
  gasFeePercentage: number;
}

export const NFTSniper: React.FC<NFTSniperProps> = ({ drop, walletAddress, onBack, onLog, onSuccess, onError, isActive, gasFeePercentage }) => {
  const [status, setStatus] = useState<'idle' | 'monitoring' | 'minting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [contractDeployed, setContractDeployed] = useState<boolean>(false);
  const [mintFunctions, setMintFunctions] = useState<any[]>([]);
  const [activeMintFunction, setActiveMintFunction] = useState<{ name: string, signature: string } | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [maxPrice, setMaxPrice] = useState(parseFloat(drop.mintPrice) * 1.2); // 20% buffer
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [automaticMint, setAutomaticMint] = useState(true);
  const [mintSpeed, setMintSpeed] = useState<'normal' | 'turbo' | 'extreme'>('normal');
  const MINTIFY_API_KEY = '85c2edccc6fad38585b794b3595af637928bd512';
  const provider = useRef<ethers.BrowserProvider | null>(null);
  const signer = useRef<ethers.JsonRpcSigner | null>(null);
  const checkInterval = useRef<NodeJS.Timeout | null>(null);
  const mintingInProgress = useRef(false);
  console.log(setTransactionHash)

  // Add a log message
  const addLog = (message: string) => {
    setLogMessages(logs => [message, ...logs.slice(0, 49)]); // Keep last 50 logs
  };

  // Check Mintify API for upcoming NFT status
  const checkMintifyAPI = async () => {
    addLog(`Checking Mintify for upcoming NFT: ${drop.contractAddress}`);
    
    try {
      // Try to get data from Mintify API for upcoming/unlisted drops
      const mintifyResponse = await fetch(
        `https://api.mintify.xyz/v1/contracts/${drop.contractAddress}`,
        {
          headers: {
            'Authorization': `Bearer ${MINTIFY_API_KEY}`,
            'Accept': 'application/json'
          }
        }
      );
      
      if (mintifyResponse.ok) {
        const data = await mintifyResponse.json();
        if (data.contract) {
          addLog(`Found NFT on Mintify: ${data.contract.name}`);
          return true;
        }
      }
      
      // Check for upcoming drops
      const upcomingResponse = await fetch(
        `https://api.mintify.xyz/v1/drops/upcoming?contractAddress=${drop.contractAddress}`,
        {
          headers: {
            'Authorization': `Bearer ${MINTIFY_API_KEY}`,
            'Accept': 'application/json'
          }
        }
      );
      
      if (upcomingResponse.ok) {
        const upcomingData = await upcomingResponse.json();
        if (upcomingData.drops && upcomingData.drops.length > 0) {
          addLog(`Found as upcoming drop on Mintify: ${upcomingData.drops[0].name}`);
          
          if (upcomingData.drops[0].launchTime) {
            const launchDate = new Date(upcomingData.drops[0].launchTime * 1000);
            addLog(`Launch time: ${launchDate.toLocaleString()}`);
          }
          
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking Mintify:', error);
      addLog(`Error checking Mintify API: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  };

  // Check if contract is deployed
  useEffect(() => {
    const checkDeployment = async () => {
      if (!window.ethereum) return;

      try {
        // First check Mintify for info about this NFT
        await checkMintifyAPI();
        
        // Then check on-chain status
        const newProvider = new ethers.BrowserProvider(window.ethereum);
        provider.current = newProvider;
        signer.current = await newProvider.getSigner();
        addLog('Connected to wallet');
        
        const deployed = await isTargetContractDeployed(newProvider, drop.contractAddress);
        setContractDeployed(deployed);
        
        if (deployed) {
          addLog(`Contract ${drop.contractAddress} is deployed.`);
          // Detect mint functions
          const functions = await detectMintFunctions(newProvider, drop.contractAddress);
          setMintFunctions(functions);
          addLog(`Detected ${functions.length} mint functions.`);
        } else {
          addLog(`Contract ${drop.contractAddress} is not yet deployed.`);
        }
      } catch (error) {
        console.error('Error checking contract deployment:', error);
        setError(`Error checking deployment: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    checkDeployment();
    
    // Check periodically for deployment
    const interval = setInterval(checkDeployment, 10000);
    return () => clearInterval(interval);
  }, [drop.contractAddress, addLog, checkMintifyAPI]);

  // Start monitoring for mint function activation
  const startMonitoring = async () => {
    if (!window.ethereum || !walletAddress) {
      setError('Ethereum provider or wallet not available');
      return;
    }

    setStatus('monitoring');
    setError(null);
    addLog('Starting mint function monitor...');

    try {
      const newProvider = new ethers.BrowserProvider(window.ethereum);
      provider.current = newProvider;
      signer.current = await newProvider.getSigner();
      
      // Define the callback for when a mint function becomes active
      const onMintActivated = async (mintFunction: { name: string, signature: string }) => {
        addLog(`🚨 MINT FUNCTION ACTIVE: ${mintFunction.name}`);
        setActiveMintFunction(mintFunction);
        
        // If automatic mint is enabled, trigger the mint
        if (automaticMint) {
          addLog(`Automatic mint enabled, executing mint using ${mintFunction.name}...`);
          executeMint();
        }
      };
      
      // Start watching for mint activation with different intervals based on speed
      const intervalMs = mintSpeed === 'normal' ? 5000 : mintSpeed === 'turbo' ? 2000 : 500;
      const cleanup = watchForMintActivation(newProvider, drop.contractAddress, onMintActivated, intervalMs);
      
      addLog(`Monitoring mint activation every ${intervalMs}ms (${mintSpeed} mode).`);
      return () => cleanup();
    } catch (error) {
      console.error('Error starting monitoring:', error);
      setError(`Error monitoring: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setStatus('error');
    }
  };

  // Execute the mint function
  const executeMint = async () => {
    if (mintingInProgress.current || !provider.current || !signer.current) return;
    
    mintingInProgress.current = true;
    addLog('Executing mint transaction...');
    
    try {
      const contract = new ethers.Contract(
        drop.contractAddress,
        [
          `function ${activeMintFunction?.name}(uint256) payable`,
          `function ${activeMintFunction?.name}() payable`
        ],
        signer.current
      );
      
      const gasPrice = await provider.current.getFeeData();
      let maxFeePerGas = gasPrice.maxFeePerGas || gasPrice.gasPrice;
      
      if (maxFeePerGas) {
        maxFeePerGas = (maxFeePerGas * BigInt(gasFeePercentage)) / 100n;
      }
      
      const options: { value: bigint; maxFeePerGas?: bigint } = {
        value: ethers.parseEther(drop.mintPrice || "0.05")
      };
      
      if (maxFeePerGas) {
        options.maxFeePerGas = maxFeePerGas;
      }
      
      let tx;
      const mintFn = contract.getFunction(activeMintFunction?.name!);
      
      if (mintFn.fragment.inputs.length > 0) {
        tx = await mintFn(quantity, options);
      } else {
        tx = await mintFn(options);
      }
      
      addLog(`Mint transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      addLog(`Mint transaction confirmed! Gas used: ${receipt?.gasUsed?.toString() || 'unknown'}`);
      
      let tokenId: number | undefined = undefined;
      if (receipt && receipt.logs) {
        const transferLog = receipt.logs.find((log: { topics: string[] }) => 
          log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' &&
          log.topics[2] !== '0x0000000000000000000000000000000000000000000000000000000000000000'
        );
        
        if (transferLog && transferLog.topics[3]) {
          tokenId = parseInt(transferLog.topics[3], 16);
          addLog(`Minted token ID: ${tokenId}`);
        }
      }
      
      onSuccess(tokenId);
    } catch (error) {
      console.error("Mint error:", error);
      
      if (error instanceof Error) {
        if (error.message.includes('insufficient funds')) {
          onError("Insufficient funds for minting");
        } else if (error.message.includes('user rejected')) {
          onError("Transaction rejected by user");
        } else {
          onError(`Mint failed: ${error.message}`);
        }
      } else {
        onError("Unknown error during mint");
      }
    } finally {
      mintingInProgress.current = false;
    }
  };

  // Monitor for mint readiness when active
  useEffect(() => {
    if (!isActive || !drop.contractAddress || !provider.current) {
      return;
    }

    addLog("Starting mint monitoring...");
    
    const checkMintAvailability = async () => {
      try {
        if (!contractDeployed) {
          const code = await provider.current!.getCode(drop.contractAddress);
          if (code !== '0x') {
            setContractDeployed(true);
            addLog("Contract just deployed! Checking mint functions...");
          }
          return;
        }
        
        if (!activeMintFunction) {
          const functions = await detectMintFunctions(provider.current!, drop.contractAddress);
          if (functions.length > 0) {
            for (const func of functions) {
              const isAccessible = await isMintFunctionAccessible(
                provider.current!, 
                drop.contractAddress,
                func.name
              );
              
              if (isAccessible) {
                setActiveMintFunction(func);
                addLog(`Found accessible mint function: ${func.name}`);
                break;
              }
            }
            
            if (!activeMintFunction && functions.length > 0) {
              setActiveMintFunction(functions[0]);
              addLog(`Found mint function (may require special access): ${functions[0].name}`);
            }
          }
          return;
        }

        if (contractDeployed && activeMintFunction && !mintingInProgress.current) {
          addLog("Mint function is active! Attempting to mint...");
          void executeMint();
        } else if (activeMintFunction) {
          try {
            const isAccessible = await isMintFunctionAccessible(
              provider.current!,
              drop.contractAddress,
              activeMintFunction.name
            );
            
            if (isAccessible && !contractDeployed) {
              setContractDeployed(true);
              addLog("Mint function is now accessible!");
            }
          } catch (error) {
            addLog("Still waiting for mint to become accessible");
          }
        }
      } catch (error) {
        console.error("Error in mint check:", error);
      }
    };

    const intervalTime = getCheckFrequency();
    checkMintAvailability();
    
    checkInterval.current = setInterval(checkMintAvailability, intervalTime);
    addLog(`Monitoring mint every ${intervalTime/1000} seconds (based on gas settings)`);

    return () => {
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
        checkInterval.current = null;
      }
    };
  }, [isActive, drop.contractAddress, contractDeployed, activeMintFunction, onError, onLog]);

  // Speed settings based on gas fee percentage
  const getCheckFrequency = () => {
    if (gasFeePercentage > 150) return 1000; // 1 second
    if (gasFeePercentage > 100) return 2000; // 2 seconds
    if (gasFeePercentage > 50) return 3000;  // 3 seconds
    return 5000; // Default to 5 seconds
  };

  return (
    <div className="p-4">
      <button 
        onClick={onBack}
        className="mb-4 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
      >
        ← Back
      </button>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
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
          <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm">
            {drop.launchStatus}
          </div>
          
          <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-sm text-white ${
            status === 'monitoring' ? 'bg-yellow-500 bg-opacity-90' :
            status === 'minting' ? 'bg-purple-600 bg-opacity-90' :
            status === 'success' ? 'bg-green-600 bg-opacity-90' :
            status === 'error' ? 'bg-red-600 bg-opacity-90' :
            'bg-gray-600 bg-opacity-90'
          }`}>
            {status === 'idle' && 'Ready'}
            {status === 'monitoring' && 'Monitoring'}
            {status === 'minting' && 'Minting!'}
            {status === 'success' && 'Success!'}
            {status === 'error' && 'Error'}
          </div>
        </div>
        
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-2">{drop.name}</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Drop Details</h3>
              <p className="text-gray-700 mb-1"><span className="font-medium">Contract Status:</span> {contractDeployed ? '✅ Deployed' : '⏳ Not Deployed'}</p>
              <p className="text-gray-700 mb-1"><span className="font-medium">Price:</span> {parseFloat(drop.mintPrice).toFixed(3)} ETH</p>
              <p className="text-gray-700 mb-1">
                <span className="font-medium">Contract:</span> {`${drop.contractAddress.slice(0, 8)}...${drop.contractAddress.slice(-6)}`}
              </p>
              
              {mintFunctions.length > 0 && (
                <div className="mt-3">
                  <p className="font-medium text-gray-700">Available Mint Functions:</p>
                  <ul className="text-sm text-gray-600 mt-1 ml-4 list-disc">
                    {mintFunctions.map((func, index) => (
                      <li key={index} className={activeMintFunction?.name === func.name ? 'font-bold text-green-600' : ''}>
                        {func.name} {activeMintFunction?.name === func.name && '(ACTIVE)'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-3">Sniper Configuration</h3>
              
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to Mint</label>
                <input 
                  type="number" 
                  min="1" 
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Price per NFT (ETH)</label>
                <input 
                  type="number" 
                  min="0.001"
                  step="0.001" 
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Mint Speed</label>
                <select
                  value={mintSpeed}
                  onChange={(e) => setMintSpeed(e.target.value as 'normal' | 'turbo' | 'extreme')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="normal">Normal (5 sec)</option>
                  <option value="turbo">Turbo (2 sec)</option>
                  <option value="extreme">Extreme (0.5 sec)</option>
                </select>
              </div>
              
              <div className="mb-3 flex items-center">
                <input
                  type="checkbox"
                  id="automaticMint"
                  checked={automaticMint}
                  onChange={(e) => setAutomaticMint(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="automaticMint" className="text-sm font-medium text-gray-700">
                  Mint automatically when active
                </label>
              </div>
              
              <div className="mt-4 flex flex-col space-y-2">
                {status === 'idle' && (
                  <button
                    onClick={startMonitoring}
                    disabled={!contractDeployed || !walletAddress}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:bg-gray-400"
                  >
                    Start Monitoring
                  </button>
                )}
                
                {status === 'monitoring' && (
                  <button
                    onClick={() => setStatus('idle')}
                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                  >
                    Stop Monitoring
                  </button>
                )}
                
                {activeMintFunction && status !== 'minting' && status !== 'success' && (
                  <button
                    onClick={executeMint}
                    disabled={!walletAddress}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                  >
                    Mint Now
                  </button>
                )}
                
                {status === 'success' && transactionHash && (
                  <a
                    href={`https://etherscan.io/tx/${transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-center"
                  >
                    View Transaction
                  </a>
                )}
              </div>
            </div>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Activity Log</h3>
            <div className="h-40 overflow-y-auto text-sm font-mono bg-gray-900 text-green-400 p-3 rounded">
              {logMessages.length === 0 ? (
                <p>No activity yet...</p>
              ) : (
                logMessages.map((log, index) => (
                  <div key={index} className="mb-1">{log}</div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 