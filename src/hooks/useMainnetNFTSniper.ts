import { useEffect, useRef, useState } from 'react';
import { ethers } from 'ethers';

// Standard ERC721 mint function signatures to try
const MINT_SIGNATURES = [
  'function mint(uint256)',
  'function mint(address,uint256)',
  'function publicMint(uint256)',
  'function publicMint(address,uint256)',
  'function mintPublic(uint256)',
  'function mintPublic(address,uint256)'
];

interface MintConfig {
  maxGasPrice: bigint;
  maxMintPrice: bigint;
  quantity: number;
}

// List of free public RPC endpoints that are known to be reliable
const PUBLIC_RPC_URLS = [
  'https://cloudflare-eth.com',
  'https://eth.llamarpc.com',
  'https://eth.meowrpc.com',
  'https://1rpc.io/eth',
  'https://ethereum.publicnode.com', 
];

export const useMainnetNFTSniper = (
  contractAddress: string,
  isActive: boolean,
  gasFeePercentage: number,
  walletAddress: string,
  onWatching: () => void,
  onSuccess: () => void,
  onError: (error: string) => void
) => {
  const [provider, setProvider] = useState<ethers.Provider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [publicProvider, setPublicProvider] = useState<ethers.Provider | null>(null);
  const mintAttemptedRef = useRef(false);
  const watchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const errorCountRef = useRef(0);
  const activeRef = useRef(false);
  const requestCountRef = useRef<number>(0);
  const isInitializedRef = useRef<boolean>(false);
  const lastCheckTimeRef = useRef<number>(Date.now());
  const providerInitializedRef = useRef<boolean>(false); // New ref to prevent multiple initializations

  // Initialize provider and signer only once
  useEffect(() => {
    // Skip if already initialized or if initialization is in progress
    if (isInitializedRef.current || providerInitializedRef.current) return;
    
    providerInitializedRef.current = true;
    
    const init = async () => {
      if (!window.ethereum) {
        onError('MetaMask not installed');
        providerInitializedRef.current = false;
        return;
      }

      try {
        // First try to use MetaMask's provider as our primary source
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        try {
          const network = await browserProvider.getNetwork();
          
          if (network.chainId !== 1n) {
            onError('Please connect to Ethereum Mainnet');
            providerInitializedRef.current = false;
            return;
          }
        } catch (networkError) {
          console.error("Network detection error:", networkError);
          onError('Error detecting network. Please check your MetaMask connection.');
          providerInitializedRef.current = false;
          return;
        }

        try {
          // Use MetaMask provider for transactions
          const signer = await browserProvider.getSigner();
          setProvider(browserProvider);
          setSigner(signer);
        } catch (signerError) {
          console.error("Error getting signer:", signerError);
          onError('Please connect your wallet in MetaMask');
          providerInitializedRef.current = false;
          return;
        }
        
        // For monitoring, use a public provider to avoid MetaMask rate limiting
        let publicProvider: ethers.Provider | null = null;
        
        // Try each public RPC in sequence
        let connected = false;
        for (const rpcUrl of PUBLIC_RPC_URLS) {
          try {
            const provider = new ethers.JsonRpcProvider(rpcUrl);
            // Test the provider with a simple call
            await provider.getBlockNumber();
            publicProvider = provider;
            console.log(`Connected to RPC: ${rpcUrl}`);
            connected = true;
            break;
          } catch (rpcError) {
            console.warn(`RPC ${rpcUrl} failed:`, rpcError);
            continue;
          }
        }
        
        if (!connected || !publicProvider) {
          // If all public RPCs fail, fall back to the browser provider
          console.warn('All public RPCs failed, using browser provider');
          publicProvider = browserProvider;
        }
        
        // Add throttling to prevent too many requests
        if (publicProvider instanceof ethers.JsonRpcProvider) {
          publicProvider = addThrottling(publicProvider);
        }
        
        setPublicProvider(publicProvider);
        isInitializedRef.current = true;
        providerInitializedRef.current = false;
        console.log('Providers initialized successfully');
      } catch (error) {
        console.error('Failed to initialize provider:', error);
        onError('Failed to connect to Ethereum: ' + (error instanceof Error ? error.message : String(error)));
        providerInitializedRef.current = false;
      }
    };

    init();
  }, [onError]);

  // Helper function to add throttling to a JsonRpcProvider
  const addThrottling = (provider: ethers.JsonRpcProvider) => {
    // Track last call times for different methods separately
    const lastCallTimes: Record<string, number> = {};
    // Track consecutive errors for circuit breaking
    const errorCounts: Record<string, number> = {};
    // Set cooling period for methods in milliseconds
    const METHOD_THROTTLE_TIME = 2000; // 2 seconds
    
    const throttledProvider = new Proxy(provider, {
      get(target, prop, receiver) {
        const original = Reflect.get(target, prop, receiver);
        
        if (typeof original === 'function' && 
            (prop === 'getBlockNumber' || 
             prop === 'getCode' || 
             prop === 'getLogs' || 
             prop === 'getNetwork' ||
             prop === 'call' ||
             prop === 'getFeeData')) {
          
          return async (...args: any[]) => {
            const methodName = String(prop);
            // Throttle requests to avoid rate limiting
            const now = Date.now();
            const lastCallTime = lastCallTimes[methodName] || 0;
            const timeSinceLastCall = now - lastCallTime;
            
            if (timeSinceLastCall < METHOD_THROTTLE_TIME) {
              // Wait for the throttle time to pass
              const waitTime = METHOD_THROTTLE_TIME - timeSinceLastCall;
              console.log(`Throttling ${methodName} for ${waitTime}ms`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
            
            lastCallTimes[methodName] = Date.now();
            requestCountRef.current++;
            
            try {
              // Apply the method with timeout to prevent hanging
              const result = await Promise.race([
                original.apply(target, args),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error(`Timeout calling ${methodName}`)), 15000)
                )
              ]);
              
              // Reset error count on success
              errorCounts[methodName] = 0;
              return result;
            } catch (error) {
              // Increment error count and log
              errorCounts[methodName] = (errorCounts[methodName] || 0) + 1;
              console.error(`Error calling ${methodName} (attempt ${errorCounts[methodName]}):`, error);
              
              // If we've had too many errors with this method, delay longer
              if (errorCounts[methodName] > 2) {
                console.warn(`Multiple errors with ${methodName}, backing off...`);
                lastCallTimes[methodName] = Date.now() + 10000; // Extra 10 second cooldown
              }
              
              throw error;
            }
          };
        }
        
        return original;
      }
    });
    
    return throttledProvider as ethers.JsonRpcProvider;
  };

  // Track active state in a ref to prevent stale closures
  useEffect(() => {
    activeRef.current = isActive;
    
    // Clean up on deactivation
    if (!isActive && watchIntervalRef.current) {
      // Clear the interval
      clearInterval(watchIntervalRef.current);
      watchIntervalRef.current = null;
      
      // Reset tracking state
      requestCountRef.current = 0;
      errorCountRef.current = 0;
      mintAttemptedRef.current = false;
      console.log('NFT Sniper deactivated and all resources cleaned up');
    }
    
    // Return cleanup function to ensure timers are cleared
    return () => {
      if (watchIntervalRef.current) {
        clearInterval(watchIntervalRef.current);
        watchIntervalRef.current = null;
      }
    };
  }, [isActive]);

  // Main monitoring logic with improved error handling
  useEffect(() => {
    // Clear any existing interval when dependencies change
    if (watchIntervalRef.current) {
      clearInterval(watchIntervalRef.current);
      watchIntervalRef.current = null;
    }
    
    // Reset tracking
    requestCountRef.current = 0;
    
    if (!isActive || !contractAddress || !provider || !signer || !walletAddress || !publicProvider) {
      return;
    }

    // Reset error count and mint attempted when configuration changes
    errorCountRef.current = 0;
    mintAttemptedRef.current = false;
    
    // Use a reasonable interval that won't hit rate limits - much longer interval to prevent eth request floods
    const MONITORING_INTERVAL = 15000; // 15 seconds between checks
    const BLOCK_CHECK_INTERVAL = 30000; // 30 seconds between block checks
    let lastBlockCheckTime = 0;
    
    const monitoringFunction = async () => {
      if (!activeRef.current || mintAttemptedRef.current) {
        return;
      }

      try {
        // Only check blocks periodically to avoid too many requests
        const now = Date.now();
        if (now - lastBlockCheckTime > BLOCK_CHECK_INTERVAL) {
          lastBlockCheckTime = now;
          
          try {
            // First verify the contract address is valid before doing anything else
            if (!contractAddress || !ethers.isAddress(contractAddress)) {
              console.error("Invalid contract address:", contractAddress);
              onError("Invalid contract address format");
              return;
            }
            
            // Now check if contract is deployed
            try {
              const code = await Promise.race([
                publicProvider.getCode(contractAddress),
                new Promise<string>((_, reject) => 
                  setTimeout(() => reject(new Error("Contract code check timed out")), 10000)
                )
              ]);
              
              if (code === '0x') {
                console.log("Contract not deployed yet");
                return; // Just return, no need to show error
              }
            } catch (codeError) {
              console.error("Error checking contract code:", codeError);
              errorCountRef.current++;
              // Continue to next checks - might be a temporary network issue
            }
            
            // Try to check if NFT is active, with a timeout
            try {
              const isLivePromise = checkNFTStatus();
              const timeoutPromise = new Promise<boolean>((_, reject) => {
                setTimeout(() => reject(new Error("NFT status check timed out")), 15000);
              });
              
              const isLive = await Promise.race([isLivePromise, timeoutPromise]);
              if (isLive) {
                await attemptMint();
              }
            } catch (statusError) {
              console.error("Error checking NFT status:", statusError);
              errorCountRef.current++;
            }
          } catch (blockCheckError) {
            console.error("Error in block check:", blockCheckError);
            errorCountRef.current++;
          }
        }
        
        // If we got here without errors, reset the error counter
        if (errorCountRef.current > 0) {
          errorCountRef.current--;
        }
      } catch (error) {
        console.error("Error in monitoring cycle:", error);
        errorCountRef.current++;
        
        // Circuit breaker with specific errors
        if (errorCountRef.current > 5) {
          if (watchIntervalRef.current) {
            clearInterval(watchIntervalRef.current);
            watchIntervalRef.current = null;
          }
          
          // Show a helpful error message
          let errorMessage = "Connection issues detected. Please refresh the page.";
          if (error instanceof Error) {
            // Check for various RPC errors
            const errorMsg = error.message.toLowerCase();
            
            if (errorMsg.includes("cannot read") || 
                errorMsg.includes("private field") || 
                errorMsg.includes("typeerror")) {
              // Internal ethers.js errors
              errorMessage = "Internal library error. Please refresh the page.";
            }
            else if (errorMsg.includes("input") || 
                errorMsg.includes("format") || 
                errorMsg.includes("invalid") ||
                errorMsg.includes("parameter")) {
              // RPC format issues
              errorMessage = "RPC provider is having issues with request format. Try again later.";
            }
            else if (errorMsg.includes("timeout") || 
                     errorMsg.includes("timed out") ||
                     errorMsg.includes("network error")) {
              // Network timeouts
              errorMessage = "Network connection issues. Check your internet connection.";
            }
            else if (errorMsg.includes("rate limit") || 
                     errorMsg.includes("too many requests")) {
              // Rate limiting
              errorMessage = "Rate limit exceeded. Please wait a few minutes and try again.";
            }
          }
          
          onError(errorMessage);
        }
      }
    };
    
    // Use a much longer interval that won't flood the network
    watchIntervalRef.current = setInterval(monitoringFunction, MONITORING_INTERVAL);
    
    // Run immediately for first check - but with a delay
    setTimeout(monitoringFunction, 2000);

    // Combine our checking functions to reduce network calls
    const checkNFTStatus = async () => {
      try {
        // Try totalSupply approach
        try {
          const contract = new ethers.Contract(
            contractAddress,
            ['function totalSupply() view returns (uint256)'],
            publicProvider
          );
          
          const totalSupply = await contract.totalSupply();
          if (totalSupply > 0n) {
            return true;
          }
        } catch {
          // Silent fail and try next approach
        }
        
        // Try ownerOf approach
        try {
          const contract = new ethers.Contract(
            contractAddress,
            ['function ownerOf(uint256) view returns (address)'],
            publicProvider
          );
          
          // Try to check ownership of token #1
          await contract.ownerOf(1);
          return true;
        } catch {
          // Silent fail and try next approach
        }
        
        // Finally check Transfer events, but only if we can't get contract info directly
        try {
          // Use a block range instead of 'latest' to avoid format issues
          const currentBlock = await publicProvider.getBlockNumber();
          // Look back 10 blocks to find transfers
          const fromBlock = Math.max(0, currentBlock - 10);
          
          const transferEventId = ethers.id('Transfer(address,address,uint256)');
          
          // Avoid using raw JsonRpcProvider.send() which has private field issues
          // Instead create a properly formatted filter for getLogs
          try {
            // Create a filtered event object
            const contract = new ethers.Contract(
              contractAddress,
              ['event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'],
              publicProvider
            );
            
            console.log('Querying for Transfer events on contract:', contractAddress);
            
            // Use queryFilter which handles formatting properly
            const events = await contract.queryFilter(
              contract.filters.Transfer(),
              fromBlock, 
              currentBlock
            );
            
            return events.length > 0;
          } catch (queryError) {
            console.error('Error querying events:', queryError);
            
            // If queryFilter fails, try a more basic approach with explicit formatting
            try {
              // Create a minimal filter with blockchain-compatible hex values
              const filter = {
                address: contractAddress,
                fromBlock: '0x' + fromBlock.toString(16),
                toBlock: '0x' + currentBlock.toString(16),
                topics: [transferEventId]
              };
              
              console.log('Falling back to basic getLogs with filter:', filter);
              
              // Use the provider getLogs method directly
              const logs = await publicProvider.getLogs(filter);
              return logs.length > 0;
            } catch (logsError) {
              console.warn('Secondary getLogs approach failed:', logsError);
              return false;
            }
          }
        } catch (logsError) {
          console.error('Error checking contract logs:', logsError);
          return false;
        }
      } catch (error) {
        console.error("Error checking NFT status:", error);
        return false;
      }
    };
    
    const attemptMint = async () => {
      if (mintAttemptedRef.current) return;
      mintAttemptedRef.current = true;

      try {
        // Simple gas price estimation with fallback
        let gasPrice: bigint = ethers.parseUnits('50', 'gwei'); // Default fallback
        
        try {
          // Try to get gas price using a direct RPC call
          if (provider) {
            const feeData = await provider.getFeeData();
            if (feeData && feeData.gasPrice) {
              gasPrice = feeData.gasPrice;
            }
          }
        } catch (error) {
          console.warn('Error getting gas price, using default:', error);
        }
        
        const maxGasPrice = gasPrice * BigInt(gasFeePercentage) / 100n;
        
        const config: MintConfig = {
          maxGasPrice,
          maxMintPrice: ethers.parseEther('0.5'), // Adjust based on expected mint price
          quantity: 1
        };

        // Try different mint signatures with proper error handling
        for (const signature of MINT_SIGNATURES) {
          try {
            // Create proper ABI interface for the mint function
            const functionName = signature.split('(')[0].trim();
            const contract = new ethers.Contract(
              contractAddress,
              [signature],
              signer
            );

            // Skip if function doesn't exist on contract
            if (!contract[functionName]) continue;

            console.log(`Trying mint signature: ${signature}`);
            
            // Format arguments based on function signature
            const args = [];
            if (signature.includes('address')) {
              args.push(walletAddress);
            } 
            args.push(config.quantity);
            
            // Estimate gas for the transaction
            const gasEstimate = await contract[functionName].estimateGas(...args).catch(() => null);
            
            if (gasEstimate) {
              // Use legacy transaction format to avoid EIP-1559 issues
              const tx = await contract[functionName](...args, {
                gasPrice: maxGasPrice,
                gasLimit: gasEstimate * 12n / 10n // Add 20% buffer
              });

              console.log('Mint transaction sent:', tx.hash);
              const receipt = await tx.wait();
              
              if (receipt && receipt.status === 1) {
                onSuccess();
                return;
              }
            }
          } catch (error) {
            console.log(`Failed with signature ${signature}:`, error);
            continue;
          }
        }

        onError('Failed to mint with all known signatures');
      } catch (error) {
        console.error('Mint attempt failed:', error);
        onError('Failed to mint NFT: ' + (error instanceof Error ? error.message : String(error)));
      }
    };

    // Start the process with a single notification
    onWatching();

    // Cleanup
    return () => {
      if (watchIntervalRef.current) {
        clearInterval(watchIntervalRef.current);
        watchIntervalRef.current = null;
      }
    };
  }, [isActive, contractAddress, provider, signer, walletAddress, gasFeePercentage, publicProvider, onWatching, onSuccess, onError]);
};

export default useMainnetNFTSniper; 