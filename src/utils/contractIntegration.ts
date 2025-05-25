
import { ethers } from 'ethers';

// ABI fragments for common NFT functions
const MINTING_ABI = [
  // ERC721 with mint function
  'function mint(address to) public payable returns (uint256)',
  'function mint(address to, uint256 tokenId) public payable',
  'function mintTo(address to) public payable returns (uint256)',
  'function safeMint(address to) public payable returns (uint256)',
  
  // Functions with quantity
  'function mint(address to, uint256 quantity) public payable returns (uint256[])',
  'function mintBatch(address to, uint256 quantity) public payable',
  
  // Mint with URI
  'function mintWithURI(address to, string uri) public payable returns (uint256)',
  
  // Common view functions
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  
  // Sales info
  'function price() view returns (uint256)',
  'function mintPrice() view returns (uint256)',
  'function cost() view returns (uint256)',
  'function getPrice() view returns (uint256)',
  'function publicPrice() view returns (uint256)',
];

// Signature detection for mint functions
const MINT_FUNCTION_SIGNATURES = [
  'mint(address)',
  'mint(address,uint256)',
  'mintTo(address)',
  'safeMint(address)',
  'mint(address,uint256)',
  'mintBatch(address,uint256)',
];

/**
 * Validates an NFT contract address
 * @param {string} contractAddress - The contract address to validate
 * @param {ethers.Provider} provider - Ethers provider
 * @returns {Promise<{isValid: boolean, name: string, error: string}>}
 */
export async function validateNFTContract(contractAddress, provider) {
  if (!contractAddress || !ethers.isAddress(contractAddress)) {
    return { isValid: false, name: '', error: 'Invalid contract address format' };
  }
  
  try {
    // Check if contract exists
    const code = await provider.getCode(contractAddress);
    if (code === '0x' || code === '0x0') {
      return { isValid: false, name: '', error: 'No contract deployed at this address' };
    }
    
    // Create contract with ABI that includes common NFT functions
    const contract = new ethers.Contract(contractAddress, MINTING_ABI, provider);
    
    // Try to get basic NFT information
    try {
      const name = await contract.name();
      let symbol = '';
      try { symbol = await contract.symbol(); } catch {}
      
      return { 
        isValid: true, 
        name, 
        symbol,
        error: '' 
      };
    } catch (e) {
      // If we can't get name, it might not be an NFT contract
      return { 
        isValid: false, 
        name: '', 
        error: 'Could not retrieve NFT metadata. This may not be an NFT contract.' 
      };
    }
  } catch (error) {
    console.error('Error validating NFT contract:', error);
    return { 
      isValid: false, 
      name: '', 
      error: 'Error validating contract: ' + error.message 
    };
  }
}

/**
 * Detects available mint functions on a contract
 * @param {string} contractAddress - The contract address
 * @param {ethers.Provider} provider - Ethers provider
 * @returns {Promise<Array<{name: string, payable: boolean, params: Array}>>}
 */
export async function detectMintFunctions(contractAddress, provider) {
  if (!contractAddress || !ethers.isAddress(contractAddress)) {
    return [];
  }
  
  try {
    // Get contract code and analyze it (simplified approach)
    const contract = new ethers.Contract(contractAddress, MINTING_ABI, provider);
    
    // Try various known mint function patterns
    const mintFunctions = [];
    
    // Test each mint function signature
    for (const signature of MINT_FUNCTION_SIGNATURES) {
      try {
        // Check if function exists by trying to get its signature
        const fragment = contract.interface.getFunction(signature);
        if (fragment) {
          mintFunctions.push({
            name: fragment.name,
            payable: fragment.payable,
            params: fragment.inputs.map(input => ({
              name: input.name,
              type: input.type
            }))
          });
        }
      } catch {}
    }
    
    return mintFunctions;
  } catch (error) {
    console.error('Error detecting mint functions:', error);
    return [];
  }
}

