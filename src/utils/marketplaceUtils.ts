// utils/marketplaceUtils.ts

export const OPENSEA_API_KEY = import.meta.env.OPENSEA_API_KEY;

/**
 * Fetch NFTs from OpenSea (Ethereum)
 */
export const fetchNFTsFromOpenSea = async (contractAddress: string) => {
  try {
    const response = await fetch(
      `https://api.opensea.io/api/v2/chain/ethereum/contract/${contractAddress}/nfts`,
      {
        headers: {
          'accept': 'application/json',
          'x-api-key': OPENSEA_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `OpenSea API error (${response.status}): ${errorData?.detail || response.statusText}`
      );
    }

    const data = await response.json();
    return data.nfts || [];
  } catch (err) {
    console.error('OpenSea error:', err);
    return [];
  }
};


export const fetchUpcomingCollectionsFromMagicEden = async ( contractAddress: string ) => {
  const url = contractAddress
    ? `http://localhost:5000/api/magiceden/upcoming?contract=${contractAddress}`
    : `http://localhost:5000/api/magiceden/upcoming`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Magic Eden API error (${response.status}): ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching upcoming collections from Magic Eden:', error);
    return [];
  }
};