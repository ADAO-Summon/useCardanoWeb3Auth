export type BlockfrostAmount = {
    unit: string,
    quantity: string,

}
export type BlockfrostUTXO={
    address: string,
    tx_hash: string,
    output_index: number,
    block: string,
    amount: BlockfrostAmount[],
    data_hash?: string,
    inline_datum?: string,
    reference_script_hash?: string,
}

export type BlockfrostAsset = {
    asset: string
    policy_id: string
    asset_name: string
    fingerprint: string
    quantity: string
    initial_tx_hash: string
    mint_or_burn_count: number,
    onchain_metadata: any,
    onchain_metadata_standard: string | null,
    metadata: any,
    readableName: string
  }
export type CardanoAddressInfo ={
    address: string,
    amount: BlockfrostAmount[],
    stake_address?: string,
    type: 'byron' | 'shelley',
    script: boolean,
}