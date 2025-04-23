import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from "../assets/logo-remove.png";
// import { useAccount } from 'wagmi';
import NFTCard from './NFTCard';
import useSniperConfig from '../hooks/useSniperConfig';
import useListingWatcher from '../hooks/useListingWatcher';

interface DashboardPanelProps {
  status: string;
  contractAddress: string;
  walletAddress: string;
}

const DashboardPanel: React.FC<DashboardPanelProps> = ({ status, contractAddress, walletAddress }) => {
  // const { isConnected } = useAccount();
  const navigate = useNavigate();

  const [address, setAddress] = useState(contractAddress || '');
  const [inputValue, setInputValue] = useState('');
  const [nfts, setNfts] = useState<any[]>([]);
  const [nftError, setNftError] = useState<string | null>(null);
  const [loadingNfts, setLoadingNfts] = useState(false);
  const [gasFee, setGasFee] = useState(1000);
  const { sniperConfig, setSniperConfig } = useSniperConfig();

 
  const baseGasFee = 0.1;
  const adjustedGasFee = (baseGasFee * gasFee) / 1000;
  useListingWatcher(contractAddress, currentFloor, sniperConfig);

  const shortenAddress = (addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

  
  const fetchNFTDetails = async () => {
    const contract = inputValue.trim().toLowerCase();

    if (!contract || contract.length !== 42 || !contract.startsWith("0x")) {
      setNftError("Please enter a valid Ethereum contract address.");
      return;
    }

    setLoadingNfts(true);
    try {
      const response = await fetch(`http://localhost:3001/api/upcoming/${contract}`);
      const data = await response.json();

      if (data?.name) {
        setNfts([data]); // force as array to match existing rendering
        setNftError(null);
      } else {
        setNfts([]);
        setNftError("No collection found for this contract.");
      }
    } catch (err) {
      console.error("Error fetching contract metadata:", err);
      setNftError("Error fetching NFT details. Try again.");
    } finally {
      setLoadingNfts(false);
    }
  };

  const handleConfirm = () => {
    navigate('/confirmation', {
      state: { gasFeePercentage: gasFee, ethCost: adjustedGasFee },
    });
  };

  // Update address from prop
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
        <input
          type="text"
          placeholder="Paste contract or wallet address"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="text-sm font-mono bg-white/20 text-white p-4 rounded-xl w-full mb-4 focus:outline-none"
        />

        <div className="flex gap-4 mb-4">
          <button
            onClick={fetchNFTDetails}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Load NFTs
          </button>

        </div>

        {/* NFT Display */}
        {loadingNfts ? (
          <p className="text-indigo-300">Loading NFTs...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {nftError ? (
              <p className="text-red-400 col-span-full text-center">{nftError}</p>
            ) : nfts.length > 0 ? (
              nfts.map((nft, idx) => <NFTCard key={idx} nft={nft} />)
            ) : (
              !loadingNfts && <p className="text-gray-500 col-span-full text-center">No NFTs found</p>
            )}
          </div>
        )}

        {/* Gas Fee */}
        {/* <div className="mb-4">
          <h3 className="text-lg font-semibold text-white/80">Max Gas Fee (100%)</h3>
          <p className="text-3xl font-bold text-white text-center">{baseGasFee} ETH</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-white/70 mb-1">Preferred Gas Fee Range</label>
          <input
            type="range"
            min="100"
            max="1000"
            value={gasFee}
            onChange={(e) => setGasFee(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-sm text-center mt-2">
            {gasFee}% = {adjustedGasFee.toFixed(6)} ETH
          </div>
        </div> */}

        {/* Sniping Settings */}

        <div className="mb-4 p-4 border rounded bg-gray-900">
          <h3 className="text-white font-semibold mb-2">Sniping Settings</h3>

          <label className="block text-sm text-gray-300 mb-1">
            Sniping Threshold (% below floor):
          </label>
          <input
            type="number"
            value={sniperConfig.percentage}
            onChange={(e) =>
              setSniperConfig({ ...sniperConfig, percentage: parseFloat(e.target.value) })
            }
            className="w-full p-2 rounded bg-gray-800 text-white mb-3"
            min="1"
            max="100"
          />

          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={sniperConfig.isActive}
              onChange={(e) =>
                setSniperConfig({ ...sniperConfig, isActive: e.target.checked })
              }
              className="form-checkbox"
            />
            Activate Sniping
          </label>
        </div>


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