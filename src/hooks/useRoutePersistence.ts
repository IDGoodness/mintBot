import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const PERSISTENCE_KEYS = {
  LAST_ROUTE: 'nft_sniper_last_route',
  WALLET_CONNECTED: 'nft_sniper_wallet_connected',
  SESSION_DATA: 'nft_sniper_session_data'
};

interface SessionData {
  walletAddress: string;
  contractAddress: string;
  botActive: boolean;
  timestamp: number;
}

export const useRoutePersistence = (walletAddress: string | null) => {
  const navigate = useNavigate();
  const [lastRoute, setLastRoute] = useState<string>('/');

  // Save current route and session data
  const saveRoute = (route: string) => {
    try {
      localStorage.setItem(PERSISTENCE_KEYS.LAST_ROUTE, route);
      setLastRoute(route);
    } catch (error) {
      console.error('Error saving route:', error);
    }
  };

  // Save session data
  const saveSessionData = (data: Partial<SessionData>) => {
    try {
      const existingData = localStorage.getItem(PERSISTENCE_KEYS.SESSION_DATA);
      const currentData = existingData ? JSON.parse(existingData) : {};
      
      const newData = {
        ...currentData,
        ...data,
        timestamp: Date.now()
      };
      
      localStorage.setItem(PERSISTENCE_KEYS.SESSION_DATA, JSON.stringify(newData));
    } catch (error) {
      console.error('Error saving session data:', error);
    }
  };

  // Check and restore session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const savedRoute = localStorage.getItem(PERSISTENCE_KEYS.LAST_ROUTE);
        if (savedRoute) {
          setLastRoute(savedRoute);
        }

        const sessionData = localStorage.getItem(PERSISTENCE_KEYS.SESSION_DATA);
        
        if (sessionData) {
          const data = JSON.parse(sessionData) as SessionData;
          const isSessionValid = Date.now() - data.timestamp < 24 * 60 * 60 * 1000; // 24 hours
          
          if (isSessionValid && data.walletAddress === walletAddress) {
            // If we're on the home page but have a valid session, redirect to dashboard
            if (savedRoute === '/dashboard' && window.location.pathname === '/') {
              navigate('/dashboard');
            }
          } else {
            // Clear invalid session
            localStorage.removeItem(PERSISTENCE_KEYS.SESSION_DATA);
            localStorage.removeItem(PERSISTENCE_KEYS.LAST_ROUTE);
            setLastRoute('/');
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
      }
    };

    if (walletAddress) {
      checkSession();
    }
  }, [walletAddress, navigate]);

  // Save route changes
  useEffect(() => {
    const handleRouteChange = () => {
      const currentPath = window.location.pathname;
      if (currentPath !== '/') {
        saveRoute(currentPath);
      }
    };

    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  return {
    lastRoute,
    saveRoute,
    saveSessionData
  };
}; 