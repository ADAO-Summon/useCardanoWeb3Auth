import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Web3Auth } from './utils/web3auth';
import { OAuthClients } from './types/web3auth';

// Adjust the context to optionally include a loading state or functions


const defaultWeb3AuthValue: Web3Auth | null = null;

// Create a context
const Web3AuthContext = createContext<Web3Auth | null>(defaultWeb3AuthValue);

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
  //const auth = new Web3Auth(oAuthClients, network, blockfrostKey, blockfrostUrl, redirectPathName, redirectUri, web3AuthClientId);

  const web3Auth = useMemo(() => {
    if (typeof window !== 'undefined') {
      const web3auth = Web3Auth.getInstance(
        oAuthClients, network, blockfrostKey, blockfrostUrl,
        redirectPathName, redirectUri, web3AuthClientId
      )
      return web3auth
    }
  }, [typeof window]);
  const initializeWeb3Auth = useCallback(async() => {
    if (web3Auth) {
      await web3Auth.initialize();
      await web3Auth.initializeBlockchainAccounts();
      await web3Auth.initializeWalletAPI();
    }
  }, [web3Auth]);

  useEffect(() => {
    if (web3Auth && web3Auth.status === "not_initialized") {
      initializeWeb3Auth().then(() => {
        console.log({ web3Auth });
      });
    }
  }, [web3Auth]);

  return (
    <Web3AuthContext.Provider value={web3Auth }>
      {children}
    </Web3AuthContext.Provider>
  );
};

// Custom hook for easy access to the context
export const useWeb3Auth = () => useContext(Web3AuthContext);
