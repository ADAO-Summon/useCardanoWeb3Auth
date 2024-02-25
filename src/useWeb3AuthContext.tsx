import React, { createContext, useContext, useEffect, useState } from 'react';
//import Web3AuthConfirmationDialog from 'src/components/Web3AuthConfirmationDialog';
import { Web3AuthResult, createWeb3Auth } from './Web3Auth';
import { OAuthClients } from './types';

const defaultWeb3AuthValue: Web3AuthResult = {
  login: () => { },
  getDeviceShare: async () => { },
  logout: () => { },
  getUserInfo: () => { },
  walletAddress: '',
  loggedIn: false,
  userInfo: null,
  getSeedPhrase: ()=>'',
  web3AuthAPI: null, // Assuming WalletApi can be null
};

// Create a context
const Web3AuthContext = createContext(defaultWeb3AuthValue);

// Export the provider as a component
export const Web3AuthProvider = ({ children, oAuthClients, network, blockfrostKey, blockfrostUrl, redirectPathName, redirectUri, web3AuthClientId }: { children: any, oAuthClients: OAuthClients, network: "Mainnet" | "Preprod", blockfrostKey: string, blockfrostUrl:string, redirectPathName:string, redirectUri: string, web3AuthClientId:string }) => {
  const web3Auth = createWeb3Auth({oAuthClients, network, blockfrostKey, blockfrostUrl, redirectPathName, redirectUri, web3AuthClientId});

  return (
    <Web3AuthContext.Provider value={web3Auth as Web3AuthResult}>
      {children}
    </Web3AuthContext.Provider>
  );
};

// Custom hook for easy access to the context
export const useWeb3Auth = () => useContext(Web3AuthContext);
