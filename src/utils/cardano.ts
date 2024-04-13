import { BlockfrostAsset, BlockfrostUTXO, CardanoAddressInfo } from "../types/cardano";
import { TokenBalance, TokenInfo } from "../types/multichain";
import { Emulator, UTxO, WalletApi, fromLabel } from "lucid-cardano"


export const tokenNameFromUnit = (unit: string) => unit === 'lovelace' ? 'ADA' : tokenNameFromAssetName(unit.replace(unit.slice(0, 56), ""))//Buffer.from(unit.replace(unit.slice(0, 56), ""), "hex").toString("ascii")
export const tokenNameFromAssetName = (assetName: string) => assetName == 'lovelace' ? 'ADA ' : (() => {
    const label = fromLabel(assetName.slice(0, 8));
    console.log({ label }, assetName.slice(0, 8))
    const name = (() => {
        const hexName = Number.isInteger(label) ? Buffer.from(assetName.slice(8), "hex").toString("ascii") : Buffer.from(assetName, "hex").toString("ascii");
        return hexName || null;
    })();
    return Number.isInteger(label) ? `(${label}) ${name}` : name
    //Buffer.from(assetName, "hex").toString("ascii")
})()

export const getCardanoAddressInfo = async (address: string): Promise<CardanoAddressInfo>=> {
    const result = await fetch(
        `${process.env.BLOCKFROST_URL}/addresses/${address}`,
        {
            headers: {
                project_id: process.env.BLOCKFROST_PROJECT_ID as string,
                "Content-Type": "application/json",
            },
        },
    ).then((res) => res.json());

    if (result.error) {
        if (result.status_code === 400) throw new Error("Invalid Request");
        else if (result.status_code === 500) throw new Error("Internal Error");
        // else address not found because it's a new address
        else {
            return {
                address: address,
                amount: [],
                stake_address: "",
                type: "byron",
                script: false
             }
        }
        // else return Buffer.from(C.Value.new(C.BigNum.from_str('0')).to_bytes()).toString('hex');
    }
    return result
}

const lucidUTXoToBlockfrostUTXO = (utxo: UTxO): BlockfrostUTXO => {
    return {
        tx_hash: utxo.txHash,
        address: utxo.address,
        inline_datum: utxo.datum || "",
        output_index: utxo.outputIndex,
        data_hash: utxo.datumHash || "",
        reference_script_hash: utxo.scriptRef?.script || "",
        block: "",
        amount: Object.keys(utxo.assets).map(key => {
            return {
                unit: key,
                quantity: utxo.assets[key].toString().replace("n", "")
            }
        }),

    }
}

export const getCardanoAddressUtxos = async (address: string, emulator?: Emulator) => {
    let result: BlockfrostUTXO[] = [];
    if (emulator) {
        const utxos: BlockfrostUTXO[] = (await emulator.getUtxos(address)).map((utxo: UTxO) => {
            return lucidUTXoToBlockfrostUTXO(utxo)
        })
        console.log({ utxos })
        return utxos
    }
    let page = 1// paginate && paginate.page ? paginate.page + 1 : 1;
    const limit = ''//paginate && paginate.limit ? `&count=${paginate.limit}` : '';
    while (true) {
        let pageResult = await fetch(
            `${process.env.BLOCKFROST_URL}/addresses/${address}/utxos?page=${page}${limit}`,
            {
                headers: {
                    project_id: process.env.BLOCKFROST_PROJECT_ID as string,
                    "Content-Type": "application/json",
                },
            },
        ).then((res) => res.json());

        if (pageResult.error) {
            if (pageResult.status_code === 400) throw new Error("Invalid Request");
            else if (pageResult.status_code === 500) throw new Error("Internal Error");
            else {
                pageResult = [];
            }
        }
        result = result.concat(pageResult);
        if (pageResult.length <= 0 /* || paginate */) break;
        page++;
    }
    return result
}

