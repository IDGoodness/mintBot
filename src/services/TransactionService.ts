
import { ethers } from 'ethers';

class TransactionService {
  private provider: ethers.Provider | null = null;
  
  initialize(provider: ethers.Provider) {
    this.provider = provider;
    return this;
  }
  
  /**
   * Wait for a transaction to be confirmed
   * @param txHash Transaction hash
   * @param confirmations Number of confirmations to wait for
   */
  async waitForTransaction(txHash: string, confirmations: number = 1) {
    if (!this.provider) {
      throw new Error('TransactionService not initialized');
    }
    
    try {
      return await this.provider.waitForTransaction(txHash, confirmations);
    } catch (error) {
      console.error('Error waiting for transaction:', error);
      throw error;
    }
  }
  
  /**
   * Get transaction receipt
   * @param txHash Transaction hash
   */
  async getTransactionReceipt(txHash: string) {
    if (!this.provider) {
      throw new Error('TransactionService not initialized');
    }
    
    try {
      return await this.provider.getTransactionReceipt(txHash);
    } catch (error) {
      console.error('Error getting transaction receipt:', error);
      throw error;
    }
  }
  
  /**
   * Check if a transaction was successful
   * @param txHash Transaction hash
   */
  async isTransactionSuccessful(txHash: string): Promise<boolean> {
    try {
      const receipt = await this.getTransactionReceipt(txHash);
      return receipt !== null && receipt.status === 1;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Estimate gas for a transaction
   * @param tx Transaction request
   */
  async estimateGas(tx: ethers.TransactionRequest): Promise<bigint> {
    if (!this.provider) {
      throw new Error('TransactionService not initialized');
    }
    
    try {
      return await this.provider.estimateGas(tx);
    } catch (error) {
      console.error('Error estimating gas:', error);
      throw error;
    }
  }
  
  /**
   * Get recommended gas price (including EIP-1559 support)
   */
  async getRecommendedGasPrice(urgency: 'low' | 'medium' | 'high' = 'medium'): Promise<{
    gasPrice: bigint | null;
    maxFeePerGas: bigint | null;
    maxPriorityFeePerGas: bigint | null;
  }> {
    if (!this.provider) {
      throw new Error('TransactionService not initialized');
    }
    
    try {
      const feeData = await this.provider.getFeeData();
      
      // Multipliers based on urgency
      const multipliers = {
        low: 0.9,
        medium: 1.0,
        high: 1.3
      };
      
      const multiplier = multipliers[urgency];
      
      // EIP-1559 fees
      let maxFeePerGas = feeData.maxFeePerGas;
      let maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
      
      if (maxFeePerGas && maxPriorityFeePerGas) {
        maxFeePerGas = BigInt(Math.floor(Number(maxFeePerGas) * multiplier));
        maxPriorityFeePerGas = BigInt(Math.floor(Number(maxPriorityFeePerGas) * multiplier));
      }
      
      // Legacy gas price
      let gasPrice = feeData.gasPrice;
      if (gasPrice) {
        gasPrice = BigInt(Math.floor(Number(gasPrice) * multiplier));
      }
      
      return {
        gasPrice,
        maxFeePerGas,
        maxPriorityFeePerGas
      };
    } catch (error) {
      console.error('Error getting recommended gas price:', error);
      throw error;
    }
  }
}

// Export as singleton
export const transactionService = new TransactionService();
export default transactionService;
