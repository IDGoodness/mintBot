import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from "../assets/logo-remove.png";
// import { useAccount } from 'wagmi';
import NFTCard from './NFTCard';
import {
  fetchNFTsFromOpenSea,
  fetchUpcomingCollectionsFromMagicEden
} from '../utils/marketplaceUtils';

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
  const baseGasFee = 0.1;
  const adjustedGasFee = (baseGasFee * gasFee) / 1000;

  const shortenAddress = (addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

  const fetchNFTs = async () => {
    const selected = inputValue || walletAddress || address;

    // Reset previous state
    setNftError(null);
    setNfts([]);

    if (!selected || selected.length !== 42 || !selected.startsWith('0x')) {
      setNftError("Please enter a valid Ethereum address.");
      return;
    }

    setLoadingNfts(true);
    try {
      const openseaNFTs = await fetchNFTsFromOpenSea(selected);
      if (openseaNFTs.length === 0) {
        setNftError("No NFTs found for this address.");
      } else {
        setNfts(openseaNFTs);
      }
    } catch (err: any) {
      console.error('Error fetching NFTs from OpenSea:', err);
      setNftError("Failed to fetch NFTs. Please try again or check the address.");
    } finally {
      setLoadingNfts(false);
    }
  };

  // fetch upcoming collections from Magic Eden
  
  const fetchUpcomingCollections = async () => {
    const selected = inputValue || walletAddress || address;

    setLoadingNfts(true);
    try {
      const collections = await fetchUpcomingCollectionsFromMagicEden(selected);
      setNfts(collections);
    } catch (error) {
      console.error('Error fetching upcoming collections:', error);
      setNfts([]);
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
            onClick={fetchNFTs}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Load NFTs
          </button>
          <button
            onClick={fetchUpcomingCollections}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Load Upcoming Collections
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

        {/* Upcoming NFTs Dsiplay */}

        {nfts.length > 0 ? (
          nfts.map((collection, idx) => ( <NFTCard key={idx} nft={collection} />
          ))
        ) : (
          <p className="text-gray-500 col-span-full text-center">No upcoming collections found</p>
        )}


        {/* Gas Fee */}
        <div className="mb-4">
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
