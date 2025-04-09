import { useState } from 'react';
import NFTMintSite from './NFTMintSite.tsx';
import DashboardPanel from './components/DashboardPanel';

function App() {
  const [walletAddress, setWalletAddress] = useState('');
  const [status, setStatus] = useState('Disconnected');

  const handleWalletConnect = (address: string) => {
    setWalletAddress(address);
    setStatus('Wallet Connected');
  };

  const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS || '0x...';

  return (
    <>
      {!walletAddress ? (
        <NFTMintSite onConnect={handleWalletConnect} />
      ) : (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
          <h1 className="text-5xl font-bold mb-6">mintBot</h1>
          <DashboardPanel status={status} contractAddress={contractAddress} />
        </div>
      )}
    </>
  );
}

export default App;