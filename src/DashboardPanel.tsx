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

  const fetchNFTDetails = async () => {
    const contract = inputValue.trim().toLowerCase();

    if (!contract || contract.length !== 42 || !contract.startsWith("0x")) {
      setNftError("Please enter a valid Ethereum contract address.");
      return;
    }

    setLoadingNfts(true);
    setBotStatus('Fetching NFT details...');
    
    try {
      // Check if contract exists
      const provider = new ethers.BrowserProvider(window.ethereum);
      const code = await provider.getCode(contract);
      
      if (code === '0x') {
        setNftError("Contract does not exist at this address");
        setLoadingNfts(false);
        return;
      }
      
      // Create a minimal ERC721 interface to query name and symbol
      const minimalABI = [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function totalSupply() view returns (uint256)"
      ];
      
      const nftContract = new ethers.Contract(contract, minimalABI, provider);
      
      // Try to get name and symbol
      let name = "Unknown Collection";
      let symbol = "";
      let totalSupply = 0;
      
      try {
        name = await nftContract.name();
      } catch (e) {
        console.log("Couldn't fetch name:", e);
      }
      
      try {
        symbol = await nftContract.symbol();
      } catch (e) {
        console.log("Couldn't fetch symbol:", e);
      }
      
      try {
        totalSupply = await nftContract.totalSupply();
        totalSupply = Number(totalSupply);
      } catch (e) {
        console.log("Couldn't fetch totalSupply:", e);
      }
      
      // For a real app, you would query an NFT API for more details
      // For now we'll use what we've found plus some placeholder values
      const nftData = {
        name: name,
        symbol: symbol,
        image: `https://via.placeholder.com/300/4F46E5/FFFFFF?text=${encodeURIComponent(name)}`,
        slug: symbol.toLowerCase(),
        description: `${name} (${symbol}) - NFT Collection with ${totalSupply} items`,
        contract: contract,
        floorPrice: 0.1, // In a real app, you'd get this from an API
        totalSupply: totalSupply
      };
      
      setNfts([nftData]);
      setCurrentFloor(nftData.floorPrice);
      setNftError(null);
      setBotStatus('NFT details loaded');
      
    } catch (err) {
      console.error("Error fetching contract metadata:", err);
      setNftError("Error fetching NFT details. Try again.");
      setBotStatus('Error fetching NFT details');
    } finally {
      setLoadingNfts(false);
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
              <p className="text-red-400 col-span-full text-center">{nftError}</p>
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