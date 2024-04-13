
import Web3 from "web3";
import { SafeEventEmitterProvider } from "@web3auth/base";
import { Web3AuthMPCCoreKit, WEB3AUTH_NETWORK, Point, SubVerifierDetailsParams, TssShareType, keyToMnemonic, getWebBrowserFactor, COREKIT_STATUS, TssSecurityQuestion, generateFactorKey, mnemonicToKey } from "@web3auth/mpc-core-kit";

//import type { provider } from "web3-core";
import { TORUS_SAPPHIRE_NETWORK } from "@toruslabs/constants";

import {  SignedMessage, M, Payload, PrivateKey, WalletApi, fromHex, toHex, C } from 'lucid-cardano';
import  React, { useEffect, useState } from "react";
import { mnemonicToEntropy } from "./utils/bip39";
import { OAuthClients } from "./types";
export interface Web3AuthResult {
	login: (platform: "discord" | "google" | "twitter" | "github") => void;
	getDeviceShare: () => Promise<any>;
	logout: () => void;
	getUserInfo: () => void;
	loggedIn: boolean,
	walletAddress: string;
	userInfo: any;
	getSeedPhrase: ()=>string;
	web3AuthAPI: WalletApi | null,
}

const selectedNetwork = TORUS_SAPPHIRE_NETWORK.SAPPHIRE_DEVNET
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

