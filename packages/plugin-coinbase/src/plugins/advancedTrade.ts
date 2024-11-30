import { RESTClient } from '../../advanced-sdk-ts/src/rest';
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
import { tradeTemplate } from "../templates";
import { isTradeContent, TradeContent, TradeSchema } from "../types";
import { readFile } from "fs/promises";
import { parse } from "csv-parse/sync";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { createArrayCsvWriter } from "csv-writer";
import { OrderSide } from '../../advanced-sdk-ts/src/rest/types/common-types';

// File path setup remains the same
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = path.resolve(__dirname, "../../plugin-coinbase/src/plugins");
const tradeCsvFilePath = path.join(baseDir, "trades.csv");

const tradeProvider: Provider = {
    get: async (runtime: IAgentRuntime, _message: Memory) => {
        try {
            const client = new RESTClient(
                runtime.getSetting("COINBASE_API_KEY") ?? process.env.COINBASE_API_KEY,
                runtime.getSetting("COINBASE_PRIVATE_KEY") ?? process.env.COINBASE_PRIVATE_KEY
            );

            // Get accounts and products information
            const accounts = await client.listAccounts({});
            const products = await client.listProducts({});

            // Read CSV file logic remains the same
            if (!fs.existsSync(tradeCsvFilePath)) {
                const csvWriter = createArrayCsvWriter({
                    path: tradeCsvFilePath,
                    header: [
                        "Product ID",
                        "Side",
                        "Amount",
                        "Price",
                        "Status",
                        "Order ID",
                        "Transaction URL"
                    ],
                });
                await csvWriter.writeRecords([]);
            }

            const csvData = await readFile(tradeCsvFilePath, "utf-8");
            const records = parse(csvData, {
                columns: true,
                skip_empty_lines: true,
            });

            return {
                accounts: accounts.accounts,
                products: products.products,
                trades: records
            };
        } catch (error) {
            elizaLogger.error("Error in tradeProvider:", error);
            return [];
        }
    },
};

async function appendTradeToCsv(tradeResult: any) {
    try {
        const csvWriter = createArrayCsvWriter({
            path: tradeCsvFilePath,
            header: [
                "Product ID",
                "Side",
                "Amount",
                "Price",
                "Status",
                "Order ID",
                "Transaction URL"
            ],
            append: true,
        });

        const formattedTrade = [
            tradeResult.product_id,
            tradeResult.side,
            tradeResult.size,
            tradeResult.price,
            tradeResult.status,
            tradeResult.order_id,
            `https://pro.coinbase.com/trade/${tradeResult.product_id}`
        ];

        await csvWriter.writeRecords([formattedTrade]);
    } catch (error) {
        elizaLogger.error("Error writing trade to CSV:", error);
    }
}

export const executeAdvancedTradeAction: Action = {
    name: "EXECUTE_ADVANCED_TRADE",
    description: "Execute a trade using Coinbase Advanced Trading API",
    validate: async (runtime: IAgentRuntime) => {
        return !!(runtime.getSetting("COINBASE_API_KEY") || process.env.COINBASE_API_KEY) &&
               !!(runtime.getSetting("COINBASE_PRIVATE_KEY") || process.env.COINBASE_PRIVATE_KEY);
    },
    handler: async (
        runtime: IAgentRuntime,
        _message: Memory,
        state: State,
        _options: any,
        callback: HandlerCallback
    ) => {
        try {
            const client = new RESTClient(
                runtime.getSetting("COINBASE_API_KEY") ?? process.env.COINBASE_API_KEY,
                runtime.getSetting("COINBASE_PRIVATE_KEY") ?? process.env.COINBASE_PRIVATE_KEY
            );

            const tradeDetails = await generateObjectV2({
                runtime,
                context: composeContext({ state, template: tradeTemplate }),
                modelClass: ModelClass.SMALL,
                schema: TradeSchema,
            });

            if (!isTradeContent(tradeDetails.object)) {
                callback({ text: "Invalid trade details" }, []);
                return;
            }

            const { sourceAsset, targetAsset, amount, side } = tradeDetails.object as TradeContent;
            const productId = `${sourceAsset}-${targetAsset}`;

            const order = await client.createOrder({
                clientOrderId: '0',
                productId,
                side: side === "BUY" ? OrderSide.BUY : OrderSide.SELL,
                orderConfiguration: {
                    market_market_ioc: {
                        quote_size: amount.toString()
                    }
                }

            });

            await appendTradeToCsv(order);

            callback({
                text: `Trade executed successfully:
- Product: ${productId}
- Amount: ${amount}
- Order ID: ${order.order_id}
- Status: ${order.status}`
            }, []);

        } catch (error) {
            elizaLogger.error("Error during trade execution:", error);
            callback({
                text: "Failed to execute the trade. Please check the logs for details."
            }, []);
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Buy $100 worth of BTC using USD" }
            },
            {
                user: "{{agentName}}",
                content: {
                    text: `Trade executed successfully:
- Product: BTC-USD
- Amount: 100
- Order ID: 12345
- Status: FILLED`
                }
            }
        ]
    ],
    similes: ["TRADE", "BUY", "SELL", "EXCHANGE", "SWAP"]
};

export const advancedTradePlugin: Plugin = {
    name: "advancedTradePlugin",
    description: "Enables advanced trading using Coinbase Advanced Trading API",
    actions: [executeAdvancedTradeAction],
    providers: [tradeProvider]
};