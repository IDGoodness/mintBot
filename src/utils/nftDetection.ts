import { ethers } from 'ethers';

// Common ERC721 function signatures to detect
const ERC721_SIGNATURES = {
  balanceOf: '0x70a08231', // balanceOf(address)
  ownerOf: '0x6352211e', // ownerOf(uint256)
  approve: '0x095ea7b3', // approve(address,uint256)
  getApproved: '0x081812fc', // getApproved(uint256)
  transferFrom: '0x23b872dd', // transferFrom(address,address,uint256)
  safeTransferFrom: '0x42842e0e', // safeTransferFrom(address,address,uint256)
};

// Common mint function signatures
const MINT_SIGNATURES = [
  {
    name: 'mint',
    signature: '0xa0712d68', // mint(uint256)
    parameters: ['uint256'],
  },
  {
    name: 'publicMint',
    signature: '0x2e8c91f5', // publicMint(uint256)
    parameters: ['uint256'],
  },
  {
    name: 'mintPublic',
    signature: '0xf7fb30e5', // mintPublic(uint256)
    parameters: ['uint256'],
  },
  {
    name: 'mintTo',
    signature: '0x449a52f8', // mintTo(address,uint256)
    parameters: ['address', 'uint256'],
  },
  {
    name: 'purchase',
    signature: '0xefef39a1', // purchase(uint256)
    parameters: ['uint256'],
  },
  {
    name: 'claim',
    signature: '0x4e71d92d', // claim()
    parameters: [],
  },
  {
    name: 'claimTo',
    signature: '0x12d1e440', // claimTo(address)
    parameters: ['address'],
  },
];

// Minimum ABI for ERC721 functionality
export const ERC721_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function approve(address to, uint256 tokenId)',
  'function getApproved(uint256 tokenId) view returns (address)',
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
  'function transferFrom(address from, address to, uint256 tokenId)',
  'function safeTransferFrom(address from, address to, uint256 tokenId)',
  'function safeTransferFrom(address from, address to, uint256 tokenId, bytes data)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)',
  'event ApprovalForAll(address indexed owner, address indexed operator, bool approved)',
];

export interface NFTContractInfo {
  contractAddress: string;
  isERC721: boolean;
  name?: string;
  symbol?: string;
  mintFunctions: Array<{
    name: string;
    signature: string;
    parameters: string[];
  }>;
  abi: string[];
}

/**
 * Check if an address is a valid ERC721 NFT contract
 * @param provider Ethereum provider
 * @param contractAddress Contract address to check
 * @returns Whether the contract implements ERC721 interface
 */
export const isERC721Contract = async (
  provider: ethers.Provider,
  contractAddress: string
): Promise<boolean> => {
  try {
    // First check if there's any code at this address
    const code = await provider.getCode(contractAddress);
    if (code === '0x' || code === '') {
      console.log(`No contract code at address ${contractAddress}`);
      return false;
    }

    // Check for presence of essential ERC721 functions in bytecode
    // We need at least balanceOf, ownerOf, and transferFrom to consider it an ERC721
    const requiredSignatures = [
      ERC721_SIGNATURES.balanceOf,
      ERC721_SIGNATURES.ownerOf,
      ERC721_SIGNATURES.transferFrom,
    ];

    let matchCount = 0;
    for (const signature of requiredSignatures) {
      if (code.includes(signature.slice(2))) {
        matchCount++;
      }
    }

    // If we found at least 2 of the 3 required signatures, assume it's an ERC721
    return matchCount >= 2;
  } catch (error) {
    console.error('Error checking if contract is ERC721:', error);
    return false;
  }
};

/**
 * Detect mint functions available in an NFT contract
 * @param provider Ethereum provider
 * @param contractAddress NFT contract address
 * @returns Array of detected mint function signatures
 */
export const detectMintFunctions = async (
  provider: ethers.Provider,
  contractAddress: string
): Promise<Array<{ name: string; signature: string; parameters: string[] }>> => {
  try {
    const code = await provider.getCode(contractAddress);
    if (code === '0x' || code === '') {
      return [];
    }

    const detectedFunctions = [];
    
    for (const mintFunc of MINT_SIGNATURES) {
      if (code.includes(mintFunc.signature.slice(2))) {
        detectedFunctions.push(mintFunc);
      }
    }

    return detectedFunctions;
  } catch (error) {
    console.error('Error detecting mint functions:', error);
    return [];
  }
};

