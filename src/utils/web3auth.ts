import { SafeEventEmitterProvider } from "@web3auth/base";
import Web3, { net } from "web3";
import { newEmptyAddresses, newEmptyBalance } from "./multichain";
import { AccountAddresses, AccountBalances, OAuthClients } from "../types/web3auth";
import { getEVMAddressNFTs } from "./evm";
import { getCardanoAddressInfo, getCardanoAssetsByAddress } from "./cardano";

import * as solanaWeb3 from "@solana/web3.js";
import { SubVerifierDetailsParams, TssShareType, UserInfo, Web3AuthMPCCoreKit, generateFactorKey, getWebBrowserFactor, keyToMnemonic } from "@web3auth/mpc-core-kit";
import { TORUS_SAPPHIRE_NETWORK } from "@toruslabs/constants";
import jwt from 'jsonwebtoken';
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { Web3AuthWalletAPI, createWalletFromMnemonic } from "./walletAPI";
import { C, Emulator, Network, WalletApi } from "lucid-cardano";
import { Blockchain } from "../types/multichain";
import BN from "bn.js";

const web3AuthNetwork = TORUS_SAPPHIRE_NETWORK.SAPPHIRE_DEVNET
let instance: Web3Auth | null = null
export const getChainConfig = (network: "Mainnet" | "Preprod") => {
    return network === "Mainnet" ?
        {
            chainNamespace: "eip155" as any,
            chainId: "0x89", // hex of 137, polygon mainnet
            rpcTarget: "https://rpc.ankr.com/polygon",
            // Avoid using public rpcTarget in production.
            // Use services like Infura, Quicknode etc
            displayName: "Polygon Mainnet",
            blockExplorer: "https://polygonscan.com",
            ticker: "MATIC",
            tickerName: "Matic",
        }
        :
        {
            chainNamespace: "eip155" as any,
            chainId: "0x13881", // hex of 80001, polygon testnet
            rpcTarget: "https://polygon-mumbai-pokt.nodies.app", //"https://rpc.ankr.com/polygon_mumbai",
            // Avoid using public rpcTarget in production.
            // Use services like Infura, Quicknode etc
            displayName: "Polygon MATIC Testnet",
            blockExplorer: "https://mumbai.polygonscan.com/",
            ticker: "MATIC",
            tickerName: "MATIC",
            logo: "https://cryptologos.cc/logos/polygon-matic-logo.png",
        };
}

export class Web3Auth {
    oAuthClients: OAuthClients;
    network: "Mainnet" | "Preprod";
    blockfrostKey: string;
    blockfrostUrl: string;
    redirectPathName: string;
    redirectUri: string;
    //web3AuthClientId: string;
    chainConfig: any;
    coreKitInstance: Web3AuthMPCCoreKit;
   /*  private cardanoPaymentKey: C.PrivateKey | null;
    private cardanoStakeKey: C.PrivateKey | null;
    private solanaKeyPair: solanaWeb3.Keypair | null;
    private ethProvider: EthereumPrivateKeyProvider | null; */
    cardanoAddress: string;
    cardanoWalletAPI: WalletApi | null;
    backupFactorKey: string | null;
    isAccountsCreated: boolean;
    solanaConnection: solanaWeb3.Connection;
    status: 'not_initialized' | 'initializing' | 'initialized' | 'logged_in' | 'accounts_created' | 'api_created' | 'full_login'
    moralisKey?: string | null

