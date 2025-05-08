import React, { useState } from 'react';
// Import a random fallback image
import fallbackImg from '../assets/nft3.png';

export interface NFTCardProps {
  nft: {
    image?: string;
    name?: string;
    symbol?: string;
    slug?: string;
    description?: string;
    creator?: string;
    contract?: string;
    openseaUrl?: string;
    floorPrice?: number;
    totalSupply?: number;
    [key: string]: any;
  };
}

const NFTCard: React.FC<NFTCardProps> = ({ nft }) => {
  const [imgError, setImgError] = useState(false);
  
  const handleImageError = () => {
    console.log("Image failed to load:", nft.image);
    setImgError(true);
  };

  return (
    <div className="bg-white/10 p-4 rounded-xl border border-white/20 transition-all hover:border-indigo-500/50">
      <div className="flex flex-col h-full">
        <div className="mb-3 bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-lg">
          <img 
            src={imgError ? fallbackImg : nft.image} 
            alt={nft.name || 'NFT'} 
            className="w-full h-48 object-cover rounded-lg shadow-md" 
            onError={handleImageError}
            loading="lazy"
          />
        </div>
        
        <div className="flex-1 space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-white">{nft.name || 'Unnamed'}</h3>
            {nft.symbol && <span className="bg-indigo-600/50 px-2 py-1 rounded text-xs font-mono">{nft.symbol}</span>}
          </div>
          
          <p className="text-gray-300 text-sm line-clamp-2">{nft.description || 'No description available'}</p>
          
          <div className="pt-2 space-y-1 text-sm">
            {nft.totalSupply !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-400">Total Supply:</span>
                <span className="text-white font-medium">{nft.totalSupply.toLocaleString()}</span>
              </div>
            )}
            
            {nft.floorPrice !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-400">Floor Price:</span>
                <span className="text-white font-medium">{nft.floorPrice} ETH</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="text-gray-400">Contract:</span>
              <span className="text-blue-400 font-mono text-xs truncate max-w-[150px]" title={nft.contract}>
                {nft.contract?.substring(0, 6)}...{nft.contract?.substring(nft.contract.length - 4)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="pt-3 mt-3 border-t border-white/10">
          <button 
            onClick={() => window.open(`https://etherscan.io/address/${nft.contract}`, '_blank')}
            className="w-full py-2 bg-indigo-600/50 hover:bg-indigo-600 rounded-lg text-sm font-medium transition-colors"
          >
            View on Etherscan
          </button>
        </div>
      </div>
    </div>
  );
};

export default NFTCard;