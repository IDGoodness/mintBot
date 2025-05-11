import { ethers } from 'ethers';
import { transferNFT } from '../utils/nftTransferUtils';

const FEE_RECIPIENT = '0x...'; // Replace with your fee recipient address
const FEE_PERCENTAGE = 2; // 2% fee

export class TransactionService {
  private signer: ethers.Signer;
  private provider: ethers.Provider;

  constructor(signer: ethers.Signer) {
    this.signer = signer;
    this.provider = signer.provider!;
  }

  async calculateAndDeductFee(amount: bigint): Promise<bigint> {
    const feeAmount = (amount * BigInt(FEE_PERCENTAGE)) / BigInt(100);
    const remainingAmount = amount - feeAmount;

    // Send fee to fee recipient
    const feeTx = await this.signer.sendTransaction({
      to: FEE_RECIPIENT,
      value: feeAmount
    });

    await feeTx.wait();
    return remainingAmount;
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
    mintAmount: bigint,
    userAddress: string
  ): Promise<{
    feeTx: ethers.TransactionResponse;
    nftTx: boolean;
  }> {
    // 1. Calculate and deduct fee
    const remainingAmount = await this.calculateAndDeductFee(mintAmount);

    // 2. Transfer NFT to user using the provider and signer
    const nftTx = await this.transferNFT(contractAddress, tokenId, userAddress);

    // Get the fee transaction
    const feeTx = await this.signer.sendTransaction({
      to: FEE_RECIPIENT,
      value: mintAmount - remainingAmount
    });

    return {
      feeTx,
      nftTx
    };
  }
} 