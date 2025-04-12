import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import NFTMintSite from './NFTMintSite.tsx';
import DashboardPanel from './components/DashboardPanel';
import ConfirmationPage from './components/ConfirmationPage';
import SuccessPage from './components/SuccessPage'; // Create this component

function App() {
  const [walletAddress, setWalletAddress] = useState('');
  const [status, setStatus] = useState('Disconnected');

  const handleWalletConnect = (address: string) => {
    setWalletAddress(address);
    setStatus('Wallet Connected');
  };

  const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS || '0x...';

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            !walletAddress ? (
              <NFTMintSite onConnect={handleWalletConnect} />
            ) : (
              <DashboardPanel
                status={status}
                contractAddress={contractAddress}
                walletAddress={walletAddress}  // Pass walletAddress here
              />
            )
          }
        />
        <Route path="/confirmation" element={<ConfirmationPage />} />
        <Route path="/success" element={<SuccessPage />} /> {/* Added SuccessPage route */}
      </Routes>
    </Router>
  );
}

export default App;