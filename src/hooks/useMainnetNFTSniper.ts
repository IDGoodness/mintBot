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

  // Initialize provider and signer only once
  useEffect(() => {
    if (isInitializedRef.current) return;
    
    const init = async () => {
      if (!window.ethereum) {
        onError('MetaMask not installed');
        return;
      }

      try {
        // First try to use MetaMask's provider as our primary source
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        const network = await browserProvider.getNetwork();
        
        if (network.chainId !== 1n) {
          onError('Please connect to Ethereum Mainnet');
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
      } catch (error) {
        console.error('Failed to initialize provider:', error);
        onError('Failed to connect to Ethereum: ' + (error instanceof Error ? error.message : String(error)));
      }
    };

    init();
  }, [onError]);

  // Helper function to throttle method calls
  const getThrottledMethod = (method: Function) => {
    return async (...args: any[]) => {
      // Allow max 2 requests per second
      const now = Date.now();
      const timeSinceLastCheck = now - lastCheckTimeRef.current;
      
      if (timeSinceLastCheck < 500) {
        await new Promise(resolve => setTimeout(resolve, 500 - timeSinceLastCheck));
      }
      
      lastCheckTimeRef.current = Date.now();
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
    
    // Get the current block to start monitoring from
    const initializeBlockMonitoring = async () => {
      try {
        const currentBlock = await publicProvider.getBlockNumber();
        lastBlockCheckedRef.current = currentBlock;
        console.log('Starting monitoring from block:', currentBlock);
      } catch (error) {
        console.error('Error getting current block:', error);
      }
    };
    
    // Periodic check for new blocks
    const checkNewBlocks = async () => {
      if (!activeRef.current || mintAttemptedRef.current) return;
      
      try {
        const latestBlock = await publicProvider.getBlockNumber();
        
        if (latestBlock > lastBlockCheckedRef.current) {
          // Only check blocks if enough time has passed to avoid rapid requests
          if (Date.now() - lastCheckTimeRef.current > 5000) {
            // Check for activity in the contract
            const filter = {
              address: contractAddress,
              fromBlock: lastBlockCheckedRef.current + 1,
              toBlock: latestBlock
            };
            
            const events = await publicProvider.getLogs(filter);
            
            if (events.length > 0) {
              console.log(`Found ${events.length} events for contract, checking mint status`);
              await checkNFTStatus();
            }
            
            lastBlockCheckedRef.current = latestBlock;
            lastCheckTimeRef.current = Date.now();
          }
        }
      } catch (error) {
        console.error('Error checking new blocks:', error);
        errorCountRef.current++;
      }
    };

    // Main check function with throttling
    const checkNFTStatus = async () => {
      if (mintAttemptedRef.current || !activeRef.current) return;
      
      // Prevent too many checks
      const now = Date.now();
      if (now - lastCheckTimeRef.current < 5000) {
        return;
      }
      
      lastCheckTimeRef.current = now;
      
      // Keep track of which provider we're using
      let currentProvider = publicProvider;
      const tryApproaches = async (provider: ethers.Provider) => {
        try {
          const approaches = [
            checkTotalSupply,
            checkOwnerOf,
            checkContractActivity
          ];
          
          for (const approach of approaches) {
            if (!activeRef.current) return false;
            
            const isLive = await approach(provider).catch(() => false);
            if (isLive) {
              console.log('Mint is live! Detected using approach:', approach.name);
              return true;
            }
            
            // Small delay between approaches
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          return false;
        } catch (error) {
          console.error("Error checking NFT status:", error);
          return false;
        }
      };
      
      try {
        // First try with the primary provider
        const isLive = await tryApproaches(currentProvider);
        if (isLive) {
          await attemptMint();
          return;
        }
        
        // If the primary provider is not the browser provider, try that as fallback
        if (currentProvider !== provider && provider) {
          console.log("Trying fallback provider for status check");
          const isLiveWithFallback = await tryApproaches(provider);
          if (isLiveWithFallback) {
            await attemptMint();
            return;
          }
        }
        
        // Reset error count on successful check
        errorCountRef.current = 0;
      } catch (error) {
        errorCountRef.current++;
        console.error('Error checking mint status:', error);
      }
    };

    // Check functions
    const checkTotalSupply = async (provider: ethers.Provider) => {
      try {
        const contract = new ethers.Contract(
          contractAddress,
          ['function totalSupply() view returns (uint256)'],
          provider
        );
        
        const totalSupply = await contract.totalSupply();
        return totalSupply > 0n;
      } catch {
        return false;
      }
    };
    
    const checkOwnerOf = async (provider: ethers.Provider) => {
      try {
        const contract = new ethers.Contract(
          contractAddress,
          ['function ownerOf(uint256) view returns (address)'],
          provider
        );
        
        // Try to check ownership of token #1
        await contract.ownerOf(1);
        return true;
      } catch {
        return false;
      }
    };
    
    const checkContractActivity = async (provider: ethers.Provider) => {
      try {
        const filter = {
          address: contractAddress,
          topics: [
            ethers.id('Transfer(address,address,uint256)')
          ],
          fromBlock: lastBlockCheckedRef.current - 10 > 0 ? lastBlockCheckedRef.current - 10 : 0,
          toBlock: 'latest'
        };
        
        // Use the provider getLogs method
        if (provider instanceof ethers.JsonRpcProvider) {
          const logs = await provider.getLogs(filter);
          return logs.length > 0;
        } else if (provider instanceof ethers.BrowserProvider) {
          // BrowserProvider requires different format
          const logs = await provider.getLogs(filter);
          return logs.length > 0;
        }
        
        return false;
      } catch {
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

    const setupBlockchainMonitoring = () => {
      // Clear existing interval if any
      if (watchIntervalRef.current) {
        clearInterval(watchIntervalRef.current);
      }

      // Use a combined monitoring approach that's more reliable
      const monitoringFunction = async () => {
        if (!activeRef.current || mintAttemptedRef.current) {
          return;
        }
        
        try {
          // First check if we're still connected to the network
          try {
            await publicProvider.getBlockNumber();
          } catch (networkError) {
            console.error("Provider connection error, attempting to recover:", networkError);
            
            // Try to reinitialize the provider
            if (provider) {
              try {
                // First try to use the browser provider directly
                const blockNum = await provider.getBlockNumber();
                console.log("Recovered using browser provider, current block:", blockNum);
                
                // Update the public provider to use the browser provider
                setPublicProvider(provider);
              } catch (recoveryError) {
                throw new Error("Failed to recover connection: " + recoveryError);
              }
            } else {
              throw new Error("No fallback provider available");
            }
          }
          
          // Check for new blocks
          await checkNewBlocks();
          
          // Also do a direct NFT status check periodically
          const now = Date.now();
          if (now - lastCheckTimeRef.current > 30000) { // Every 30 seconds
            await checkNFTStatus();
          }
        } catch (error) {
          console.error("Error in monitoring cycle:", error);
          errorCountRef.current++;
          
          // Circuit breaker if too many errors
          if (errorCountRef.current > 8) {
            console.warn("Too many monitoring errors, pausing for recovery");
            if (watchIntervalRef.current) {
              clearInterval(watchIntervalRef.current);
              watchIntervalRef.current = null;
            }
            
            onError("Connection issues detected. Trying to recover...");
            
            // Try again after 15 seconds with reset error count
            setTimeout(() => {
              if (activeRef.current) {
                errorCountRef.current = 0;
                // Try to reinitialize
                const reinitialize = async () => {
                  try {
                    // First try to use MetaMask's provider again
                    const browserProvider = new ethers.BrowserProvider(window.ethereum);
                    const network = await browserProvider.getNetwork();
                    
                    if (network.chainId !== 1n) {
                      onError('Please connect to Ethereum Mainnet');
                      return;
                    }
                    
                    const signer = await browserProvider.getSigner();
                    setProvider(browserProvider);
                    setSigner(signer);
                    setPublicProvider(browserProvider);
                    
                    if (activeRef.current) {
                      setupBlockchainMonitoring();
                    }
                  } catch (error) {
                    console.error('Failed to reinitialize:', error);
                    onError('Recovery failed, please refresh the page');
                  }
                };
                
                reinitialize();
              }
            }, 15000);
          }
        }
      };

      // Use a reasonable interval that won't hit rate limits
      watchIntervalRef.current = setInterval(monitoringFunction, 15000);
      
      // Run immediately for first check
      monitoringFunction();
    };

    const startMonitoring = async () => {
      try {
        onWatching();
        
        // Check contract validity only once and throttle
        try {
          const code = await publicProvider.getCode(contractAddress);
          if (code === '0x') {
            onError('Contract not deployed yet or invalid address');
            return;
          }
        } catch (codeError) {
          console.error('Error checking contract code:', codeError);
          // Try with browser provider if available
          if (provider instanceof ethers.BrowserProvider) {
            try {
              const code = await provider.getCode(contractAddress);
              if (code === '0x') {
                onError('Contract not deployed yet or invalid address');
                return;
              }
            } catch (backupError) {
              console.error('Backup code check also failed:', backupError);
              onError('Could not verify contract deployment');
              return;
            }
          } else {
            onError('Could not verify contract deployment');
            return;
          }
        }
        
        await initializeBlockMonitoring();
        console.log('Starting monitoring for contract:', contractAddress);
        setupBlockchainMonitoring();
        
        // Do an initial status check after a small delay to avoid RPC throttling
        setTimeout(async () => {
          if (activeRef.current) {
            await checkNFTStatus();
          }
        }, 2000);
      } catch (error) {
        console.error('Error starting monitoring:', error);
        onError('Failed to start monitoring: ' + (error instanceof Error ? error.message : String(error)));
      }
    };

    // Start with a small delay to avoid immediate API calls after button click
    setTimeout(() => {
      if (activeRef.current) {
        startMonitoring();
      }
    }, 1000);

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