import { Blockchain, TokenBalance, TokenInfo } from "./multichain"

export type OAuthClients = { [key: string]: { name: string, clientId: string, verifier: string } }
export type AccountAddresses = Record<Blockchain, string | null>
export type AccountBalances = {isLoading: boolean, assets: Record<Blockchain, TokenBalance>}
