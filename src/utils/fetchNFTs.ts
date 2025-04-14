// src/utils/fetchNFTs.ts

export const getEthNFTs = async (contractAddress: string) => {
    try {
      const response = await fetch(`https://api.opensea.io/api/v2/chain/ethereum/contract/${contractAddress}/nfts`, {
        headers: {
          'accept': 'application/json',
          'x-api-key': 'your-opensea-api-key', // replace with your real key
        },
      });
      const data = await response.json();
      return data.nfts || [];
    } catch (error) {
      console.error('Error fetching NFTs from Ethereum (OpenSea):', error);
      return [];
    }
  };
  
  export const getBeraNFTs = async (contractAddress: string) => {
    try {
      const response = await fetch(`https://api.mintify.xyz/nft/v2/nfts/${contractAddress}?chain=berachain`, {
        headers: {
          'accept': 'application/json',
          'x-api-key': 'your-mintify-api-key', // replace with your real key
        },
      });
      const data = await response.json();
      return data.nfts || [];
    } catch (error) {
      console.error('Error fetching NFTs from Berachain (Mintify):', error);
      return [];
    }
  };
  