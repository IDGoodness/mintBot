
import { ethers } from 'ethers';
import { validateNFTContract, detectMintFunctions, getMintPrice, mintNFT } from './contractIntegration';

class MintifyService {
  private provider: ethers.Provider | null = null;
  private signer: ethers.Signer | null = null;
  
  /**
   * Initialize the service with provider and signer
   */
  initialize(provider: ethers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
    console.log('MintifyService initialized');
    return this;
  }
  
  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return !!(this.provider && this.signer);
  }
  
  /**
   * Validate an NFT contract
   * @param contractAddress The contract address to validate
   */
  async validateContract(contractAddress: string) {
    if (!this.provider) {
      throw new Error('MintifyService not initialized');
    }
    
    return await validateNFTContract(contractAddress, this.provider);
  }
  
  /**
   * Get available mint functions on a contract
   * @param contractAddress The contract address
   */
  async getMintFunctions(contractAddress: string) {
    if (!this.provider) {
      throw new Error('MintifyService not initialized');
    }
    
    return await detectMintFunctions(contractAddress, this.provider);
  }
  
  /**
   * Get the mint price for a contract
   * @param contractAddress The contract address
   */
  async getPrice(contractAddress: string) {
    if (!this.provider) {
      throw new Error('MintifyService not initialized');
    }
    
    return await getMintPrice(contractAddress, this.provider);
  }
  
  /**
   * Mint an NFT from a contract
   * @param contractAddress The contract address
   * @param options Minting options (quantity, value, etc.)
   */
  async mint(contractAddress: string, options: any = {}) {
    if (!this.signer) {
      throw new Error('MintifyService not initialized with signer');
    }
    
    // Add gas price boost if specified
    if (options.gasBoost) {
      try {
        const feeData = await this.provider?.getFeeData();
        if (feeData && feeData.gasPrice) {
          const boostedGas = feeData.gasPrice * BigInt(options.gasBoost) / BigInt(100);
          options.gasPrice = boostedGas;
        }
      } catch (e) {
        console.warn('Failed to apply gas boost:', e);
      }
    }
    
    return await mintNFT(contractAddress, this.signer, options);
  }
  
  /**
   * Batch mint multiple NFTs
   * @param contractAddress The contract address
   * @param quantity Number of NFTs to mint
   * @param options Minting options
   */
  async batchMint(contractAddress: string, quantity: number, options: any = {}) {
    if (!this.signer) {
      throw new Error('MintifyService not initialized with signer');
    }
    
    // Add quantity to options
    options.quantity = quantity;
    
    // For batch minting, we might need to increase the value
    if (options.value) {
      options.value = (BigInt(options.value) * BigInt(quantity)).toString();
    }
    
    return await this.mint(contractAddress, options);
  }
  
  /**
   * Estimate gas for minting
   * @param contractAddress The contract address
   * @param options Minting options
   */
  async estimateGas(contractAddress: string, options: any = {}) {
    if (!this.provider || !this.signer) {
      throw new Error('MintifyService not initialized');
    }
    
    try {
      const contract = new ethers.Contract(
        contractAddress,
        [
          'function mint(address to) public payable returns (uint256)',
          'function mint(address to, uint256 tokenId) public payable',
        ],
        this.provider
      );
      
      const walletAddress = await this.signer.getAddress();
      
      // Try to estimate gas for mint function
      try {
        const gasEstimate = await contract.mint.estimateGas(
          walletAddress,
          { value: options.value || '0' }
        );
        
        return {
          success: true,
          gasEstimate: gasEstimate.toString(),
          error: ''
        };
      } catch (e) {
        // If the basic mint function fails, try with quantity
        try {
          const quantity = options.quantity || 1;
          const gasEstimate = await contract.mint.estimateGas(
            walletAddress,
            quantity,
            { value: options.value || '0' }
          );
          
          return {
            success: true,
            gasEstimate: gasEstimate.toString(),
            error: ''
          };
        } catch (e2) {
          return {
            success: false,
            gasEstimate: '0',
            error: 'Could not estimate gas: ' + e2.message
          };
        }
      }
    } catch (error) {
      console.error('Error estimating gas:', error);
      return {
        success: false,
        gasEstimate: '0',
        error: 'Error estimating gas: ' + error.message
      };
    }
  }
}

// Export as a singleton
export const mintifyService = new MintifyService();
export default mintifyService;