/**
 * Get comprehensive information about an NFT contract
 * @param provider Ethereum provider
 * @param contractAddress NFT contract address
 * @returns Contract information and ABI
 */
export const getNFTContractInfo = async (
  provider: ethers.Provider,
  contractAddress: string
): Promise<NFTContractInfo | null> => {
  try {
    // Check if the address has any code
    const code = await provider.getCode(contractAddress);
    if (code === '0x' || code === '') {
      console.log(`No contract code at address ${contractAddress}`);
      return null;
    }

    // Check if it's an ERC721
    const isERC721 = await isERC721Contract(provider, contractAddress);
    if (!isERC721) {
      console.log(`Contract at ${contractAddress} is not an ERC721`);
      return null;
    }

    // Detect mint functions
    const mintFunctions = await detectMintFunctions(provider, contractAddress);

    // Try to get name and symbol
    let name = undefined;
    let symbol = undefined;
    
    try {
      const contract = new ethers.Contract(contractAddress, ERC721_ABI, provider);
      name = await contract.name();
      symbol = await contract.symbol();
    } catch (error) {
      console.warn('Could not get name/symbol for contract:', error);
    }

    // Generate complete ABI with detected mint functions
    const completeAbi = [...ERC721_ABI];
    
    // Add detected mint functions to ABI
    mintFunctions.forEach(func => {
      let abiEntry;
      if (func.parameters.length === 0) {
        abiEntry = `function ${func.name}() payable`;
      } else if (func.parameters.length === 1 && func.parameters[0] === 'uint256') {
        abiEntry = `function ${func.name}(uint256 quantity) payable`;
      } else if (func.parameters.length === 2 && func.parameters[0] === 'address' && func.parameters[1] === 'uint256') {
        abiEntry = `function ${func.name}(address recipient, uint256 quantity) payable`;
      }
      
      if (abiEntry) {
        completeAbi.push(abiEntry);
      }
    });

    return {
      contractAddress,
      isERC721,
      name,
      symbol,
      mintFunctions,
      abi: completeAbi,
    };
  } catch (error) {
    console.error('Error getting NFT contract info:', error);
    return null;
  }
};

/**
 * Check if the mint function in a contract can be called directly without special permissions
 * @param provider Ethereum provider
 * @param contractAddress NFT contract address
 * @param mintFunctionName Name of the mint function to test
 * @returns Whether the mint function can be called directly
 */