   // private seedPhrase: string | null;
    private static instance: Web3Auth | null = null;
    // Declare a map to hold private properties
    private static privates = new WeakMap<object, {
        seedPhrase: string | null,
        cardanoPaymentKey: C.PrivateKey | null,
        cardanoStakeKey: C.PrivateKey | null,
        solanaKeyPair: solanaWeb3.Keypair | null,
        ethProvider: EthereumPrivateKeyProvider | null,
        web3AuthClientId: string,
    }>();
    private constructor(
        oAuthClients: OAuthClients,
        network: "Mainnet" | "Preprod",
        blockfrostKey: string,
        blockfrostUrl: string,
        redirectPathName: string,
        redirectUri: string,
        web3AuthClientId: string,
    ) {
        // Initialization logic here...
        if (Web3Auth.instance) {
            throw new Error("Instance already exists!");
        }

        this.oAuthClients = oAuthClients;
        this.network = network;
        this.blockfrostKey = blockfrostKey;
        this.blockfrostUrl = blockfrostUrl;
        this.redirectPathName = redirectPathName;
        this.redirectUri = redirectUri;
        //this.web3AuthClientId = web3AuthClientId;
        this.chainConfig = getChainConfig(network)
        //this.cardanoPaymentKey = null;
        // this.cardanoStakeKey = null;
        //this.solanaKeyPair = null;
        //this.ethProvider = null;
        this.solanaConnection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('devnet'), 'confirmed');
        this.cardanoAddress = '';
        this.cardanoWalletAPI = null;
        this.backupFactorKey = null;
        this.isAccountsCreated = false;
        this.status = "not_initialized"
        this.moralisKey = null
        this.coreKitInstance = new Web3AuthMPCCoreKit(
            {
                web3AuthClientId: web3AuthClientId,
                web3AuthNetwork: web3AuthNetwork,
                chainConfig: this.chainConfig,
                uxMode: 'redirect',
                baseUrl: redirectUri,//window.location.origin,//'http://localhost:3000',//typeof window !== 'undefined' ? `${window.location.origin}` : 'http://localhost:8084',
                redirectPathName: this.redirectPathName//'web3auth/login',
            }
        )
        // this.seedPhrase = null;

