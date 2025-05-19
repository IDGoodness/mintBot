import { useEffect, useRef, useState } from 'react';
import { ethers } from 'ethers';
import { createFeeTransferTransaction, verifyFeeTransfer } from '../utils/feeUtils';
import { transferNFT, verifyNFTOwnership } from '../utils/nftTransferUtils';
import { detectMintFunctions, isMintFunctionAccessible } from '../utils/nftDetection';
import { SUPPORTED_NETWORKS } from '../config/networks';

// Bot fee configuration
const BOT_FEE = {
  percentage: 5, // 5% of mint price
  recipientAddress: '0x123...' // Replace with your fee recipient address
};

// Update persistence keys
const PERSISTENCE_KEYS = {
  ACTIVE_SNIPES: 'nft_sniper_active_snipes',
  WALLET_ADDRESS: 'nft_sniper_wallet_address',
  SELECTED_NETWORK: 'nft_sniper_network',
  BOT_STATE: 'nft_sniper_bot_state',
  CONTRACT_ADDRESS: 'nft_sniper_contract_address',
  GAS_FEE: 'nft_sniper_gas_fee'
};

// Add interface for persisted bot state
interface PersistedBotState {
  isActive: boolean;
  contractAddress: string;
  gasFee: number;
  network: string;
  walletAddress: string;
  lastUpdated: number;
}

// Standard ERC721 mint function signatures to try
const MINT_SIGNATURES = [
  'function mint(uint256)',
  'function mint(address,uint256)',
  'function publicMint(uint256)',
  'function publicMint(address,uint256)',
  'function mintPublic(uint256)',
  'function mintPublic(address,uint256)',
  // Add more common mint signatures
  'function mint()',
  'function claim(uint256)',
  'function claim(address,uint256)',
  'function claim()',
  'function buy(uint256)',
  'function purchase(uint256)',
  'function safeMint(address,uint256)',
  'function createToken(string)',
  'function mintNFT(address,uint256)',
  'function mintNFT(uint256)',
  'function mintToken(uint256)',
  'function mintTo(address,uint256)',
  
  // Add payable versions - very common for NFTs
  'function mint(uint256) payable',
  'function mint() payable',
  'function publicMint(uint256) payable',
  'function claim(uint256) payable',
  'function buy(uint256) payable',
  'function publicSale(uint256) payable',
  'function mintPublic(uint256) payable',
  'function mintNFT(uint256) payable',
  'function purchaseTokens(uint256) payable',
  
  // Additional patterns
  'function mintWithETH(uint256) payable',
  'function publicSaleMint(uint256) payable',
  'function directMint(uint256)',
  'function mintForAddress(address,uint256)',
  'function mintForSale(uint256) payable'
];

interface MintConfig {
  maxGasPrice: bigint;
  maxMintPrice: bigint;
  quantity: number;
}