export const getUTxOAmountPerTokenRange = async (utxos: BlockfrostUTXO[], breakpoints: number[]) => {
    const sortedBreakpoints = breakpoints.sort((a, b) => a - b)
    const stats: { [key: string]: number } = {}
    sortedBreakpoints.forEach((breakpoint, index) => {
        if (index === 0) stats[`<${breakpoint}`] = 0
        else if (index <= sortedBreakpoints.length - 1) stats[`${sortedBreakpoints[index - 1]}-${breakpoint}`] = 0
        else stats[`>${breakpoint}`] = 0
    })
    stats[`>${sortedBreakpoints[sortedBreakpoints.length - 1]}`] = 0
    //console.log({stats, sortedBreakpoints}, Object.keys(stats))
    for (let utxo of utxos) {
        const tokenAmount = utxo.amount.length
        let breakpoint = sortedBreakpoints.find(breakpoint => tokenAmount < breakpoint)
        if (!breakpoint) stats[`>${sortedBreakpoints[sortedBreakpoints.length - 1]}`] += 1
        else if (breakpoint === sortedBreakpoints[0]) stats[`<${breakpoint}`] += 1
        else stats[`${breakpoints[sortedBreakpoints.indexOf(breakpoint) - 1]}-${breakpoint}`] += 1
    }

    const result = Object.keys(stats).map(key => {
        return {
            range: key,
            count: stats[key]
        }
    })
    return result
}

export const getUTxOStatsForAddress = async (address: string, breakpoints: number[]) => {
    const utxos = await getCardanoAddressUtxos(address)
    const minAdaStats = await calculateMinAdaFromUTXOs(utxos)
    const tokensPerUTxO = await getUTxOAmountPerTokenRange(utxos, breakpoints)
    return { tokensPerUTxO, minAdaStats }
}


export const getProtocolParams = async () => {
    const result = await fetch(
        `${process.env.BLOCKFROST_URL}/epochs/latest/parameters`,
        {
            headers: {
                project_id: process.env.BLOCKFROST_PROJECT_ID as string,
                "Content-Type": "application/json",
            },
        },
    ).then((res) => res.json());

    if (result.error) {
        if (result.status_code === 400) throw new Error("Invalid Request");
        else if (result.status_code === 500) throw new Error("Internal Error");
        // else return Buffer.from(C.Value.new(C.BigNum.from_str('0')).to_bytes()).toString('hex');
    }
    return result
}

export const calculateMinAdaFromUTXOs = async (utxos: BlockfrostUTXO[]) => {
    const protocolParams = await getProtocolParams()
    console.log({ protocolParams })
    let totalMinLovelaces = 0
    const utxosMinAda = []
    for (let utxo of utxos) {
        let utxoMinLovelaces = 0// Number(protocolParams.min_utxo_value)
        const utxoEntrySizeWithoutVal = 27
        const size = calculateUTxOSize(utxo)
        const utxoEntrySize = utxoEntrySizeWithoutVal + size
        utxoMinLovelaces += utxoEntrySize * Number(protocolParams.coins_per_utxo_size)
        totalMinLovelaces += utxoMinLovelaces
        utxosMinAda.push({ [utxo.tx_hash + "-" + utxo.output_index]: utxoMinLovelaces })
    }
    return { totalMinLovelaces, utxosMinAda }
}

const roundupBytesToWords = (bytes: number) => {
    return Math.ceil((bytes + 7) / 8)
}

const calculateUTxOSize = (utxo: BlockfrostUTXO) => {
    let sumAssetNameLengths = 0
    const numAssets = utxo.amount.length
    const policyMap = new Map<string, number>()
    for (let asset of utxo.amount) {
        if (asset.unit != "lovelace") {
            sumAssetNameLengths += asset.unit.length
            const policyId = asset.unit.substring(0, 56)
            if (!policyMap.has(policyId)) policyMap.set(policyId, 1)
            else policyMap.set(policyId, (policyMap.get(policyId) || 0) + 1)
        }

    }
    const policyIdSize = 28
    const numPIDs = policyMap.size

    const size = 6 + roundupBytesToWords(numAssets * 12 + sumAssetNameLengths + numPIDs * policyIdSize)
    return size
}

const fromAssetUnit = (unit: string) => {
    console.log(unit)
    const policyId = unit.slice(0, 56);
    const label = fromLabel(unit.slice(56, 64));
    const name = (() => {
        const hexName = Number.isInteger(label) ? unit.slice(64) : unit.slice(56);
        return unit.length === 56 ? '' : hexName || null;
    })();
    return { policyId, name, label };
}

async function batchProcess(items: any, batchSize: number, processFunction: any) {
    let result: any = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map((item: any) => processFunction(item)));
        result = result.concat(batchResults);
    }
    return result;
}


const convertMetadataPropToString = (src: any) => {
    if (typeof src === 'string') return src;
    else if (Array.isArray(src)) return src.join('');
    return null;
};