        // Initialize the private properties in the WeakMap
        Web3Auth.privates.set(this, {
            seedPhrase: null,
            cardanoPaymentKey: null,
            cardanoStakeKey: null,
            solanaKeyPair: null,
            ethProvider: null,
            web3AuthClientId: web3AuthClientId
        });
        /*  if (instance) {
             console.log("Instance already exists")
             return instance
         }
         instance = this */
    }

    public static getInstance(
        oAuthClients: OAuthClients,
        network: "Mainnet" | "Preprod",
        blockfrostKey: string,
        blockfrostUrl: string,
        redirectPathName: string,
        redirectUri: string,
        web3AuthClientId: string,
    ): Web3Auth {
        if (!Web3Auth.instance) {
            Web3Auth.instance = new Web3Auth(
                oAuthClients, network, blockfrostKey, blockfrostUrl,
                redirectPathName, redirectUri, web3AuthClientId
            );
        }
        return Web3Auth.instance;
    }
    async initialize() {
        console.log("initializing", this.status)
        if (this.status !== "not_initialized") {
            return this
        } else {
            this.status = "initializing"
        }
        await this.coreKitInstance.init();
        console.log("Status", this.coreKitInstance.status)
        if (this.coreKitInstance.status === "LOGGED_IN") {
            this.status = "logged_in"
        } else {
            this.status = "initialized"
        }
        return this;
    }

    async login(platform: "discord" | "google" | "twitter" | "github" | "jwt", jwtToken?: string) {
        console.log("logging in")
        if (platform === "jwt" && jwtToken) {
            const sub = jwt.decode(jwtToken)?.sub;
            if (!sub) throw new Error('sub not found in jwt')
            await this.coreKitInstance.loginWithJWT({
                verifier: "testing-jwt-verifier",
                verifierId: sub as string,
                idToken: jwtToken,
            })
            return this.coreKitInstance;
        }

        try {
            if (!this.coreKitInstance) {
                throw new Error('eror initiated to login');
            }
            const verifierConfig = {
                subVerifierDetails: {
                    typeOfLogin: this.oAuthClients[platform].name,
                    verifier: this.oAuthClients[platform].verifier,
                    clientId: this.oAuthClients[platform].clientId,
                },
            } as SubVerifierDetailsParams;
            if (platform === "github" || platform === "twitter") {
                verifierConfig.subVerifierDetails.jwtParams = {
                    // TO DO: change this to specific auth0 domain
                    domain: 'https://dev-zru34kf2uvbc4rss.us.auth0.com',
                    connection: platform,
                    verifierIdField: 'sub',
                    //scope: 'read:current_user openid profile email',
                }
            }
            await this.coreKitInstance.loginWithOauth(verifierConfig);
            const coreKitStatus = this.coreKitInstance.status
            if (coreKitStatus === "LOGGED_IN") {
                this.status = "logged_in"
            }
            localStorage.setItem("walletName", "web3auth");
            localStorage.setItem("blockchain", "cardano");
        } catch (error: unknown) {
            console.error(error);
        }
        return this.coreKitInstance;
    }

    async initializeBlockchainAccounts() {
        //console.log(await getDeviceShare())
        console.log("initializing blockchain accounts")
        //await this.coreKitInstance.init();
        if (this.status === "not_initialized") {
            throw new Error("corekit instance not initialized yet")
            // await this.initialize()
        }
        if (this.coreKitInstance.status === "REQUIRED_SHARE" /* COREKIT_STATUS.REQUIRED_SHARE */) {
            throw new Error("required more shares, please enter your backup/ device factor key, or reset account unrecoverable once reset, please use it with caution]");
        } else if (this.coreKitInstance.tKey?.privKey) {
            // const fKey = coreKitInstance.getCurrentFactorKey()
            const provider = await EthereumPrivateKeyProvider.getProviderInstance({ chainConfig: this.chainConfig, privKey: this.coreKitInstance.tKey.privKey.toString('hex') });
            //coreKitInstance.provider = provider
            // create wallet from mnemonic
            const mnemonic = keyToMnemonic(this.coreKitInstance.tKey.privKey.toString('hex'))
            const { address, stakeAddr, paymentKey, stakeKey } = await createWalletFromMnemonic(mnemonic, this.network)
            const solanaKeyPair = solanaWeb3.Keypair.fromSeed(this.coreKitInstance.tKey.privKey.toString('hex') as any);
            const privateData = Web3Auth.privates.get(this) as any;
            this.cardanoAddress = address;
            privateData.cardanoPaymentKey = paymentKey;
            privateData.cardanoStakeKey = stakeKey;
            privateData.solanaKeyPair = solanaKeyPair;
            privateData.ethProvider = provider;
            privateData.seedPhrase = mnemonic
            this.isAccountsCreated = true;
            if (this.status === "api_created") {
                this.status = "full_login"
            } else {
                this.status = "accounts_created"
            }
            return { cardanoAddress: address, cardanoStakeAddress: stakeAddr, cardanoPaymentKey: paymentKey, cardanoStakeKey: stakeKey, mnemonic, ethProvider: provider, solanaKeyPair }
        } else {
            throw new Error('no private key found')
        }
    }

    async UNSAFE_getSeedPhrase() {
        const privateData = Web3Auth.privates.get(this) as any;
        if (!privateData.seedPhrase) {
            throw new Error('Seed phrase not found. Please initialize blockchain accounts first by calling initiateBlockchainAccounts().')
        }
        return privateData.seedPhrase
    }

    async initializeWalletAPI(emulator?: Emulator) {
        console.log("initializing wallet api", this.status)
        const privateData = Web3Auth.privates.get(this) as any;
        console.log({ privateData })

        if (!privateData.cardanoPaymentKey || !privateData.cardanoStakeKey || !this.network) {
            throw new Error('Cardano keys not found. Please initialize blockchain accounts first by calling initiateBlockchainAccounts().')
        }
        const api = new Web3AuthWalletAPI(privateData.cardanoPaymentKey!, privateData.cardanoStakeKey!, this.network, this.blockfrostUrl, this.blockfrostKey, emulator)
        this.cardanoWalletAPI = api;
        if (this.status === "accounts_created") {
            this.status = "full_login"
        } else {
            this.status = "api_created"
        }
        return api
    }

    async fullLogin(platform: "discord" | "google" | "twitter" | "github" | "jwt", jwtToken?: string, emulator?: Emulator) {
        await this.initialize()
        console.log("initialized. Logging in")
        await this.login(platform, jwtToken)
        console.log("logged in. Initializing blockchain accounts")
        const blockchainAccounts = await this.initializeBlockchainAccounts()
        const walletAPI = await this.initializeWalletAPI(emulator)
    }

    async getBlockchainAccounts() {
        const privateData = Web3Auth.privates.get(this) as any;

        return await getBlockchainAccounts(this.coreKitInstance, privateData.ethProvider, this.cardanoAddress, privateData.solanaKeyPair)
    }

    async getBlockchainBalances() {
        const privateData = Web3Auth.privates.get(this) as any;
        return await getBlockchainBalances(this.coreKitInstance, privateData.ethProvider, this.cardanoAddress, privateData.solanaKeyPair, this.blockfrostUrl, this.blockfrostKey, this.moralisKey)
    }

    //--
    async enableMFA() {
        if (!this.coreKitInstance) {
            throw new Error("coreKitInstance is not set");
        }
        const factorKey = await this.coreKitInstance.enableMFA({});
        const factorKeyMnemonic = keyToMnemonic(factorKey);

        console.log("MFA enabled, device factor stored in local store, deleted hashed cloud key, your backup factor key: ", factorKeyMnemonic);
        return factorKeyMnemonic;
    };

    async getDeviceFactor() {
        if (!this.coreKitInstance) {
            throw new Error("coreKitInstance is not set");
        }
        try {
            const factorKey = await getWebBrowserFactor(this.coreKitInstance!);
            this.backupFactorKey = factorKey as string;
            console.log("Device share: ", factorKey);
            return factorKey
        } catch (e) {
            console.log(e);
        }
    };

    async exportMnemonicFactor(): Promise<string> {
        if (!this.coreKitInstance) {
            throw new Error("coreKitInstance is not set");
        }
        console.log("export share type: ", TssShareType.RECOVERY);
        const factorKey = generateFactorKey();
        await this.coreKitInstance.createFactor({
            shareType: TssShareType.RECOVERY,
            factorKey: factorKey.private,
        });
        const factorKeyMnemonic = await keyToMnemonic(factorKey.private.toString("hex"));
        console.log("Export factor key mnemonic: ", factorKeyMnemonic);
        return factorKeyMnemonic
    };

    //only working for eth currently
    async signMessage(message: string, password?: string, blockchain?: Blockchain) {
        const privateData = Web3Auth.privates.get(this) as any;

        if (!this.coreKitInstance) {
            console.log("provider not initialized yet");
            return;
        }
        const web3 = new Web3(privateData.ethProvider as any);

        // Get user's Ethereum public address
        const fromAddress = (await web3.eth.getAccounts())[0];

        const originalMessage = "YOUR_MESSAGE";

        // Sign the message
        const signedMessage = await web3.eth.personal.sign(
            message,
            fromAddress,
            password!
            // "test password!" // configure your own password here.
        );
        console.log(signedMessage);
        return signedMessage
    };

    async logout() {
        const privateData = Web3Auth.privates.get(this) as any;

        if (!this.coreKitInstance) {
            throw new Error("coreKitInstance not found");
        }
        await this.coreKitInstance.logout();
        this.status = "initialized"
        privateData.ethProvider = null
        privateData.seedPhrase = null
        privateData.cardanoPaymentKey = null
        privateData.cardanoStakeKey = null
        privateData.solanaKeyPair = null
    };

    async criticalResetAccount(): Promise<void> {
        // This is a critical function that should only be used for testing purposes
        // Resetting your account means clearing all the metadata associated with it from the metadata server
        // The key details will be deleted from our server and you will not be able to recover your account
        if (!this.coreKitInstance) {
            throw new Error("coreKitInstance is not set");
        }
        //@ts-ignore
        // if (selectedNetwork === WEB3AUTH_NETWORK.MAINNET) {
        //   throw new Error("reset account is not recommended on mainnet");
        // }
        await coreKitInstance.tKey.storageLayer.setMetadata({
            privKey: new BN(this.coreKitInstance.metadataKey!, "hex"),
            input: { message: "KEY_NOT_FOUND" },
        });
        console.log("reset");
        this.logout();
    };

    getUserInfo(): UserInfo {
        const user = this.coreKitInstance?.getUserInfo();
        return user
    };

}