function CreateWeb3Auth({oAuthClients, network, blockfrostUrl, blockfrostKey, redirectPathName, redirectUri, web3AuthClientId}:{oAuthClients:OAuthClients, network: "Mainnet" | "Preprod", blockfrostKey:string, blockfrostUrl:string, redirectPathName:string, redirectUri: string, web3AuthClientId:string }): Web3AuthResult {
	const [loggedIn, setLoggedIn] = React.useState(false);
	const [userInfo, setUserInfo] = React.useState({});

	const [walletAddress, setWalletAddress] = useState<string>("")
	const [rewardAddress, setRewardAddress] = useState<string>("")
	const [paymentKey, setPaymentKey] = useState<C.PrivateKey | null>(null)
	const [stakeKey, setStakeKey] = useState<C.PrivateKey | null>(null)

	const [web3, setWeb3] = useState<any>(undefined)
	const [coreKitStatus, setCoreKitStatus] = useState<COREKIT_STATUS>(COREKIT_STATUS.NOT_INITIALIZED);
	const [backupFactorKey, setBackupFactorKey] = useState<string | undefined>(undefined);
	const [provider, setProvider] = useState<SafeEventEmitterProvider | null>(null);
	const [coreKitInstance, setCoreKitInstace] = useState<any>(null)

	const [missingShares, setMissingShares] = useState<number>(3)
	const [seedPhrase, setSeedPhrase] = useState<string>("")

	const createWalletFromMnemonic = async (mnemonic: string) => {
		function harden(num: number): number {
			if (typeof num !== "number") throw new Error("Type number required here!");
			return 0x80000000 + num;
		}
		setSeedPhrase(mnemonic)
		const entropy = await mnemonicToEntropy(mnemonic);
		const rootKey = C.Bip32PrivateKey.from_bip39_entropy(
			fromHex(entropy),
			new Uint8Array(),
		);

		const accountKey = rootKey.derive(harden(1852))
			.derive(harden(1815))
			.derive(harden(0)); //account index

		const pKey = accountKey.derive(0).derive(0).to_raw_key();
		const sKey = accountKey.derive(2).derive(0).to_raw_key();
		setPaymentKey(pKey)
		setStakeKey(sKey)

		const paymentKeyHash = pKey.to_public().hash();
		const stakeKeyHash = sKey.to_public().hash();

		const networkId = network === "Mainnet" ? 1 : 0;
		const address = C.BaseAddress.new(
			networkId,
			C.StakeCredential.from_keyhash(paymentKeyHash),
			C.StakeCredential.from_keyhash(stakeKeyHash),
		).to_address().to_bech32(undefined)

		const stakeAddr = C.RewardAddress.new(
			networkId,
			C.StakeCredential.from_keyhash(stakeKeyHash),
		).to_address().to_bech32(undefined)

		setWalletAddress(address)
		setRewardAddress(stakeAddr)
		setLoggedIn(true)
	}


	useEffect(() => {
		if (typeof window != undefined) {
			const coreKitInstance = new Web3AuthMPCCoreKit(
				{
					web3AuthClientId: web3AuthClientId,//'BB7UzU7QOBv0XWHoqcMv6PrvEAJOgfsOSGt2ub6ho0HlrjMtFA9uDEcxoTykoA2C768SGZZllwfmdBEttCUg57Y',
					web3AuthNetwork: selectedNetwork,
					chainConfig: getChainConfig(network),
					uxMode: 'redirect',
					baseUrl: redirectUri,//typeof window !== 'undefined' ? `${window.location.origin}` : 'http://localhost:8084',
					redirectPathName: redirectPathName//'web3auth/login',
				}
			);
			setCoreKitInstace(coreKitInstance)
		}

	}, [])

	useEffect(() => {
		if (coreKitInstance) {
			const init = async () => {
				//console.log(await getDeviceShare())
				await coreKitInstance.init();
				if (coreKitInstance.provider) {
					setProvider(coreKitInstance.provider);
				}
				if (coreKitInstance.status === "REQUIRED_SHARE" /* COREKIT_STATUS.REQUIRED_SHARE */) {
					console.error("required more shares, please enter your backup/ device factor key, or reset account unrecoverable once reset, please use it with caution]");
				} else if (coreKitInstance.tKey?.privKey) {
					const walletName = localStorage.getItem('summonWalletName')
					/* if(!accessToken && walletName =='web3auth'){
						logout()
						return
					} */
					// const fKey = coreKitInstance.getCurrentFactorKey()
					const mnemonic = keyToMnemonic(coreKitInstance.tKey.privKey.toString('hex'))
					createWalletFromMnemonic(mnemonic)
					//logout()
				}
			};
			init();
		}
	}, [coreKitInstance]);



	useEffect(() => {
		if (provider) {
			const web3 = new Web3(provider as any);
			setWeb3(web3);
		}
	}, [provider])

	const getSeedPhrase = () => {
		return seedPhrase
	}

	const login = async (platform: "discord" | "google" | "twitter" | "github") => {
		console.log("logging in")
		try {
			// Triggering Login using Service Provider ==> opens the popup
			if (!coreKitInstance) {
				throw new Error('initiated to login');
			}
			const verifierConfig = {
				subVerifierDetails: {
					typeOfLogin: oAuthClients[platform].name,
					verifier: oAuthClients[platform].verifier,
					clientId: oAuthClients[platform].clientId,
				},
			} as SubVerifierDetailsParams;
			if (platform === "github" || platform === "twitter") {
				verifierConfig.subVerifierDetails.jwtParams = {
					domain: 'https://dev-zru34kf2uvbc4rss.us.auth0.com',
					connection: platform,
					verifierIdField: 'sub',
					//scope: 'read:current_user openid profile email',
				}
			}
			await coreKitInstance.loginWithOauth(verifierConfig);
			setCoreKitStatus(coreKitInstance.status);
		} catch (error: unknown) {
			console.error(error);
		}
	};

	const getDeviceShare = async () => {
		const factorKey = await getWebBrowserFactor(coreKitInstance!);
		setBackupFactorKey(factorKey);
		console.log("Device share: ", factorKey);
	}

	const getKeyHashes = (tx: C.Transaction, utxos: C.TransactionUnspentOutput[]) => {
		const requiredKeyHashes = [];

		const paymentKeyHash = Buffer.from(
			paymentKey!.to_public().hash().to_bytes()
		).toString('hex');
		const stakeKeyHash = Buffer.from(
			stakeKey!.to_public().hash().to_bytes()
		).toString('hex');

		//get key hashes from inputs
		const inputs = tx.body().inputs();
		for (let i = 0; i < inputs.len(); i++) {
			const input = inputs.get(i);
			const txHash = Buffer.from(input.transaction_id().to_bytes()).toString(
				'hex'
			);
			const index = parseInt(input.index().to_str());
			if (
				utxos.some(
					(utxo) =>
						Buffer.from(utxo.input().transaction_id().to_bytes()).toString(
							'hex'
						) === txHash && parseInt(utxo.input().index().to_str()) === index
				)
			) {
				requiredKeyHashes.push(paymentKeyHash);
			}
		}

		//get key hashes from certificates
		const txBody = tx.body();
		const certs = txBody.certs()
		const keyHashFromCert = (txBody: C.TransactionBody) => {
			for (let i = 0; i < certs!.len(); i++) {
				const cert = txBody.certs()!.get(i);
				if (cert) {
					if (cert.kind() === 0) {
						const credential = cert.as_stake_registration()!.stake_credential();
						if (credential.kind() === 0) {
							// stake registration doesn't required key hash
						}
					} else if (cert.kind() === 1) {
						const credential = cert.as_stake_deregistration()!.stake_credential();
						if (credential.kind() === 0) {
							const keyHash = Buffer.from(
								credential.to_keyhash()!.to_bytes()
							).toString('hex');
							requiredKeyHashes.push(keyHash);
						}
					} else if (cert.kind() === 2) {
						const credential = cert.as_stake_delegation()!.stake_credential();
						if (credential.kind() === 0) {
							const keyHash = Buffer.from(
								credential.to_keyhash()!.to_bytes()
							).toString('hex');
							requiredKeyHashes.push(keyHash);
						}
					} else if (cert.kind() === 3) {
						const owners = cert
							.as_pool_registration()!
							.pool_params()
							.pool_owners();
						for (let i = 0; i < owners.len(); i++) {
							const keyHash = Buffer.from(owners.get(i).to_bytes()).toString(
								'hex'
							);
							requiredKeyHashes.push(keyHash);
						}
					} else if (cert.kind() === 4) {
						const operator = cert.as_pool_retirement()!.pool_keyhash().to_hex();
						requiredKeyHashes.push(operator);
					} else if (cert.kind() === 6) {
						const instant_reward = cert
							.as_move_instantaneous_rewards_cert()!
							.move_instantaneous_reward()!
							.as_to_stake_creds()!
							.keys();
						for (let i = 0; i < instant_reward.len(); i++) {
							const credential = instant_reward.get(i);

							if (credential.kind() === 0) {
								const keyHash = Buffer.from(
									credential.to_keyhash()!.to_bytes()
								).toString('hex');
								requiredKeyHashes.push(keyHash);
							}
						}
					}
				}

			}
		};
		if (certs) {
			if (certs) keyHashFromCert(txBody);
		}


		// key hashes from withdrawals
		const withdrawals = txBody.withdrawals();
		const keyHashFromWithdrawal = (withdrawals: C.Withdrawals) => {
			const rewardAddresses = withdrawals.keys();
			for (let i = 0; i < rewardAddresses.len(); i++) {
				const credential = rewardAddresses.get(i).payment_cred();
				if (credential.kind() === 0) {
					requiredKeyHashes.push(credential.to_keyhash()!.to_hex());
				}
			}
		};
		if (withdrawals) keyHashFromWithdrawal(withdrawals);

		//get key hashes from scripts
		const scripts = tx.witness_set().native_scripts();
		const keyHashFromScript: any = (scripts: C.NativeScripts) => {
			for (let i = 0; i < scripts.len(); i++) {
				const script = scripts.get(i);
				if (script.kind() === 0) {
					const keyHash = Buffer.from(
						script.as_script_pubkey()!.addr_keyhash().to_bytes()
					).toString('hex');
					requiredKeyHashes.push(keyHash);
				}
				if (script.kind() === 1) {
					return keyHashFromScript(script.as_script_all()!.native_scripts());
				}
				if (script.kind() === 2) {
					return keyHashFromScript(script.as_script_any()!.native_scripts());
				}
				if (script.kind() === 3) {
					return keyHashFromScript(script.as_script_n_of_k()!.native_scripts());
				}
			}
		};

		if (scripts) keyHashFromScript(scripts);

		//get keyHashes from required signers
		const requiredSigners = tx.body().required_signers();
		if (requiredSigners) {
			for (let i = 0; i < requiredSigners.len(); i++) {
				requiredKeyHashes.push(
					Buffer.from(requiredSigners.get(i).to_bytes()).toString('hex')
				);
			}
		}
		return requiredKeyHashes
	}

	function signDataUtil(
		addressHex: string,
		payload: Payload,
		privateKey: PrivateKey,
	): SignedMessage {
		const protectedHeaders = M.HeaderMap.new();
		protectedHeaders.set_algorithm_id(
			M.Label.from_algorithm_id(
				M.AlgorithmId.EdDSA,
			),
		);
		protectedHeaders.set_header(
			M.Label.new_text("address"),
			M.CBORValue.new_bytes(fromHex(addressHex)),
		);
		const protectedSerialized = M.ProtectedHeaderMap.new(
			protectedHeaders,
		);
		const unprotectedHeaders = M.HeaderMap.new();
		const headers = M.Headers.new(
			protectedSerialized,
			unprotectedHeaders,
		);
		const builder = M.COSESign1Builder.new(
			headers,
			fromHex(payload),
			false,
		);
		const toSign = builder.make_data_to_sign().to_bytes();

		const priv = C.PrivateKey.from_bech32(privateKey);

		const signedSigStruc = priv.sign(toSign).to_bytes();
		const coseSign1 = builder.build(signedSigStruc);

		const key = M.COSEKey.new(
			M.Label.from_key_type(M.KeyType.OKP), //OKP
		);
		key.set_algorithm_id(
			M.Label.from_algorithm_id(
				M.AlgorithmId.EdDSA,
			),
		);
		key.set_header(
			M.Label.new_int(
				M.Int.new_negative(
					M.BigNum.from_str("1"),
				),
			),
			M.CBORValue.new_int(
				M.Int.new_i32(6), //M.CurveType.Ed25519
			),
		); // crv (-1) set to Ed25519 (6)
		key.set_header(
			M.Label.new_int(
				M.Int.new_negative(
					M.BigNum.from_str("2"),
				),
			),
			M.CBORValue.new_bytes(priv.to_public().as_bytes()),
		); // x (-2) set to public key

		return {
			signature: toHex(coseSign1.to_bytes()),
			key: toHex(key.to_bytes()),
		};
	}



	const getAddressesFromKeys = (paymentKey: C.PrivateKey, stakeKey: C.PrivateKey) => {
		const paymentKeyHash = paymentKey.to_public().hash();
		const stakeKeyHash = stakeKey.to_public().hash();

		const networkId = network === "Mainnet" ? 1 : 0;

		const address = C.BaseAddress.new(
			networkId,
			C.StakeCredential.from_keyhash(paymentKeyHash),
			C.StakeCredential.from_keyhash(stakeKeyHash),
		).to_address().to_bech32(undefined)


		const stakeAddr = C.RewardAddress.new(
			networkId,
			C.StakeCredential.from_keyhash(stakeKeyHash),
		).to_address().to_bech32(undefined)
		return { address, stakeAddress: stakeAddr }
	}


	/* ----------------- WalletAPI ---------------------*/
	const assetsToValue = async (assets: { unit: string, quantity: string }[]) => {
		const multiAsset = C.MultiAsset.new();
		const lovelace = assets.find((asset) => asset.unit === 'lovelace');
		const policies = [
			...new Set(
				assets
					.filter((asset) => asset.unit !== 'lovelace')
					.map((asset) => asset.unit.slice(0, 56))
			),
		];
		policies.forEach((policy) => {
			const policyAssets = assets.filter(
				(asset) => asset.unit.slice(0, 56) === policy
			);
			const assetsValue = C.Assets.new();
			policyAssets.forEach((asset) => {
				assetsValue.insert(
					C.AssetName.new(Buffer.from(asset.unit.slice(56), 'hex')),
					C.BigNum.from_str(asset.quantity)
				);
			});
			multiAsset.insert(
				C.ScriptHash.from_bytes(Buffer.from(policy, 'hex')),
				assetsValue
			);
		});
		const value = C.Value.new(
			C.BigNum.from_str(lovelace ? lovelace.quantity : '0')
		);
		if (assets.length > 1 || !lovelace) value.set_multiasset(multiAsset);
		return value;
	};

	const utxoFromJson = async (
		output: any,
		address: string
	) => {
		return C.TransactionUnspentOutput.new(
			C.TransactionInput.new(
				C.TransactionHash.from_bytes(
					Buffer.from(output.tx_hash || output.txHash, 'hex')
				),
				C.BigNum.from_str(
					(output.output_index ?? output.txId).toString()
				)
			),
			C.TransactionOutput.new(
				C.Address.from_bytes(Buffer.from(address, 'hex')),
				await assetsToValue(output.amount)
			)
		);
	};

	const getNetworkId = async (): Promise<number> => {
		if (network === 'Mainnet') {
			return 1
		} else {
			return 0
		}
		return 0
	}
	const getUtxos = async (): Promise<string[] | undefined> => {
		const { address, stakeAddress } = getAddressesFromKeys(paymentKey!, stakeKey!)
		let result: any = [];
		let page = 1// paginate && paginate.page ? paginate.page + 1 : 1;
		const limit = ''//paginate && paginate.limit ? `&count=${paginate.limit}` : '';
		const addressHex = Buffer.from(C.Address.from_bech32(address).to_bytes()).toString('hex')
		while (true) {
			let pageResult = await fetch(
				`${blockfrostUrl}/addresses/${address}/utxos?page=${page}${limit}`,
				{
					headers: {
						project_id: blockfrostKey as string,
						"Content-Type": "application/json",
					},
				},
			).then((res) => res.json());


			if (pageResult.error) {
				if (result.status_code === 400) throw APIError.InvalidRequest;
				else if (result.status_code === 500) throw APIError.InternalError;
				else {
					pageResult = [];
				}
			}
			result = result.concat(pageResult);
			if (pageResult.length <= 0 /* || paginate */) break;
			page++;
		}

		const converted = await Promise.all(
			result.map(async (utxo: any) => {
				const coreUtxo = await utxoFromJson(utxo, addressHex)
				return Buffer.from(coreUtxo.to_bytes()).toString('hex')
			}
			)
		);
		return converted;
	};

	const getBalance = async (): Promise<string> => {
		const { address, stakeAddress } = getAddressesFromKeys(paymentKey!, stakeKey!)
		const result = await fetch(
			`${blockfrostUrl}/addresses/${address}`,
			{
				headers: {
					project_id: blockfrostKey as string,
					"Content-Type": "application/json",
				},
			},
		).then((res) => res.json());

		if (result.error) {
			if (result.status_code === 400) throw APIError.InvalidRequest;
			else if (result.status_code === 500) throw APIError.InternalError;
			else return Buffer.from(C.Value.new(C.BigNum.from_str('0')).to_bytes()).toString('hex');
		}
		const value = await assetsToValue(result.amount);
		return Buffer.from(value.to_bytes()).toString('hex')
	}
	const getUsedAddresses = async (): Promise<string[]> => {
		const { address, stakeAddress } = getAddressesFromKeys(paymentKey!, stakeKey!)
		return [Buffer.from(C.Address.from_bech32(address).to_bytes()).toString('hex')];
	}
	const getUnusedAddresses = async (): Promise<string[]> => {
		const { address, stakeAddress } = getAddressesFromKeys(paymentKey!, stakeKey!)
		return [Buffer.from(C.Address.from_bech32(address).to_bytes()).toString('hex')];
	}
	const getRewardAddresses = async (): Promise<string[]> => {
		const { address, stakeAddress } = getAddressesFromKeys(paymentKey!, stakeKey!)
		return [Buffer.from(C.Address.from_bech32(stakeAddress).to_bytes()).toString('hex')];
	}
	const getChangeAddress = async (): Promise<string> => {
		const { address, stakeAddress } = getAddressesFromKeys(paymentKey!, stakeKey!)
		return Buffer.from(C.Address.from_bech32(address).to_bytes()).toString('hex');
	}
	const signTx = async (tx: string, partialSign: boolean): Promise<string> => {
		const paymentKeyHash = Buffer.from(
			paymentKey!.to_public().hash().to_bytes()
		).toString('hex');
		const stakeKeyHash = Buffer.from(
			stakeKey!.to_public().hash().to_bytes()
		).toString('hex');

		const rawTx = C.Transaction.from_bytes(Buffer.from(tx, 'hex'));
		const txWitnessSet = C.TransactionWitnessSet.new();
		const vkeyWitnesses = C.Vkeywitnesses.new();
		const txHash = C.hash_transaction(rawTx.body());
		const utxos: C.TransactionUnspentOutput[] = (await getUtxos())?.map((utxo: string) => C.TransactionUnspentOutput.from_bytes(Buffer.from(utxo, 'hex'))) || []
		const keyHashes = getKeyHashes(rawTx, utxos)

		keyHashes.forEach((keyHash: any) => {

			let signingKey;
			if (keyHash === paymentKeyHash) signingKey = paymentKey;
			else if (keyHash === stakeKeyHash) signingKey = stakeKey;
			//else if (!partialSign) throw TxSignError.ProofGeneration;
			else return;
			const vkey = C.make_vkey_witness(txHash, signingKey!);
			vkeyWitnesses.add(vkey);
		});

		//stakeKey!.free();
		//stakeKey = null;
		//paymentKey!.free();
		//paymentKey = null;

		txWitnessSet.set_vkeys(vkeyWitnesses);
		return Buffer.from(txWitnessSet.to_bytes()).toString('hex');
	}

	const signData = async (address: string, payload: string): Promise<{ signature: string; key: string }> => {
		if (address.startsWith('e0' ) || address.startsWith('e1')) {
			return signDataUtil(address, payload, stakeKey!.to_bech32())//await lucid.wallet.signMessage(rewardAddress, message)
		} else {
			return signDataUtil(address, payload, paymentKey!.to_bech32())//await lucid.wallet.signMessage(rewardAddress, message)
		}
	}

	const submitTx = async (tx: string): Promise<string> => {
		const transaction = C.Transaction.from_bytes(Buffer.from(tx, 'hex'))
		const result = await fetch(
			`${blockfrostUrl}/tx/submit`,
			{
				headers: {
					project_id: blockfrostKey as string,
					"Content-Type": "application/cbor",
				},
				method: 'POST',
				body: transaction.to_bytes()

			},
		).then((res) => res.json());

		if (result.error) {
			if (result.status_code === 400)
				throw { ...TxSendError.Failure, message: result.message };
			else if (result.status_code === 500) throw APIError.InternalError;
			else if (result.status_code === 429) throw TxSendError.Refused;
			else if (result.status_code === 425) throw ERROR.fullMempool;
			else throw APIError.InvalidRequest;
		}
		return result.toString('hex');
	}

	const getCollateral = async (): Promise<string[]> => {
		return []
	};


	const web3AuthAPI: WalletApi = {
		getNetworkId,
		getUtxos,
		getBalance,
		getUsedAddresses,
		getUnusedAddresses,
		getChangeAddress,
		getRewardAddresses,
		signTx,
		signData,
		submitTx,
		getCollateral,
		experimental: {
			getCollateral,
			on: () => { },
			off: () => { }
		}
	}
	/* -------------------------------------------------*/



	const getUserInfo = (): void => {
		const user = coreKitInstance?.getUserInfo();
		return user
	};

	const logout = async () => {
		if (!coreKitInstance) {
			throw new Error("coreKitInstance not found");
		}
		setLoggedIn(false)
		await coreKitInstance.logout();
		console.log("Logging out");
		setProvider(null);
	};


	return {
		login,
		logout,
		getDeviceShare,
		getUserInfo,
		walletAddress,
		loggedIn,
		userInfo,
		getSeedPhrase,
		web3AuthAPI
	}
}

export default CreateWeb3Auth;