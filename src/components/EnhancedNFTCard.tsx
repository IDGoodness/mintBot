
import React, { useState } from 'react';
import { useAccount, useNetwork, useProvider } from 'wagmi';
import { ethers } from 'ethers';

const EnhancedNFTCard = ({ nft, address }) => {
  const { chain } = useNetwork();
  const provider = useProvider();
  
  const [expanded, setExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Fallback image
  const fallbackImage = '/nft1.png';
  
  // Format addresses to be shorter
  const formatAddress = (addr) => {
    if (!addr) return '';
    return addr.substring(0, 6) + '...' + addr.substring(addr.length - 4);
  };
  
  // Handle image loading errors
  const handleImageError = () => {
    setImageError(true);
  };
  
  // Determine the image source
  const getImageSource = () => {
    if (imageError || !nft.image) {
      return fallbackImage;
    }
    
    // Clean IPFS URLs
    if (typeof nft.image === 'string' && nft.image.startsWith('ipfs://')) {
      const ipfsHash = nft.image.replace('ipfs://', '');
      return `https://ipfs.io/ipfs/${ipfsHash}`;
    }
    
    return nft.image;
  };
  
  // Get token explorer URL
  const getTokenExplorerUrl = () => {
    if (!chain?.blockExplorers?.default?.url) return '#';
    
    return `${chain.blockExplorers.default.url}/token/${nft.contractAddress}?a=${nft.tokenId}`;
  };
  
  // Format token ID
  const formatTokenId = (tokenId) => {
    if (!tokenId) return 'Unknown';
    
    // If tokenId is a hex string, convert to decimal
    if (typeof tokenId === 'string' && tokenId.startsWith('0x')) {
      try {
        return ethers.BigNumber.from(tokenId).toString();
      } catch (e) {
        return tokenId;
      }
    }
    
    return tokenId;
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {/* Image */}
      <div 
        className="w-full h-48 relative bg-gray-100 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <img
          src={getImageSource()}
          alt={nft.name || 'NFT'}
          className="w-full h-full object-cover"
          onError={handleImageError}
        />
        
        {/* Collection Tag */}
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full">
          {nft.contractName || formatAddress(nft.contractAddress)}
        </div>
      </div>
      
      {/* Details */}
      <div className="p-4">
        <h3 className="text-lg font-bold mb-1 truncate">{nft.name || `Token #${formatTokenId(nft.tokenId)}`}</h3>
        
        <div className="text-sm text-gray-500 mb-2">
          ID: {formatTokenId(nft.tokenId)}
        </div>
        
        {nft.description && (
          <p className={`text-sm text-gray-600 mb-3 ${expanded ? '' : 'line-clamp-2'}`}>
            {nft.description}
          </p>
        )}
        
        {/* Properties/Traits (if available) */}
        {nft.attributes && nft.attributes.length > 0 && (
          <div className="mt-2">
            <h4 className="text-xs text-gray-500 mb-1">Properties:</h4>
            <div className="flex flex-wrap gap-1">
              {(expanded ? nft.attributes : nft.attributes.slice(0, 3)).map((attr, index) => (
                <div key={index} className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded">
                  {attr.trait_type}: {attr.value}
                </div>
              ))}
              {!expanded && nft.attributes.length > 3 && (
                <div 
                  className="bg-gray-50 text-gray-500 text-xs px-2 py-1 rounded cursor-pointer"
                  onClick={() => setExpanded(true)}
                >
                  +{nft.attributes.length - 3} more
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Actions */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between">
          <a
            href={getTokenExplorerUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 text-sm hover:underline"
          >
            View on Explorer
          </a>
          
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {expanded ? 'Show Less' : 'Show More'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedNFTCard;