//--------------


export const getBlockchainAccounts = async (coreKitInstance: any, ethProvider?: SafeEventEmitterProvider | null, cardanoAddress?: string, solanaKeyPair?: any) => {
    if (!coreKitInstance) {
        console.log("provider not initialized yet");
        return;
    }
    if (!ethProvider) {
        console.log("provider not initialized yet");
        return;
    }
    const web3 = new Web3(ethProvider);

    // Get user's Ethereum public address
    const address = await web3.eth.getAccounts();
    console.log(address);

    /* let balance = await solanaConnection.getBalance(solanaKeyPair!.publicKey);
    console.log(`${balance / solanaWeb3.LAMPORTS_PER_SOL} SOL`); */
    // Get user's Solana public address
    const allAddresses = newEmptyAddresses()
    return {
        ...allAddresses,
        ethereum: address[0],
        cardano: cardanoAddress,
        solana: solanaKeyPair!.publicKey.toString()
    } as AccountAddresses
}

export const getBlockchainBalances = async (coreKitInstance: any, ethProvider: SafeEventEmitterProvider | null, cardanoAddress: string, solanaKeyPair: any, blockfrostUrl: string, blockfrostKey: string, moralisKey?: string | null) => {
    const solanaConnection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('devnet'), 'confirmed');

    if (!coreKitInstance) {
        console.log("provider not initialized yet");
        return;
    }
    const web3 = new Web3(ethProvider as any);

    // Get user's Ethereum public address
    const address = (await web3.eth.getAccounts())[0];
    // Get user's balance in ether
    const weiBalance = await web3.eth.getBalance(address)
    const ethereumBalance = web3.utils.fromWei(
        weiBalance, // Balance is in wei
        "ether"
    );
    let solanaBalance = await solanaConnection.getBalance(solanaKeyPair!.publicKey);
    const cardanoAddressInfo = await getCardanoAddressInfo(cardanoAddress!, blockfrostUrl, blockfrostKey);
    // const cardanoBalance = BigInt(cardanoAddressInfo.amount.filter((asset: any) => asset.unit === 'lovelace')[0].quantity)// / 1000000
    const cardanoAssets = await getCardanoAssetsByAddress(cardanoAddress!, blockfrostUrl, blockfrostKey);
    console.log({ cardanoAssets })

    if(moralisKey){
        const evmNFTs = await getEVMAddressNFTs(address, 'polygon', moralisKey);
    }
    // balances are returned in ether, sol and ada (not in lovelace, lamports or wei)
    let balance: AccountBalances = newEmptyBalance()
    balance = {
        ...balance,
        isLoading: false,
        assets: {
            ...balance.assets,
            ethereum: {
                balance: BigInt(weiBalance), FTs: [], NFTs: []
            },
            solana: {
                balance: BigInt(solanaBalance) /* / solanaWeb3.LAMPORTS_PER_SOL */,
                FTs: [], NFTs: []
            },
            cardano: cardanoAssets
        }
    }
    console.log(balance);
    return balance
}