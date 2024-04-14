import CountBtn from '@/components/CountBtn';
import ReactSVG from '@/assets/react.svg';
import { Badge } from '@/components/ui/badge';
import { Web3AuthProvider, useWeb3Auth } from 'use-cardano-web3-auth';
import { Button } from './components/ui/button';
import { fromHex, toHex } from 'lucid-cardano';
import { Web3Auth } from 'use-cardano-web3-auth/dist/utils/web3auth';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { SignDialog } from './components/SignDialog';
import { AccountAddresses, AccountBalances } from 'use-cardano-web3-auth/dist/types/web3auth';


function App() {
  const UseCardanoNodeOptions = {
    provider: 'blockfrost',
    // this exposes your API key to the client, consider using blockfrost-proxy instead
    projectId: import.meta.env.VITE_BLOCKFROST_PROJECT_ID as string,
  }

  const oAuthClients: { [key: string]: { name: string, clientId: string, verifier: string } } = {
    /* discord: {
      name: "discord",
      clientId: "1179814953654423603",
      verifier: "summon-discord"
    }, */
    google: {
      name: "google",
      clientId: "270914932394-dmpe4q3hfrbvt3loij6n50n22av9lmk0.apps.googleusercontent.com",
      verifier: "summon"
    },
    twitter: {
      name: "jwt",
      clientId: "wOO2G3FWdrDYH6p9D5fkBJtAPtPgT3K2",
      verifier: "summon-twitter"
    },
    github: {
      name: "jwt",
      clientId: "wOO2G3FWdrDYH6p9D5fkBJtAPtPgT3K2",
      verifier: "summon-github"
    }

  }
  const TestComponent = () => {
    const { web3Auth } = useWeb3Auth();
    const { cardanoAddress, cardanoWalletAPI } = web3Auth! as Web3Auth;
    const isLoading = web3Auth?.status != "not_initialized" && web3Auth?.status != "full_login" && web3Auth?.status != "initialized";
    const [signedMessage, setSignedMessage] = useState<{ signature: string; key: string; } | undefined>();
    const [blockchainAccounts, setBlockchainAccounts] = useState<AccountAddresses>();

    useEffect(()=>{
      if(web3Auth?.status === "full_login"){
        (async()=>{
          const accounts = await web3Auth?.getBlockchainAccounts();
          setBlockchainAccounts(accounts);
        })()
      }

    },[web3Auth?.status])
    const onSign = async (message: string) => {
      let hexMessage = '';
      for (var i = 0, l = message.length; i < l; i++) {
        hexMessage += message.charCodeAt(i).toString(16);
      }
      const signature = await cardanoWalletAPI?.signData((await cardanoWalletAPI?.getRewardAddresses())![0], hexMessage);
      console.log({ signature });
      setSignedMessage(signature);
    }


    return (
      <div className="flex flex-col gap-2 container">
        {
          web3Auth?.status === "full_login" ?
            <div className="w-[50vw] justify-center content-center items-center text-center flex flex-col gap-2">
              <div className="flex flex-col text-left gap-2">
                <div>CardanoAddress: {cardanoAddress}</div>
                <div>Polygon Address: {blockchainAccounts?.ethereum}</div>
              </div>
              <SignDialog message="Hello World!" onSign={onSign} />
              <div className="w-2/3 break-all whitespace-normal">{signedMessage && "Signed Message: " + JSON.stringify(signedMessage)}</div>
              <Button onClick={() => { web3Auth.logout() }}>Logout</Button>
            </div>
            :
            <>
              {isLoading ? <Loader2 className="animate-spin" /> : <Button disabled={isLoading} onClick={() => { web3Auth?.login("google") }}>Login</Button>}
            </>
        }

      </div>
    );
  };


  return (
    <main className="flex flex-col items-center justify-center h-screen">
      <div className="flex flex-col items-center gap-y-4">
        <div className="inline-flex items-center gap-x-4">
          <img src={ReactSVG} alt="React Logo" className="w-32" />
          <span className="text-6xl">+</span>
          <img src={'/vite.svg'} alt="Vite Logo" className="w-32" />
        </div>
        <Web3AuthProvider web3AuthClientId='BB7UzU7QOBv0XWHoqcMv6PrvEAJOgfsOSGt2ub6ho0HlrjMtFA9uDEcxoTykoA2C768SGZZllwfmdBEttCUg57Y' redirectUri={typeof window !== 'undefined' ? `${window.location.origin}` : 'http://localhost:5173'} redirectPathName={"web3auth/login"} oAuthClients={oAuthClients} blockfrostKey={import.meta.env.VITE_BLOCKFROST_PROJECT_ID as string} blockfrostUrl={import.meta.env.VITE_BLOCKFROST_URL as string} network={import.meta.env.VITE_NETWORK as "Mainnet" | "Preprod"} >
          <TestComponent />
        </Web3AuthProvider>
      </div>
    </main>
  );
}

export default App;
