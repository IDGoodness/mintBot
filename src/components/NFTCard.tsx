import React from 'react';

export interface NFTCardProps {
  nft: {
    image_url?: string;
    name?: string;
    token_id?: string;
    [key: string]: any;
  };
}

const NFTCard: React.FC<NFTCardProps> = ({ nft }) => {
  return (
    <div className="bg-white/10 p-4 rounded-xl border border-white/20">
      {nft.image_url && (
        <img src={nft.image_url} alt={nft.name || 'NFT'} className="w-full h-48 object-cover rounded mb-3" />
      )}
      <div><strong>Name:</strong> {nft.name || 'Unnamed'}</div>
      <div><strong>Token ID:</strong> {nft.token_id || 'N/A'}</div>
    </div>
  );
};

export default NFTCard;