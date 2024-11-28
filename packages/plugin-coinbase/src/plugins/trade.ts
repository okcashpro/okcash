import { Coinbase, Trade } from "@coinbase/coinbase-sdk";
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
    Provider,
} from "@ai16z/eliza";
import { initializeWallet } from "../utils";
import { tradeTemplate } from "../templates";
import {
    isTradeContent,
    TradeContent,
    TradeSchema,
    TradeTransaction,
} from "../types";
import { readFile } from "fs/promises";
import { parse } from "csv-parse/sync";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { createArrayCsvWriter } from "csv-writer";

// Dynamically resolve the file path to the src/plugins directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = path.resolve(__dirname, "../../plugin-coinbase/src/plugins");
const tradeCsvFilePath = path.join(baseDir, "trades.csv");

export const tradeProvider: Provider = {
    get: async (_runtime: IAgentRuntime, _message: Memory) => {
        try {
            elizaLogger.log("Reading CSV file from:", tradeCsvFilePath);

            // Check if the file exists; if not, create it with headers
            if (!fs.existsSync(tradeCsvFilePath)) {
                elizaLogger.warn("CSV file not found. Creating a new one.");
                const csvWriter = createArrayCsvWriter({
                    path: tradeCsvFilePath,
                    header: [
                        "Network",
                        "Amount",
                        "Source Asset",
                        "Target Asset",
                        "Status",
                        "Error Code",
                        "Transaction URL",
                    ],
                });
                await csvWriter.writeRecords([]); // Create an empty file with headers
                elizaLogger.log("New CSV file created with headers.");
            }

            // Read and parse the CSV file
            const csvData = await readFile(tradeCsvFilePath, "utf-8");
            const records = parse(csvData, {
                columns: true,
                skip_empty_lines: true,
            });

            elizaLogger.log("Parsed CSV records:", records);
            return records.map((record: any) => ({
                network: record["Network"] || undefined,
                amount: parseFloat(record["Amount"]) || undefined,
                sourceAsset: record["Source Asset"] || undefined,
                targetAsset: record["Target Asset"] || undefined,
                status: record["Status"] || undefined,
                errorCode: record["Error Code"] || "",
                transactionUrl: record["Transaction URL"] || "",
            }));
        } catch (error) {
            elizaLogger.error("Error in tradeProvider:", error);
            return [];
        }
    },
};

export async function appendTradesToCsv(trades: TradeTransaction[]) {
    try {
        const csvWriter = createArrayCsvWriter({
            path: tradeCsvFilePath,
            header: [
                "Network",
                "Amount",
                "Source Asset",
                "Target Asset",
                "Status",
                "Error Code",
                "Transaction URL",
            ],
            append: true,
        });

        const formattedTrades = trades.map((trade) => [
            trade.network,
            trade.amount.toString(),
            trade.sourceAsset,
            trade.targetAsset,
            trade.status,
            trade.errorCode || "",
            trade.transactionUrl || "",
        ]);

        elizaLogger.log("Writing trades to CSV:", formattedTrades);
        await csvWriter.writeRecords(formattedTrades);
        elizaLogger.log("All trades written to CSV successfully.");
    } catch (error) {
        elizaLogger.error("Error writing trades to CSV:", error);
    }
}

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

            const trade: Trade = await wallet.createTrade(tradeParams);

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
                    text: "Trade 0.0001 ETH for USDC on the base",
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
    similes: [
        "CREATE_TRADE",
        "TRADE",
        "SWAP",
        "EXCHANGE",
        "SWAP_ASSETS",
        "SWAP_CURRENCY",
    ],
};

export const tradePlugin: Plugin = {
    name: "tradePlugin",
    description: "Enables asset trading using the Coinbase SDK.",
    actions: [executeTradeAction],
};
