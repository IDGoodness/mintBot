import React from 'react';

export interface NFTCardProps {
  nft: {
    image?: string;
    name?: string;
    slug?: string;
    description?: string;
    creator?: string;
    contract?: string;
    openseaUrl?: string;
    [key: string]: any;
  };
}

const NFTCard: React.FC<NFTCardProps> = ({ nft }) => {
  return (
    <div className="bg-white/10 p-4 rounded-xl border border-white/20">
      {nft.image_url && (
        <img src={nft.image} alt={nft.name || 'NFT'} className="w-full h-48 object-cover rounded mb-3" />
      )}
      <div><strong>Name:</strong> {nft.name || 'Unnamed'}</div>
      <div><strong>Slug:</strong> {nft.slug || 'N/A'}</div>
      <div><strong>URL:</strong> {nft.openseaUrl || 'N/A'}</div>
      {/* <div className='line-clamp-3 w-full' ><strong>Desc:</strong> {nft.description || 'N/A'}</div>
      <div><strong>Creator:</strong> {nft.creator || 'N/A'}</div>
      <div className='line-clamp-2 w-full' ><strong>Contract:</strong> {nft.contract || 'N/A'}</div>
      <div className='uppercase' ><strong className='capitalize' >Standard:</strong> {nft.token_standard || 'N/A'}</div> */}
    </div>
  );
};

export default NFTCard;