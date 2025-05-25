
import React, { useState, useEffect } from 'react';
import { useAccount, useNetwork, useProvider, useSigner } from 'wagmi';
import { ethers } from 'ethers';
import mintifyService from './MintifyService';

const NFTMintSite = () => {
  const { address } = useAccount();
  const { chain } = useNetwork();
  const provider = useProvider();
  const { data: signer } = useSigner();
  
  const [contractAddress, setContractAddress] = useState('');
  const [contractInfo, setContractInfo] = useState(null);
  const [mintFunctions, setMintFunctions] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [customValue, setCustomValue] = useState('');
  const [useCustomValue, setUseCustomValue] = useState(false);
  const [gasBoost, setGasBoost] = useState(0);
  
  const [validationLoading, setValidationLoading] = useState(false);
  const [mintLoading, setMintLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mintTxHash, setMintTxHash] = useState('');
  
  // Initialize MintifyService when provider and signer are available
  useEffect(() => {
    if (provider && signer) {
      mintifyService.initialize(provider, signer);
    }
  }, [provider, signer]);
  
  // Reset state when chain changes
  useEffect(() => {
    resetForm();
  }, [chain]);
  
  const resetForm = () => {
    setContractInfo(null);
    setMintFunctions([]);
    setQuantity(1);
    setCustomValue('');
    setUseCustomValue(false);
    setGasBoost(0);
    setError('');
    setSuccess('');
    setMintTxHash('');
  };
  
  // Validate NFT contract
  const validateContract = async () => {
    if (!contractAddress) {
      setError('Please enter a contract address');
      return;
    }
    
    if (!mintifyService.isInitialized()) {
      setError('Wallet not connected or service not initialized');
      return;
    }
    
    setValidationLoading(true);
    setError('');
    setContractInfo(null);
    setMintFunctions([]);
    
    try {
      // Validate the contract
      const validationResult = await mintifyService.validateContract(contractAddress);
      
      if (!validationResult.isValid) {
        setError(validationResult.error || 'Invalid NFT contract');
        setValidationLoading(false);
        return;
      }
      
      // Get mint functions
      const availableMintFunctions = await mintifyService.getMintFunctions(contractAddress);
      
      // Get mint price
      const priceResult = await mintifyService.getPrice(contractAddress);
      
      setContractInfo({
        name: validationResult.name,
        symbol: validationResult.symbol,
        price: priceResult.success ? priceResult.price : '0'
      });
      
      setMintFunctions(availableMintFunctions);
      
      if (availableMintFunctions.length === 0) {
        setError('No mint functions detected. This contract may not be mintable directly.');
      }
      
      setValidationLoading(false);
    } catch (err) {
      console.error('Contract validation error:', err);
      setError('Failed to validate contract: ' + err.message);
      setValidationLoading(false);
    }
  };
  
  // Format price for display
  const formatPrice = (priceWei) => {
    if (!priceWei || priceWei === '0') {
      return 'Free mint or unknown price';
    }
    
    try {
      const priceEth = ethers.formatEther(priceWei);
      return `${priceEth} ${chain?.nativeCurrency?.symbol || 'ETH'}`;
    } catch (err) {
      return 'Invalid price format';
    }
  };
  
  // Calculate total price based on quantity
  const calculateTotalPrice = () => {
    if (useCustomValue && customValue) {
      try {
        const valueWei = ethers.parseEther(customValue);
        const totalValueWei = valueWei * BigInt(quantity);
        return ethers.formatEther(totalValueWei);
      } catch (err) {
        return 'Invalid amount';
      }
    } else if (contractInfo?.price) {
      try {
        const priceWei = BigInt(contractInfo.price);
        const totalPriceWei = priceWei * BigInt(quantity);
        return ethers.formatEther(totalPriceWei);
      } catch (err) {
        return 'Invalid price';
      }
    }
    
    return '0';
  };
  
  // Mint NFT
  const mintNFT = async () => {
    if (!contractAddress || !mintifyService.isInitialized()) {
      setError('Contract address invalid or service not initialized');
      return;
    }
    
    setMintLoading(true);
    setError('');
    setSuccess('');
    setMintTxHash('');
    
    try {
      const options = {
        quantity: quantity,
        gasBoost: gasBoost > 0 ? gasBoost : undefined
      };
      
      // Set value for transaction
      if (useCustomValue && customValue) {
        try {
          const valueWei = ethers.parseEther(customValue);
          const totalValueWei = valueWei * BigInt(quantity);
          options.value = totalValueWei.toString();
        } catch (err) {
          setError('Invalid custom value');
          setMintLoading(false);
          return;
        }
      } else if (contractInfo?.price && contractInfo.price !== '0') {
        const priceWei = BigInt(contractInfo.price);
        const totalPriceWei = priceWei * BigInt(quantity);
        options.value = totalPriceWei.toString();
      }
      
      // Mint the NFT
      const result = await mintifyService.mint(contractAddress, options);
      
      if (result.success) {
        setSuccess('NFT minted successfully!');
        setMintTxHash(result.txHash);
      } else {
        setError(result.error || 'Failed to mint NFT');
      }
      
      setMintLoading(false);
    } catch (err) {
      console.error('Mint error:', err);
      setError('Error minting NFT: ' + err.message);
      setMintLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h2 className="text-2xl font-bold mb-6">NFT Minting Interface</h2>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        {/* Contract Address Input */}
        <div className="mb-6">
          <label className="block text-gray-700 mb-2">NFT Contract Address</label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              placeholder="0x..."
              className="flex-1 border rounded p-2"
            />
            <button
              onClick={validateContract}
              disabled={validationLoading || !address}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
            >
              {validationLoading ? 'Validating...' : 'Validate'}
            </button>
          </div>
          {!address && (
            <p className="text-red-500 mt-2">Please connect your wallet first</p>
          )}
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="p-3 mb-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {/* Success Display */}
        {success && (
          <div className="p-3 mb-4 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
            {mintTxHash && (
              <div className="mt-2">
                <a 
                  href={`${chain?.blockExplorers?.default?.url}/tx/${mintTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 underline"
                >
                  View transaction
                </a>
              </div>
            )}
          </div>
        )}
        
        {/* Contract Info Display */}
        {contractInfo && (
          <div className="mb-6 p-4 bg-gray-50 rounded border">
            <h3 className="font-bold text-lg">{contractInfo.name}</h3>
            {contractInfo.symbol && (
              <p className="text-gray-600">Symbol: {contractInfo.symbol}</p>
            )}
            <p className="text-gray-600">
              Price: {formatPrice(contractInfo.price)}
            </p>
            <p className="text-gray-600">
              Mint Functions: {mintFunctions.length > 0 
                ? mintFunctions.map(f => f.name).join(', ') 
                : 'None detected'}
            </p>
          </div>
        )}
        
        {/* Minting Options */}
        {contractInfo && mintFunctions.length > 0 && (
          <>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Quantity</label>
              <input
                type="number"
                min="1"
                max="10"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="border rounded p-2 w-full"
              />
            </div>
            
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={useCustomValue}
                  onChange={() => setUseCustomValue(!useCustomValue)}
                  className="mr-2"
                />
                <span>Use custom value</span>
              </label>
              
              {useCustomValue && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    placeholder="ETH amount"
                    className="border rounded p-2 w-full"
                  />
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">
                Gas Boost (% above base fee)
              </label>
              <input
                type="range"
                min="0"
                max="50"
                value={gasBoost}
                onChange={(e) => setGasBoost(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-500">
                <span>0%</span>
                <span>{gasBoost}%</span>
                <span>50%</span>
              </div>
            </div>
            
            <div className="mb-6 p-3 bg-gray-100 rounded">
              <p className="font-semibold">Total Cost: {calculateTotalPrice()} {chain?.nativeCurrency?.symbol || 'ETH'}</p>
            </div>
            
            <button
              onClick={mintNFT}
              disabled={mintLoading || !address}
              className="w-full py-3 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300"
            >
              {mintLoading ? 'Minting...' : 'Mint NFT'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default NFTMintSite;
