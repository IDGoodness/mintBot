
const axios = require('axios');
const ethers = require('ethers');

// ERC721 minimal ABI for getting token data
const ERC721_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function balanceOf(address owner) view returns (uint256)'
];

// Fallback image if metadata can't be loaded
const FALLBACK_IMAGE = '/nft1.png';

/**
 * Fetch NFTs for a given wallet address and contract
 * @param {string} walletAddress - The wallet address to fetch NFTs for
 * @param {string} contractAddress - Optional contract address to filter by
 * @param {ethers.Provider} provider - Ethers provider
 * @returns {Promise<Array>} - Array of NFT objects
 */
async function fetchNFTs(walletAddress, contractAddress, provider) {
  if (!walletAddress || !ethers.isAddress(walletAddress)) {
    console.error('Invalid wallet address');
    return [];
  }
  
  try {
    // If we have a specific contract, fetch NFTs just for that contract
    if (contractAddress && ethers.isAddress(contractAddress)) {
      return await fetchNFTsFromContract(walletAddress, contractAddress, provider);
    }
    
    // Otherwise fetch from multiple sources for better coverage
    const [alchemyNFTs, moralisNFTs] = await Promise.allSettled([
      fetchFromAlchemy(walletAddress, provider.network.chainId),
      fetchFromMoralis(walletAddress, provider.network.chainId)
    ]);
    
    // Combine and deduplicate results
    const nfts = [];
    
    if (alchemyNFTs.status === 'fulfilled' && alchemyNFTs.value) {
      nfts.push(...alchemyNFTs.value);
    }
    
    if (moralisNFTs.status === 'fulfilled' && moralisNFTs.value) {
      // Add Moralis NFTs that aren't already in the list
      moralisNFTs.value.forEach(moralisNFT => {
        if (!nfts.some(nft => 
          nft.contractAddress === moralisNFT.contractAddress && 
          nft.tokenId === moralisNFT.tokenId
        )) {
          nfts.push(moralisNFT);
        }
      });
    }
    
    // If we still have no NFTs, try on-chain method as last resort
    if (nfts.length === 0) {
      // This would require knowing which contracts to check
      // For now just log that we couldn't find any NFTs
      console.log('No NFTs found through APIs, consider specifying contracts');
    }
    
    return nfts;
  } catch (error) {
    console.error('Error fetching NFTs:', error);
    return [];
  }
}

/**
 * Fetch NFTs from a specific contract
 */
async function fetchNFTsFromContract(walletAddress, contractAddress, provider) {
  try {
    // Create contract instance
    const contract = new ethers.Contract(contractAddress, ERC721_ABI, provider);
    
    // Get balance
    const balance = await contract.balanceOf(walletAddress);
    if (balance === 0n) {
      return [];
    }
    
    // Try to get collection metadata
    let name = 'Unknown Collection';
    let symbol = 'NFT';
    
    try {
      name = await contract.name();
      symbol = await contract.symbol();
    } catch (e) {
      console.warn('Could not get collection metadata:', e);
    }
    
    // Since ERC721 doesn't have a standard way to get all tokens,
    // we'd need to check events or use indexer APIs
    // For now return a placeholder indicating NFTs exist
    return [{
      contractAddress,
      contractName: name,
      symbol,
      tokenId: 'unknown', // We'd need token enumeration or events to get actual IDs
      name: `${name} Token`,
      description: `A token from the ${name} collection`,
      image: FALLBACK_IMAGE,
      tokenType: 'ERC721',
      timeLastUpdated: new Date().toISOString(),
      balance: Number(balance)
    }];
  } catch (error) {
    console.error('Error fetching NFTs from contract:', error);
    return [];
  }
}

/**
 * Fetch NFTs from Alchemy API
 */
async function fetchFromAlchemy(walletAddress, chainId) {
  // Select API base URL based on network
  const networkMap = {
    1: 'eth-mainnet',
    5: 'eth-goerli',
    137: 'polygon-mainnet',
    80001: 'polygon-mumbai',
    // Add other networks as needed
  };
  
  const network = networkMap[chainId] || 'eth-mainnet';
  const apiKey = process.env.ALCHEMY_API_KEY || 'demo'; // Should be configured in your env
  
  try {
    const response = await axios.get(
      `https://eth-mainnet.g.alchemy.com/v2/${apiKey}/getNFTs/`,
      {
        params: {
          owner: walletAddress,
          withMetadata: true,
          pageSize: 100
        },
        timeout: 10000 // 10 second timeout
      }
    );
    
    if (response.data && response.data.ownedNfts) {
      return response.data.ownedNfts.map(nft => ({
        contractAddress: nft.contract.address,
        contractName: nft.contract.name || 'Unknown Collection',
        symbol: nft.contract.symbol || 'NFT',
        tokenId: nft.id.tokenId,
        name: nft.title || `NFT #${nft.id.tokenId}`,
        description: nft.description || '',
        image: nft.media[0]?.gateway || FALLBACK_IMAGE,
        tokenType: nft.id.tokenMetadata?.tokenType || 'ERC721',
        timeLastUpdated: nft.timeLastUpdated || new Date().toISOString()
      }));
    }
    return [];
  } catch (error) {
    console.warn('Alchemy API error:', error);
    return [];
  }
}

/**
 * Fetch NFTs from Moralis API
 */
async function fetchFromMoralis(walletAddress, chainId) {
  // Map chainId to Moralis format
  const chainMap = {
    1: 'eth',
    5: 'goerli',
    137: 'polygon',
    80001: 'mumbai',
    // Add other networks as needed
  };
  
  const chain = chainMap[chainId] || 'eth';
  const apiKey = process.env.MORALIS_API_KEY || ''; // Should be configured in your env
  
  // If no API key, skip this source
  if (!apiKey) {
    console.warn('No Moralis API key configured');
    return [];
  }
  
  try {
    const response = await axios.get(
      `https://deep-index.moralis.io/api/v2/${walletAddress}/nft`,
      {
        params: {
          chain,
          format: 'decimal',
          limit: 100
        },
        headers: {
          'accept': 'application/json',
          'X-API-Key': apiKey
        },
        timeout: 10000 // 10 second timeout
      }
    );
    
    if (response.data && response.data.result) {
      return response.data.result.map(nft => {
        // Try to parse metadata if it exists
        let metadata = {};
        try {
          if (nft.metadata) {
            metadata = JSON.parse(nft.metadata);
          }
        } catch (e) {
          console.warn('Could not parse NFT metadata:', e);
        }
        
        return {
          contractAddress: nft.token_address,
          contractName: nft.name || 'Unknown Collection',
          symbol: nft.symbol || 'NFT',
          tokenId: nft.token_id,
          name: metadata.name || `NFT #${nft.token_id}`,
          description: metadata.description || '',
          image: metadata.image || FALLBACK_IMAGE,
          tokenType: nft.contract_type || 'ERC721',
          timeLastUpdated: new Date().toISOString()
        };
      });
    }
    return [];
  } catch (error) {
    console.warn('Moralis API error:', error);
    return [];
  }
}

module.exports = {
  fetchNFTs
};
