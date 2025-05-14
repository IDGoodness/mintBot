import React, { useState, useEffect, useRef } from 'react';
import logo from "../assets/logo-remove.png";
import { ethers } from 'ethers';
import NetworkSwitcher from './NetworkSwitcher';
import { TransactionService } from '../services/TransactionService';
import ProcessWarning from './ProcessWarning';
import contractMonitorService from '../services/ContractMonitorService';

// Import all NFT fallback images
import nft1 from "../assets/nft1.png";
import nft2 from "../assets/nft2.png";
import nft3 from "../assets/nft3.png";
import nft4 from "../assets/nft4.png";
import nft5 from "../assets/nft5.png";

import useMainnetNFTSniper from '../hooks/useMainnetNFTSniper';
import { validateNFTContract, getNFTContractInfo } from '../utils/contractUtils';
import { extractContractAddress, getMarketplaceNFTData } from '../utils/marketplaceUtils';
import EnhancedNFTCard from './EnhancedNFTCard';
import NotificationModal from './NotificationModal';

interface DashboardPanelProps {
  status: string;
  contractAddress: string;
  walletAddress: string;
  onProcessingChange: (isProcessing: boolean) => void;
  onViewUpcoming?: () => void;
}

const DashboardPanel: React.FC<DashboardPanelProps> = ({
  status,
  contractAddress,
  walletAddress,
  onProcessingChange,
}) => {
  const [currentNetwork, setCurrentNetwork] = useState<any>(null);
  const transactionService = useRef<TransactionService | null>(null);

  const [address, setAddress] = useState(contractAddress || '');
  const [inputValue, setInputValue] = useState('');
  const [nfts, setNfts] = useState<any[]>([]);
  const [nftError, setNftError] = useState<string | null>(null);
  const [loadingNfts, setLoadingNfts] = useState(false);
  const [gasFee, setGasFee] = useState(100);
  const [currentFloor, setCurrentFloor] = useState(0);
  const [botActive, setBotActive] = useState(false);
  const [botStatus, setBotStatus] = useState('Ready');
  const [mintSuccess, setMintSuccess] = useState(false);
  const fallbackImages = [nft1, nft2, nft3, nft4, nft5];
  
  // Notification state
  const [showModal, setShowModal] = useState(false);
  const [modalProps, setModalProps] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'loading'
  });
  
  // Use a simpler notification system
  const showNotification = (title: string, message: string, type: 'success' | 'error' | 'info' | 'loading') => {
    // Set the modal properties first
    setModalProps({
      title,
      message,
      type
    });
    
    // Then show the modal
    setShowModal(true);
  };
  
  // Simple close handler
  const handleModalClose = () => {
    setShowModal(false);
  };
  
  console.log(address, currentFloor);
  
  const baseGasFee = 0.1;
  const adjustedGasFee = (baseGasFee * gasFee) / 100;
  
  const [activationLoading, setActivationLoading] = useState(false);
  const activationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [checkingContract, setCheckingContract] = useState(false);
  
  // Add a new state to track connection status
  const [networkStatus, setNetworkStatus] = useState<'connected'|'connecting'|'error'>('connecting');

  const [showMonitorOption, setShowMonitorOption] = useState<boolean>(false);

  useEffect(() => {
    const initTransactionService = async () => {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        transactionService.current = new TransactionService(signer);
      }
    };

    initTransactionService();
    
    // Setup auto-activation callback
    contractMonitorService.setAutoActivationCallback((contract) => {
      console.log(`Auto-activation triggered for contract: ${contract.contractAddress}`);
      // Update UI to reflect auto-activation
      setBotStatus(`Contract ${contract.name} deployed! Auto-activating bot...`);
      
      // Wait a moment to let the user see what's happening
      setTimeout(() => {
        // Use the address from the deployed contract
        setInputValue(contract.contractAddress);
        
        // Activate the bot
        activateBot(contract.contractAddress, true);
      }, 1500);
    });
    
    return () => {
      if (activationIntervalRef.current) {
        clearInterval(activationIntervalRef.current);
      }
    };
  }, []);

  useMainnetNFTSniper(
    inputValue,
    botActive,
    gasFee,
    walletAddress,
    () => {
      setBotStatus('Watching for mint...');
    },
    (tokenId?: number) => {
      setBotStatus('Mint successful!');
      setMintSuccess(true);
      if (tokenId !== undefined) {
        handleSuccessfulSnipe(tokenId);
      }
    },
    (error: string) => {
      setBotStatus(`Error: ${error}`);
      showNotification('Error Occurred', error, 'error');
    }
  );

  const shortenAddress = (addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

  const switchToMainnet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask to connect to Ethereum Mainnet");
      return;
    }

    try {
      // Request switch to Ethereum Mainnet
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x1' }] // Mainnet chainId
      });
    } catch (error: any) {
      console.error("Error switching to Mainnet:", error);
      setBotStatus('Error switching to Mainnet');
    }
  };

  const fetchNFTDetails = async () => {
    // Clean up and normalize the input first
    const rawInput = inputValue.trim();
    const contract = extractContractAddress(rawInput);
    
    console.log('Starting fetch for:', contract);
  
    try {
      if (!ethers.isAddress(contract)) {
        throw new Error('Invalid Ethereum address format');
      }
  
      setLoadingNfts(true);
      setNftError(null);
      setBotStatus('Fetching NFT details...');
      showNotification('Loading', 'Fetching NFT details...', 'loading');
  
      // 1. Check network connection first
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork().catch(() => {
        throw new Error('Failed to connect to Ethereum network');
      });
      
      console.log('Network:', network.name, network.chainId.toString());
      
      if (network.chainId !== 1n) {
        throw new Error('Please connect to Ethereum Mainnet');
      }
  
      // 2. Display checking message
      setCheckingContract(true);
      setBotStatus('Checking contract validity...');
      
      // 3. Try to get marketplace data from all sources
      let nftData = null;
      let contractOnChainValid = false;
      let contractInfo = null;
      
      // First check if we can get marketplace data
      setBotStatus('Checking marketplaces for NFT data...');
      const marketplaceData = await getMarketplaceNFTData(contract);
      
      if (marketplaceData) {
        // We found marketplace data
        console.log('Marketplace data found:', marketplaceData);
        
        // If it's an upcoming NFT, add it to contract monitor
        if (marketplaceData.status === 'upcoming' && marketplaceData.launchTime) {
          contractMonitorService.monitorContract(
            contract,
            marketplaceData.name,
            marketplaceData.mintPrice?.toString() || '0',
            marketplaceData.launchTime,
            10000 // Check every 10 seconds
          );
          
          // Add notification for monitoring
          setBotStatus(`Monitoring upcoming NFT: ${marketplaceData.name}`);
        }
        
        // Build NFT data from marketplace data
        nftData = {
          name: marketplaceData.name,
          symbol: marketplaceData.symbol || 'NFT',
          image: marketplaceData.imageUrl || fallbackImages[Math.floor(Math.random() * fallbackImages.length)],
          description: marketplaceData.description || 'No description available',
          contract: contract,
          floorPrice: marketplaceData.mintPrice || 0,
          totalSupply: marketplaceData.totalSupply || 0,
          launchTime: marketplaceData.launchTime || 0,
          status: marketplaceData.status
        };
      } else {
        // If we didn't find marketplace data, check on-chain
        setBotStatus('Checking on-chain data...');
        
        try {
          // Check if the contract exists at all
          const code = await provider.getCode(contract);
          if (code === '0x') {
            // Contract not deployed - we'll add it to monitoring
            setBotStatus('Contract not yet deployed. Adding to monitoring...');
            
            // Add to contract monitor service with default values
            contractMonitorService.monitorContract(
              contract,
              'Unlisted NFT',
              '0',
              Math.floor(Date.now() / 1000), // Current time
              10000 // Check every 10 seconds
            );
            
            // Create a basic nft data object
            nftData = {
              name: 'Unlisted NFT Collection',
              symbol: 'NFT',
              image: fallbackImages[Math.floor(Math.random() * fallbackImages.length)],
              description: 'This NFT contract has not been deployed yet. The bot will monitor for deployment.',
              contract: contract,
              floorPrice: 0,
              totalSupply: 0,
              launchTime: 0,
              status: 'upcoming'
            };
          } else {
            // Contract exists on-chain
            const validation = await validateNFTContract(contract, provider);
            if (!validation.valid) {
              throw new Error(validation.reason || 'Invalid NFT contract');
            }
            contractOnChainValid = true;
            setBotStatus('Reading on-chain information...');
            // Get on-chain contract info
            contractInfo = await getNFTContractInfo(contract, provider);
            
            if (contractInfo) {
              // Calculate a random floor price for demonstration if not found elsewhere
              const randomFloor = (Math.random() * 0.5 + 0.01).toFixed(3);
              
              // Create nft data from on-chain info
              nftData = {
                name: contractInfo.name || 'Unnamed Collection',
                symbol: contractInfo.symbol || 'NFT',
                image: fallbackImages[Math.floor(Math.random() * fallbackImages.length)],
                description: 'NFT details loaded from on-chain data.',
                contract: contract,
                floorPrice: parseFloat(randomFloor),
                totalSupply: contractInfo.totalSupply ? Number(contractInfo.totalSupply.toString()) : 0,
                launchTime: 0,
                status: 'deployed'
              };
            } else {
              throw new Error('Failed to read NFT contract information');
            }
          }
        } catch (error) {
          // Only throw if we don't have any nftData yet
          if (!nftData) {
            if (error instanceof Error) {
              throw error;
            }
            throw new Error('Failed to validate contract');
          }
        }
      }
      
      // At this point we should have nftData from one source or another
      if (nftData) {
        setNfts([nftData]);
        setCurrentFloor(nftData.floorPrice);
        
        // Set appropriate status based on NFT state
        if (nftData.status === 'upcoming') {
          setBotStatus('Upcoming NFT found! Monitoring for deployment.');
        } else if (contractOnChainValid) {
          setBotStatus('NFT contract verified on-chain.');
        } else {
          setBotStatus('NFT details loaded from marketplace.');
        }
      } else {
        throw new Error('No NFT data found from any source');
      }
      
      setCheckingContract(false);
      
      // Use the clean close function
      handleModalClose();
      
      // Show success notification after a delay
      setTimeout(() => {
        showNotification('Success', 'NFT details loaded successfully', 'success');
      }, 300);
  
    } catch (error) {
      console.error('Full error stack:', error);
      setNftError(error instanceof Error ? error.message : 'Unknown error occurred');
      setBotStatus('Error loading NFT details');
      setCheckingContract(false);
      
      // Use the clean close function
      handleModalClose();
      
      // Wait before showing error notification
      setTimeout(() => {
        showNotification('Error', error instanceof Error ? error.message : 'Unknown error occurred', 'error');
      }, 300);
      
      // Specific error handling
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          setNftError('Network error - check internet connection');
        }
        if (error.message.includes('API')) {
          setNftError('API error - try again later');
        }
      }
    } finally {
      setLoadingNfts(false);
      console.log('Fetch completed');
    }
  };

  const activateBot = (contractAddressOverride?: string, isAutoActivated = false) => {
    const addressToUse = contractAddressOverride || inputValue;
    
    if (!addressToUse || !gasFee) {
      setNftError("Please enter a contract address and set gas fee first.");
      showNotification('Missing Information', 'Please enter a contract address and set gas fee first.', 'error');
      return;
    }
    
    // Validate contract address
    if (!ethers.isAddress(addressToUse)) {
      setNftError("Please enter a valid Ethereum contract address.");
      showNotification('Invalid Address', 'Please enter a valid Ethereum contract address.', 'error');
      return;
    }
    
    // If we have nft error, clear it
    if (nftError) {
      setNftError(null);
    }
    
    // Reset monitor option
    setShowMonitorOption(false);
    
    // Clear any existing interval
    if (activationIntervalRef.current) {
      clearInterval(activationIntervalRef.current);
    }
    
    // Show loading state
    setActivationLoading(true);
    setBotStatus(isAutoActivated ? 'Auto-activating bot...' : 'Initializing bot...');
    
    // Show loading modal during initialization only (skip for auto-activation)
    if (!isAutoActivated) {
      showNotification('Initializing', 'Bot is being initialized...', 'loading');
    }
    
    // Validate the contract before activating
    const validateContract = async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const validation = await validateNFTContract(addressToUse, provider);
        
        if (!validation.valid) {
          setActivationLoading(false);
          setNftError(validation.reason || 'Invalid NFT contract');
          
          // Check if the reason is specifically that the contract is not deployed
          if (validation.reason === 'Contract not deployed at this address') {
            // Offer to monitor instead
            setBotStatus('Contract not deployed - monitoring recommended');
            
            // Close loading modal
            handleModalClose();
            
            // Show a different notification that offers monitoring
            showNotification(
              'Contract Not Deployed', 
              'This contract is not yet deployed. Would you like to monitor for its deployment?', 
              'info'
            );
            
            // Add logic to show monitor option
            setShowMonitorOption(true);
            
            return false;
          } else {
            // For other errors, show standard error
            setBotStatus('Error: Invalid contract');
            
            // Close loading modal
            handleModalClose();
            
            // Show error notification
            showNotification('Invalid Contract', validation.reason || 'Invalid NFT contract', 'error');
            return false;
          }
        }
        
        return true;
      } catch (error) {
        console.error('Error validating contract:', error);
        setActivationLoading(false);
        setNftError('Error validating contract');
        setBotStatus('Error: Could not validate contract');
        
        // Close loading modal
        handleModalClose();
        
        // Show error notification
        showNotification('Validation Error', 'Could not validate NFT contract', 'error');
        return false;
      }
    };
    
    // Start validation and then activation process
    validateContract().then(isValid => {
      if (!isValid) return;
      
      // Wait for 1 second to simulate initialization
      setTimeout(() => {
        setActivationLoading(false);
        setBotActive(true);
        setBotStatus('Bot activated! Watching for mint...');
        onProcessingChange(true); // Show the warning message
        
        // Close loading modal
        handleModalClose();
        
        // Set a timeout to show some activity feedback
        let dotCount = 0;
        activationIntervalRef.current = setInterval(() => {
          if (!botActive) {
            if (activationIntervalRef.current) {
              clearInterval(activationIntervalRef.current);
            }
            return;
          }
          
          dotCount = (dotCount + 1) % 4;
          const dots = '.'.repeat(dotCount);
          setBotStatus(`Watching for mint${dots}`);
        }, 800);
      }, 1000);
    });
  };

  const deactivateBot = () => {
    // First close any open modals
    handleModalClose();
    
    // Clear the animation interval
    if (activationIntervalRef.current) {
      clearInterval(activationIntervalRef.current);
      activationIntervalRef.current = null;
    }
    
    // Reset monitor option
    setShowMonitorOption(false);
    
    // Update state
    setBotActive(false);
    setBotStatus('Bot deactivated');
    onProcessingChange(false); // Hide the warning message
  };

  useEffect(() => {
    if (contractAddress) setAddress(contractAddress);
  }, [contractAddress]);

  // Reset the monitor option when the input value changes
  useEffect(() => {
    setShowMonitorOption(false);
  }, [inputValue]);

  // Update the useEffect that checks network
  useEffect(() => {
    const checkNetwork = async () => {
      if (!window.ethereum) {
        setBotStatus('Please install MetaMask');
        setNetworkStatus('error');
        return;
      }
      
      setNetworkStatus('connecting');
      
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        
        // Update currentNetwork state
        setCurrentNetwork(network);
        
        if (network.chainId !== 1n) { // Ethereum Mainnet
          setBotStatus('Please connect to Ethereum Mainnet');
          setNetworkStatus('error');
          // Prompt to switch
          await switchToMainnet();
        } else {
          setBotStatus('Connected to Ethereum Mainnet');
          setNetworkStatus('connected');
        }
      } catch (error) {
        console.error("Error checking network:", error);
        setBotStatus('Error checking network');
        setNetworkStatus('error');
      }
    };
    
    checkNetwork();
    
    // Also listen for network changes
    if (window.ethereum) {
      window.ethereum.on('chainChanged', (chainId: string) => {
        console.log('Chain changed to:', chainId);
        checkNetwork();
      });
      
      window.ethereum.on('accountsChanged', () => {
        checkNetwork();
      });
    }
    
    return () => {
      // Clean up listeners
      if (window.ethereum) {
        window.ethereum.removeListener('chainChanged', checkNetwork);
        window.ethereum.removeListener('accountsChanged', checkNetwork);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (activationIntervalRef.current) {
        clearInterval(activationIntervalRef.current);
      }
    };
  }, []);

  const handleSuccessfulSnipe = async (tokenId: number) => {
    if (!transactionService.current) {
      showNotification('Error', 'Transaction service not initialized', 'error');
      return;
    }

    try {
      onProcessingChange(true);
      setBotStatus('Processing successful snipe...');

      const result = await transactionService.current.handleSuccessfulSnipe(
        inputValue,
        tokenId,
        walletAddress
      );

      if (result.success) {
        // Show success notification
        showNotification(
          'Success!', 
          `Successfully sniped NFT #${tokenId} from contract ${shortenAddress(inputValue)}`, 
          'success'
        );
        
        // Update UI
        setBotStatus('NFT successfully sniped!');
        setMintSuccess(true);
      } else {
        throw new Error('NFT transfer failed');
      }
    } catch (error) {
      console.error('Error handling successful snipe:', error);
      showNotification('Error', 'Failed to process successful snipe', 'error');
    } finally {
      onProcessingChange(false);
      // Deactivate bot after successful or failed snipe
      deactivateBot();
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-[#0f172a] overflow-hidden text-white p-6">
      {/* Process Warning */}
      <ProcessWarning isVisible={botActive} />

      {/* Monitoring Indicator */}
      {contractMonitorService.getMonitoredContracts().length > 0 && (
        <div className="fixed top-0 left-0 right-0 bg-blue-600 py-2 text-center z-50 flex items-center justify-center">
          <div className="w-3 h-3 bg-blue-300 rounded-full mr-2 animate-pulse"></div>
          <span className="font-medium">
            Monitoring {contractMonitorService.getMonitoredContracts().length} contract(s) for deployment
          </span>
          {contractMonitorService.getMonitoredContracts().some(c => c.autoActivate) && (
            <span className="ml-2 bg-green-700 text-green-100 px-2 py-0.5 rounded-full text-xs">
              Auto-Activation Enabled
            </span>
          )}
        </div>
      )}

      {/* Simple modal rendering - only keep for errors and loading states */}
      {showModal && (
        <NotificationModal
          isOpen={showModal}
          onClose={handleModalClose}
          title={modalProps.title}
          message={modalProps.message}
          type={modalProps.type}
        />
      )}

      {/* Glowing Orbs */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-100px] left-[-100px] w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
        <div className="absolute bottom-[-100px] right-[-100px] w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-2xl opacity-40 animate-pulse delay-200" />
      </div>

      {/* Network Switcher */}
      <div className="absolute top-4 right-4">
        <NetworkSwitcher
          currentNetwork={currentNetwork}
          onNetworkChange={setCurrentNetwork}
        />
      </div>

      <div className="relative z-10 w-full max-w-4xl p-8 bg-white/10 text-white rounded-3xl shadow-2xl backdrop-blur-md border border-white/20">
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <img src={logo} alt="Logo" className="w-28 h-28 object-contain rounded-xl -mb-6" />
          <h1 className="text-4xl font-extrabold tracking-wide">MintworX</h1>
        </div>

        {/* Wallet Info */}
        <div className="mb-4 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-white/80">Connected Wallet</h3>
            <p className="text-sm text-white/60">{shortenAddress(walletAddress)}</p>
          </div>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${
              networkStatus === 'connected' ? 'bg-green-500' : 
              networkStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
              'bg-red-500'
            }`}></div>
            <span className="text-sm text-white/70">
              {networkStatus === 'connected' ? 'Connected to Ethereum' : 
               networkStatus === 'connecting' ? 'Connecting...' : 
               'Network Error'}
            </span>
          </div>
        </div>

        {/* Inputs */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white/70 mb-1">NFT Contract Address</label>
          <input
            type="text"
            placeholder="Paste NFT contract address (0x...)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="text-sm font-mono bg-white/20 text-white p-4 rounded-xl w-full focus:outline-none"
          />
        </div>

        <div className="flex gap-4 mb-4">
          <button
            onClick={fetchNFTDetails}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex-1"
          >
            Fetch NFT Details
          </button>
        </div>

        {/* NFT Display */}
        {loadingNfts ? (
          <div className="flex flex-col justify-center items-center my-6 p-8 border border-indigo-500/20 rounded-lg bg-black/20">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-indigo-300 text-lg font-medium mb-2">{checkingContract ? 'Checking contract...' : 'Loading NFT details...'}</p>
            <p className="text-indigo-200/60 text-sm">{botStatus}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {nftError ? (
              <div className="col-span-full text-center p-6 border border-red-500/20 rounded-lg bg-black/20">
                <p className="text-red-400 mb-2">{nftError}</p>
                
                {nftError.includes("connect to Ethereum Mainnet") && (
                  <button
                    onClick={switchToMainnet}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mt-2"
                  >
                    Switch to Ethereum Mainnet
                  </button>
                )}
                
                {nftError.includes("No contract deployed at this address") && (
                  <div className="mt-4">
                    <p className="text-amber-400 mb-2">This address does not have a contract deployed yet.</p>
                    <button
                      onClick={() => {
                        if (inputValue && ethers.isAddress(inputValue)) {
                          // Add to monitoring with auto-activation enabled
                          contractMonitorService.monitorContract(
                            inputValue,
                            'Unlisted NFT',
                            '0',
                            Math.floor(Date.now() / 1000),
                            5000, // Check every 5 seconds
                            true  // Enable auto-activation
                          );
                          
                          // Update UI
                          setBotStatus('Monitoring for contract deployment with auto-activation enabled...');
                          showNotification(
                            'Auto-Monitoring Started', 
                            'Added address to deployment monitor. Bot will automatically activate when the contract is deployed.', 
                            'info'
                          );
                          
                          // Clear error
                          setNftError(null);
                        } else {
                          showNotification('Invalid Address', 'Please enter a valid Ethereum address', 'error');
                        }
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Monitor & Auto-Activate
                    </button>
                  </div>
                )}
              </div>
            ) : nfts.length > 0 ? (
              nfts.map((nft, idx) => <EnhancedNFTCard key={idx} nft={nft} />)
            ) : (
              !loadingNfts && (
                <div className="col-span-full text-center p-6 border border-blue-500/20 rounded-lg bg-black/20">
                  <p className="text-gray-400">No NFTs found. Enter a contract address above and click "Fetch NFT Details".</p>
                </div>
              )
            )}
          </div>
        )}

        {/* Monitoring Section - only shown when there are contracts being monitored */}
        {contractMonitorService.getMonitoredContracts().length > 0 && (
          <div className="mb-6 p-4 border rounded bg-black/30">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-semibold">Monitored Contracts</h3>
              <span className="text-xs text-blue-300">
                {contractMonitorService.getMonitoredContracts().length} address(es) being watched
              </span>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              {contractMonitorService.getMonitoredContracts().map(contract => (
                <div key={contract.contractAddress} className="p-3 bg-gray-800 rounded-lg flex justify-between items-center">
                  <div>
                    <div className="text-white font-medium">{contract.name}</div>
                    <div className="text-blue-300 text-xs">{contract.contractAddress}</div>
                  </div>
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${
                      contract.status === 'pending' ? 'bg-blue-500 animate-pulse' : 
                      contract.status === 'deployed' ? 'bg-green-500' : 'bg-red-500'
                    }`}></span>
                    <button
                      onClick={() => {
                        contractMonitorService.stopMonitoring(contract.contractAddress);
                        // Force a re-render
                        setNfts([...nfts]);
                      }}
                      className="ml-2 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Stop
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gas Fee Settings */}
        {nfts.length > 0 && (
          <>
            <div className="mb-6 p-4 border rounded bg-black/30">
              <h3 className="text-white font-semibold mb-2">Gas Fee Settings</h3>
              
              <label className="block text-sm text-gray-300 mb-1">
                Gas Fee Percentage (1-200%):
              </label>
              <input
                type="range"
                min="1"
                max="200"
                value={gasFee}
                onChange={(e) => setGasFee(parseInt(e.target.value))}
                className="w-full p-2 mb-2"
              />
              
              <div className="flex justify-between text-sm text-gray-400">
                <span>Low</span>
                <span>Medium</span>
                <span>High</span>
              </div>
              
              <div className="mt-3 bg-blue-900/30 p-2 rounded">
                <p className="text-center text-xl">
                  <span className="text-gray-300">Selected Gas: </span>
                  <span className="font-bold text-white">{gasFee}%</span>
                  <span className="text-sm text-gray-300 ml-2">({adjustedGasFee.toFixed(4)} ETH)</span>
                </p>
              </div>
            </div>

            {/* Bot Controls */}
            <div className="mb-6 p-4 border rounded bg-black/30">
              <h3 className="text-white font-semibold mb-2">Bot Status: <span className="text-blue-400">{botStatus}</span></h3>
              
              <div className="flex gap-3">
                <button
                  onClick={() => activateBot()}
                  disabled={botActive || activationLoading}
                  className={`flex-1 py-2 px-4 rounded flex items-center justify-center ${
                    botActive ? 'bg-green-600 text-white cursor-not-allowed' : 
                    activationLoading ? 'bg-gray-600' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {activationLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Initializing...
                    </>
                  ) : botActive ? 'Bot Activated' : 'Activate Bot'}
                </button>
                
                <button
                  onClick={deactivateBot}
                  disabled={!botActive}
                  className={`flex-1 py-2 px-4 rounded ${!botActive ? 'bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  Deactivate Bot
                </button>
              </div>
              
              {/* Monitor option for non-deployed contracts */}
              {showMonitorOption && !botActive && (
                <div className="mt-3 p-3 border border-blue-500/30 rounded-lg bg-blue-900/20">
                  <p className="text-blue-300 text-sm mb-2">
                    This contract isn't deployed yet. Would you like to monitor for its deployment?
                  </p>
                  <button
                    onClick={() => {
                      // Add contract to monitoring
                      contractMonitorService.monitorContract(
                        inputValue,
                        'Unlisted NFT',
                        '0',
                        Math.floor(Date.now() / 1000),
                        5000, // Check every 5 seconds
                        true  // Enable auto-activation
                      );
                      
                      // Update UI
                      setShowMonitorOption(false);
                      setBotStatus('Monitoring for contract deployment with auto-activation enabled...');
                      showNotification(
                        'Auto-Monitoring Started', 
                        'Added address to deployment monitor. Bot will automatically activate when the contract is deployed.', 
                        'info'
                      );
                    }}
                    className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Monitor & Auto-Activate
                  </button>
                </div>
              )}
              
              {mintSuccess && (
                <div className="mt-3 bg-green-500/20 p-3 rounded text-center">
                  <p className="text-green-400 font-bold">NFT Successfully Minted! 🎉</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Status */}
        <div className="mt-4 text-sm text-blue-400 text-center">
          Status: {status}
        </div>
      </div>
    </div>
  );
};

export default DashboardPanel; 