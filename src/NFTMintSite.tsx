import React from 'react';
import Connect from './components/Connect';
import Footer from './components/Footer';

interface NFTMintSiteProps {
  onConnect: (addr: string) => void;
}

const NFTMintSite: React.FC<NFTMintSiteProps> = ({ onConnect }) => {

  const handleConnect = (address: string) => {
    onConnect(address); // no need to store locally
    console.log('Connected wallet address:', address);
  };

  return (
    <div className="flex flex-col min-h-screen font-sans bg-gradient-to-br from-gray-900 to-indigo-900">
      <div className="flex flex-col lg:flex-row flex-grow md:mx-28">
        {/* Left Section */}
        <div className="flex-1 p-8 flex flex-col justify-center">
          <div className="max-w-md text-white">
            <h1 className="text-4xl font-bold mb-4">NFT Minting Site</h1>
            <p className="mb-6">
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Dignissimos reprehenderit voluptas ut magni...
            </p>
            <p className="text-sm text-gray-300">
              More details about the NFT and why you should mint it.
            </p>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-sm bg-gray-800 rounded-xl shadow-lg p-6 text-center">
            <img
              src="https://cdn.pixabay.com/photo/2024/05/26/10/15/bird-8788491_1280.jpg"
              alt="NFT pic"
              className="rounded-md mb-4 w-full h-auto"
            />
            <h2 className="text-2xl font-semibold text-white mb-1">Minting Site NFT</h2>
            <p className="text-gray-300 mb-2">This NFT can be minted from a website.</p>
            <p className="text-gray-200 font-medium mb-4">0 / 1 Claimed</p>

            <Connect onConnect={handleConnect} />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default NFTMintSite;