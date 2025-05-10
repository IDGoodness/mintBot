import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion'; // Import Framer Motion
import Connect from './components/Connect';
import Footer from './components/Footer';
import nft1 from "./assets/nft1.png";
import nft2 from "./assets/nft2.png";
import nft3 from "./assets/nft3.png";
import nft4 from "./assets/nft4.png";
import nft5 from "./assets/nft5.png";
import logo from "./assets/logo-remove.png";
import { useNavigate } from 'react-router-dom';

interface NFTMintSiteProps {
  onConnect: (addr: string) => void;
}

const NFTMintSite: React.FC<NFTMintSiteProps> = ({ onConnect }) => {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = [nft1, nft2, nft3, nft4, nft5];

  useEffect(() => {
    // Check for valid session
    const sessionData = localStorage.getItem('sessionData');
    if (sessionData) {
      const data = JSON.parse(sessionData);
      const isSessionValid = Date.now() - data.timestamp < 24 * 60 * 60 * 1000; // 24 hours
      if (isSessionValid) {
        navigate('/dashboard');
      }
    }
  }, [navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000); // Change image every 3 seconds
    return () => clearInterval(interval); // Cleanup interval on component unmount
  }, [images.length]);

  const handleConnect = (address: string) => {
    onConnect(address); // no need to store locally
    console.log('Connected wallet address:', address);
  };

  return (
    <motion.div
      className="flex flex-col min-h-screen font-sans bg-gradient-to-br from-gray-900 to-indigo-900"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <motion.div
        className="flex flex-col lg:flex-row flex-grow md:mx-28"
        initial={{ y: -50 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Left Section */}
        <motion.div
          className="flex-1 p-8 flex flex-col justify-center"
          initial={{ x: -100 }}
          animate={{ x: 0 }}
          transition={{ duration: 2.0 }}
        >
          <div className="max-w-md text-white">
            <div className="flex items-center mb-4">
              <img src={logo} alt="MintworX Logo" className="w-28" />
              <h1 className="text-4xl font-bold text-white text-center">MintworX</h1>
            </div>
            <p className="mb-6 text-center md:text-left ">
              Revolutionalize minting processes with our exclusive Mint-Bot
            </p>
            <p className="text-sm text-gray-300 text-center md:text-left ">
              MintworX combines the excitement of NFT art with practical utility. Our NFTs are your exclusive key to the Mint Bot, a powerful tool for minting NFTs from top launchpads with precision.
            </p>
          </div>
        </motion.div>

        {/* Right Section */}
        <motion.div
          className="flex-1 flex items-center justify-center p-8"
          initial={{ x: 100 }}
          animate={{ x: 0 }}
          transition={{ duration: 2.0 }}
        >
          <div className="w-full max-w-sm bg-gray-800 rounded-xl shadow-lg p-6 text-center">
            <img
              src={images[currentImageIndex]}
              alt={`NFT ${currentImageIndex + 1}`}
              className="rounded-md mb-4 w-full h-auto"
              key={currentImageIndex} // Key ensures animation runs on image change
              // initial={{ opacity: 0 }}
              // animate={{ opacity: 1 }}
              // transition={{ duration: 1.5 }}
            />
            <h2 className="text-2xl font-semibold text-white mb-1">MintworX</h2>
            <p className="text-gray-300 mb-2">This NFT can be minted from a website.</p>
            <Connect onConnect={handleConnect} />
          </div>
        </motion.div>
      </motion.div>

      <Footer />
    </motion.div>
  );
};

export default NFTMintSite;