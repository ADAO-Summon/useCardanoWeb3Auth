import { TokenBalance } from "../types/multichain"

export const BLOCKCHAINS = ['cardano', 'ethereum', 'solana', 'vechain'] as const

export const newEmptyBalance = () => {
    const assetBlockchains = BLOCKCHAINS.reduce((acc, blockchain) => {
        acc[blockchain] = { balance: 0n, FTs: [], NFTs: [] }
        return acc
    }, {} as Record<typeof BLOCKCHAINS[number], TokenBalance>)
    return ({
        isLoading: true,
        assets: assetBlockchains
    })
}

export const newEmptyAddresses = () => {
    return BLOCKCHAINS.reduce((acc, blockchain) => {
        acc[blockchain] = null
        return acc
    }, {} as Record<typeof BLOCKCHAINS[number], string | null>)
}