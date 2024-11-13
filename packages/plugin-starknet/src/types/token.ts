interface AvnuQuoteParams {
    sellTokenAddress: string;
    buyTokenAddress: string;
    sellAmount?: string;
    buyAmount?: string;
    takerAddress?: string;
    excludeSources?: string[];
    size?: number;
    integratorFees?: string;
    integratorFeeRecipient?: string;
    integratorName?: string;
    pulsarMoneyFeeRecipient?: number;
}

interface AvnuRoute {
    name: string;
    address: string;
    percent: number;
    sellTokenAddress: string;
    buyTokenAddress: string;
}

interface GasTokenPrice {
    tokenAddress: string;
    gasFeesInGasToken: string;
    gasFeesInUsd: number;
}

interface GaslessInfo {
    active: boolean;
    gasTokenPrices: GasTokenPrice[];
}

interface AvnuQuoteResponse {
    quoteId: string;
    sellTokenAddress: string;
    sellAmount: string;
    sellAmountInUsd: number;
    buyTokenAddress: string;
    buyAmount: string;
    buyAmountInUsd: number;
    buyAmountWithoutFees: string;
    buyAmountWithoutFeesInUsd: number;
    estimatedAmount: boolean;
    chainId: string;
    blockNumber: string;
    expiry: number;
    routes: AvnuRoute[];
    gasFees: string;
    gasFeesInUsd: number;
    avnuFees: string;
    avnuFeesInUsd: number;
    avnuFeesBps: string;
    integratorFees: string;
    integratorFeesInUsd: number;
    integratorFeesBps: string;
    priceRatioUsd: number;
    liquiditySource: string;
    sellTokenPriceInUsd: number;
    buyTokenPriceInUsd: number;
    gasless: GaslessInfo;
}

export type { AvnuQuoteParams, AvnuQuoteResponse };
