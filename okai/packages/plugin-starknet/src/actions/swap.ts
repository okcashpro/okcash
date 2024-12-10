import {
    Action,
    ActionExample,
    composeContext,
    okaiLogger,
    generateObjectDEPRECATED,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
} from "@okcashpro/okai";
import {
    executeSwap as executeAvnuSwap,
    fetchQuotes,
    QuoteRequest,
} from "@avnu/avnu-sdk";

import { getStarknetAccount } from "../utils/index.ts";
import { validateStarknetConfig } from "../environment.ts";

interface SwapContent {
    sellTokenAddress: string;
    buyTokenAddress: string;
    sellAmount: string;
}

export function isSwapContent(content: SwapContent): content is SwapContent {
    // Validate types
    const validTypes =
        typeof content.sellTokenAddress === "string" &&
        typeof content.buyTokenAddress === "string" &&
        typeof content.sellAmount === "string";
    if (!validTypes) {
        return false;
    }

    // Validate addresses (must be 32-bytes long with 0x prefix)
    const validAddresses =
        content.sellTokenAddress.startsWith("0x") &&
        content.sellTokenAddress.length === 66 &&
        content.buyTokenAddress.startsWith("0x") &&
        content.buyTokenAddress.length === 66;

    return validAddresses;
}

const swapTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

These are known addresses you will get asked to swap, use these addresses for sellTokenAddress and buyTokenAddress:
- BROTHER/brother/$brother: 0x03b405a98c9e795d427fe82cdeeeed803f221b52471e3a757574a2b4180793ee
- BTC/btc: 0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac
- ETH/eth: 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7
- STRK/strk: 0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d
- LORDS/lords: 0x0124aeb495b947201f5fac96fd1138e326ad86195b98df6dec9009158a533b49

Example response:
\`\`\`json
{
    "sellTokenAddress": "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    "buyTokenAddress": "0x124aeb495b947201f5fac96fd1138e326ad86195b98df6dec9009158a533b49",
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
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        await validateStarknetConfig(runtime);
        return true;
    },
    description:
        "Perform a token swap on starknet. Use this action when a user asks you to swap tokens anything.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        okaiLogger.log("Starting EXECUTE_STARKNET_SWAP handler...");
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const swapContext = composeContext({
            state,
            template: swapTemplate,
        });

        const response = await generateObjectDEPRECATED({
            runtime,
            context: swapContext,
            modelClass: ModelClass.MEDIUM,
        });

        okaiLogger.debug("Response:", response);

        if (!isSwapContent(response)) {
            callback?.({ text: "Invalid swap content, please try again." });
            return false;
        }

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

            okaiLogger.log(
                "Swap completed successfully! tx: " + swapResult.transactionHash
            );
            callback?.({
                text:
                    "Swap completed successfully! tx: " +
                    swapResult.transactionHash,
            });

            return true;
        } catch (error) {
            okaiLogger.error("Error during token swap:", error);
            callback?.({ text: `Error during swap:` });
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Swap 10 ETH for LORDS",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Ok, I'll swap 10 ETH for LORDS",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Swap 100 $lords on starknet",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Ok, I'll swap 100 $lords on starknet",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Swap 0.5 BTC for LORDS",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Ok, I'll swap 0.5 BTC for LORDS",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
