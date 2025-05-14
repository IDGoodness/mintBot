import { ethers } from 'ethers';
import contractMonitorService from '../services/ContractMonitorService';
import { getBestMintFunction, getNFTContractInfo } from './nftDetection';

// ABI for NFTSniper contract (minimal version with just the functions we need)
const NFT_SNIPER_ABI = [
  "function setupTarget(address nftContract, bytes4 mintSig, uint256 maxGasPrice, uint256 maxMintPrice) external",
  "function deposit() external payable",
  "function withdraw(uint256 amount) external nonReentrant",
  "function executeMint(address nftContract, uint256 quantity, uint256 mintPrice, uint256 gasPrice) external nonReentrant",
  "function setTargetActive(address nftContract, bool active) external",
  "function userBalances(address user) external view returns (uint256)"
];

// Full ABI and bytecode for deployment
// const NFT_SNIPER_FULL_ABI = [
//   "constructor()",
//   "function setupTarget(address nftContract, bytes4 mintSig, uint256 maxGasPrice, uint256 maxMintPrice) external",
//   "function deposit() external payable",
//   "function withdraw(uint256 amount) external nonReentrant",
//   "function executeMint(address nftContract, uint256 quantity, uint256 mintPrice, uint256 gasPrice) external nonReentrant",
//   "function setTargetActive(address nftContract, bool active) external",
//   "function userBalances(address user) external view returns (uint256)",
//   "function mintConfigurations(address user, address nftContract) external view returns (bytes4 mintSignature, uint256 maxGasPrice, uint256 maxMintPrice, bool active)",
//   "function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) external returns (bytes4)"
// ];

// Replace with the deployed contract address from your deployment
export const NFT_SNIPER_ADDRESS = '0x8464135c8F25Da09e49BC8782676a84730C318bC'; // Updated to your actual deployed contract address

/**
 * Check if a target NFT contract exists
 * @param provider Ethereum provider
 * @param contractAddress The NFT contract address to check
 * @returns Whether the contract is deployed
 */
export const isTargetContractDeployed = async (provider: ethers.Provider, contractAddress: string): Promise<boolean> => {
  try {
    const code = await provider.getCode(contractAddress);
    return code !== '0x';
  } catch (error) {
    console.error('Error checking if target contract is deployed:', error);
    return false;
  }
};

/**
 * Handle an upcoming NFT collection that isn't deployed yet
 * @param provider Ethereum provider
 * @param contractAddress The NFT contract address to monitor
 * @param nftName The name of the NFT collection
 * @param maxGasPrice Maximum gas price to pay (in Gwei)
 * @param maxMintPrice Maximum mint price to pay (in ETH)
 * @param launchTime Expected launch time (UNIX timestamp) if known
 * @returns Monitoring information
 */
export const monitorUpcomingNFT = async (
  provider: ethers.BrowserProvider,
  contractAddress: string,
  nftName: string,
  maxGasPrice: number,
  maxMintPrice: string,
  launchTime: number = 0
) => {
  // Check if the NFTSniper contract is deployed
  const sniperDeployed = await isContractDeployed(provider);
  if (!sniperDeployed) {
    throw new Error('NFTSniper contract not deployed. Please deploy it first.');
  }
  
  const targetDeployed = await isTargetContractDeployed(provider, contractAddress);
  if (!targetDeployed) {
    // Set up continuous monitoring for the contract's deployment
    const monitoringSuccess = await contractMonitorService.monitorContract(
      contractAddress,
      nftName,
      maxMintPrice,
      launchTime
    );

    if (!monitoringSuccess) {
      throw new Error('Failed to set up monitoring for the NFT contract');
    }

    // Register a callback for when the contract is deployed
    contractMonitorService.onDeployment(contractAddress, async (contract) => {
      try {
        console.log(`Contract ${contractAddress} has been deployed! Setting up sniper...`);
        console.log(contract);
        
        // Get information about the deployed contract
        const contractInfo = await getNFTContractInfo(provider, contractAddress);
        
        // If it's a valid NFT contract, set up the sniper automatically
        if (contractInfo && contractInfo.isERC721) {
          const mintSig = await getBestMintFunction(provider, contractAddress) || '0x00000000';
          
          // Set up the NFTSniper contract with the detected mint function
          const contract = await connectToNFTSniper(provider);
          const gasPriceWei = ethers.parseUnits(maxGasPrice.toString(), "gwei");
          const mintPriceWei = ethers.parseEther(maxMintPrice);
          
          await contract.setupTarget(
            contractAddress,
            mintSig,
            gasPriceWei,
            mintPriceWei
          );
          
          console.log(`Auto-setup complete for ${nftName} with mint signature ${mintSig}`);
        } else {
          console.warn(`Deployed contract at ${contractAddress} is not a valid ERC721 NFT`);
        }
      } catch (error) {
        console.error(`Error auto-setting up NFT sniper for ${contractAddress}:`, error);
      }
    });
    
    // Return monitoring information
    return {
      status: 'monitoring',
      contractAddress,
      name: nftName,
      maxGasPrice,
      maxMintPrice,
      message: 'This NFT contract is not deployed yet. We will monitor for its deployment and auto-setup once it launches.',
      launchTime
    };
  }
  
  // If the contract is already deployed, proceed with normal setup
  return null;
};

