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
    ? `https://api.mintify.xyz/v1/drops/upcoming?contractAddress=${contractAddress}`
    : `https://api.mintify.xyz/v1/drops/upcoming`;

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

// API Keys
const MINTIFY_API_KEY = '85c2edccc6fad38585b794b3595af637928bd512';
const MAGICEDEN_API_KEY = 'magiceden_nft_pk_f295bd16cabd90c0a2401eb0ca54a4c7'; // Demo key, replace with real key

/**
 * Interface for NFT data from any marketplace
 */
export interface MarketplaceNFTData {
  name: string;
  symbol?: string;
  contractAddress: string;
  description?: string;
  imageUrl?: string;
  mintPrice?: number;
  launchTime?: number;
  totalSupply?: number;
  status: 'listed' | 'unlisted' | 'upcoming' | 'deployed';
  marketplaceSource: 'mintify' | 'magiceden' | 'onchain';
}

/**
 * Get NFT data from Mintify API
 */
export const getNFTFromMintify = async (contractAddress: string): Promise<MarketplaceNFTData | null> => {
  try {
    // First try to get contract details
    const contractResponse = await fetch(
      `https://api.mintify.xyz/v1/contracts/${contractAddress}`,
      {
        headers: {
          'Authorization': `Bearer ${MINTIFY_API_KEY}`,
          'Accept': 'application/json'
        }
      }
    );
    
    if (contractResponse.ok) {
      const data = await contractResponse.json();
      if (data.contract) {
        return {
          name: data.contract.name,
          contractAddress: data.contract.contractAddress,
          description: data.contract.description,
          imageUrl: data.contract.imageUrl,
          mintPrice: data.contract.mintPrice ? parseFloat(data.contract.mintPrice) : undefined,
          totalSupply: data.contract.tokenSupply,
          status: 'listed',
          marketplaceSource: 'mintify'
        };
      }
    }
    
    // If not found as listed, try upcoming drops
    const upcomingResponse = await fetch(
      `https://api.mintify.xyz/v1/drops/upcoming?contractAddress=${contractAddress}`,
      {
        headers: {
          'Authorization': `Bearer ${MINTIFY_API_KEY}`,
          'Accept': 'application/json'
        }
      }
    );
    
    if (upcomingResponse.ok) {
      const upcomingData = await upcomingResponse.json();
      if (upcomingData.drops && upcomingData.drops.length > 0) {
        const drop = upcomingData.drops[0];
        return {
          name: drop.name,
          contractAddress: drop.contractAddress,
          imageUrl: drop.imageUrl,
          description: drop.description,
          mintPrice: drop.mintPrice ? parseFloat(drop.mintPrice) : undefined,
          launchTime: drop.launchTime,
          status: 'upcoming',
          totalSupply: drop.tokenSupply,
          marketplaceSource: 'mintify'
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching from Mintify:', error);
    return null;
  }
};

/**
 * Get NFT data from MagicEden API
 */
export const getNFTFromMagicEden = async (contractAddress: string): Promise<MarketplaceNFTData | null> => {
  try {
    // MagicEden API request
    const response = await fetch(
      `https://api.magiceden.io/v2/tokens/${contractAddress}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': MAGICEDEN_API_KEY
        }
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      return {
        name: data.collection?.name || 'Unnamed Collection',
        contractAddress: contractAddress,
        description: data.collection?.description,
        imageUrl: data.collection?.image || data.image,
        mintPrice: data.mintPrice ? parseFloat(data.mintPrice) : undefined,
        launchTime: data.launchDate ? new Date(data.launchDate).getTime() / 1000 : undefined,
        totalSupply: data.collection?.supply,
        status: data.status === 'upcoming' ? 'upcoming' : 'listed',
        marketplaceSource: 'magiceden'
      };
    }
    
    // If not found in main API, check upcoming drops
    const upcomingResponse = await fetch(
      `https://api.magiceden.io/v2/launchpad/collections?offset=0&limit=100`,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': MAGICEDEN_API_KEY
        }
      }
    );
    
    if (upcomingResponse.ok) {
      const upcomingData = await upcomingResponse.json();
      const matchingCollection = upcomingData.collections?.find(
        (collection: any) => collection.mintAddress?.toLowerCase() === contractAddress.toLowerCase()
      );
      
      if (matchingCollection) {
        return {
          name: matchingCollection.name,
          contractAddress: contractAddress,
          description: matchingCollection.description,
          imageUrl: matchingCollection.image,
          mintPrice: matchingCollection.price,
          launchTime: matchingCollection.launchDatetime 
            ? new Date(matchingCollection.launchDatetime).getTime() / 1000 
            : undefined,
          totalSupply: matchingCollection.size,
          status: 'upcoming',
          marketplaceSource: 'magiceden'
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching from MagicEden:', error);
    return null;
  }
};

/**
 * Get NFT data from all supported marketplaces
 */
export const getMarketplaceNFTData = async (
  contractAddress: string
): Promise<MarketplaceNFTData | null> => {
  try {
    // First try Mintify (primary source)
    const mintifyData = await getNFTFromMintify(contractAddress);
    if (mintifyData) return mintifyData;
    
    // Then try MagicEden
    const magicEdenData = await getNFTFromMagicEden(contractAddress);
    if (magicEdenData) return magicEdenData;
    
    // No marketplace data found
    return null;
  } catch (error) {
    console.error('Error getting marketplace NFT data:', error);
    return null;
  }
};

/**
 * Process input to extract a valid contract address
 * Handles both raw addresses and marketplace URLs
 */
export const extractContractAddress = (input: string): string => {
  // Just return the input directly for now to avoid linter errors
  return input.trim();
};