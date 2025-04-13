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

      const sepoliaChainId = '0xaa36a7';

      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });

      if (currentChainId !== sepoliaChainId) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: sepoliaChainId }],
          });
        } catch (switchError: any) {
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
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-[#0f172a] overflow-hidden">
      {/* Glowing blue background blobs */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-2xl opacity-40 animate-pulse delay-200" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-3xl p-8 rounded-3xl backdrop-blur-sm bg-white/10 shadow-2xl border border-white/20 transition-all duration-500 ease-in-out text-white">
        <h2 className="text-4xl font-extrabold text-center mb-6 tracking-wide">Confirm Transaction</h2>

        <div className="grid gap-4 text-center text-lg font-medium">
          <div className="bg-white/20 backdrop-blur-md p-4 rounded-xl shadow-inner">
            <p className="text-xl">Gas Fee Percentage: <span className="font-bold">{gasFeePercentage}%</span></p>
          </div>
          <div className="bg-white/20 backdrop-blur-md p-4 rounded-xl shadow-inner">
            <p className="text-xl">ETH Cost: <span className="font-bold">{ethCost.toFixed(6)} ETH</span></p>
          </div>
          <div className="bg-white/20 backdrop-blur-md p-4 rounded-xl shadow-inner">
            <p className="text-xl">Transaction Fee: <span className="font-bold">0.0001 ETH</span></p>
          </div>
          <div className="bg-gradient-to-r from-green-400 to-blue-500 p-4 rounded-xl text-white text-2xl font-bold shadow-lg">
            Total Cost: {totalCost.toFixed(6)} ETH
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={handleConfirm}
            className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white py-3 px-6 rounded-full shadow-xl transition duration-300 ease-in-out text-xl font-semibold"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationPage;