/**
 * Check if NFTSniper contract is deployed at the address
 * @param provider Ethereum provider
 * @returns Whether the contract is deployed
 */
export const isContractDeployed = async (provider: ethers.Provider): Promise<boolean> => {
  try {
    const code = await provider.getCode(NFT_SNIPER_ADDRESS);
    return code !== '0x';
  } catch (error) {
    console.error('Error checking if contract is deployed:', error);
    return false;
  }
};

/**
 * Deploy the NFTSniper contract if it's not already deployed
 * @param provider Ethereum provider
 * @returns Deployed contract instance
 */
export const deployNFTSniperIfNeeded = async (provider: ethers.BrowserProvider) => {
  const isDeployed = await isContractDeployed(provider);
  
  if (isDeployed) {
    console.log('NFTSniper contract already deployed at', NFT_SNIPER_ADDRESS);
    return connectToNFTSniper(provider);
  }
  
  console.log('Deploying NFTSniper contract...');
  
  // ABI and Bytecode would normally come from compilation
  // For simplicity, we're mocking this part in the frontend
  // In a real app, you would deploy via a backend script or Foundry
  
  // Since we can't deploy a contract easily in the frontend without the bytecode,
  // let's throw an error with clear instructions
  throw new Error(
    'NFTSniper contract not deployed. Please deploy the contract using Foundry with `forge create` and update the contract address in contractIntegration.ts'
  );
};

/**
 * Connect to the NFTSniper contract
 * @param provider Ethereum provider
 * @returns Contract instance
 */
export const connectToNFTSniper = async (provider: ethers.BrowserProvider) => {
  // First check if the contract is deployed
  const deployed = await isContractDeployed(provider);
  if (!deployed) {
    throw new Error(
      'NFTSniper contract not deployed at the specified address. Please deploy the contract first or check the address.'
    );
  }
  
  const signer = await provider.getSigner();
  return new ethers.Contract(NFT_SNIPER_ADDRESS, NFT_SNIPER_ABI, signer);
};

/**
 * Setup a target contract for sniping
 * @param provider Ethereum provider
 * @param contractAddress NFT contract address to snipe
 * @param nftName Name of the NFT collection
 * @param maxGasPrice Maximum gas price willing to pay (in gwei)
 * @param maxMintPrice Maximum price willing to pay per NFT (in ETH)
 * @param launchTime Expected launch time if known
 */
