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
          <DashboardPanel status={status} contractAddress={contractAddress} />
      )}
    </>
  );
}

export default App;