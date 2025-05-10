import { ethers } from 'ethers';

// Bot fee configuration
export const BOT_FEE_CONFIG = {
  percentage: 0.05, // 5% fee
  recipientAddress: '0x0000000000000000000000000000000000000000', // Replace with actual fee recipient address
  minFee: ethers.parseEther('0.001'), // Minimum fee in ETH
  maxFee: ethers.parseEther('0.1') // Maximum fee in ETH
};

/**
 * Calculate the bot fee for a given amount
 * @param amount The amount to calculate fee for (in wei)
 * @returns The fee amount in wei
 */
export function calculateBotFee(amount: bigint): bigint {
  const fee = (amount * BigInt(Math.floor(BOT_FEE_CONFIG.percentage * 10000))) / BigInt(10000);
  
  // Ensure fee is within min/max bounds
  if (fee < BOT_FEE_CONFIG.minFee) {
    return BOT_FEE_CONFIG.minFee;
  }
  if (fee > BOT_FEE_CONFIG.maxFee) {
    return BOT_FEE_CONFIG.maxFee;
  }
  
  return fee;
}

/**
 * Calculate the amount after bot fee deduction
 * @param amount The original amount (in wei)
 * @returns The amount after fee deduction (in wei)
 */
export function calculateAmountAfterFee(amount: bigint): bigint {
  const fee = calculateBotFee(amount);
  return amount - fee;
}

/**
 * Create a transaction to transfer the bot fee
 * @param signer The ethers signer
 * @param amount The amount to transfer (in wei)
 * @returns The transaction object
 */
export async function createFeeTransferTransaction(
  signer: ethers.Signer,
  amount: bigint
): Promise<ethers.TransactionResponse> {
  const fee = calculateBotFee(amount);
  
  // Create the transaction
  const tx = {
    to: BOT_FEE_CONFIG.recipientAddress,
    value: fee,
    gasLimit: 21000n // Standard ETH transfer gas limit
  };
  
  return signer.sendTransaction(tx);
}

/**
 * Verify if a fee transfer was successful
 * @param provider The ethers provider
 * @param txHash The transaction hash
 * @returns Promise<boolean> indicating if the transfer was successful
 */
export async function verifyFeeTransfer(
  provider: ethers.Provider,
  txHash: string
): Promise<boolean> {
  try {
    const receipt = await provider.waitForTransaction(txHash);
    return receipt?.status === 1;
  } catch (error) {
    console.error('Error verifying fee transfer:', error);
    return false;
  }
}

/**
 * Format fee amount for display
 * @param amount The fee amount in wei
 * @returns Formatted string with ETH amount
 */
export function formatFeeAmount(amount: bigint): string {
  return `${ethers.formatEther(amount)} ETH`;
}

/**
 * Check if the fee recipient address is valid
 * @returns boolean indicating if the fee recipient address is valid
 */
export function isFeeRecipientValid(): boolean {
  return ethers.isAddress(BOT_FEE_CONFIG.recipientAddress) && 
         BOT_FEE_CONFIG.recipientAddress !== ethers.ZeroAddress;
} 