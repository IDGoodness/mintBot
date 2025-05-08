import { useEffect, useRef, useState } from 'react';
import { ethers } from 'ethers';

// Standard ERC721 mint function signatures to try
const MINT_SIGNATURES = [
  'mint(uint256)',
  'mint(address,uint256)',
  'publicMint(uint256)',
  'publicMint(address,uint256)',
  'mintPublic(uint256)',
  'mintPublic(address,uint256)'
];

interface MintConfig {
  maxGasPrice: bigint;
  maxMintPrice: bigint;
  quantity: number;
}

// List of free public RPC endpoints that are known to be reliable
const PUBLIC_RPC_URLS = [
  'https://eth.llamarpc.com',
  'https://rpc.mevblocker.io',
  'https://ethereum.publicnode.com',
  'https://cloudflare-eth.com',
  'https://eth.api.onfinality.io/public'
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
  const lastBlockCheckedRef = useRef<number>(0);
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
        const network = await browserProvider.getNetwork();
        
        if (network.chainId !== 1n) {
          onError('Please connect to Ethereum Mainnet');
          providerInitializedRef.current = false;
          return;
        }

        // Use MetaMask provider for transactions
        const signer = await browserProvider.getSigner();
        setProvider(browserProvider);
        setSigner(signer);
        
        // For monitoring, first try to just use the browser provider
        // This avoids relying on external RPCs that may have rate limits
        let publicProvider: ethers.Provider = browserProvider;
        let usesFallback = false;
        
        // Test a simple call to make sure it works
        try {
          await browserProvider.getBlockNumber();
          console.log('Using browser provider for monitoring');
        } catch (browserError) {
          console.warn('Browser provider failed for monitoring, trying fallbacks', browserError);
          usesFallback = true;
          
          // Try each public RPC in sequence
          for (const rpcUrl of PUBLIC_RPC_URLS) {
            try {
              const provider = new ethers.JsonRpcProvider(rpcUrl);
              // Test the provider with a simple call
              await provider.getBlockNumber();
              publicProvider = provider;
              console.log(`Connected to RPC: ${rpcUrl}`);
              break;
            } catch (rpcError) {
              console.warn(`RPC ${rpcUrl} failed:`, rpcError);
              continue;
            }
          }
        }
        
        // Add throttling to prevent too many requests (only for external providers)
        if (usesFallback && publicProvider instanceof ethers.JsonRpcProvider) {
          publicProvider.getNetwork = getThrottledMethod(publicProvider.getNetwork.bind(publicProvider));
          publicProvider.getBlockNumber = getThrottledMethod(publicProvider.getBlockNumber.bind(publicProvider));
          publicProvider.getCode = getThrottledMethod(publicProvider.getCode.bind(publicProvider));
          publicProvider.getLogs = getThrottledMethod(publicProvider.getLogs.bind(publicProvider));
        }
        
        setPublicProvider(publicProvider);
        isInitializedRef.current = true;
        providerInitializedRef.current = false;
      } catch (error) {
        console.error('Failed to initialize provider:', error);
        onError('Failed to connect to Ethereum: ' + (error instanceof Error ? error.message : String(error)));
        providerInitializedRef.current = false;
      }
    };

    init();
  }, [onError]);

  // Helper function to throttle method calls
  const getThrottledMethod = (method: Function) => {
    let lastCallTime = 0;
    const MIN_INTERVAL = 1000; // 1 second minimum between calls
    
    return async (...args: any[]) => {
      // Allow max 1 request per second
      const now = Date.now();
      const timeSinceLastCall = now - lastCallTime;
      
      if (timeSinceLastCall < MIN_INTERVAL) {
        await new Promise(resolve => setTimeout(resolve, MIN_INTERVAL - timeSinceLastCall));
      }
      
      lastCallTime = Date.now();
      requestCountRef.current++;
      
      // If we've made too many requests, warn user but don't fail
      if (requestCountRef.current > 100) {
        console.warn('High number of requests detected');
      }
      
      return method(...args);
    };
  };

  // Track active state in a ref to prevent stale closures
  useEffect(() => {
    activeRef.current = isActive;
    
    // Clean up on deactivation
    if (!isActive && watchIntervalRef.current) {
      clearInterval(watchIntervalRef.current);
      watchIntervalRef.current = null;
      requestCountRef.current = 0;
    }
  }, [isActive]);

  // Main monitoring logic
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
            // First check if contract is active by checking its code
            const code = await publicProvider.getCode(contractAddress);
            if (code === '0x') {
              // Contract not deployed yet, no need to check further
              return;
            }
            
            // Then check if NFT is active through our different methods
            const isLive = await checkNFTStatus();
            if (isLive) {
              await attemptMint();
            }
          } catch (error) {
            console.error("Error in block check:", error);
            errorCountRef.current++;
          }
        }
        
        // Reset error count on successful execution
        errorCountRef.current = 0;
      } catch (error) {
        console.error("Error in monitoring cycle:", error);
        errorCountRef.current++;
        
        // Circuit breaker if too many errors
        if (errorCountRef.current > 5) {
          if (watchIntervalRef.current) {
            clearInterval(watchIntervalRef.current);
            watchIntervalRef.current = null;
          }
          
          onError("Connection issues detected. Please refresh the page.");
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
          const filter = {
            address: contractAddress,
            topics: [
              ethers.id('Transfer(address,address,uint256)')
            ],
            fromBlock: 'latest'
          };
          
          // Use the provider getLogs method with minimal block range
          const logs = await publicProvider.getLogs(filter);
          return logs.length > 0;
        } catch {
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
        const feeData = await provider.getFeeData();
        const maxGasPrice = (feeData.gasPrice || ethers.parseUnits('50', 'gwei')) * BigInt(gasFeePercentage) / 100n;
        
        const config: MintConfig = {
          maxGasPrice,
          maxMintPrice: ethers.parseEther('0.5'), // Adjust based on expected mint price
          quantity: 1
        };

        // Try different mint signatures
        for (const sig of MINT_SIGNATURES) {
          try {
            const contract = new ethers.Contract(
              contractAddress,
              [sig],
              signer
            );

            const functionName = sig.split('(')[0];
            if (!contract[functionName]) continue;

            const gasLimit = await contract[functionName].estimateGas(
              sig.includes('address') ? [walletAddress, config.quantity] : [config.quantity],
              { maxFeePerGas: config.maxGasPrice }
            ).catch(() => null);

            if (gasLimit) {
              const tx = await contract[functionName](
                sig.includes('address') ? [walletAddress, config.quantity] : [config.quantity],
                {
                  maxFeePerGas: config.maxGasPrice,
                  gasLimit: gasLimit * 12n / 10n // Add 20% buffer
                }
              );

              console.log('Mint transaction sent:', tx.hash);
              const receipt = await tx.wait();
              
              if (receipt.status === 1) {
                onSuccess();
                return;
              }
            }
          } catch (error) {
            console.log(`Failed with signature ${sig}:`, error);
            continue;
          }
        }

        onError('Failed to mint with all known signatures');
      } catch (error) {
        console.error('Mint attempt failed:', error);
        onError('Failed to mint NFT');
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