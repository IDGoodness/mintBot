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

// ERC721 minimal ABI
const ERC721_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function ownerOf(uint256) view returns (address)',
  'function tokenURI(uint256) view returns (string)',
  'function supportsInterface(bytes4) view returns (bool)',
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
      isERC721: true,
      name,
      symbol,
      mintFunctions,
      abi: completeAbi
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
 * Watch for a mint function to become active
 * @param provider Ethereum provider
 * @param contractAddress NFT contract address
 * @param onMintActivated Callback for when mint is activated
 * @param intervalMs How often to check (default: 5000ms)
 * @returns Cleanup function
 */
export const watchForMintActivation = (
  provider: ethers.Provider,
  contractAddress: string,
  onMintActivated: (mintFunction: { name: string, signature: string }) => void,
  intervalMs = 5000
): () => void => {
  const checkedFunctions = new Set<string>();
  
  const interval = setInterval(async () => {
    try {
      // First, verify the contract is deployed
      const code = await provider.getCode(contractAddress);
      if (code === '0x') {
        return; // Contract not deployed yet
      }
      
      // Detect mint functions
      const functions = await detectMintFunctions(provider, contractAddress);
      
      // Check each detected mint function
      for (const func of functions) {
        // Skip functions we've already checked and found inaccessible
        if (checkedFunctions.has(func.name)) continue;
        
        const isAccessible = await isMintFunctionAccessible(
          provider,
          contractAddress,
          func.name
        );
        
        if (isAccessible) {
          onMintActivated(func);
          clearInterval(interval);
          return;
        } else {
          // Mark as checked so we don't waste resources checking it again
          checkedFunctions.add(func.name);
        }
      }
    } catch (error) {
      console.error('Error checking mint activation:', error);
    }
  }, intervalMs);
  
  // Return cleanup function
  return () => clearInterval(interval);
};

/**
 * Execute a mint transaction directly on an NFT contract
 * @param provider Ethereum provider
 * @param contractAddress NFT contract address
 * @param mintFunctionName Name of the mint function to call
 * @param quantity Number of NFTs to mint
 * @param maxPriceInEth Maximum price willing to pay per NFT
 * @returns Transaction receipt
 */
export const executeDirectMint = async (
  provider: ethers.Provider,
  contractAddress: string,
  mintFunctionName: string,
  quantity: number = 1,
  maxPriceInEth: string = '0.1'
): Promise<ethers.TransactionReceipt> => {
  if (!(provider instanceof ethers.BrowserProvider)) {
    throw new Error('This function requires a BrowserProvider');
  }
  
  const signer = await provider.getSigner();
  
  // Set up a minimal ABI based on the mint function name
  const abi = [
    `function ${mintFunctionName}() payable`,
    `function ${mintFunctionName}(uint256 quantity) payable`,
    `function ${mintFunctionName}(address recipient, uint256 quantity) payable`
  ];
  
  const contract = new ethers.Contract(contractAddress, abi, signer);
  const value = ethers.parseEther(maxPriceInEth);
  
  try {
    // Try to call the mint function with appropriate parameters
    let tx;
    
    // Start with the most common signature (mint with quantity)
    try {
      tx = await contract[mintFunctionName](quantity, { value });
    } catch (e) {
      // If that failed, try mint with no params
      try {
        tx = await contract[mintFunctionName]({ value });
      } catch (e2) {
        // Finally try mintTo (address, quantity)
        const address = await signer.getAddress();
        tx = await contract[mintFunctionName](address, quantity, { value });
      }
    }
    
    return await tx.wait();
  } catch (error) {
    console.error('Error executing direct mint:', error);
    throw error;
  }
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