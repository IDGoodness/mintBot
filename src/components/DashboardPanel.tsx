import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from "../assets/logo-remove.png";
import { useAccount } from 'wagmi';
import { getEthNFTs, getBeraNFTs } from '../utils/fetchNFTs';
import NFTCard from './NFTCard';
import {
  fetchNFTsFromOpenSea,
  fetchNFTsFromMagicEden,
  fetchNFTsFromMintify,
} from '../utils/marketplaceUtils';

interface DashboardPanelProps {
  status: string;
  contractAddress: string;
  walletAddress: string;
}

const DashboardPanel: React.FC<DashboardPanelProps> = ({ status, contractAddress, walletAddress }) => {
  const { isConnected } = useAccount();
  const navigate = useNavigate();

  const [address, setAddress] = useState(contractAddress || '');
  const [chain, setChain] = useState<'ethereum' | 'berachain'>('ethereum');
  const [inputValue, setInputValue] = useState('');
  const [nfts, setNfts] = useState<any[]>([]);
  const [loadingNfts, setLoadingNfts] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [loadingTokenInfo, setLoadingTokenInfo] = useState(false);
  const [gasFee, setGasFee] = useState(100);
  const baseGasFee = 0.01;
  const adjustedGasFee = (baseGasFee * gasFee) / 100;

  const shortenAddress = (addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

  const handleChainChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setChain(e.target.value as 'ethereum' | 'berachain');
  };

  const fetchTokenInfo = async (ca: string) => {
    setLoadingTokenInfo(true);
    try {
      const res = await fetch(`https://api.dexscreener.com/latest/dex/search/?q=${ca}`);
      const data = await res.json();
      setTokenInfo(data?.pairs?.[0] || null);
    } catch {
      setTokenInfo(null);
    } finally {
      setLoadingTokenInfo(false);
    }
  };

  const fetchNFTsFromEtherscan = async (wallet: string) => {
    const apiKey = 'P42CB5CQI8F6V4BH3WCSDRM2IY2WHXI7DI';
    const url = `https://api.etherscan.io/api?module=account&action=tokennfttx&address=${wallet}&page=1&offset=10&apikey=${apiKey}`;

    setLoadingNfts(true);
    try {
      const res = await fetch(url);
      const data = await res.json();
      const nftData = data?.result?.map((tx: any) => ({
        tokenId: tx.tokenID,
        tokenName: tx.tokenName,
        tokenSymbol: tx.tokenSymbol,
        from: tx.from,
        to: tx.to,
      })) || [];
      setNfts(nftData);
    } catch (err) {
      console.error('Error fetching from Etherscan', err);
      setNfts([]);
    } finally {
      setLoadingNfts(false);
    }
  };

  const fetchNFTs = async () => {
    const selected = inputValue || walletAddress || address;
    if (!selected) return;

    setLoadingNfts(true);
    try {
      let fetchedNFTs: any[] = [];
      const isContract = selected.length === 42 && selected.startsWith('0x');

      if (isContract) {
        const opensea = await fetchNFTsFromOpenSea(selected);
        const magiceden = await fetchNFTsFromMagicEden(selected);
        const mintify = await fetchNFTsFromMintify(selected);
        fetchedNFTs = [...opensea, ...magiceden, ...mintify];
      } else {
        fetchedNFTs = chain === 'ethereum'
          ? await getEthNFTs(selected)
          : await getBeraNFTs(selected);
      }

      setNfts(fetchedNFTs);
    } catch (err) {
      console.error('Error fetching NFTs:', err);
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

  // Auto-fetch when address is updated
  useEffect(() => {
    if (address && address.length === 42) {
      fetchTokenInfo(address);
      fetchNFTsFromEtherscan(address);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected && (walletAddress || address) && !inputValue) {
      fetchNFTs();
    }
  }, [isConnected, chain]);

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
          <img src={logo} alt="Logo" className="w-28 h-28 object-contain rounded-xl mb-2" />
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
          <select
            value={chain}
            onChange={handleChainChange}
            className="px-4 py-2 border rounded-md bg-white/10 text-white"
          >
            <option value="ethereum">Ethereum</option>
            <option value="berachain">Berachain</option>
          </select>
          <button
            onClick={fetchNFTs}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Load NFTs
          </button>
        </div>

        {/* Token Info */}
        {loadingTokenInfo ? (
          <p className="text-sm text-indigo-300 mb-4">Loading token info...</p>
        ) : tokenInfo ? (
          <div className="bg-white/5 p-6 rounded-xl mb-4 border border-white/20">
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div><strong>Name:</strong> {tokenInfo.baseToken.name}</div>
              <div><strong>Symbol:</strong> {tokenInfo.baseToken.symbol}</div>
              <div><strong>Price (USD):</strong> ${parseFloat(tokenInfo.priceUsd).toFixed(6)}</div>
              <div><strong>DEX:</strong> {tokenInfo.dexId}</div>
              <div><strong>Liquidity:</strong> ${tokenInfo.liquidity?.usd?.toLocaleString()}</div>
              <div><strong>Volume (24h):</strong> ${tokenInfo.volume?.h24?.toLocaleString()}</div>
            </div>
          </div>
        ) : (
          address && <p className="text-red-400 text-sm mb-4">No token info found.</p>
        )}

        {/* NFT Display */}
        {loadingNfts ? (
          <p className="text-indigo-300">Loading NFTs...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {nfts.length > 0 ? (
              nfts.map((nft, idx) => <NFTCard key={idx} nft={nft} />)
            ) : (
              <p className="text-gray-500 col-span-full text-center">No NFTs found</p>
            )}
          </div>
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
            min="0"
            max="100"
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
