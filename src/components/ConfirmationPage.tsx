import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';

const ConfirmationPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { gasFeePercentage, ethCost } = location.state || {
    gasFeePercentage: 0,
    ethCost: 0,
  };

  const transactionFee = 0.0001;
  const totalCost = ethCost + transactionFee;

  const handleConfirm = async () => {
    try {
      if (!window.ethereum) {
        alert('Please install MetaMask!');
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Convert total cost to wei (smallest unit) for transaction
      const totalCostInWei = ethers.parseUnits(totalCost.toFixed(18), 'ether');

      // Address that will receive the ETH (your platform address)
      const receiverAddress = '0xD52077C454BD1F5aAc87dbD0ffd27CAd163e9A31'; // Change this

      // Send the total cost
      const tx = await signer.sendTransaction({
        to: receiverAddress,
        value: totalCostInWei,
      });

      console.log('Transaction Sent:', tx); // Log the transaction object for debugging

      // Wait for confirmation (transaction mining)
      const receipt = await tx.wait();

      if (receipt && receipt.status === 1) {
        // Transaction successful
        navigate('/success', { state: { status: 'success' } });
      } else {
        throw new Error('Transaction failed');
      }
    } catch (err) {
      console.error('Transaction failed:', err);
      alert('Transaction failed. Please try again.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#1E2761] via-[#408EC6] to-[#7A2048] text-white p-6">
      <div className="w-full max-w-4xl p-6 bg-gray-900 rounded-lg border border-gray-700">
        <h2 className="text-2xl font-semibold mb-4">Confirmation</h2>

        <div className="mb-4">
          <h3 className="text-lg font-semibold">Gas Fee Summary</h3>
          <p>Percentage Selected: {gasFeePercentage}%</p>
          <p>ETH Cost: {ethCost.toFixed(6)} ETH</p>
          <p>Transaction Fee: 0.0001 ETH</p>
          <div className="mt-4 text-xl font-bold">Total Cost: {totalCost.toFixed(6)} ETH</div>
        </div>

        <button
          onClick={handleConfirm}
          className="bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 transition w-full"
        >
          Confirm Transaction
        </button>
      </div>
    </div>
  );
};

export default ConfirmationPage;