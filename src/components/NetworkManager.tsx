'use client';

import { useEffect } from 'react';
import {
  useAccount,
  useChainId,
  useSwitchChain,
  useChains,
} from 'wagmi';

export default function NetworkManager() {
  const { isConnected } = useAccount();
  const activeChainId = useChainId();
  const { chains } = useChains();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    if (!isConnected || !switchChain) return;

    const allowedChains = [8453, 1]; // Base & Ethereum Mainnet
    if (!allowedChains.includes(activeChainId)) {
      switchChain({ chainId: 8453 }); // Force switch to Base
    }
  }, [isConnected, activeChainId, switchChain]);

  return null;
}
