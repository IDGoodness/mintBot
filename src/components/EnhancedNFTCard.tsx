import React from 'react';

interface NFT {
  name: string;
  symbol: string;
  contract: string;
  floorPrice: number;
  totalSupply: number;
  description?: string;
}

interface EnhancedNFTCardProps {
  nft: NFT;
}

const EnhancedNFTCard: React.FC<EnhancedNFTCardProps> = ({ nft }) => {
  // Generate a unique color based on the contract address
  const getColorFromAddress = (address: string) => {
    const hash = address.slice(2).padEnd(6, '0');
    const hue = parseInt(hash.slice(0, 6), 16) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  };

  const contractColor = getColorFromAddress(nft.contract);

  return (
    <div className="bg-white/10 rounded-xl overflow-hidden backdrop-blur-sm border border-white/20">
      {/* Header with gradient background */}
      <div 
        className="p-6 relative"
        style={{
          background: `linear-gradient(135deg, ${contractColor}22, ${contractColor}44)`
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-white">{nft.name}</h3>
            <p className="text-white/60 text-sm">{nft.symbol}</p>
          </div>
          <div className="w-12 h-12 rounded-full flex items-center justify-center"
               style={{ background: `${contractColor}33` }}>
            <span className="text-2xl">🎨</span>
          </div>
        </div>
        
        <div className="flex gap-4">
          <div className="flex-1 bg-white/10 rounded-lg p-3">
            <p className="text-white/60 text-sm">Floor Price</p>
            <p className="text-white font-semibold">
              {nft.floorPrice > 0 ? `${nft.floorPrice} ETH` : 'N/A'}
            </p>
          </div>
          <div className="flex-1 bg-white/10 rounded-lg p-3">
            <p className="text-white/60 text-sm">Total Supply</p>
            <p className="text-white font-semibold">
              {nft.totalSupply.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Contract Info */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center justify-between">
          <p className="text-white/60 text-sm">Contract</p>
          <a 
            href={`https://etherscan.io/address/${nft.contract}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-sm font-mono"
          >
            {nft.contract.slice(0, 6)}...{nft.contract.slice(-4)}
          </a>
        </div>
      </div>

      {/* Description if available */}
      {nft.description && (
        <div className="p-4 border-t border-white/10">
          <p className="text-white/80 text-sm line-clamp-2">{nft.description}</p>
        </div>
      )}
    </div>
  );
};

export default EnhancedNFTCard; 