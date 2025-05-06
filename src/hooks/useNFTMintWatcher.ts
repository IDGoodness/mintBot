import { useEffect, useRef, useState } from 'react';
import { ethers } from 'ethers';

// ABI fragments for our contracts
const NFTSniperABI = [
  "function setupTarget(address nftContract, bytes4 mintSig, uint256 maxGasPrice, uint256 maxMintPrice) external",
  "function deposit() external payable",
  "function withdraw(uint256 amount) external",
  "function executeMint(address nftContract, uint256 quantity, uint256 mintPrice, uint256 gasPrice) external",
  "function setTargetActive(address nftContract, bool active) external",
  "function mintConfigurations(address user, address nftContract) external view returns (bytes4 mintSignature, uint256 maxGasPrice, uint256 maxMintPrice, bool active)",
  "function userBalances(address user) external view returns (uint256)"
];

const NFTWatcherABI = [
  "function setupWatcher(address nftContract, uint256 quantity, uint256 maxPrice, uint256 gasMultiplier, bool autoMint) external",
  "function triggerMint(address nftContract) external",
  "function stopWatching(address nftContract) external",
  "function watchConfigurations(address user, address nftContract) external view returns (bool isWatching, uint256 quantity, uint256 maxPrice, uint256 gasMultiplier, bool autoMint)",
  "function launchInfo(address nftContract) external view returns (bool hasLaunched, uint256 launchTimestamp, uint256 detectedPrice, uint256 mintCount)"
];

const NFT_SNIPER_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; 
const NFT_WATCHER_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

interface SniperConfig {
  percentage: number;
  isActive: boolean;
}

declare global {
  interface Window {
    ethereum: any;
    mintContracts?: {
      sniper: ethers.Contract;
      watcher: ethers.Contract;
    };
  }
}

/**
 * Hook to watch for NFT launches and automatically mint when detected
 */