const linkToSrc = (link: string, base64 = false) => {
    const base64regex =
        /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
    if (link.startsWith('https://')) return link;
    else if (link.startsWith('ipfs://'))
        return (
            'https://ipfs.io/ipfs/' +
            link.split('ipfs://')[1].split('ipfs/').slice(-1)[0]
        );
    else if (
        (link.startsWith('Qm') && link.length === 46) ||
        (link.startsWith('baf') && link.length === 59)
    ) {
        return 'https://ipfs.io/ipfs/' + link;
    } else if (base64 && base64regex.test(link))
        return 'data:image/png;base64,' + link;
    else if (link.startsWith('data:image')) return link;
    return null;
};

export const getCardanoAssetsByAddress = async (address: string, options?: { ignoreDetails?: boolean, page?: number, pageLength?: number }) => {
    const allNFTs: any = []
    const ignoreDetails = options && options.ignoreDetails ? options.ignoreDetails : false
    const page = options && options.page ? options.page : 1
    const pageLength = options && options.pageLength ? options.pageLength : 30
    var addressInfo: TokenBalance = { NFTs: [], FTs: [] }

    const data = await getCardanoAddressInfo(address)
    /*  await fetch(
        `${process.env.BLOCKFROST_URL}/addresses/${address}`,
        {
            headers: {
                project_id: process.env.BLOCKFROST_PROJECT_ID as string,
                'Content-Type': 'application/json'
            }
        }
    ).then(res => res.json()).catch(e => {
        console.log("error")
    }); */


    if (data && data.amount && data.amount.length > 0) {
        console.log({ data })
        const fungible: TokenInfo[] = [];
        const NFT: TokenInfo[] = [];

        const batchSize = 5; // Adjust the batch size according to the rate limit
        const slicedData = options && options.page ? data.amount.slice((page - 1) * (pageLength || 30), page * (pageLength || 30)) : data.amount
        const assetDetailsPromises = slicedData?.filter((asset: any) => asset.unit !== 'lovelace' && !ignoreDetails)
            .map((asset: any) => () => fetch(`${process.env.BLOCKFROST_URL}/assets/${asset.unit}`, {
                headers: {
                    project_id: process.env.BLOCKFROST_PROJECT_ID as string,
                    'Content-Type': 'application/json'
                }
            }).then(res => res.json()).catch(e => console.log("error fetching asset", e)));

        const assetDetails = await batchProcess(assetDetailsPromises, batchSize, (promise: any) => promise());
        for (let i = 0; i < assetDetails.length; i++) {
            const asset = assetDetails[i];
            // const asset = data.amount[i];

            if (asset) {
                const { policyId, name, label } = fromAssetUnit(asset.asset);
                const hasNFTOnchainMetadata = asset.onchain_metadata &&
                    ((asset.onchain_metadata.version === 2 &&
                        asset.onchain_metadata?.[`0x${policyId}`]?.[`0x${name}`]) ||
                        asset.onchain_metadata);
                const meta = asset.onchain_metadata;
                console.log({ asset })
                console.log({ meta })
                console.log({ metadata: asset.metadata })

                const isNFT = Number(asset.quantity) == 1 && (hasNFTOnchainMetadata && !label) || label === 222;
                const isFungible = asset.mint_or_burn_count > 1 || !asset.onchain_metadata?.image;

                const image =
                    (meta &&
                        meta.image &&
                        linkToSrc(convertMetadataPropToString(meta.image) || '')) ||
                    (asset.metadata &&
                        asset.metadata.logo &&
                        linkToSrc(asset.metadata.logo, true)) ||
                    '';
                (!isNFT ? fungible : NFT).push({
                    amount: BigInt(data.amount.find((a: any) => a.unit === asset.asset)?.quantity || 0),
                    existingAmount: BigInt(asset.quantity),
                    name: tokenNameFromAssetName(asset.asset_name || "")!,
                    tokenId: asset.asset,
                    metadata: { image, name: asset.metadata?.name || meta?.name, description: asset.metadata?.description || meta?.description },
                    decimals: asset.metadata?.decimals,
                    symbol: asset.metadata?.ticker ? asset.metadata?.ticker : meta?.symbol ? meta?.symbol : tokenNameFromAssetName(asset.asset_name || "")!,
                });

                /* if (meta) {
                    allNFTs.push(asset);
                } */
            }
        }

        addressInfo.NFTs = NFT
        addressInfo.FTs = fungible
        const lovelaceAsset = data.amount.find((asset: any) => asset.unit === 'lovelace');
        if (lovelaceAsset) {
            addressInfo.balance = BigInt(lovelaceAsset.quantity);
        }

    }
    /* const count = data.amount? data.amount.length : 0
    addressInfo.count = count */
    console.log({ addressInfo });
    return addressInfo;
}