import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from "./assets/logo-remove.png";
import NFTCard from './components/NFTCard';
import useSniperConfig from './hooks/useSniperConfig';
import useNFTMintWatcher from './hooks/useNFTMintWatcher';
import { ethers } from 'ethers';

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
  const { sniperConfig, setSniperConfig } = useSniperConfig();
  const [botStatus, setBotStatus] = useState('Ready');
  const [mintSuccess, setMintSuccess] = useState(false);
  console.log(address, currentFloor);
  
  const baseGasFee = 0.1;
  const adjustedGasFee = (baseGasFee * gasFee) / 100;
  
  useNFTMintWatcher(
    inputValue, 
    sniperConfig, 
    gasFee,
    walletAddress, 
    () => setBotStatus('Watching for mint...'),
    () => {
      setBotStatus('Mint successful!');
      setMintSuccess(true);
    },
    (error) => setBotStatus(`Error: ${error}`)
  );

  const shortenAddress = (addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

  const switchToAnvilNetwork = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask to connect to the Anvil network");
      return;
    }

    try {
      // Request switch to the Anvil local network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x7A69' }] // 31337 in hex
      });
    } catch (error: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x7A69',
                chainName: 'Anvil Local Network',
                nativeCurrency: {
                  name: 'Ethereum',
                  symbol: 'ETH',
                  decimals: 18
                },
                rpcUrls: ['http://localhost:8545'],
                blockExplorerUrls: []
              }
            ]
          });
        } catch (addError) {
          console.error("Error adding Anvil network:", addError);
        }
      } else {
        console.error("Error switching network:", error);
      }
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
  
      // 1. Check network connection first
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork().catch(() => {
        throw new Error('Failed to connect to Ethereum network');
      });
      
      console.log('Network:', network.name, network.chainId.toString());
      
      if (network.chainId !== 1n) {
        throw new Error('Please connect to Ethereum Mainnet');
      }
  
      // 2. Check contract existence with timeout
      const code = await Promise.race([
        provider.getCode(contract),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Contract check timeout')), 5000)
        )
      ]);
      
      if (code === '0x') {
        throw new Error('Contract not found on Ethereum Mainnet');
      }
  
      // 3. Add API timeout and error handling
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
  
      console.log('API status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error:', errorData);
        throw new Error(`OpenSea API: ${response.status} - ${errorData?.detail || 'Unknown error'}`);
      }
  
      const data = await response.json();
      console.log('API response:', data);
  
      // 4. Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid API response format');
      }
  
      const nftData = {
        name: data.name || 'Unnamed Collection',
        symbol: data.symbol || 'NFT',
        image: data.image_url || `https://via.placeholder.com/300?text=${encodeURIComponent(data.name || 'NFT')}`,
        description: data.description || 'No description available',
        contract: contract,
        floorPrice: data.stats?.floor_price || 0,
        totalSupply: data.stats?.total_supply || 0
      };
  
      setNfts([nftData]);
      setCurrentFloor(nftData.floorPrice);
      setBotStatus('NFT details loaded');
  
    } catch (error) {
      console.error('Full error stack:', error);
      setNftError(error instanceof Error ? error.message : 'Unknown error occurred');
      setBotStatus('Error loading NFT details');
      
      // Specific error handling
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          setNftError('Network error - check internet connection');
        }
        if (error.message.includes('API')) {
          setNftError('OpenSea API error - try again later');
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
      return;
    }
    
    setSniperConfig({ ...sniperConfig, isActive: true });
    setBotStatus('Bot activated! Watching for mint...');
  };

  const deactivateBot = () => {
    setSniperConfig({ ...sniperConfig, isActive: false });
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

  // Check network connection on component load
  useEffect(() => {
    const checkNetwork = async () => {
      if (!window.ethereum) return;
      
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        
        if (network.chainId !== 1n) { // Ethereum Mainnet
          setBotStatus(`Please connect to Ethereum Mainnet`);
        } else {
          setBotStatus(`Connected to Ethereum Mainnet`);
        }
      } catch (error) {
        console.error("Error checking network:", error);
      }
    };
    
    checkNetwork();
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-[#0f172a] overflow-hidden text-white p-6">
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
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white/80">Connected Wallet</h3>
          <p className="text-sm text-white/60">{shortenAddress(walletAddress)}</p>
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
          <div className="flex justify-center items-center my-6">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
            <p className="text-indigo-300">Loading NFT details...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {nftError ? (
              <div className="col-span-full text-center">
                <p className="text-red-400 mb-2">{nftError}</p>
                {nftError.includes("network") && (
                  <button
                    onClick={switchToAnvilNetwork}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mt-2"
                  >
                    Switch to Anvil Network
                  </button>
                )}
              </div>
            ) : nfts.length > 0 ? (
              nfts.map((nft, idx) => <NFTCard key={idx} nft={nft} />)
            ) : (
              !loadingNfts && <p className="text-gray-500 col-span-full text-center">No NFTs found. Paste a contract address above.</p>
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
                  disabled={sniperConfig.isActive}
                  className={`flex-1 py-2 px-4 rounded ${sniperConfig.isActive ? 'bg-gray-600' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  Activate Bot
                </button>
                
                <button
                  onClick={deactivateBot}
                  disabled={!sniperConfig.isActive}
                  className={`flex-1 py-2 px-4 rounded ${!sniperConfig.isActive ? 'bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}
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