import {
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    type Action,
    composeContext,
    generateObject,
} from "@ai16z/eliza";
import { connect, keyStores, utils } from "near-api-js";
import BigNumber from "bignumber.js";
import { init_env, ftGetTokenMetadata, estimateSwap, instantSwap } from '@ref-finance/ref-sdk';
import { walletProvider } from "../providers/wallet";
import { KeyPairString } from "near-api-js/lib/utils";

// Initialize Ref SDK with testnet environment
init_env('testnet');

async function swapToken(
    runtime: IAgentRuntime,
    inputTokenId: string,
    outputTokenId: string,
    amount: string,
    slippageTolerance: number = 0.01
): Promise<any> {
    try {
        // Get token metadata
        const tokenIn = await ftGetTokenMetadata(inputTokenId);
        const tokenOut = await ftGetTokenMetadata(outputTokenId);

        // Get all pools for estimation
        const response = await fetch('https://testnet-indexer.ref-finance.com/list-pools');
        const { simplePools } = await response.json();

        // Estimate swap
        const swapTodos = await estimateSwap({
            tokenIn,
            tokenOut,
            amountIn: amount,
            simplePools,
            options: {
                enableSmartRouting: true
            }
        });

        if (!swapTodos || swapTodos.length === 0) {
            throw new Error('No valid swap route found');
        }

        // Get account ID from runtime settings
        const accountId = runtime.getSetting("NEAR_ADDRESS");
        if (!accountId) {
            throw new Error("NEAR_ADDRESS not configured");
        }

        // Execute swap
        const transactions = await instantSwap({
            tokenIn,
            tokenOut,
            amountIn: amount,
            swapTodos,
            slippageTolerance,
            AccountId: accountId
        });

        return transactions;
    } catch (error) {
        console.error("Error in swapToken:", error);
        throw error;
    }
}

const swapTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "inputTokenId": "wrap.testnet",
    "outputTokenId": "ref.fakes.testnet",
    "amount": "1.5"
}
\`\`\`

{{recentMessages}}

Given the recent messages and wallet information below:

{{walletInfo}}

Extract the following information about the requested token swap:
- Input token ID (the token being sold)
- Output token ID (the token being bought)
- Amount to swap

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined. The result should be a valid JSON object with the following schema:
\`\`\`json
{
    "inputTokenId": string | null,
    "outputTokenId": string | null,
    "amount": string | null
}
\`\`\``;

export const executeSwap: Action = {
    name: "EXECUTE_SWAP_NEAR",
    similes: ["SWAP_TOKENS_NEAR", "TOKEN_SWAP_NEAR", "TRADE_TOKENS_NEAR", "EXCHANGE_TOKENS_NEAR"],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        console.log("Message:", message);
        return true;
    },
    description: "Perform a token swap using Ref Finance.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        // Compose state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const walletInfo = await walletProvider.get(runtime, message, state);
        state.walletInfo = walletInfo;

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

        if (!response.inputTokenId || !response.outputTokenId || !response.amount) {
            console.log("Missing required parameters, skipping swap");
            const responseMsg = {
                text: "I need the input token ID, output token ID, and amount to perform the swap",
            };
            callback?.(responseMsg);
            return true;
        }

        try {
            // Get account credentials
            const accountId = runtime.getSetting("NEAR_ADDRESS");
            const secretKey = runtime.getSetting("NEAR_WALLET_SECRET_KEY");

            if (!accountId || !secretKey) {
                throw new Error("NEAR wallet credentials not configured");
            }

            // Create keystore and connect to NEAR
            const keyStore = new keyStores.InMemoryKeyStore();
            const keyPair = utils.KeyPair.fromString(secretKey as KeyPairString);
            await keyStore.setKey("testnet", accountId, keyPair);

            const nearConnection = await connect({
                networkId: "testnet",
                keyStore,
                nodeUrl: "https://rpc.testnet.near.org",
            });

            // Execute swap
            const swapResult = await swapToken(
                runtime,
                response.inputTokenId,
                response.outputTokenId,
                response.amount,
                0.01 // 1% slippage tolerance
            );

            // Sign and send transactions
            const account = await nearConnection.account(accountId);
            const results = [];

            for (const tx of swapResult) {
                for (const functionCall of tx.functionCalls) {
                    const result = await account.functionCall({
                        contractId: tx.receiverId,
                        methodName: functionCall.methodName,
                        args: functionCall.args,
                        gas: functionCall.gas,
                        attachedDeposit: functionCall.amount ? BigInt(functionCall.amount) : BigInt(0),
                    });
                    results.push(result);
                }
            }

            console.log("Swap completed successfully!");
            const txHashes = results.map(r => r.transaction.hash).join(", ");

            const responseMsg = {
                text: `Swap completed successfully! Transaction hashes: ${txHashes}`,
            };

            callback?.(responseMsg);
            return true;
        } catch (error) {
            console.error("Error during token swap:", error);
            const responseMsg = {
                text: `Error during swap: ${error.message}`,
            };
            callback?.(responseMsg);
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    inputTokenId: "wrap.testnet",
                    outputTokenId: "ref.fakes.testnet",
                    amount: "1.0",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Swapping 1.0 NEAR for REF...",
                    action: "TOKEN_SWAP",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Swap completed successfully! Transaction hash: ...",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
