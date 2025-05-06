import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface NFTSniperFundingProps {
  walletAddress: string;
}

declare global {
  interface Window {
    ethereum: any;
    mintContracts?: {
      sniper: ethers.Contract;
      watcher: ethers.Contract;
    };
  }
}

const NFTSniperFunding: React.FC<NFTSniperFundingProps> = ({ walletAddress }) => {
  const [userBalance, setUserBalance] = useState<string>('0');
  const [depositAmount, setDepositAmount] = useState<string>('0.1');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('0');
  const [isDepositing, setIsDepositing] = useState<boolean>(false);
  const [isWithdrawing, setIsWithdrawing] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (!walletAddress || !window.ethereum || !window.mintContracts?.sniper) {
      setUserBalance('0');
      return;
    }

    const fetchUserBalance = async () => {
      try {
        const balance = await window.mintContracts?.sniper.userBalances(walletAddress);
        setUserBalance(ethers.formatEther(balance));
      } catch (error) {
        console.error('Error fetching user balance:', error);
      }
    };

    fetchUserBalance();
    const interval = setInterval(fetchUserBalance, 5000);

    return () => clearInterval(interval);
  }, [walletAddress]);

  const handleDeposit = async () => {
    if (!walletAddress || !window.ethereum || !window.mintContracts?.sniper) {
      setMessage({ text: 'Wallet or contracts not initialized', type: 'error' });
      return;
    }

    if (parseFloat(depositAmount) <= 0) {
      setMessage({ text: 'Please enter a valid deposit amount', type: 'error' });
      return;
    }

    try {
      setIsDepositing(true);
      setMessage({ text: 'Processing deposit...', type: 'info' });

      const tx = await window.mintContracts.sniper.deposit({
        value: ethers.parseEther(depositAmount)
      });

      setMessage({ text: 'Deposit transaction sent! Waiting for confirmation...', type: 'info' });
      await tx.wait();

      setMessage({ text: 'Deposit successful!', type: 'success' });
      
      const balance = await window.mintContracts.sniper.userBalances(walletAddress);
      setUserBalance(ethers.formatEther(balance));
    } catch (error) {
      console.error('Error depositing to contract:', error);
      setMessage({ text: `Deposit failed: ${error instanceof Error ? error.message : String(error)}`, type: 'error' });
    } finally {
      setIsDepositing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!walletAddress || !window.ethereum || !window.mintContracts?.sniper) {
      setMessage({ text: 'Wallet or contracts not initialized', type: 'error' });
      return;
    }

    const withdrawEth = withdrawAmount === '' ? userBalance : withdrawAmount;
    
    if (parseFloat(withdrawEth) <= 0) {
      setMessage({ text: 'Please enter a valid withdrawal amount', type: 'error' });
      return;
    }

    if (parseFloat(withdrawEth) > parseFloat(userBalance)) {
      setMessage({ text: 'Withdrawal amount exceeds your balance', type: 'error' });
      return;
    }

    try {
      setIsWithdrawing(true);
      setMessage({ text: 'Processing withdrawal...', type: 'info' });

      const tx = await window.mintContracts.sniper.withdraw(
        ethers.parseEther(withdrawEth)
      );

      setMessage({ text: 'Withdrawal transaction sent! Waiting for confirmation...', type: 'info' });
      await tx.wait();

      setMessage({ text: 'Withdrawal successful!', type: 'success' });
      setWithdrawAmount('');
      
      const balance = await window.mintContracts.sniper.userBalances(walletAddress);
      setUserBalance(ethers.formatEther(balance));
    } catch (error) {
      console.error('Error withdrawing from contract:', error);
      setMessage({ text: `Withdrawal failed: ${error instanceof Error ? error.message : String(error)}`, type: 'error' });
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="p-4 border border-gray-700 rounded-lg bg-gray-800/50 backdrop-blur-sm">
      <h3 className="text-lg font-medium text-white mb-4">Fund Your Sniper</h3>
      
      <div className="mb-4">
        <div className="flex justify-between mb-1">
          <span className="text-gray-400">Your Balance:</span>
          <span className="text-white font-bold">{parseFloat(userBalance).toFixed(4)} ETH</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full" 
            style={{ width: `${Math.min(parseFloat(userBalance) * 100, 100)}%` }}
          ></div>
        </div>
      </div>
      
      {/* Deposit Form */}
      <div className="mb-4">
        <label className="block text-gray-300 text-sm mb-1">Deposit ETH</label>
        <div className="flex space-x-2">
          <input
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            disabled={isDepositing}
            min="0.001"
            step="0.01"
            className="flex-1 bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleDeposit}
            disabled={isDepositing}
            className={`px-4 py-2 rounded font-medium ${
              isDepositing ? 'bg-gray-600' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isDepositing ? 'Depositing...' : 'Deposit'}
          </button>
        </div>
      </div>
      
      {/* Withdraw Form */}
      <div className="mb-4">
        <div className="flex justify-between">
          <label className="block text-gray-300 text-sm mb-1">Withdraw ETH</label>
          <button 
            className="text-xs text-blue-400 hover:text-blue-300"
            onClick={() => setWithdrawAmount(userBalance)}
          >
            Max
          </button>
        </div>
        <div className="flex space-x-2">
          <input
            type="number"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            disabled={isWithdrawing}
            min="0"
            max={userBalance}
            step="0.01"
            className="flex-1 bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleWithdraw}
            disabled={isWithdrawing || parseFloat(userBalance) <= 0}
            className={`px-4 py-2 rounded font-medium ${
              isWithdrawing || parseFloat(userBalance) <= 0 ? 'bg-gray-600' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
          </button>
        </div>
      </div>
      
      {/* Status Messages */}
      {message && (
        <div className={`p-3 rounded mt-2 ${
          message.type === 'success' ? 'bg-green-500/20 text-green-400' :
          message.type === 'error' ? 'bg-red-500/20 text-red-400' :
          'bg-blue-500/20 text-blue-400'
        }`}>
          <p className="text-sm">{message.text}</p>
        </div>
      )}
      
      <div className="mt-4 pt-3 border-t border-gray-700">
        <p className="text-xs text-gray-400">
          Funds deposited here are used for automatic NFT minting. You can withdraw your funds at any time.
        </p>
      </div>
    </div>
  );
};

export default NFTSniperFunding; 