import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ethers } from 'ethers';

interface SuccessPageProps {
  transactionDetails?: {
    feeTx: ethers.TransactionResponse;
    nftTx: ethers.ContractTransactionResponse;
    tokenId: number;
    contractAddress: string;
  };
}

const SuccessPage: React.FC<SuccessPageProps> = ({ transactionDetails }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const details = transactionDetails || location.state?.transactionDetails;

  if (!details) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-white mb-4">No transaction details found</h1>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="w-20 h-20 bg-green-500 rounded-full mx-auto mb-4 flex items-center justify-center"
          >
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">Snipe Successful! 🎉</h1>
          <p className="text-gray-300">Your NFT has been successfully minted and transferred to your wallet.</p>
        </div>

        <div className="space-y-6">
          <div className="bg-black/20 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Transaction Details</h2>
            <div className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm">Token ID</p>
                <p className="text-white font-mono">{details.tokenId}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Contract Address</p>
                <p className="text-white font-mono break-all">{details.contractAddress}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">NFT Transaction Hash</p>
                <a
                  href={`https://etherscan.io/tx/${details.nftTx.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 font-mono break-all"
                >
                  {details.nftTx.hash}
                </a>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Fee Transaction Hash</p>
                <a
                  href={`https://etherscan.io/tx/${details.feeTx.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 font-mono break-all"
                >
                  {details.feeTx.hash}
                </a>
              </div>
            </div>
          </div>

          <div className="flex justify-center space-x-4">
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Return to Dashboard
            </button>
            <button
              onClick={() => window.open(`https://etherscan.io/address/${details.contractAddress}`, '_blank')}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              View on Etherscan
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SuccessPage;
