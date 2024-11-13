import {
    fetchAvnuQuote,
    buildAvnuCallData,
    executeAvnuSwap,
} from "../providers/avnu.ts";
import { AvnuQuoteParams } from "../types/token";
import {
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    type Action,
} from "@ai16z/eliza/src/types.ts";
import { composeContext } from "@ai16z/eliza/src/context.ts";
import { generateObject } from "@ai16z/eliza/src/generation.ts";

const swapTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "sellTokenAddress": "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    "buyTokenAddress": "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
    "sellAmount": "1000000000000000000"
}
\`\`\`

{{recentMessages}}

Extract the following information about the requested token swap:
- Sell token address
- Buy token address  
- Amount to sell (in wei)

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.`;

export const executeSwap: Action = {
    name: "EXECUTE_SWAP",
    similes: ["SWAP_TOKENS", "TOKEN_SWAP", "TRADE_TOKENS", "EXCHANGE_TOKENS"],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        console.log("Message:", message);
        return true;
    },
    description: "Perform a token swap using Avnu.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const swapContext = composeContext({
            state,
            template: swapTemplate,
        });

        const response = await generateObject({
            runtime,
            context: swapContext,
            modelClass: ModelClass.LARGE,
        });

        console.log("Response:", response);

        try {
            // Get quote
            const quoteParams: AvnuQuoteParams = {
                sellTokenAddress: response.sellTokenAddress,
                buyTokenAddress: response.buyTokenAddress,
                sellAmount: response.sellAmount,
            };

            const quote = await fetchAvnuQuote(quoteParams);

            // Build call data
            const callData = await buildAvnuCallData({
                quoteId: quote.quoteId,
                slippage: 0.05, // 5% slippage
            });

            // Execute swap
            const swapResult = await executeAvnuSwap({
                quoteId: quote.quoteId,
                calldata: callData.calldata,
            });

            console.log("Swap completed successfully!");
            callback?.({
                text:
                    "Swap completed successfully! tx: " +
                    swapResult.transactionHash,
            });

            return true;
        } catch (error) {
            console.error("Error during token swap:", error);
            callback?.({ text: `Error during swap: ${error.message}` });
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Swap 1 ETH for USDC",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Executing swap...",
                    action: "TOKEN_SWAP",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
