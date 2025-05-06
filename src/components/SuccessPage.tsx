import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const SuccessPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { status, contractAddress, gasFeePercentage } = location.state || {};
  console.log(status)

  const shortenAddress = (addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-[#0f172a] overflow-hidden text-white p-6">
      {/* Background effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-72 h-72 bg-green-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-2xl opacity-40 animate-pulse delay-200" />
      </div>

      {/* Success content */}
      <motion.div 
        className="relative z-10 w-full max-w-3xl p-8 rounded-3xl backdrop-blur-sm bg-white/10 shadow-2xl border border-white/20 text-center"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          className="bg-green-500 w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center"
        >
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
        
        <h1 className="text-4xl font-bold mb-4">Payment Successful!</h1>
        <p className="text-gray-300 text-xl mb-6">Your MintworX bot has been activated</p>
        
        <div className="bg-black/30 p-6 rounded-xl mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="relative mr-3">
                <div className="w-4 h-4 bg-green-500 rounded-full animate-ping absolute"></div>
                <div className="w-4 h-4 bg-green-500 rounded-full relative"></div>
              </div>
              <span className="text-green-400 font-semibold">Bot Active & Monitoring</span>
            </div>
            <span className="bg-green-500/20 text-green-400 text-sm py-1 px-3 rounded-full">LIVE</span>
          </div>
          
          {contractAddress && (
            <div className="bg-black/30 p-3 rounded mb-2 text-left">
              <p className="text-sm text-gray-400">Contract</p>
              <p className="font-mono text-white">{shortenAddress(contractAddress)}</p>
            </div>
          )}
          
          {gasFeePercentage && (
            <div className="bg-black/30 p-3 rounded mb-2 text-left">
              <p className="text-sm text-gray-400">Gas Settings</p>
              <p className="text-white">{gasFeePercentage}% of current gas price</p>
            </div>
          )}
          
          <div className="mt-4 text-left">
            <h3 className="text-white text-sm mb-2">Bot will:</h3>
            <ul className="text-sm text-gray-300 list-disc pl-5 space-y-1">
              <li>Monitor for mint events on this NFT contract</li>
              <li>Automatically mint when the collection launches</li>
              <li>Use optimal gas settings for successful transaction</li>
              <li>Notify you once minting is complete</li>
            </ul>
          </div>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={() => navigate('/')} 
            className="flex-1 py-3 px-6 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-semibold transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default SuccessPage;
