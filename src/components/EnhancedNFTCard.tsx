import React, { useState, useEffect } from 'react';
// Import all fallback images
import nft1 from '../assets/nft1.png';
import nft2 from '../assets/nft2.png';
import nft3 from '../assets/nft3.png';
import nft4 from '../assets/nft4.png';
import nft5 from '../assets/nft5.png';

const fallbackImages = [nft1, nft2, nft3, nft4, nft5];

export interface EnhancedNFTCardProps {
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

const EnhancedNFTCard: React.FC<EnhancedNFTCardProps> = ({ nft }) => {
  const [imgError, setImgError] = useState(false);
  const [selectedFallback] = useState(
    fallbackImages[Math.floor(Math.random() * fallbackImages.length)]
  );
  const [imageUrl, setImageUrl] = useState<string>(nft.image || selectedFallback);
  
  // Process image URL when it changes
  useEffect(() => {
    if (!nft.image) {
      setImageUrl(selectedFallback);
      return;
    }
    
    let url = nft.image;
    
    // Handle different image formats
    if (url.startsWith('ipfs://')) {
      // Convert IPFS URL to gateway URL
      url = `https://ipfs.io/ipfs/${url.replace('ipfs://', '')}`;
    } else if (!url.startsWith('http')) {
      // If not a valid URL, use fallback
      url = selectedFallback;
    }
    
    setImageUrl(url);
  }, [nft.image, selectedFallback]);
  
  const handleImageError = () => {
    console.log("Image failed to load:", imageUrl);
    setImgError(true);
  };

  const openOpensea = () => {
    window.open(`https://opensea.io/assets/ethereum/${nft.contract}`, '_blank');
  };

  const openEtherscan = () => {
    window.open(`https://etherscan.io/address/${nft.contract}`, '_blank');
  };

  return (
    <div className="bg-white/10 p-5 rounded-xl border border-white/20 transition-all hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10">
      <div className="flex flex-col h-full">
        <div className="mb-4 bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-lg overflow-hidden group relative">
          <img 
            src={imgError ? selectedFallback : imageUrl} 
            alt={nft.name || 'NFT'} 
            className="w-full h-56 object-cover rounded-lg shadow-lg transform transition-all group-hover:scale-105" 
            onError={handleImageError}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center">
            <button
              onClick={openOpensea}
              className="mb-4 px-4 py-2 bg-blue-600/90 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              View on OpenSea
            </button>
          </div>
        </div>
        
        <div className="flex-1 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-white truncate" title={nft.name}>
              {nft.name || 'Unnamed'}
            </h3>
            {nft.symbol && <span className="bg-indigo-600/50 px-2 py-1 rounded text-xs font-mono">{nft.symbol}</span>}
          </div>
          
          <p className="text-gray-300 text-sm line-clamp-3 min-h-[3em]">{nft.description || 'No description available'}</p>
          
          <div className="pt-3 space-y-2 border-t border-white/10 text-sm">
            {nft.totalSupply !== undefined && nft.totalSupply > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Total Supply:</span>
                <span className="text-white font-medium">{nft.totalSupply.toLocaleString()}</span>
              </div>
            )}
            
            {nft.floorPrice !== undefined && nft.floorPrice > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Floor Price:</span>
                <span className="text-white font-medium">{nft.floorPrice} ETH</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="text-gray-400">Contract:</span>
              <span 
                className="text-blue-400 font-mono text-xs truncate max-w-[150px] cursor-pointer hover:underline" 
                title={nft.contract}
                onClick={openEtherscan}
              >
                {nft.contract?.substring(0, 6)}...{nft.contract?.substring(nft.contract.length - 4)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="pt-4 mt-4 border-t border-white/10 flex gap-2">
          <button 
            onClick={openEtherscan}
            className="flex-1 py-2 bg-indigo-600/50 hover:bg-indigo-600 rounded-lg text-sm font-medium transition-colors"
          >
            Etherscan
          </button>
          <button 
            onClick={openOpensea}
            className="flex-1 py-2 bg-blue-600/50 hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors"
          >
            OpenSea
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedNFTCard; 