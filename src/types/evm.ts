
export type EvmNftInfo = {
    token_address: string,
    token_id: string,
    transfer_index: number[],
    owner_of: string,
    block_number: string,
    block_number_minted: string,
    token_hash: string,
    amount: string,
    contract_type?: string,
    name: string,
    symbol: string,
    token_uri: string,
    metadata: string,
    last_token_uri_sync: null,
    last_metadata_sync: string,
    minter_address: string
  }

  export type EvmNftMetadata = {
    image: string,
    name: string,
    attributes: string[],
    description: string
  }