/**
 * Gets the mint price from a contract
 * @param {string} contractAddress - The contract address
 * @param {ethers.Provider} provider - Ethers provider
 * @returns {Promise<{success: boolean, price: string, error: string}>}
 */
export async function getMintPrice(contractAddress, provider) {
  if (!contractAddress || !ethers.isAddress(contractAddress)) {
    return { success: false, price: '0', error: 'Invalid contract address' };
  }
  
  try {
    const contract = new ethers.Contract(contractAddress, MINTING_ABI, provider);
    
    // Try different common price function names
    const priceFunctions = ['price', 'mintPrice', 'cost', 'getPrice', 'publicPrice'];
    
    for (const priceFunc of priceFunctions) {
      try {
        const price = await contract[priceFunc]();
        return { 
          success: true, 
          price: price.toString(),
          error: '' 
        };
      } catch {}
    }
    
    // If no price function found, return default
    return { 
      success: false, 
      price: '0', 
      error: 'Could not determine mint price. The contract may require a fixed price or be free to mint.'
    };
  } catch (error) {
    console.error('Error getting mint price:', error);
    return { 
      success: false, 
      price: '0', 
      error: 'Error getting price: ' + error.message 
    };
  }
}

/**
 * Mints an NFT from a contract
 * @param {string} contractAddress - The contract address
 * @param {ethers.Signer} signer - Ethers signer
 * @param {object} options - Minting options
 * @returns {Promise<{success: boolean, txHash: string, error: string}>}
 */
export async function mintNFT(contractAddress, signer, options = {}) {
  if (!contractAddress || !ethers.isAddress(contractAddress)) {
    return { success: false, txHash: '', error: 'Invalid contract address' };
  }
  
  try {
    const contract = new ethers.Contract(contractAddress, MINTING_ABI, signer);
    const walletAddress = await signer.getAddress();
    
    // Determine mint function and parameters
    const mintFunctions = await detectMintFunctions(contractAddress, signer.provider);
    
    if (mintFunctions.length === 0) {
      return { 
        success: false, 
        txHash: '', 
        error: 'No mint function detected on this contract' 
      };
    }
    
    // Get mint price
    const { price } = await getMintPrice(contractAddress, signer.provider);
    const mintValue = options.value || price || '0';
    
    // Try each mint function until one works
    let lastError = '';
    
    for (const mintFunc of mintFunctions) {
      try {
        let tx;
        
        // Call appropriate mint function based on its signature
        switch (mintFunc.name) {
          case 'mint':
            if (mintFunc.params.length === 1) {
              // mint(address)
              tx = await contract.mint(walletAddress, { value: mintValue });
            } else if (mintFunc.params.length === 2 && mintFunc.params[1].type === 'uint256') {
              // mint(address, quantity)
              const quantity = options.quantity || 1;
              tx = await contract.mint(walletAddress, quantity, { value: mintValue });
            }
            break;
            
          case 'mintTo':
            tx = await contract.mintTo(walletAddress, { value: mintValue });
            break;
            
          case 'safeMint':
            tx = await contract.safeMint(walletAddress, { value: mintValue });
            break;
            
          case 'mintBatch':
            const batchQuantity = options.quantity || 1;
            tx = await contract.mintBatch(walletAddress, batchQuantity, { value: mintValue });
            break;
        }
        
        if (tx) {
          // Wait for transaction confirmation
          const receipt = await tx.wait();
          return { 
            success: true, 
            txHash: receipt.hash,
            error: '' 
          };
        }
      } catch (e) {
        lastError = e.message;
        // Continue to try next mint function
      }
    }
    
    return { 
      success: false, 
      txHash: '', 
      error: 'Failed to mint: ' + lastError 
    };
  } catch (error) {
    console.error('Error minting NFT:', error);
    return { 
      success: false, 
      txHash: '', 
      error: 'Error minting NFT: ' + error.message 
    };
  }
}

export default {
  validateNFTContract,
  detectMintFunctions,
  getMintPrice,
  mintNFT
};