export const setupSniperTarget = async (
  provider: ethers.BrowserProvider, 
  contractAddress: string,
  nftName: string,
  maxGasPrice: number, 
  maxMintPrice: string,
  launchTime: number = 0
) => {
  // First check if the target contract is deployed
  const targetDeployed = await isTargetContractDeployed(provider, contractAddress);
  if (!targetDeployed) {
    // If the target contract isn't deployed yet, set up monitoring
    return await monitorUpcomingNFT(
      provider, 
      contractAddress, 
      nftName,
      maxGasPrice, 
      maxMintPrice,
      launchTime
    );
  }
  
  const contract = await connectToNFTSniper(provider);
  
  // Convert gas price from Gwei to Wei
  const gasPriceWei = ethers.parseUnits(maxGasPrice.toString(), "gwei");
  
  // Convert mint price from ETH to Wei
  const mintPriceWei = ethers.parseEther(maxMintPrice);
  
  // For deployed contracts, try to auto-detect the best mint function
  let mintSig = '0x00000000'; // Default to auto-detection

  try {
    const bestMintFunction = await getBestMintFunction(provider, contractAddress);
    if (bestMintFunction) {
      mintSig = bestMintFunction;
      console.log(`Auto-detected mint function: ${mintSig}`);
    }
  } catch (error) {
    console.warn('Error auto-detecting mint function:', error);
  }
  
  // Setup the target
  const tx = await contract.setupTarget(
    contractAddress,
    mintSig,
    gasPriceWei,
    mintPriceWei
  );
  
  // Wait for transaction to complete
  await tx.wait();
  
  return {
    status: 'ready',
    tx,
    contractAddress,
    mintSig,
    message: `NFT target ${nftName} has been set up successfully.`
  };
};

/**
 * Deposit ETH to the NFTSniper contract
 * @param provider Ethereum provider
 * @param amount Amount of ETH to deposit
 */
export const depositToSniper = async (provider: ethers.BrowserProvider, amount: string) => {
  const contract = await connectToNFTSniper(provider);
  
  // Convert ETH to Wei
  const weiAmount = ethers.parseEther(amount);
  
  // Deposit ETH
  const tx = await contract.deposit({ value: weiAmount });
  
  // Wait for transaction to complete
  await tx.wait();
  
  return tx;
};

/**
 * Get user balance in the NFTSniper contract
 * @param provider Ethereum provider
 * @param userAddress User's Ethereum address
 * @returns Balance in ETH
 */
export const getUserBalance = async (provider: ethers.BrowserProvider, userAddress: string) => {
  const contract = await connectToNFTSniper(provider);
  
  const balanceWei = await contract.userBalances(userAddress);
  
  // Convert from Wei to ETH
  return ethers.formatEther(balanceWei);
};

/**
 * Withdraw ETH from the NFTSniper contract
 * @param provider Ethereum provider
 * @param amount Amount of ETH to withdraw
 */
export const withdrawFromSniper = async (provider: ethers.BrowserProvider, amount: string) => {
  const contract = await connectToNFTSniper(provider);
  
  // Convert ETH to Wei
  const weiAmount = ethers.parseEther(amount);
  
  // Withdraw ETH
  const tx = await contract.withdraw(weiAmount);
  
  // Wait for transaction to complete
  await tx.wait();
  
  return tx;
};

/**
 * Execute a mint operation on a target NFT contract
 * @param provider Ethereum provider
 * @param nftContract NFT contract address
 * @param quantity Quantity to mint
 * @param mintPrice Price per NFT in ETH
 * @param gasPrice Gas price in Gwei
 */
export const executeMint = async (
  provider: ethers.BrowserProvider,
  nftContract: string,
  quantity: number,
  mintPrice: string,
  gasPrice: number
) => {
  // First check if the target contract is deployed
  const targetDeployed = await isTargetContractDeployed(provider, nftContract);
  if (!targetDeployed) {
    throw new Error('Target NFT contract is not yet deployed. We will monitor for its deployment.');
  }
  
  const contract = await connectToNFTSniper(provider);
  
  // Convert mint price from ETH to Wei
  const mintPriceWei = ethers.parseEther(mintPrice);
  
  // Convert gas price from Gwei to Wei
  const gasPriceWei = ethers.parseUnits(gasPrice.toString(), "gwei");
  
  // Execute mint
  const tx = await contract.executeMint(
    nftContract,
    quantity,
    mintPriceWei,
    gasPriceWei
  );
  
  // Wait for transaction to complete
  await tx.wait();
  
  return tx;
};

/**
 * Set a target active or inactive
 * @param provider Ethereum provider
 * @param nftContract NFT contract address
 * @param active Whether the target should be active
 */
export const setTargetActive = async (
  provider: ethers.BrowserProvider,
  nftContract: string,
  active: boolean
) => {
  const contract = await connectToNFTSniper(provider);
  
  // Set target active/inactive
  const tx = await contract.setTargetActive(nftContract, active);
  
  // Wait for transaction to complete
  await tx.wait();
  
  return tx;
}; 