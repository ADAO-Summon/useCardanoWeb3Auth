import { BLOCKCHAINS } from "../utils/multichain"

export type TokenMetadata = {
    image: string,
    name: string,
    attributes?: string[],
    description: string

}


export type TokenInfo = {
    tokenAddress?: string, // for evm
    tokenId: string, // this corresponds to unit in cardano (policy ID + asset name), or just tokenID in evm
    token_hash?: string,
    amount: bigint,         //amount owned by the user?
    existingAmount?: bigint, //This is the existing on-chain supply of the token. quantity for cardano, amount for evm? 
    contract_type?: string,
    name: string,          //readable name
    decimals?: number,     //for fungible tokens?
    symbol?: string, // for fungible tokens?
    metadata?: TokenMetadata,
}

export type TokenBalance = {
    NFTs: TokenInfo[],
    FTs: TokenInfo[],
    balance?: bigint // amount of lovelaces, or wei, etc.
}

// Define a type that represents all possible values of the CURRENCIES array
export type Blockchain = typeof BLOCKCHAINS[number];