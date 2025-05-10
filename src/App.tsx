import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import NFTMintSite from './NFTMintSite.tsx';
import DashboardPanel from './components/DashboardPanel';
import ConfirmationPage from './components/ConfirmationPage';
import SuccessPage from './components/SuccessPage';
import ProcessWarning from './components/ProcessWarning';

import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './wagmiConfig';

const queryClient = new QueryClient();

function App() { 
  const [walletAddress, setWalletAddress] = useState('');
  const [status, setStatus] = useState('Disconnected');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleWalletConnect = (address: string) => {
    setWalletAddress(address);
    setStatus('Wallet Connected');
  };

  const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS || '0x...';

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <ProcessWarning isVisible={isProcessing} />
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
                    walletAddress={walletAddress}
                    onProcessingChange={setIsProcessing}
                  />
                )
              }
            />
            <Route 
              path="/dashboard" 
              element={
                <DashboardPanel
                  status={status}
                  contractAddress={contractAddress}
                  walletAddress={walletAddress}
                  onProcessingChange={setIsProcessing}
                />
              } 
            />
            <Route path="/confirmation" element={<ConfirmationPage />} />
            <Route path="/success" element={<SuccessPage />} />
          </Routes>
        </Router>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;