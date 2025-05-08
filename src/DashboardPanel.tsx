import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from "./assets/logo-remove.png";
import EnhancedNFTCard from './components/EnhancedNFTCard';
import { useMainnetNFTSniper } from './hooks/useMainnetNFTSniper';
import { ethers } from 'ethers';
import { validateNFTContract, getNFTContractInfo } from './utils/contractUtils';
import NotificationModal from './components/NotificationModal';

// Import all NFT fallback images
import nft1 from "./assets/nft1.png";
import nft2 from "./assets/nft2.png";
import nft3 from "./assets/nft3.png";
import nft4 from "./assets/nft4.png";
import nft5 from "./assets/nft5.png";

interface DashboardPanelProps {
  status: string;
  contractAddress: string;
  walletAddress: string;
}

const DashboardPanel: React.FC<DashboardPanelProps> = ({ status, contractAddress, walletAddress }) => {
  const navigate = useNavigate();

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

  useMainnetNFTSniper(
    inputValue,
    botActive,
    gasFee,
    walletAddress,
    () => {
      setBotStatus('Watching for mint...');
    },
    () => {
      setBotStatus('Mint successful!');
      setMintSuccess(true);
      showNotification('Success!', 'NFT has been successfully minted!', 'success');
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
  
      // 3. Validate the NFT contract
      const validation = await validateNFTContract(contract, provider);
      if (!validation.valid) {
        throw new Error(validation.reason || 'Invalid NFT contract');
      }
  
      setBotStatus('Reading on-chain information...');
      // 4. Try to get on-chain contract info
      const contractInfo = await getNFTContractInfo(contract, provider);
      
      // 5. Try multiple APIs for best results
      setBotStatus('Fetching collection data...');
      let apiData = null;
      
      // Try OpenSea API
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
  
        const response = await fetch(
          `https://api.opensea.io/api/v2/chain/ethereum/contract/${contract}`,
          {
            headers: { 
              "X-API-KEY": "49b1fa0034e04b659a78c556af80ac50",
              "Accept": "application/json"
            },
            signal: controller.signal
          }
        ).finally(() => clearTimeout(timeout));
  
        console.log('OpenSea API status:', response.status);
        
        if (response.ok) {
          apiData = await response.json();
          console.log('OpenSea API response:', apiData);
        }
      } catch (apiError) {
        console.error('OpenSea API error:', apiError);
      }
      
      // If OpenSea failed, try NFTPort as fallback
      if (!apiData || !apiData.image_url) {
        try {
          const response = await fetch(
            `https://api.nftport.xyz/v0/nfts/${contract}?chain=ethereum&page_size=1&include=metadata`,
            {
              headers: {
                "Authorization": "77faab75-5cf3-427d-a862-2d0f7f36b406", // Public sample key
                "Content-Type": "application/json"
              }
            }
          );
          
          if (response.ok) {
            const nftPortData = await response.json();
            if (nftPortData.nfts && nftPortData.nfts.length > 0) {
              // Map NFTPort data to match our expected format
              apiData = {
                name: nftPortData.contract.name,
                symbol: contractInfo.symbol,
                image_url: nftPortData.nfts[0].file_url || nftPortData.nfts[0].cached_file_url,
                description: nftPortData.contract.metadata?.description,
                stats: {
                  floor_price: 0,
                  total_supply: nftPortData.total || contractInfo.totalSupply?.toString()
                }
              };
            }
          }
        } catch (nftPortError) {
          console.error('NFTPort API error:', nftPortError);
        }
      }
  
      // 6. Combine on-chain and API data with proper fallbacks
      const randomImageIndex = Math.floor(Math.random() * fallbackImages.length);
      setBotStatus('Building NFT data...');
  
      // Check if the image URL is a proper URL format
      let imageUrl = apiData?.image_url || '';
      if (imageUrl && !imageUrl.startsWith('http')) {
        // Try to fix IPFS URLs
        if (imageUrl.startsWith('ipfs://')) {
          imageUrl = `https://ipfs.io/ipfs/${imageUrl.replace('ipfs://', '')}`;
        } else {
          // If not a valid URL, use a fallback
          imageUrl = fallbackImages[randomImageIndex];
        }
      } else if (!imageUrl) {
        imageUrl = fallbackImages[randomImageIndex];
      }
  
      const nftData = {
        name: apiData?.name || contractInfo.name || 'Unnamed Collection',
        symbol: apiData?.symbol || contractInfo.symbol || 'NFT',
        image: imageUrl,
        description: apiData?.description || 'No description available',
        contract: contract,
        floorPrice: typeof apiData?.stats?.floor_price === 'number' ? apiData.stats.floor_price : 0,
        totalSupply: apiData?.stats?.total_supply || 
                    (contractInfo.totalSupply ? Number(contractInfo.totalSupply.toString()) : 0)
      };
  
      setNfts([nftData]);
      setCurrentFloor(nftData.floorPrice);
      setBotStatus('NFT details loaded');
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
      window.ethereum.on('chainChanged', () => {
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

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-[#0f172a] overflow-hidden text-white p-6">
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
          <p className="mt-1 text-xs text-blue-300">
            For testing, use the Mock NFT contract: 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
          </p>
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