// utils/marketplaceUtils.ts

const OPENSEA_API_KEY = 'YOUR_OPENSEA_API_KEY';

export const fetchNFTsFromOpenSea = async (contractAddress: string) => {
  try {
    const response = await fetch(`https://api.opensea.io/api/v2/chain/ethereum/contract/${contractAddress}/nfts`, {
      headers: {
        'X-API-KEY': OPENSEA_API_KEY
      }
    });
    const data = await response.json();
    return data.nfts || [];
  } catch (err) {
    console.error('OpenSea error', err);
    return [];
  }
};

export const fetchNFTsFromMagicEden = async (contractAddress: string) => {
  try {
    // Adjust endpoint based on Magic Eden's EVM support
    const response = await fetch(`https://api-mainnet.magiceden.io/v2/evm/collections/${contractAddress}`);
    const data = await response.json();
    return data.nfts || [];
  } catch (err) {
    console.error('Magic Eden error', err);
    return [];
  }
};
  
  export const fetchNFTsFromMintify = async (contractAddress: string) => {
    try {
      // Replace with actual Mintify endpoint and API key if needed
      const response = await fetch(`https://api.mintify.xyz/contracts/${contractAddress}`);
      const data = await response.json();
      return data.nfts || [];
    } catch (err) {
      console.error('Mintify error', err);
      return [];
    }
  };
  