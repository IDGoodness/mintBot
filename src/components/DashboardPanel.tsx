import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from "../assets/logo-remove.png";
import { ethers } from 'ethers';
import NetworkSwitcher from './NetworkSwitcher';
import { TransactionService } from '../services/TransactionService';
import ProcessWarning from './ProcessWarning';

// Import all NFT fallback images
import nft1 from "../assets/nft1.png";
import nft2 from "../assets/nft2.png";
import nft3 from "../assets/nft3.png";
import nft4 from "../assets/nft4.png";
import nft5 from "../assets/nft5.png";

import useMainnetNFTSniper from '../hooks/useMainnetNFTSniper';
import { validateNFTContract, getNFTContractInfo } from '../utils/contractUtils';
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
  const navigate = useNavigate();
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

  useEffect(() => {
    const initTransactionService = async () => {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        transactionService.current = new TransactionService(signer);
      }
    };

    initTransactionService();
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
    const contract = inputValue.trim().toLowerCase();
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
  
      // 3. Try to get contract info from Mintify API first for unlisted NFTs
      setBotStatus('Checking Mintify for upcoming/unlisted NFTs...');
      const MINTIFY_API_KEY = '85c2edccc6fad38585b794b3595af637928bd512';
      
      let mintifyData = null;
      try {
        // Try to get data from Mintify API for upcoming/unlisted drops
        const mintifyResponse = await fetch(
          `https://api.mintify.xyz/v1/contracts/${contract}`,
          {
            headers: {
              'Authorization': `Bearer ${MINTIFY_API_KEY}`,
              'Accept': 'application/json'
            }
          }
        );
        
        if (mintifyResponse.ok) {
          const data = await mintifyResponse.json();
          console.log('Mintify API response:', data);
          
          if (data.contract) {
            mintifyData = data.contract;
          }
        }
      } catch (mintifyError) {
        console.error('Mintify API error:', mintifyError);
        // Continue with on-chain validation if Mintify fails
      }
  
      // 4. Validate on-chain if not found in Mintify
      let contractOnChainValid = false;
      let contractInfo = null;
      
      // Only validate on-chain if not found in Mintify
      if (!mintifyData) {
        try {
          // Check if the contract exists at all
          const code = await provider.getCode(contract);
          if (code === '0x') {
            // Before throwing error, attempt to get upcoming NFT data
            try {
              const upcomingResponse = await fetch(
                `https://api.mintify.xyz/v1/drops/upcoming?contractAddress=${contract}`,
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
                  // Found as an upcoming drop
                  const drop = upcomingData.drops[0];
                  mintifyData = {
                    name: drop.name,
                    contractAddress: drop.contractAddress,
                    imageUrl: drop.imageUrl,
                    description: drop.description,
                    mintPrice: drop.mintPrice,
                    launchTime: drop.launchTime,
                    status: 'upcoming',
                    tokenSupply: drop.tokenSupply
                  };
                } else {
                  throw new Error('No contract deployed at this address');
                }
              } else {
                throw new Error('No contract deployed at this address');
              }
            } catch (upcomingError) {
              throw new Error('No contract deployed at this address. Please verify the contract address is correct.');
            }
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
          }
        } catch (error) {
          if (!mintifyData) { // Only throw if we don't have Mintify data
            if (error instanceof Error) {
              throw error;
            }
            throw new Error('Failed to validate contract');
          }
        }
      }
      
      // 5. Build the NFT data combining all sources
      setBotStatus('Building NFT data...');
      
      // Get a fallback image if needed
      const randomImageIndex = Math.floor(Math.random() * fallbackImages.length);
      const fallbackImage = fallbackImages[randomImageIndex];
      
      // Determine the image URL
      let imageUrl = mintifyData?.imageUrl || '';
      
      // Fix IPFS URLs if needed
      if (imageUrl && !imageUrl.startsWith('http')) {
        if (imageUrl.startsWith('ipfs://')) {
          imageUrl = `https://ipfs.io/ipfs/${imageUrl.replace('ipfs://', '')}`;
        } else {
          imageUrl = fallbackImage;
        }
      } else if (!imageUrl && contractInfo?.name) {
        // If we have on-chain data but no image, use fallback
        imageUrl = fallbackImage;
      }
      
      // Combine the data with proper fallbacks
      const nftData = {
        name: mintifyData?.name || contractInfo?.name || 'Unnamed Collection',
        symbol: contractInfo?.symbol || 'NFT',
        image: imageUrl,
        description: mintifyData?.description || 'No description available',
        contract: contract,
        floorPrice: mintifyData?.mintPrice ? parseFloat(mintifyData.mintPrice) : 0,
        totalSupply: mintifyData?.tokenSupply || 
                   (contractInfo?.totalSupply ? Number(contractInfo.totalSupply.toString()) : 0),
        launchTime: mintifyData?.launchTime || 0,
        status: mintifyData?.status || (contractOnChainValid ? 'deployed' : 'unknown')
      };
  
      setNfts([nftData]);
      setCurrentFloor(nftData.floorPrice);
      
      // Set appropriate status based on NFT state
      if (nftData.status === 'upcoming') {
        setBotStatus('Upcoming NFT found! Not yet deployed.');
      } else if (contractOnChainValid) {
        setBotStatus('NFT contract verified on-chain.');
      } else {
        setBotStatus('NFT details loaded from Mintify.');
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

  const activateBot = () => {
    if (!inputValue || !gasFee) {
      setNftError("Please enter a contract address and set gas fee first.");
      showNotification('Missing Information', 'Please enter a contract address and set gas fee first.', 'error');
      return;
    }
    
    // Validate contract address
    if (!ethers.isAddress(inputValue)) {
      setNftError("Please enter a valid Ethereum contract address.");
      showNotification('Invalid Address', 'Please enter a valid Ethereum contract address.', 'error');
      return;
    }
    
    // If we have nft error, clear it
    if (nftError) {
      setNftError(null);
    }
    
    // Clear any existing interval
    if (activationIntervalRef.current) {
      clearInterval(activationIntervalRef.current);
    }
    
    // Show loading state
    setActivationLoading(true);
    setBotStatus('Initializing bot...');
    
    // Show loading modal during initialization only
    showNotification('Initializing', 'Bot is being initialized...', 'loading');
    
    // Validate the contract before activating
    const validateContract = async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const validation = await validateNFTContract(inputValue, provider);
        
        if (!validation.valid) {
          setActivationLoading(false);
          setNftError(validation.reason || 'Invalid NFT contract');
          setBotStatus('Error: Invalid contract');
          
          // Close loading modal
          handleModalClose();
          
          // Show error notification
          showNotification('Invalid Contract', validation.reason || 'Invalid NFT contract', 'error');
          return false;
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
    
    // Update state
    setBotActive(false);
    setBotStatus('Bot deactivated');
    onProcessingChange(false); // Hide the warning message
  };

  const handleConfirm = () => {
    navigate('/confirmation', {
      state: { 
        gasFeePercentage: gasFee, 
        ethCost: adjustedGasFee,
        contractAddress: inputValue
      },
    });
  };

  useEffect(() => {
    if (contractAddress) setAddress(contractAddress);
  }, [contractAddress]);

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
        ethers.parseEther(adjustedGasFee.toString()),
        walletAddress
      );

      // Navigate to success page with transaction details
      navigate('/success', {
        state: {
          transactionDetails: {
            ...result,
            tokenId,
            contractAddress: inputValue
          }
        }
      });
    } catch (error) {
      console.error('Error handling successful snipe:', error);
      showNotification('Error', 'Failed to process successful snipe', 'error');
    } finally {
      onProcessingChange(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-[#0f172a] overflow-hidden text-white p-6">
      {/* Process Warning */}
      <ProcessWarning isVisible={botActive} />

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
                  onClick={activateBot}
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
              
              {mintSuccess && (
                <div className="mt-3 bg-green-500/20 p-3 rounded text-center">
                  <p className="text-green-400 font-bold">NFT Successfully Minted! 🎉</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Confirm */}
        <button
          onClick={handleConfirm}
          className="w-full py-3 px-4 rounded-full text-white bg-indigo-600 hover:bg-indigo-700 transition-all text-lg font-semibold"
        >
          Confirm & Proceed
        </button>

        {/* Status */}
        <div className="mt-4 text-sm text-blue-400 text-center">
          Status: {status}
        </div>
      </div>
    </div>
  );
};

export default DashboardPanel; 