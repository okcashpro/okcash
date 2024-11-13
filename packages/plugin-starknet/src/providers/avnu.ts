import { AvnuQuoteParams, AvnuQuoteResponse } from "../types/token";
import {
    IAgentRuntime,
    Memory,
    Provider,
    State,
} from "@ai16z/eliza/src/types.ts";

export const avnuQuoteProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, _state?: State) => {
        const userId = message.userId;

        return;
    },
};

type BuildAvnuCallDataParams = {
    quoteId: string;
    slippage: number;
};

type BuildAvnuCallDataResponse = {
    chainId: string;
    contractAddress: string;
    entrypoint: string;
    calldata: string[];
};

export async function buildAvnuCallData({
    quoteId,
    slippage,
}: BuildAvnuCallDataParams): Promise<BuildAvnuCallDataResponse> {
    const callData = {
        gasTokenAddress:
            "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
        quoteId,
        slippage,
    };

    const response = await fetch("https://starknet.api.avnu.fi/swap/v2/build", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(callData),
    });

    const data = await response.json();
    return data;
}

type ExecuteAvnuSwapResponse = {
    transactionHash: string;
    gasTokenAddress: string;
    gasTokenAmount: string;
};

export async function executeAvnuSwap({
    quoteId,
    calldata,
}: {
    quoteId: string;
    calldata: string[];
}): Promise<ExecuteAvnuSwapResponse> {
    const response = await fetch(
        "https://starknet.api.avnu.fi/swap/v2/execute",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ quoteId, signature: calldata }),
        }
    );
    const data = await response.json();
    return data;
}

export async function fetchAvnuQuote(
    params: AvnuQuoteParams
): Promise<AvnuQuoteResponse> {
    const baseUrl = "https://starknet.api.avnu.fi/swap/v2/quotes";
    const queryParams = new URLSearchParams({
        sellTokenAddress: params.sellTokenAddress,
        buyTokenAddress: params.buyTokenAddress,
        ...(params.sellAmount && { sellAmount: params.sellAmount }),
        ...(params.buyAmount && { buyAmount: params.buyAmount }),
        ...(params.takerAddress && { takerAddress: params.takerAddress }),
        ...(params.excludeSources && {
            excludeSources: params.excludeSources.join(","),
        }),
        ...(params.size && { size: params.size.toString() }),
        ...(params.integratorFees && { integratorFees: params.integratorFees }),
        ...(params.integratorFeeRecipient && {
            integratorFeeRecipient: params.integratorFeeRecipient,
        }),
        ...(params.integratorName && { integratorName: params.integratorName }),
        ...(params.pulsarMoneyFeeRecipient && {
            PULSAR_MONEY_FEE_RECIPIENT:
                params.pulsarMoneyFeeRecipient.toString(),
        }),
    });

    const url = `${baseUrl}?${queryParams.toString()}`;

    try {
        const response = await fetch(url, {
            method: "GET",
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch Avnu quote: ${errorText}`);
        }

        const data = await response.json();
        return data as AvnuQuoteResponse;
    } catch (error) {
        console.error("Error fetching Avnu quote:", error);
        throw error;
    }
}
