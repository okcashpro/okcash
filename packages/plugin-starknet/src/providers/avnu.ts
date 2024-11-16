import { IAgentRuntime } from "@ai16z/eliza";

interface AvnuQuoteParams {
    sellTokenAddress: string;
    buyTokenAddress: string;
    sellAmount?: string;
    takerAddress?: string;
    excludeSources?: string[];
    size?: number;
    integratorName?: string;
}

export async function fetchAvnuQuote(
    runtime: IAgentRuntime,
    params: AvnuQuoteParams
) {
    const apiKey = runtime.getSetting("AVNU_API_KEY");

    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append("sellTokenAddress", params.sellTokenAddress);
    queryParams.append("buyTokenAddress", params.buyTokenAddress);

    if (params.sellAmount) {
        queryParams.append("sellAmount", params.sellAmount);
    }
    if (params.takerAddress) {
        queryParams.append("takerAddress", params.takerAddress);
    }
    if (params.excludeSources) {
        queryParams.append("excludeSources", params.excludeSources.join(","));
    }
    if (params.size) {
        queryParams.append("size", params.size.toString());
    }
    if (params.integratorName) {
        queryParams.append("integratorName", params.integratorName);
    }

    const url = `https://starknet.api.avnu.fi/swap/v2/quotes?${queryParams.toString()}`;

    const response = await fetch(url, {
        method: "GET",
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch Avnu quote: ${errorText}`);
    }

    return response.json();
}

export const avnuProvider = {
    get: async (runtime: IAgentRuntime) => {
        try {
            const params = {
                sellTokenAddress: runtime.getSetting("SELL_TOKEN_ADDRESS"),
                buyTokenAddress: runtime.getSetting("BUY_TOKEN_ADDRESS"),
                sellAmount: runtime.getSetting("SELL_AMOUNT"),
            };

            const quote = await fetchAvnuQuote(runtime, params);
            return JSON.stringify(quote, null, 2);
        } catch (error) {
            console.error("Error fetching Avnu quote:", error);
            return `Failed to fetch quote: ${error instanceof Error ? error.message : "Unknown error"}`;
        }
    },
};