const useNFTMintWatcher = (
  contractAddress: string,
  sniperConfig: SniperConfig,
  gasFeePercentage: number,
  walletAddress: string,
  onWatching: () => void,
  onSuccess: () => void,
  onError: (error: string) => void
) => {
  const wsRef = useRef<WebSocket | null>(null);
  const attemptedMintRef = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [sniperContract, setSniperContract] = useState<ethers.Contract | null>(null);
  const [watcherContract, setWatcherContract] = useState<ethers.Contract | null>(null);
  
  // Add this ref for Etherscan monitoring
  const etherscanLastTxCountRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (!walletAddress || !contractAddress || !window.ethereum) {
      return;
    }
    
    const initializeContracts = async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        const sniper = new ethers.Contract(
          NFT_SNIPER_ADDRESS,
          NFTSniperABI,
          signer
        );
        
        const watcher = new ethers.Contract(
          NFT_WATCHER_ADDRESS,
          NFTWatcherABI,
          signer
        );
        
        setSniperContract(sniper);
        setWatcherContract(watcher);
        
        window.mintContracts = {
          sniper,
          watcher
        };
        
        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to initialize contracts:", error);
        onError("Failed to initialize contract interfaces");
      }
    };
    
    initializeContracts();
  }, [walletAddress, contractAddress]);

  useEffect(() => {
    if (!sniperConfig.isActive || !isInitialized || !contractAddress || !walletAddress || !sniperContract || !watcherContract) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      attemptedMintRef.current = false;
      return;
    }
    
    const setupWatcher = async () => {
      try {
        onWatching();
        
        const provider = new ethers.BrowserProvider(window.ethereum);
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice || ethers.parseUnits("20", "gwei");
        
        // Calculate max gas price based on user's gasFeePercentage setting
        const maxGasPrice = gasPrice * BigInt(Math.floor(gasFeePercentage)) / 100n;
        
        // Default max mint price - in a production app, this could be dynamically set
        const maxMintPrice = ethers.parseEther("0.1");
        
        console.log(`Setting up NFT sniping for ${contractAddress}`);
        console.log(`Max gas price: ${ethers.formatUnits(maxGasPrice, "gwei")} gwei`);
        console.log(`Max mint price: ${ethers.formatEther(maxMintPrice)} ETH`);
        
        // Check if user has enough balance in the contract
        try {
          const userBalance = await sniperContract.userBalances(walletAddress);
          if (userBalance < maxMintPrice) {
            onError(`Insufficient funds in NFT Sniper. Please deposit at least ${ethers.formatEther(maxMintPrice)} ETH`);
            return;
          }
        } catch (err) {
          console.error("Error checking user balance:", err);
        }
        
        // Setup target in NFTSniper contract
        // We use 0x00000000 as initial mintSignature, it will be auto-detected
        try {
          const tx1 = await sniperContract.setupTarget(
            contractAddress,
            "0x00000000", 
            maxGasPrice,
            maxMintPrice
          );
          await tx1.wait();
          console.log("Target setup successful in NFTSniper");
        } catch (err) {
          console.error("Error setting up target in NFTSniper:", err);
          onError(`Failed to set up target: ${err instanceof Error ? err.message : String(err)}`);
          return;
        }
        
        // Setup watcher in NFTWatcher contract
        try {
          const tx2 = await watcherContract.setupWatcher(
            contractAddress,
            1,  // quantity
            maxMintPrice,
            gasFeePercentage * 100, // gas multiplier in basis points (100 = 1x)
            true // autoMint
          );
          await tx2.wait();
          console.log("Watcher setup successful in NFTWatcher");
        } catch (err) {
          console.error("Error setting up watcher in NFTWatcher:", err);
          onError(`Failed to set up watcher: ${err instanceof Error ? err.message : String(err)}`);
          return;
        }
        
        // Start monitoring for mint events
        setupBlockchainMonitoring();
        setupWebsocketMonitoring();
      } catch (error) {
        console.error("Failed to setup watcher:", error);
        onError(`Failed to setup watcher: ${error instanceof Error ? error.message : String(error)}`);
      }
    };
    
    // Monitor blockchain directly for events
    const setupBlockchainMonitoring = () => {
      const checkInterval = setInterval(async () => {
        if (!isInitialized || !contractAddress || !watcherContract) {
          clearInterval(checkInterval);
          return;
        }
        
        try {
          // Check if the NFT has launched according to our watcher contract
          const launchInfo = await watcherContract.launchInfo(contractAddress);
          
          if (launchInfo.hasLaunched) {
            console.log("Mint launch detected via blockchain monitoring!");
            if (attemptedMintRef.current) return;
            attemptedMintRef.current = true;
            
            await triggerMint();
            clearInterval(checkInterval);
          }
        } catch (err) {
          console.error("Error checking launch status:", err);
        }
      }, 5000); // Check every 5 seconds
      
      // Clean up interval on unmount
      return () => clearInterval(checkInterval);
    };
    
    const setupWebsocketMonitoring = () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      
      // Try to connect to multiple sources for redundancy
      setupOpenseaWebsocket();
      setupEtherscanEventMonitoring();
    };
    
    const setupOpenseaWebsocket = () => {
      try {
        const ws = new WebSocket('wss://api.opensea.io/ws/events');
        wsRef.current = ws;
        
        ws.onopen = () => {
          console.log('Connected to OpenSea WebSocket');
          ws.send(JSON.stringify({
            type: "subscribe",
            topic: "collection",
            collection: contractAddress.toLowerCase()
          }));
        };
        
        ws.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Look for any events that might indicate a mint is happening
            if (data?.event_type === 'mint_started' || 
                data?.event_type === 'collection_offer' || 
                data?.event_type === 'item_listed' || 
                data?.event_type === 'item_sold') {
              console.log('Mint event detected via OpenSea websocket!', data);
              
              if (attemptedMintRef.current) return;
              attemptedMintRef.current = true;
              
              await triggerMint();
            }
          } catch (err) {
            console.error('Error handling websocket event:', err);
          }
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };
        
        ws.onclose = () => {
          console.log('OpenSea WebSocket connection closed');
          
          // Try to reconnect after a delay
          setTimeout(() => {
            if (sniperConfig.isActive) {
              setupOpenseaWebsocket();
            }
          }, 5000);
        };
      } catch (error) {
        console.error('Error setting up OpenSea WebSocket:', error);
      }
    };
    
    const setupEtherscanEventMonitoring = () => {
      // In a real app, you might use Etherscan's API or a service like Alchemy
      // to monitor for contract events. This is a simplified placeholder.
      console.log('Setting up additional event monitoring for contract:', contractAddress);
      
      // Poll for transaction count as a simple proxy for activity
      const checkInterval = setInterval(async () => {
        if (!isInitialized || !contractAddress || !sniperConfig.isActive) {
          clearInterval(checkInterval);
          return;
        }
        
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          
          // Check code on the contract to see if it's deployed
          const code = await provider.getCode(contractAddress);
          if (code === '0x') {
            // Contract not deployed yet, continue monitoring
            return;
          }
          
          // Try to detect if minting has started by looking at transaction count
          const txCount = await provider.getTransactionCount(contractAddress);
          
          // Store tx count in a ref to track changes
          if (!etherscanLastTxCountRef.current) {
            etherscanLastTxCountRef.current = txCount;
          } else if (txCount > etherscanLastTxCountRef.current) {
            console.log(`Transaction count increased: ${etherscanLastTxCountRef.current} -> ${txCount}`);
            etherscanLastTxCountRef.current = txCount;
            
            // Significant activity may indicate minting has started
            if (txCount - etherscanLastTxCountRef.current > 5 && !attemptedMintRef.current) {
              console.log('Significant activity detected - attempting mint');
              attemptedMintRef.current = true;
              await triggerMint();
              clearInterval(checkInterval);
            }
          }
        } catch (err) {
          console.error('Error in Etherscan monitoring:', err);
        }
      }, 3000); // Check every 3 seconds
      
      // Return cleanup function
      return () => clearInterval(checkInterval);
    };
    
    setupWatcher();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [contractAddress, sniperConfig.isActive, isInitialized, gasFeePercentage, walletAddress, sniperContract, watcherContract]);
  
  const triggerMint = async () => {
    if (!isInitialized || !contractAddress || !watcherContract || !sniperContract) {
      onError('System not initialized');
      return;
    }
    
    try {
      // First check if the NFT has already launched according to our watcher contract
      const launchInfo = await watcherContract.launchInfo(contractAddress);
      
      // Get current gas price for dynamic adjustment
      const provider = new ethers.BrowserProvider(window.ethereum);
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || ethers.parseUnits("20", "gwei");
      
      // Adjust gas price based on user settings
      const adjustedGasPrice = gasPrice * BigInt(Math.floor(gasFeePercentage)) / 100n;
      
      console.log("Attempting to trigger NFT mint");
      console.log("Has already launched:", launchInfo.hasLaunched);
      console.log("Current gas price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");
      console.log("Adjusted gas price:", ethers.formatUnits(adjustedGasPrice, "gwei"), "gwei");
      
      let tx;
      
      if (launchInfo.hasLaunched) {
        // First try to use the NFTWatcher.triggerMint which handles auto-detection
        console.log("NFT has launched - using NFTWatcher.triggerMint");
        tx = await watcherContract.triggerMint(contractAddress);
      } else {
        // If the watcher hasn't detected a launch yet, try direct minting
        console.log("NFT not detected as launched yet - trying direct mint via NFTSniper");
        
        // Check mint configuration for this contract
        const config = await sniperContract.mintConfigurations(walletAddress, contractAddress);
        if (!config.active) {
          onError("Target not active in NFTSniper configuration");
          return;
        }
        
        // For direct minting, we need to estimate mint price
        // In a production app, you would query the NFT contract or use an oracle
        const estimatedPrice = ethers.parseEther("0.08");
        
        console.log("Estimated mint price:", ethers.formatEther(estimatedPrice), "ETH");
        
        // Check user balance in NFTSniper
        const userBalance = await sniperContract.userBalances(walletAddress);
        console.log("User balance in NFTSniper:", ethers.formatEther(userBalance), "ETH");
        
        if (userBalance < estimatedPrice) {
          onError(`Insufficient funds in NFT Sniper. You have ${ethers.formatEther(userBalance)} ETH, but need at least ${ethers.formatEther(estimatedPrice)} ETH`);
          return;
        }
        
        // Execute mint through NFTSniper
        tx = await sniperContract.executeMint(
          contractAddress,
          1, // quantity
          estimatedPrice,
          adjustedGasPrice
        );
      }
      
      console.log('Mint transaction sent:', tx.hash);
      onError(`Mint transaction sent: ${tx.hash.substring(0, 10)}...`); // Use error to display info temporarily
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('Mint transaction confirmed:', receipt);
      
      // Check if the transaction was successful
      if (receipt.status === 1) {
        onSuccess();
        return receipt;
      } else {
        onError('Transaction completed but may have failed');
        return receipt;
      }
    } catch (error) {
      console.error('Mint execution error:', error);
      onError(`Mint failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  };
  
  return { triggerMint };
};

export default useNFTMintWatcher; 