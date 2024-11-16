import {
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    type Action,
} from "@ai16z/eliza";
import { composeContext } from "@ai16z/eliza";
import { generateObject } from "@ai16z/eliza";
import {
    executeSwap as executeAvnuSwap,
    fetchQuotes,
    QuoteRequest,
} from "@avnu/avnu-sdk";
import { getStarknetAccount } from "../providers/wallet.ts";

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
    name: "EXECUTE_STARKNET_SWAP",
    similes: [
        "STARKNET_SWAP_TOKENS",
        "STARKNET_TOKEN_SWAP",
        "STARKNET_TRADE_TOKENS",
        "STARKNET_EXCHANGE_TOKENS",
    ],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        const requiredSettings = [
            "STARKNET_ADDRESS",
            "STARKNET_PRIVATE_KEY",
            "STARKNET_RPC_URL",
        ];

        for (const setting of requiredSettings) {
            if (!runtime.getSetting(setting)) {
                return false;
            }
        }

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
            const quoteParams: QuoteRequest = {
                sellTokenAddress: response.sellTokenAddress,
                buyTokenAddress: response.buyTokenAddress,
                sellAmount: BigInt(response.sellAmount),
            };

            const quote = await fetchQuotes(quoteParams);

            // Execute swap
            const swapResult = await executeAvnuSwap(
                getStarknetAccount(runtime),
                quote[0],
                {
                    slippage: 0.05, // 5% slippage
                    executeApprove: true,
                }
            );

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
                    text: "Swap 1 ETH for USDC on Starknet",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Buy LORDS on Starknet",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Executing swap...",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
