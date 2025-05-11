import { ethers } from 'ethers';

const FEE_RECIPIENT = '0x...'; // Replace with your fee recipient address
const FEE_PERCENTAGE = 2; // 2% fee

export class TransactionService {
  private signer: ethers.Signer;

  constructor(signer: ethers.Signer) {
    this.signer = signer;
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

  async transferNFT(contractAddress: string, tokenId: number, toAddress: string): Promise<ethers.ContractTransactionResponse> {
    const nftContract = new ethers.Contract(
      contractAddress,
      [
        'function transferFrom(address from, address to, uint256 tokenId)',
        'function safeTransferFrom(address from, address to, uint256 tokenId)'
      ],
      this.signer
    );

    try {
      // Try safeTransferFrom first
      return await nftContract.safeTransferFrom(
        await this.signer.getAddress(),
        toAddress,
        tokenId
      );
    } catch (error) {
      // Fallback to regular transferFrom if safeTransferFrom fails
      return await nftContract.transferFrom(
        await this.signer.getAddress(),
        toAddress,
        tokenId
      );
    }
  }

  async handleSuccessfulSnipe(
    contractAddress: string,
    tokenId: number,
    mintAmount: bigint,
    userAddress: string
  ): Promise<{
    feeTx: ethers.TransactionResponse;
    nftTx: ethers.ContractTransactionResponse;
  }> {
    // 1. Calculate and deduct fee
    const remainingAmount = await this.calculateAndDeductFee(mintAmount);

    // 2. Transfer NFT to user
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