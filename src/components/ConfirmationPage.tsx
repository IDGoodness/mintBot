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
  
      const sepoliaChainId = '0xaa36a7'; // Sepolia chain ID
  
      // Check current network
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
  
      // If not Sepolia, try switching
      if (currentChainId !== sepoliaChainId) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: sepoliaChainId }],
          });
        } catch (switchError: any) {
          // If the network isn't added in MetaMask
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: sepoliaChainId,
                    chainName: 'Sepolia Test Network',
                    nativeCurrency: {
                      name: 'SepoliaETH',
                      symbol: 'ETH',
                      decimals: 18,
                    },
                    rpcUrls: ['https://rpc.sepolia.org'],
                    blockExplorerUrls: ['https://sepolia.etherscan.io'],
                  },
                ],
              });
            } catch (addError) {
              alert('Failed to add Sepolia network. Please do it manually in MetaMask.');
              return;
            }
          } else {
            alert('Please switch to Sepolia network in MetaMask.');
            return;
          }
        }
      }
  
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
  
      const receiverAddress = '0xD52077C454BD1F5aAc87dbD0ffd27CAd163e9A31';
      const totalCostInWei = ethers.parseUnits(totalCost.toFixed(18), 'ether');
  
      const tx = await signer.sendTransaction({
        to: receiverAddress,
        value: totalCostInWei,
      });
  
      const receipt = await tx.wait();
  
      if (receipt && receipt.status === 1) {
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#1E2761] via-[#408EC6] to-[#7A2048] text-black p-6">
      <div className="w-full max-w-4xl p-11 bg-gray-100 rounded-lg border border-gray-300">
        <h2 className="text-4xl font-semibold mb-4 flex items-center justify-center">Confirmation</h2>

        <div className="mb-4 text-center">
          <h3 className="text-2xl font-semibold mb-2">Gas Fee Summary</h3>
          <p className="text-xl">Percentage Selected: {gasFeePercentage}%</p>
          <p className="text-xl">ETH Cost: {ethCost.toFixed(6)} ETH</p>
          <p className="text-xl">Transaction Fee: 0.0001 ETH</p>
          <div className="mt-4 text-3xl font-bold flex items-center justify-center mb-4">Total Cost: {totalCost.toFixed(6)} ETH</div>
        </div>

        <button
          onClick={handleConfirm}
          className="block mx-auto bg-indigo-600 text-white py-3 px-5 rounded-full shadow-xl transform transition duration-300 ease-in-out hover:-translate-y-1 hover:bg-indigo-700 active:shadow-inner"

        >
          Confirm Transaction
        </button>
      </div>
    </div>
  );
};

export default ConfirmationPage;