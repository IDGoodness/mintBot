import { ethers } from 'ethers';

// Standard ERC721 ABI for transfer functions
const ERC721_ABI = [
  'function transferFrom(address from, address to, uint256 tokenId) external',
  'function safeTransferFrom(address from, address to, uint256 tokenId) external',
  'function safeTransferFrom(address from, address to, uint256 tokenId, bytes data) external',
  'function ownerOf(uint256 tokenId) external view returns (address)'
];

/**
 * Transfer an NFT to the specified address
 * @param provider The ethers provider
 * @param signer The ethers signer
 * @param contractAddress The NFT contract address
 * @param tokenId The token ID to transfer
 * @param toAddress The address to transfer the NFT to
 * @returns Promise<boolean> indicating if the transfer was successful
 */
export async function transferNFT(
  provider: ethers.Provider,
  signer: ethers.Signer,
  contractAddress: string,
  tokenId: bigint,
  toAddress: string
): Promise<boolean> {
  try {
    // Create contract instance
    const contract = new ethers.Contract(contractAddress, ERC721_ABI, signer);
    
    // Get the current owner of the NFT
    const currentOwner = await contract.ownerOf(tokenId);
    
    // Check if the signer is the owner
    const signerAddress = await signer.getAddress();
    if (currentOwner.toLowerCase() !== signerAddress.toLowerCase()) {
      throw new Error('Signer is not the owner of the NFT');
    }
    
    // Try safeTransferFrom first (recommended)
    try {
      const tx = await contract.safeTransferFrom(signerAddress, toAddress, tokenId);
      await tx.wait();
      return true;
    } catch (error) {
      console.warn('safeTransferFrom failed, trying transferFrom:', error);
      
      // Fallback to regular transferFrom
      const tx = await contract.transferFrom(signerAddress, toAddress, tokenId);
      await tx.wait();
      return true;
    }
  } catch (error) {
    console.error('Error transferring NFT:', error);
    return false;
  }
}

/**
 * Verify NFT ownership
 * @param provider The ethers provider
 * @param contractAddress The NFT contract address
 * @param tokenId The token ID to check
 * @param address The address to verify ownership for
 * @returns Promise<boolean> indicating if the address owns the NFT
 */
export async function verifyNFTOwnership(
  provider: ethers.Provider,
  contractAddress: string,
  tokenId: bigint,
  address: string
): Promise<boolean> {
  try {
    const contract = new ethers.Contract(contractAddress, ERC721_ABI, provider);
    const owner = await contract.ownerOf(tokenId);
    return owner.toLowerCase() === address.toLowerCase();
  } catch (error) {
    console.error('Error verifying NFT ownership:', error);
    return false;
  }
}

/**
 * Get NFT metadata
 * @param provider The ethers provider
 * @param contractAddress The NFT contract address
 * @param tokenId The token ID to get metadata for
 * @returns Promise<{name: string, symbol: string, owner: string}> The NFT metadata
 */
export async function getNFTMetadata(
  provider: ethers.Provider,
  contractAddress: string,
  tokenId: bigint
): Promise<{name: string, symbol: string, owner: string}> {
  try {
    const contract = new ethers.Contract(contractAddress, ERC721_ABI, provider);
    const owner = await contract.ownerOf(tokenId);
    
    // Note: name and symbol are optional in ERC721, so we'll return empty strings if not available
    let name = '';
    let symbol = '';
    
    try {
      name = await contract.name();
    } catch (error) {
      console.warn('Contract does not implement name()');
    }
    
    try {
      symbol = await contract.symbol();
    } catch (error) {
      console.warn('Contract does not implement symbol()');
    }
    
    return { name, symbol, owner };
  } catch (error) {
    console.error('Error getting NFT metadata:', error);
    throw error;
  }
} 