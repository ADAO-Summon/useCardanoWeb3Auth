import Moralis from "moralis";
import { EvmChain } from "@moralisweb3/common-evm-utils";

export const getEVMAddressNFTs = async (address: string, chain: string) => {
    await Moralis.start({
      apiKey: process.env.MORALIS_API_KEY,
      // ...and any other configuration
    });
  
    const allNFTs = [];
    const selectedChain = chain === "ethereum" ? EvmChain.ETHEREUM : chain === "bsc" ? EvmChain.BSC : EvmChain.POLYGON;
  
    const chains = [selectedChain];
  
    for (const chain of chains) {
      const response = await Moralis.EvmApi.nft.getWalletNFTs({
        address,
        chain,
      });
      
  
      allNFTs.push(response.toJSON());
    }
    
    console.log({allNFTs});
    return allNFTs;
  };

  const getEVMAssetsByAddress = async (address: string, chain: string) => {
  }