# use-cardano-web3auth

`use-cardano-web3auth` is a React hook library designed to facilitate authentication with web3auth.io in Cardano projects.

## Installation

```bash
npm install use-cardano-web3auth
```

# Usage
1. Login to [Web3Auth](https://web3auth.io/):
2. Visit [web3auth.io](https://web3auth.io/) and create a new project.
3. Create verifiers for social login (e.g., Google, Twitter, GitHub).
4. Set OAuth Verifiers:

```typescript
const oAuthClients: { [key: string]: { name: string, clientId: string, verifier: string } } = {
    google: {
      name: "google",
      clientId: "MY_GOOGLE_CLIENT_ID",
      verifier: "my-google-verifier"
    },
    twitter: {
      name: "jwt",
      clientId: "MY_TWITTER_CLIENT_ID",
      verifier: "my-twitter-verifier"
    },
    github: {
      name: "jwt",
      clientId: "MY_GITHUB_CLIENT_ID",
      verifier: "my-github-verifier"
    }
  }

```

3. Wrap Components with Web3AuthProvider:

```typescript
import { Web3AuthProvider } from 'use-cardano-web3-auth';

<Web3AuthProvider
    web3AuthClientId='YOUR_WEB3AUTH_CLIENT_ID'
    redirectUri={typeof window !== 'undefined' ? `${window.location.origin}` : 'http://localhost:5173'}
    redirectPathName={"web3auth/login"}
    oAuthClients={oAuthClients}
    blockfrostKey={process.env.BLOCKFROST_PROJECT_ID as string}
    blockfrostUrl={process.env.BLOCKFROST_URL as string}
    network={process.env.NETWORK as "Mainnet" | "Preprod"}
>
    <YourComponent />
</Web3AuthProvider>

```

# Example usage:
## Creating a Cardano Wallet with social login:
```typescript
import { useWeb3Auth } from 'use-cardano-web3-auth';

const YourComponent = () => {
    const { web3AuthAPI } = useWeb3Auth();

    const handleLogin = async () => {
        await web3AuthAPI.login("google");
    }

    return (
        <button onClick={handleLogin}>Login with Google</button>
    );
}

```

## Using the CIP-30 Wallet API:
```typescript
import { useWeb3Auth } from 'use-cardano-web3-auth';

const YourComponent = () => {
    const { web3AuthAPI } = useWeb3Auth();

    const handleSignMessage = async () => {
        const message = "Hello World!";
        let hexMessage = '';

        for (var i = 0, l = message.length; i < l; i++) {
            hexMessage += message.charCodeAt(i).toString(16);
        }

        const signature = await web3AuthAPI!.signData((await web3AuthAPI?.getRewardAddresses())![0],  hexMessage);
        console.log({ signature });
    }

    return (
        <button onClick={handleSignMessage}>Sign Message</button>
    );
}

```

# License
This project is licensed under the MIT License - see the LICENSE file for details.