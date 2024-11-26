import { Coinbase, Wallet } from "@coinbase/coinbase-sdk";
import {
    Action,
    Plugin,
    elizaLogger,
    IAgentRuntime,
    Memory,
    HandlerCallback,
    State,
    composeContext,
    generateObjectV2,
    ModelClass,
} from "@ai16z/eliza";
import { initializeWallet } from "../utils";
import { tradeTemplate } from "../templates";
import { isTradeContent, TradeContent, TradeSchema } from "../types";

export const executeTradeAction: Action = {
    name: "EXECUTE_TRADE",
    description:
        "Execute a trade between two assets using the Coinbase SDK and log the result.",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        elizaLogger.log("Validating runtime for EXECUTE_TRADE...");
        return (
            !!(
                runtime.character.settings.secrets?.COINBASE_API_KEY ||
                process.env.COINBASE_API_KEY
            ) &&
            !!(
                runtime.character.settings.secrets?.COINBASE_PRIVATE_KEY ||
                process.env.COINBASE_PRIVATE_KEY
            )
        );
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback: HandlerCallback
    ) => {
        elizaLogger.log("Starting EXECUTE_TRADE handler...");

        try {
            Coinbase.configure({
                apiKeyName:
                    runtime.getSetting("COINBASE_API_KEY") ??
                    process.env.COINBASE_API_KEY,
                privateKey:
                    runtime.getSetting("COINBASE_PRIVATE_KEY") ??
                    process.env.COINBASE_PRIVATE_KEY,
            });

            const context = composeContext({
                state,
                template: tradeTemplate,
            });

            const tradeDetails = await generateObjectV2({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
                schema: TradeSchema,
            });

            if (!isTradeContent(tradeDetails.object)) {
                callback(
                    {
                        text: "Invalid trade details. Ensure network, amount, source asset, and target asset are correctly specified.",
                    },
                    []
                );
                return;
            }

            const { network, amount, sourceAsset, targetAsset } =
                tradeDetails.object as TradeContent;

            const allowedNetworks = ["base", "sol", "eth", "arb", "pol"];
            if (!allowedNetworks.includes(network)) {
                callback(
                    {
                        text: `Invalid network. Supported networks are: ${allowedNetworks.join(
                            ", "
                        )}.`,
                    },
                    []
                );
                return;
            }

            const wallet = await initializeWallet(runtime, network);

            elizaLogger.log("Wallet initialized:", {
                network,
                address: await wallet.getDefaultAddress(),
            });

            const tradeParams = {
                amount,
                fromAssetId: sourceAsset,
                toAssetId: targetAsset,
            };

            const trade = await wallet.createTrade(tradeParams);

            elizaLogger.log("Trade initiated:", trade.toString());

            // Wait for the trade to complete
            await trade.wait();

            elizaLogger.log("Trade completed successfully:", trade.toString());

            callback(
                {
                    text: `Trade executed successfully:
- Network: ${network}
- Amount: ${amount}
- From: ${sourceAsset}
- To: ${targetAsset}`,
                },
                []
            );
        } catch (error) {
            elizaLogger.error("Error during trade execution:", error);
            callback(
                {
                    text: "Failed to execute the trade. Please check the logs for more details.",
                },
                []
            );
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Trade 0.01 ETH for USDC on the base network.",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: `Trade executed successfully:
- Network: base
- Amount: 0.01
- From: ETH
- To: USDC`,
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Swap 1 SOL for USDC on the sol network.",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: `Trade executed successfully:
- Network: sol
- Amount: 1
- From: SOL
- To: USDC`,
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Exchange 100 USDC for ETH on the pol network.",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: `Trade executed successfully:
- Network: pol
- Amount: 100
- From: USDC
- To: ETH`,
                },
            },
        ],
    ],
};

export const tradePlugin: Plugin = {
    name: "tradePlugin",
    description: "Enables asset trading using the Coinbase SDK.",
    actions: [executeTradeAction],
};
