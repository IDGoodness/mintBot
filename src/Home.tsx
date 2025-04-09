// NFTMintSite.tsx
import React from 'react';
import Footer from './components/Footer';

const NFTMintSite: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen font-sans bg-gradient-to-br from-gray-900 to-indigo-900">
      <div className="flex flex-col lg:flex-row flex-grow md:mx-28">
        
        {/* Left Section */}
        <div className="flex-1 p-8 flex flex-col justify-center">
          <div className="max-w-md text-white">
          {<img
            src=""
            alt="Site Logo"
            className="w-32 h-auto mb-4"
          /> }
            <h1 className="text-4xl font-bold mb-4">
              NFT Minting Site
            </h1>
            <p className="mb-6">
              Lorem ipsum dolor sit, amet consectetur adipisicing elit. Dignissimos reprehenderit voluptas ut magni. Ducimus sunt cumque, id tempora voluptas voluptate explicabo quidem nisi qui sed quod expedita nesciunt reprehenderit eveniet!
            </p>
            <p className="text-sm text-gray-300">
              Lorem ipsum dolor, sit amet consectetur adipisicing elit. Beatae veritatis ad quis quibusdam, dolore earum dignissimos voluptate illo unde aliquid corporis voluptates eaque nemo dolores soluta, qui totam quasi. Soluta.
            </p>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-sm bg-gray-800 rounded-xl shadow-lg p-6 text-center">

            <img
              src="https://www.google.com/imgres?q=picture&imgurl=https%3A%2F%2Fcdn.pixabay.com%2Fphoto%2F2024%2F05%2F26%2F10%2F15%2Fbird-8788491_1280.jpg&imgrefurl=https%3A%2F%2Fpixabay.com%2Fimages%2Fsearch%2Fnature%2F&docid=Ba_eiczVaD9-zM&tbnid=90TpIHBM_bySlM&vet=12ahUKEwiptr2Qh8uMAxUGUkEAHfA8DfAQM3oECBwQAA..i&w=1280&h=853&hcb=2&itg=1&ved=2ahUKEwiptr2Qh8uMAxUGUkEAHfA8DfAQM3oECBwQAA"
              alt="NFT pic"
              className="rounded-md mb-4 w-full h-auto"
            />

            <h2 className="text-2xl font-semibold text-white mb-1">
              Minting Site NFT
            </h2>

            <p className="text-gray-300 mb-2">
              This NFT can be minted from a website.
            </p>

            <p className="text-gray-200 font-medium mb-4">
              0 / 1 Claimed
            </p>

            <button
              className="w-full py-3 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      </div>

      {/* Footer Component */}
      <Footer />
    </div>
  );
};

export default NFTMintSite;