export const isMintFunctionAccessible = async (
  provider: ethers.Provider,
  contractAddress: string,
  mintFunctionName: string
): Promise<boolean> => {
  try {
    const info = await getNFTContractInfo(provider, contractAddress);
    if (!info) return false;

    const mintFunc = info.mintFunctions.find(f => f.name === mintFunctionName);
    if (!mintFunc) return false;

    // Create a contract instance with the detected ABI
    const contract = new ethers.Contract(contractAddress, info.abi, provider);

    // Try to estimate gas for the mint function call
    // This will fail if the function is not accessible (e.g., onlyOwner)
    if (mintFunc.parameters.length === 0) {
      await contract.getFunction(mintFunctionName).estimateGas({ value: ethers.parseEther('0.01') });
    } else if (mintFunc.parameters.length === 1 && mintFunc.parameters[0] === 'uint256') {
      await contract.getFunction(mintFunctionName).estimateGas(1, { value: ethers.parseEther('0.01') });
    } else if (mintFunc.parameters.length === 2 && mintFunc.parameters[0] === 'address' && mintFunc.parameters[1] === 'uint256') {
      if (provider instanceof ethers.BrowserProvider) {
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        await contract.getFunction(mintFunctionName).estimateGas(address, 1, { value: ethers.parseEther('0.01') });
      } else {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.log(`Mint function ${mintFunctionName} is not accessible:`, error);
    return false;
  }
};

/**
 * Monitor a contract for when its mint function becomes active
 * @param provider Ethereum provider
 * @param contractAddress NFT contract address
 * @param callback Function to call when mint becomes active
 * @param checkIntervalMs Time between checks in milliseconds
 * @returns Cleanup function
 */
export const watchForMintActivation = (
  provider: ethers.Provider,
  contractAddress: string,
  callback: (mintFunction: { name: string, signature: string }) => void,
  checkIntervalMs: number = 5000
): () => void => {
  let isMintActiveAlready = false;
  let activeMintFunction: { name: string, signature: string } | null = null;
  let isCleanedUp = false;
  
  const checkMintStatus = async () => {
    if (isCleanedUp) return;
    
    try {
      // Skip if we've already found an active mint function
      if (isMintActiveAlready && activeMintFunction) return;
      
      // Get NFT contract info
      const info = await getNFTContractInfo(provider, contractAddress);
      if (!info || info.mintFunctions.length === 0) return;
      
      // Check each mint function
      for (const func of info.mintFunctions) {
        const isAccessible = await isMintFunctionAccessible(provider, contractAddress, func.name);
        
        if (isAccessible) {
          console.log(`MINT FUNCTION ACTIVE: ${func.name} on contract ${contractAddress}`);
          isMintActiveAlready = true;
          activeMintFunction = {
            name: func.name,
            signature: func.signature
          };
          
          // Call the callback with the mint function info
          callback(activeMintFunction);
          break;
        }
      }
    } catch (error) {
      console.error('Error checking mint status:', error);
    } finally {
      // Schedule the next check if we haven't found an active mint yet
      if (!isMintActiveAlready && !isCleanedUp) {
        setTimeout(checkMintStatus, checkIntervalMs);
      }
    }
  };
  
  // Start checking
  checkMintStatus();
  
  // Return cleanup function
  return () => {
    isCleanedUp = true;
  };
};

/**
 * Direct mint function that can be used to immediately mint when a function becomes available
 * @param provider Ethereum provider
 * @param contractAddress NFT contract address
 * @param mintFunctionName Name of the mint function
 * @param quantity Quantity to mint
 * @param mintPriceEth Price per NFT in ETH
 * @returns Transaction receipt
 */
export const executeDirectMint = async (
  provider: ethers.BrowserProvider,
  contractAddress: string,
  mintFunctionName: string,
  quantity: number = 1,
  mintPriceEth: string = '0.01'
): Promise<ethers.TransactionReceipt> => {
  const info = await getNFTContractInfo(provider, contractAddress);
  if (!info) throw new Error('Could not get contract info');
  
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(contractAddress, info.abi, signer);
  
  // Get the mint function parameters
  const mintFunc = info.mintFunctions.find(f => f.name === mintFunctionName);
  if (!mintFunc) throw new Error(`Mint function ${mintFunctionName} not found`);
  
  const mintPriceWei = ethers.parseEther(mintPriceEth);
  let tx;
  
  // Call the mint function with the appropriate parameters
  if (mintFunc.parameters.length === 0) {
    // Example: mint()
    tx = await contract[mintFunctionName]({ value: mintPriceWei * BigInt(quantity) });
  } else if (mintFunc.parameters.length === 1 && mintFunc.parameters[0] === 'uint256') {
    // Example: mint(uint256 quantity)
    tx = await contract[mintFunctionName](quantity, { value: mintPriceWei * BigInt(quantity) });
  } else if (mintFunc.parameters.length === 2 && mintFunc.parameters[0] === 'address' && mintFunc.parameters[1] === 'uint256') {
    // Example: mintTo(address recipient, uint256 quantity)
    const recipient = await signer.getAddress();
    tx = await contract[mintFunctionName](recipient, quantity, { value: mintPriceWei * BigInt(quantity) });
  } else {
    throw new Error('Unsupported mint function parameter pattern');
  }
  
  // Wait for transaction to be mined
  const receipt = await tx.wait();
  return receipt;
};

/**
 * Get the best mint function to use for an NFT contract
 * @param provider Ethereum provider
 * @param contractAddress NFT contract address
 * @returns The best mint function signature to use
 */
export const getBestMintFunction = async (
  provider: ethers.Provider,
  contractAddress: string
): Promise<string | null> => {
  try {
    const info = await getNFTContractInfo(provider, contractAddress);
    if (!info || info.mintFunctions.length === 0) {
      return null;
    }

    // Check each mint function to see if it's accessible
    for (const func of info.mintFunctions) {
      const isAccessible = await isMintFunctionAccessible(provider, contractAddress, func.name);
      if (isAccessible) {
        return func.signature;
      }
    }

    // If no accessible function found, return the first mint function as fallback
    return info.mintFunctions[0].signature;
  } catch (error) {
    console.error('Error getting best mint function:', error);
    return null;
  }
}; 