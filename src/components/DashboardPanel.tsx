
import React, { useState, useEffect } from 'react';
import { useAccount, useNetwork, useProvider, useSigner } from 'wagmi';
import { ethers } from 'ethers';
import NFTCard from './NFTCard';
import EnhancedNFTCard from './EnhancedNFTCard';
import MonitoringCard from './MonitoringCard';
import mintifyService from './MintifyService';

// Import the fetchNFTs function directly
const { fetchNFTs } = require('./fetchNFTs');

const DashboardPanel = () => {
  const { address } = useAccount();
  const { chain } = useNetwork();
  const provider = useProvider();
  const { data: signer } = useSigner();
  
  const [collections, setCollections] = useState([]);
  const [ownedNFTs, setOwnedNFTs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Initialize services
  useEffect(() => {
    if (provider && signer) {
      mintifyService.initialize(provider, signer);
    }
  }, [provider, signer]);
  
  // Fetch collections and NFTs when wallet or chain changes
  useEffect(() => {
    if (address && provider) {
      fetchUserCollections();
      fetchUserNFTs();
    } else {
      setCollections([]);
      setOwnedNFTs([]);
    }
  }, [address, chain, provider]);
  
  // Function to fetch user's NFT collections
  const fetchUserCollections = async () => {
    if (!address || !provider) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Fetch all NFTs
      const nfts = await fetchNFTs(address, null, provider);
      
      // Group NFTs by collection (contract address)
      const collectionMap = {};
      
      nfts.forEach(nft => {
        if (!collectionMap[nft.contractAddress]) {
          collectionMap[nft.contractAddress] = {
            address: nft.contractAddress,
            name: nft.contractName || 'Unknown Collection',
            symbol: nft.symbol || 'NFT',
            tokens: [],
            count: 0,
            image: nft.image // Use first NFT image as collection thumbnail
          };
        }
        
        collectionMap[nft.contractAddress].tokens.push(nft);
        collectionMap[nft.contractAddress].count += 1;
      });
      
      // Convert map to array
      const collectionArray = Object.values(collectionMap);
      
      setCollections(collectionArray);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching collections:', err);
      setError('Failed to load collections. Please try again.');
      setLoading(false);
    }
  };
  
  // Function to fetch user's individual NFTs
  const fetchUserNFTs = async () => {
    if (!address || !provider) return;
    
    try {
      // Use the fetchNFTs function to get all NFTs
      const nfts = await fetchNFTs(address, null, provider);
      setOwnedNFTs(nfts);
    } catch (err) {
      console.error('Error fetching NFTs:', err);
    }
  };
  
  // Refresh data
  const refreshData = () => {
    fetchUserCollections();
    fetchUserNFTs();
  };
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Your NFT Dashboard</h2>
        <button 
          onClick={refreshData}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
        >
          Refresh
        </button>
      </div>
      
      {error && (
        <div className="p-4 mb-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Collections Section */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Your Collections</h3>
            {collections.length === 0 ? (
              <p className="text-gray-500">No collections found. Try refreshing or connecting a different wallet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {collections.map((collection, index) => (
                  <div key={index} className="border rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex items-center space-x-4">
                      <div className="h-16 w-16 rounded-full bg-gray-200 overflow-hidden">
                        {collection.image ? (
                          <img 
                            src={collection.image} 
                            alt={collection.name} 
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/nft1.png'; // Fallback image
                            }}
                          />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-blue-400 to-purple-500"></div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold">{collection.name}</h4>
                        <p className="text-sm text-gray-600">{collection.symbol}</p>
                        <p className="text-sm text-gray-600">{collection.count} NFTs</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Individual NFTs Section */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Your NFTs</h3>
            {ownedNFTs.length === 0 ? (
              <p className="text-gray-500">No NFTs found. Try refreshing or connecting a different wallet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {ownedNFTs.map((nft, index) => (
                  <EnhancedNFTCard 
                    key={index}
                    nft={nft}
                    address={address}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPanel;
