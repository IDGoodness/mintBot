import { ethers } from 'ethers';
import { transferNFT } from '../utils/nftTransferUtils';

export class TransactionService {
  private signer: ethers.Signer;
  private provider: ethers.Provider;

  constructor(signer: ethers.Signer) {
    this.signer = signer;
    this.provider = signer.provider!;
  }

  async transferNFT(contractAddress: string, tokenId: number, toAddress: string): Promise<boolean> {
    // Use the provider for read operations and signer for write operations
    return await transferNFT(
      this.provider,
      this.signer,
      contractAddress,
      BigInt(tokenId),
      toAddress
    );
  }

  async handleSuccessfulSnipe(
    contractAddress: string,
    tokenId: number,
    userAddress: string
  ): Promise<{
    success: boolean;
    tokenId: number;
    contractAddress: string;
  }> {
    console.log(`Handling successful snipe: NFT #${tokenId} at ${contractAddress} for ${userAddress}`);
    
    // Transfer NFT to user using the provider and signer
    const success = await this.transferNFT(contractAddress, tokenId, userAddress);

    // Return the success status and details
    return {
      success,
      tokenId,
      contractAddress
    };
  }
} 