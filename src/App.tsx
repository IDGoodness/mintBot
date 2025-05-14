import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import NFTMintSite from './NFTMintSite.tsx';
import DashboardPanel from './components/DashboardPanel';
import ConfirmationPage from './components/ConfirmationPage';
import SuccessPage from './components/SuccessPage';
import ProcessWarning from './components/ProcessWarning';
import { UpcomingDrops } from './components/UpcomingDrops';
import { DropDetails } from './components/DropDetails';
import { NFTSniper } from './components/NFTSniper';
import { UpcomingNFT } from './services/MintifyService';

import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './wagmiConfig';

const queryClient = new QueryClient();

function App() { 
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [status, setStatus] = useState('Disconnected');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDrop, setSelectedDrop] = useState<UpcomingNFT | null>(null);
  const [viewMode, setViewMode] = useState<'dashboard' | 'upcoming' | 'details' | 'sniper'>('dashboard');

  const handleWalletConnect = (address: string) => {
    setWalletAddress(address);
    setStatus('Wallet Connected');
  };

  const handleSelectDrop = (drop: UpcomingNFT) => {
    setSelectedDrop(drop);
    setViewMode('details');
  };

  const handleBackToDrops = () => {
    setSelectedDrop(null);
    setViewMode('upcoming');
  };

  const handleGoToSniper = (drop: UpcomingNFT) => {
    setSelectedDrop(drop);
    setViewMode('sniper');
  };

  const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS || '0x8464135c8F25Da09e49BC8782676a84730C318bC';

  const renderContent = () => {
    if (!walletAddress) {
      return <NFTMintSite onConnect={handleWalletConnect} />;
    }

    switch (viewMode) {
      case 'upcoming':
        return <UpcomingDrops onSelectDrop={handleSelectDrop} walletAddress={walletAddress} onSnipe={handleGoToSniper} />;
      case 'details':
        return <DropDetails drop={selectedDrop} onBack={handleBackToDrops} walletAddress={walletAddress} />;
      case 'sniper':
        return selectedDrop ? (
          <NFTSniper 
            drop={selectedDrop} 
            walletAddress={walletAddress} 
            onBack={() => setViewMode('upcoming')} 
          />
        ) : (
          <UpcomingDrops onSelectDrop={handleSelectDrop} walletAddress={walletAddress} onSnipe={handleGoToSniper} />
        );
      case 'dashboard':
      default:
        return (
          <DashboardPanel
            status={status}
            contractAddress={contractAddress}
            walletAddress={walletAddress as string}
            onProcessingChange={setIsProcessing}
            onViewUpcoming={() => setViewMode('upcoming')}
          />
        );
    }
  };

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <ProcessWarning isVisible={isProcessing} />
          <Routes>
            <Route
              path="/"
              element={renderContent()}
            />
            <Route 
              path="/dashboard" 
              element={
                <DashboardPanel
                  status={status}
                  contractAddress={contractAddress}
                  walletAddress={walletAddress || ''}
                  onProcessingChange={setIsProcessing}
                  onViewUpcoming={() => setViewMode('upcoming')}
                />
              } 
            />
            <Route path="/upcoming" element={<UpcomingDrops onSelectDrop={handleSelectDrop} walletAddress={walletAddress} onSnipe={handleGoToSniper} />} />
            <Route path="/confirmation" element={<ConfirmationPage />} />
            <Route path="/success" element={<SuccessPage />} />
            <Route path="/sniper" element={
              selectedDrop ? (
                <NFTSniper 
                  drop={selectedDrop} 
                  walletAddress={walletAddress} 
                  onBack={() => setViewMode('upcoming')} 
                />
              ) : (
                <UpcomingDrops onSelectDrop={handleGoToSniper} walletAddress={walletAddress} />
              )
            } />
          </Routes>
        </Router>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;