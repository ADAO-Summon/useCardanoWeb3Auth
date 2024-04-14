import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Web3Auth } from './utils/web3auth';
import { OAuthClients } from './types/web3auth';

// Adjust the context to optionally include a loading state or functions
interface Web3AuthContextType {
  web3Auth: Web3Auth | undefined;
  isLoading: boolean; // Add a loading state
}

const defaultWeb3AuthValue: Web3AuthContextType = { web3Auth: undefined, isLoading: true };

// Create a context
const Web3AuthContext = createContext<Web3AuthContextType>(defaultWeb3AuthValue);

export const Web3AuthProvider = ({
  children,
  oAuthClients,
  network,
  blockfrostKey,
  blockfrostUrl,
  redirectPathName,
  redirectUri,
  web3AuthClientId,
}: {
  children: React.ReactNode;
  oAuthClients: OAuthClients;
  network: "Mainnet" | "Preprod";
  blockfrostKey: string;
  blockfrostUrl: string;
  redirectPathName: string;
  redirectUri: string;
  web3AuthClientId: string;
}) => {
  const [isLoading, setIsLoading] = useState(true); // Track the loading state
  const [status, setStatus] = useState<string | undefined>(undefined); // Track the status of the Web3Auth instance
  //const auth = new Web3Auth(oAuthClients, network, blockfrostKey, blockfrostUrl, redirectPathName, redirectUri, web3AuthClientId);

  const web3Auth = useMemo(() => {
    if (typeof window !== 'undefined') {
      try {
        const web3auth = Web3Auth.getInstance(
          oAuthClients,
          network,
          blockfrostKey,
          blockfrostUrl,
          redirectPathName,
          redirectUri,
          web3AuthClientId
        );
        web3auth.onStatusChange = setStatus;
        return web3auth;
      } catch (error) {
        console.error('Error initializing Web3Auth:', error);
      }
    }
  }, [typeof window]);
  const initializeWeb3Auth = useCallback(async () => {
    console.log("statuss", web3Auth?.status)

    if (web3Auth) {
      if (web3Auth.status === "not_initialized") {
        await web3Auth.initialize();
      }
      if (web3Auth.status === "logged_in") {
        await web3Auth.initializeBlockchainAccounts();
      }
      if (web3Auth.status === "accounts_created") {
        await web3Auth.initializeWalletAPI();
      }
    }
  }, [web3Auth]);

  useEffect(() => {
    if (web3Auth && web3Auth.status === "not_initialized") {
      initializeWeb3Auth().then(() => {
        console.log({ web3Auth });
        setIsLoading(false);
      });
    }
  }, [web3Auth]);

  return (
    <Web3AuthContext.Provider value={{ web3Auth, isLoading }}>
      {children}
    </Web3AuthContext.Provider>
  );
};

// Custom hook for easy access to the context
export const useWeb3Auth = () => useContext(Web3AuthContext);