interface ActiveSnipe {
  contractAddress: string;
  network: string;
  startTime: number;
  status: 'watching' | 'minting' | 'success' | 'failed';
  lastError?: string;
}

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
  const [selectedNetwork, setSelectedNetwork] = useState<string>('ethereum');
  const [activeSnipes, setActiveSnipes] = useState<ActiveSnipe[]>([]);
  
  const mintAttemptedRef = useRef(false);
  const watchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const errorCountRef = useRef(0);
  const activeRef = useRef(false);
  const requestCountRef = useRef<number>(0);
  const isInitializedRef = useRef<boolean>(false);
  const providerInitializedRef = useRef<boolean>(false);

  // Load persisted state on mount
  useEffect(() => {
    const loadPersistedState = async () => {
      try {
        // Load active snipes
        const savedSnipes = localStorage.getItem(PERSISTENCE_KEYS.ACTIVE_SNIPES);
        if (savedSnipes) {
          const snipes = JSON.parse(savedSnipes) as ActiveSnipe[];
          // Only restore snipes that are still active (watching or minting)
          const activeSnipes = snipes.filter(snipe => 
            snipe.status === 'watching' || snipe.status === 'minting'
          );
          setActiveSnipes(activeSnipes);
        }

        // Load selected network
        const savedNetwork = localStorage.getItem(PERSISTENCE_KEYS.SELECTED_NETWORK);
        if (savedNetwork) {
          setSelectedNetwork(savedNetwork);
        }

        // Load bot state
        const savedBotState = localStorage.getItem(PERSISTENCE_KEYS.BOT_STATE);
        if (savedBotState) {
          const botState = JSON.parse(savedBotState) as PersistedBotState;
          
          // Check if the saved state is still valid (less than 24 hours old)
          const isStateValid = Date.now() - botState.lastUpdated < 24 * 60 * 60 * 1000;
          
          if (isStateValid && botState.walletAddress === walletAddress) {
            // Restore the bot state
            if (botState.isActive) {
              // Re-initialize the bot with saved settings
              activeRef.current = true;
              onWatching();
              
              // Start monitoring if there are active snipes
              if (activeSnipes.length > 0) {
                console.log('Restoring active snipes:', activeSnipes);
                // The monitoring effect will pick up the active snipes
              }
            }
          } else {
            // Clear invalid state
            localStorage.removeItem(PERSISTENCE_KEYS.BOT_STATE);
          }
        }
      } catch (error) {
        console.error('Error loading persisted state:', error);
      }
    };

    loadPersistedState();
  }, [walletAddress]);

  // Save bot state whenever it changes
  useEffect(() => {
    const botState: PersistedBotState = {
      isActive,
      contractAddress,
      gasFee: gasFeePercentage,
      network: selectedNetwork,
      walletAddress,
      lastUpdated: Date.now()
    };

    try {
      localStorage.setItem(PERSISTENCE_KEYS.BOT_STATE, JSON.stringify(botState));
    } catch (error) {
      console.error('Error saving bot state:', error);
    }
  }, [isActive, contractAddress, gasFeePercentage, selectedNetwork, walletAddress]);

  // Save active snipes whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(PERSISTENCE_KEYS.ACTIVE_SNIPES, JSON.stringify(activeSnipes));
    } catch (error) {
      console.error('Error saving active snipes:', error);
    }
  }, [activeSnipes]);

  // Save selected network whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(PERSISTENCE_KEYS.SELECTED_NETWORK, selectedNetwork);
    } catch (error) {
      console.error('Error saving selected network:', error);
    }
  }, [selectedNetwork]);

  // Add cleanup function to handle browser close/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Save current state before unload
      const botState: PersistedBotState = {
        isActive,
        contractAddress,
        gasFee: gasFeePercentage,
        network: selectedNetwork,
        walletAddress,
        lastUpdated: Date.now()
      };

      try {
        localStorage.setItem(PERSISTENCE_KEYS.BOT_STATE, JSON.stringify(botState));
        localStorage.setItem(PERSISTENCE_KEYS.ACTIVE_SNIPES, JSON.stringify(activeSnipes));
      } catch (error) {
        console.error('Error saving state before unload:', error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isActive, contractAddress, gasFeePercentage, selectedNetwork, walletAddress, activeSnipes]);

  // Function to switch networks
  const switchNetwork = async (networkName: string) => {
    if (!window.ethereum) {
      onError('MetaMask not installed');
      return;
    }

    const network = SUPPORTED_NETWORKS[networkName as keyof typeof SUPPORTED_NETWORKS];
    if (!network) {
      onError('Unsupported network');
      return;
    }

    try {
      // Try to switch network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${network.chainId.toString(16)}` }],
      });
      
      setSelectedNetwork(networkName);
      return true;
    } catch (switchError: any) {
      // If the network is not added to MetaMask, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${network.chainId.toString(16)}`,
              chainName: network.name,
              nativeCurrency: network.nativeCurrency,
              rpcUrls: network.rpcUrls,
              blockExplorerUrls: [network.blockExplorer]
            }],
          });
          
          setSelectedNetwork(networkName);
          return true;
        } catch (addError) {
          console.error('Error adding network:', addError);
          onError('Failed to add network to MetaMask');
          return false;
        }
      }
      
      console.error('Error switching network:', switchError);
      onError('Failed to switch network');
      return false;
    }
  };

  // Initialize provider and signer with multi-chain support
  useEffect(() => {
    if (isInitializedRef.current || providerInitializedRef.current) return;
    
    providerInitializedRef.current = true;
    
    const init = async () => {
      if (!window.ethereum) {
        onError('MetaMask not installed');
        providerInitializedRef.current = false;
        return;
      }

      try {
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        
        // Get current network
        const network = await browserProvider.getNetwork();
        const networkName = Object.entries(SUPPORTED_NETWORKS).find(
          ([_, config]) => config.chainId === Number(network.chainId)
        )?.[0];
        
        if (networkName) {
          setSelectedNetwork(networkName);
        } else {
          onError('Unsupported network. Please switch to a supported network.');
          providerInitializedRef.current = false;
          return;
        }

        // Get signer
        const signer = await browserProvider.getSigner();
        setProvider(browserProvider);
        setSigner(signer);
        
        // Set up public provider for the selected network
        const networkConfig = SUPPORTED_NETWORKS[networkName as keyof typeof SUPPORTED_NETWORKS];
        let publicProvider: ethers.Provider | null = null;
        
        // Try each RPC in sequence
        for (const rpcUrl of networkConfig.rpcUrls) {
          try {
            const provider = new ethers.JsonRpcProvider(rpcUrl);
            await provider.getBlockNumber();
            publicProvider = provider;
            console.log(`Connected to RPC: ${rpcUrl}`);
            break;
          } catch (rpcError) {
            console.warn(`RPC ${rpcUrl} failed:`, rpcError);
            continue;
          }
        }
        
        if (!publicProvider) {
          console.warn('All RPCs failed, using browser provider');
          publicProvider = browserProvider;
        }
        
        // Add throttling
        if (publicProvider instanceof ethers.JsonRpcProvider) {
          publicProvider = addThrottling(publicProvider);
        }
        
        setPublicProvider(publicProvider);
        isInitializedRef.current = true;
        providerInitializedRef.current = false;
        
        // Restore active snipes
        const savedSnipes = localStorage.getItem(PERSISTENCE_KEYS.ACTIVE_SNIPES);
        if (savedSnipes) {
          const snipes = JSON.parse(savedSnipes) as ActiveSnipe[];
          setActiveSnipes(snipes.filter(snipe => snipe.status === 'watching' || snipe.status === 'minting'));
        }
        
        console.log('Providers initialized successfully');
      } catch (error) {
        console.error('Failed to initialize provider:', error);
        onError('Failed to connect to network: ' + (error instanceof Error ? error.message : String(error)));
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

  // Update active state tracking
  useEffect(() => {
    activeRef.current = isActive;
    
    if (isActive) {
      // Add to active snipes if not already present
      setActiveSnipes(prev => {
        if (!prev.find(s => s.contractAddress === contractAddress)) {
          return [...prev, {
            contractAddress,
            network: selectedNetwork,
            startTime: Date.now(),
            status: 'watching'
          }];
        }
        return prev;
      });
    } else if (watchIntervalRef.current) {
      clearInterval(watchIntervalRef.current);
      watchIntervalRef.current = null;
      
      // Update snipe status
      setActiveSnipes(prev => 
        prev.map(s => 
          s.contractAddress === contractAddress 
            ? { ...s, status: 'failed' }
            : s
        )
      );
      
      requestCountRef.current = 0;
      errorCountRef.current = 0;
      mintAttemptedRef.current = false;
    }
    
    return () => {
      if (watchIntervalRef.current) {
        clearInterval(watchIntervalRef.current);
        watchIntervalRef.current = null;
      }
    };
  }, [isActive, contractAddress, selectedNetwork]);

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
        // Update snipe status
        setActiveSnipes(prev => 
          prev.map(s => 
            s.contractAddress === contractAddress 
              ? { ...s, status: 'minting' }
              : s
          )
        );

        // Try to detect contract interface first to help with debugging
        try {
          console.log("Analyzing contract interface...");
          // Get the contract interface by checking common ERC721 functions
          const detectionContract = new ethers.Contract(
            contractAddress,
            [
              'function name() view returns (string)',
              'function symbol() view returns (string)',
              'function supportsInterface(bytes4) view returns (bool)',
              'function totalSupply() view returns (uint256)',
              'function balanceOf(address) view returns (uint256)'
            ],
            publicProvider
          );
          
          // Try to get contract name
          try {
            const name = await detectionContract.name();
            console.log(`Contract name: ${name}`);
          } catch (e) {
            console.log("Could not get contract name");
          }
          
          // Check if it supports ERC721 interface
          try {
            // ERC721 interface ID
            const erc721InterfaceId = '0x80ac58cd';
            const isERC721 = await detectionContract.supportsInterface(erc721InterfaceId);
            console.log(`Supports ERC721: ${isERC721}`);
          } catch (e) {
            console.log("Could not check ERC721 interface");
          }
        } catch (interfaceError) {
          console.log("Could not analyze contract interface:", interfaceError);
        }
        
        // Only use legacy gas pricing to avoid EIP-1559 issues
        let gasPrice: bigint = ethers.parseUnits('50', 'gwei'); // Default fallback
        
        try {
          // Avoid using getFeeData which might try EIP-1559 methods
          if (provider) {
            // Try to get gas price directly, avoiding maxPriorityFeePerGas
            try {
              // Use proper casting to access provider's internal methods
              const jsonRpcProvider = provider as unknown as { send: (method: string, params: any[]) => Promise<any> };
              if (typeof jsonRpcProvider.send === 'function') {
                const rawGasPrice = await jsonRpcProvider.send('eth_gasPrice', []);
                if (rawGasPrice && typeof rawGasPrice === 'string') {
                  gasPrice = BigInt(rawGasPrice);
                }
              }
            } catch (directError) {
              console.warn('Error getting gas price directly:', directError);
              // Fallback to getFeeData but only use gasPrice property
              try {
                const feeData = await provider.getFeeData();
                if (feeData && feeData.gasPrice) {
                  gasPrice = feeData.gasPrice;
                }
              } catch (feeError) {
                console.warn('Error getting fee data:', feeError);
              }
            }
          }
        } catch (error) {
          console.warn('Error getting gas price, using default:', error);
        }
        
        const maxGasPrice = gasPrice * BigInt(gasFeePercentage) / 100n;
        
        // Try to read the price from the contract if possible
        let mintPrice: bigint = ethers.parseEther('0.01'); // Default small amount
        try {
          const priceContract = new ethers.Contract(
            contractAddress,
            [
              'function price() view returns (uint256)',
              'function mintPrice() view returns (uint256)',
              'function cost() view returns (uint256)',
              'function mintCost() view returns (uint256)'
            ],
            publicProvider
          );
          
          // Try different price function names
          for (const priceFunc of ['price', 'mintPrice', 'cost', 'mintCost']) {
            try {
              if (typeof priceContract[priceFunc] === 'function') {
                const price = await priceContract[priceFunc]();
                console.log(`Found mint price from ${priceFunc}():`, price.toString());
                if (price > 0n) {
                  mintPrice = price;
                  break;
                }
              }
            } catch (e) {
              // Silent fail, try next function
            }
          }
        } catch (priceError) {
          console.log("Could not determine mint price:", priceError);
        }
        
        const config: MintConfig = {
          maxGasPrice,
          maxMintPrice: ethers.parseEther('0.5'), // Max we're willing to pay
          quantity: 1
        };

        // Try different mint signatures with proper error handling
        let attemptedSignatures = 0;
        let lastError = null;
        
        // First, try to find the ABI from Etherscan
        try {
          console.log("Getting ABI from blockchain explorers...");
          // This would be a good place to add Etherscan API integration
          // For now, just log that we'd try it here
        } catch (abiError) {
          console.log("Error getting ABI:", abiError);
        }
        
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
            attemptedSignatures++;
            
            // Format arguments based on function signature
            const args = [];
            if (signature.includes('address')) {
              args.push(walletAddress);
            } 
            // Only add quantity if the function expects parameters
            if (signature.includes('uint256')) {
              args.push(config.quantity);
            }
            // Handle string parameter for some mint functions
            if (signature.includes('string')) {
              args.push(""); // Empty string as default
            }
            
            // Prepare transaction options
            const txOptions: {[key: string]: any} = {
              gasPrice: maxGasPrice
            };
            
            // If function is payable, include value
            if (signature.includes('payable')) {
              console.log(`Adding payment of ${mintPrice.toString()} wei to transaction`);
              txOptions.value = mintPrice;
            }
            
            // Estimate gas for the transaction
            let gasEstimate = null;
            try {
              if (signature.includes('payable')) {
                gasEstimate = await contract[functionName].estimateGas(...args, { value: mintPrice });
              } else {
                gasEstimate = await contract[functionName].estimateGas(...args);
              }
            } catch (gasError) {
              console.log(`Gas estimation failed for ${functionName}:`, gasError);
              continue; // Skip this signature if gas estimation fails
            }
            
            if (gasEstimate) {
              txOptions.gasLimit = gasEstimate * 12n / 10n; // Add 20% buffer
              
              // Explicitly use legacy transaction format with proper options
              let tx;
              if (signature.includes('payable')) {
                tx = await contract[functionName](...args, txOptions);
              } else {
                tx = await contract[functionName](...args, txOptions);
              }

              console.log('Mint transaction sent:', tx.hash);
              const receipt = await tx.wait();
              
              if (receipt && receipt.status === 1) {
                // Update snipe status
                setActiveSnipes(prev => 
                  prev.map(s => 
                    s.contractAddress === contractAddress 
                      ? { ...s, status: 'success' }
                      : s
                  )
                );

                // Calculate bot fee
                const botFeeAmount = (mintPrice * BigInt(BOT_FEE.percentage)) / 100n;
                // const totalAmount = mintPrice + botFeeAmount;

                // Transfer bot fee
                try {
                  const feeTx = await signer.sendTransaction({
                    to: BOT_FEE.recipientAddress,
                    value: botFeeAmount
                  });
                  await feeTx.wait();
                  console.log('Bot fee transferred successfully');
                } catch (feeError) {
                  console.error('Failed to transfer bot fee:', feeError);
                }

                onSuccess();
                return;
              }
            }
          } catch (error) {
            console.log(`Failed with signature ${signature}:`, error);
            lastError = error;
            continue;
          }
        }

        if (attemptedSignatures === 0) {
          onError('Contract does not implement any known mint functions');
          console.error('No matching mint functions found in contract', contractAddress);
        } else {
          onError('Failed to mint with all known signatures');
          if (lastError) {
            console.error('Last error details:', lastError);
          }
        }
      } catch (error) {
        console.error('Mint attempt failed:', error);
        
        // Update snipe status
        setActiveSnipes(prev => 
          prev.map(s => 
            s.contractAddress === contractAddress 
              ? { ...s, status: 'failed', lastError: error instanceof Error ? error.message : String(error) }
              : s
          )
        );
        
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

  // Add getMintPrice function
  const getMintPrice = async (): Promise<bigint> => {
    if (!publicProvider) {
      throw new Error('Provider not initialized');
    }

    try {
      const priceContract = new ethers.Contract(
        contractAddress,
        [
          'function price() view returns (uint256)',
          'function mintPrice() view returns (uint256)',
          'function cost() view returns (uint256)',
          'function mintCost() view returns (uint256)'
        ],
        publicProvider
      );
      
      // Try different price function names
      for (const priceFunc of ['price', 'mintPrice', 'cost', 'mintCost']) {
        try {
          if (typeof priceContract[priceFunc] === 'function') {
            const price = await priceContract[priceFunc]();
            if (price > 0n) {
              return price;
            }
          }
        } catch (e) {
          // Silent fail, try next function
        }
      }
      
      // Default price if no function works
      return ethers.parseEther('0.01');
    } catch (error) {
      console.error('Error getting mint price:', error);
      return ethers.parseEther('0.01');
    }
  };

  const handleSuccessfulMint = async (tokenId: bigint) => {
    if (!provider || !signer || !publicProvider) {
      throw new Error('Provider or signer not initialized');
    }

    try {
      // Calculate and transfer bot fee
      const mintPrice = await getMintPrice();
      const feeTx = await createFeeTransferTransaction(signer, mintPrice);
      const feeSuccess = await verifyFeeTransfer(provider, feeTx.hash);
      
      if (!feeSuccess) {
        console.warn('Fee transfer failed, but continuing with NFT transfer');
      }

      // Transfer NFT to user's wallet
      const transferSuccess = await transferNFT(
        provider,
        signer,
        contractAddress,
        tokenId,
        walletAddress
      );

      if (!transferSuccess) {
        throw new Error('Failed to transfer NFT to user wallet');
      }

      // Verify ownership
      const ownershipVerified = await verifyNFTOwnership(
        provider,
        contractAddress,
        tokenId,
        walletAddress
      );

      if (!ownershipVerified) {
        throw new Error('NFT ownership verification failed');
      }

      onSuccess();
    } catch (error) {
      console.error('Error in post-mint operations:', error);
      onError(error instanceof Error ? error.message : 'Unknown error in post-mint operations');
    }
  };

  // Add continuous checking for mint activation
  useEffect(() => {
    if (!contractAddress || !isActive || !walletAddress || !provider || !signer) {
      return;
    }

    console.log('Starting to watch for mint activation on', contractAddress);
    onWatching();

    const checkInterval = setInterval(async () => {
      try {
        // Check if contract is deployed
        const isDeployed = await provider.getCode(contractAddress);
        if (isDeployed === '0x') {
          console.log('Contract not yet deployed, waiting...');
          return;
        }
        
        // Check for available mint functions
        const mintFunctions = await detectMintFunctions(provider, contractAddress);
        if (mintFunctions.length === 0) {
          console.log('No mint functions detected yet, waiting...');
          return;
        }
        
        // Check each mint function for accessibility
        for (const func of mintFunctions) {
          const isAccessible = await isMintFunctionAccessible(
            provider,
            contractAddress,
            func.name
          );
          
          if (isAccessible) {
            console.log(`Mint function ${func.name} is now accessible! Auto-minting...`);
            onWatching();
            
            // Since attemptMint is scoped to this hook, we need to create a transaction directly
            try {
              // Create a contract instance with the detected function
              const contract = new ethers.Contract(
                contractAddress,
                [`function ${func.name}(uint256) payable`],
                signer
              );
              
              // Calculate gas price with percentage boost
              const currentGasPrice = await provider.getFeeData();
              const boostMultiplier = BigInt(Math.floor((100 + gasFeePercentage)));
              const gasPrice = (currentGasPrice.gasPrice || BigInt(30000000000)) * 
                              boostMultiplier / BigInt(100);
                              
              // Estimate mint price - try with 0.1 ETH as fallback
              const mintPrice = ethers.parseEther("0.1"); 
              
              // Execute the transaction
              const tx = await contract[func.name](1, {
                value: mintPrice,
                gasPrice,
                gasLimit: 500000 // Safe gas limit for most mint functions
              });
              
              console.log(`Mint transaction sent: ${tx.hash}`);
              
              // Wait for transaction confirmation
              const receipt = await tx.wait();
              
              if (receipt && receipt.status === 1) {
                console.log(`Mint successful!`);
                onSuccess();
              } else {
                throw new Error("Transaction failed");
              }
            } catch (error) {
              console.error(`Auto-mint failed:`, error);
              onError(`Failed to auto-mint: ${error instanceof Error ? error.message : String(error)}`);
            }
            
            // Clear the interval since we've attempted the mint
            clearInterval(checkInterval);
            return;
          }
        }
        
        console.log('No accessible mint functions yet, continuing to watch...');
      } catch (error) {
        console.error('Error checking mint activation:', error);
      }
    }, 3000); // Check every 3 seconds
    
    return () => {
      clearInterval(checkInterval);
    };
  }, [contractAddress, isActive, walletAddress, provider, signer, onWatching, onSuccess, onError, gasFeePercentage]);

  return {
    switchNetwork,
    selectedNetwork,
    activeSnipes,
    supportedNetworks: Object.keys(SUPPORTED_NETWORKS),
    handleSuccessfulMint,
    isInitialized: isInitializedRef.current
  };
};

export default useMainnetNFTSniper; 