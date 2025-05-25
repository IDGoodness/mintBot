
import React, { useState } from 'react';
import { ethers } from 'ethers';

const NFTCard = ({ nft, address }) => {
  const [imageError, setImageError] = useState(false);
  
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
    if (nft.image.startsWith('ipfs://')) {
      const ipfsHash = nft.image.replace('ipfs://', '');
      return `https://ipfs.io/ipfs/${ipfsHash}`;
    }
    
    return nft.image;
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {/* Image */}
      <div className="w-full h-48 relative bg-gray-100">
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
        <h3 className="text-lg font-bold mb-1 truncate">{nft.name || `Token #${nft.tokenId}`}</h3>
        
        <div className="text-sm text-gray-500 mb-2">
          ID: {typeof nft.tokenId === 'string' && nft.tokenId.startsWith('0x') 
            ? ethers.BigNumber.from(nft.tokenId).toString() 
            : nft.tokenId}
        </div>
        
        {nft.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{nft.description}</p>
        )}
        
        {/* Properties/Traits (if available) */}
        {nft.attributes && nft.attributes.length > 0 && (
          <div className="mt-2">
            <h4 className="text-xs text-gray-500 mb-1">Properties:</h4>
            <div className="flex flex-wrap gap-1">
              {nft.attributes.slice(0, 3).map((attr, index) => (
                <div key={index} className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded">
                  {attr.trait_type}: {attr.value}
                </div>
              ))}
              {nft.attributes.length > 3 && (
                <div className="bg-gray-50 text-gray-500 text-xs px-2 py-1 rounded">
                  +{nft.attributes.length - 3} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NFTCard;
