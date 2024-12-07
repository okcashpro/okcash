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
import { advancedTradeTemplate } from "../templates";
import { isAdvancedTradeContent, AdvancedTradeSchema } from "../types";
import { readFile } from "fs/promises";
import { parse } from "csv-parse/sync";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { createArrayCsvWriter } from "csv-writer";
import { OrderSide, OrderConfiguration } from '../../advanced-sdk-ts/src/rest/types/common-types';

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
            let accounts, products;
            try {
                accounts = await client.listAccounts({});
            } catch (error) {
                elizaLogger.error("Error fetching accounts:", error);
                return [];
            }

            try {
                products = await client.listProducts({});
            } catch (error) {
                elizaLogger.error("Error fetching products:", error);
                return [];
            }

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

            let csvData, records;
            try {
                csvData = await readFile(tradeCsvFilePath, "utf-8");
            } catch (error) {
                elizaLogger.error("Error reading CSV file:", error);
                return [];
            }

            try {
                records = parse(csvData, {
                    columns: true,
                    skip_empty_lines: true,
                });
            } catch (error) {
                elizaLogger.error("Error parsing CSV data:", error);
                return [];
            }

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

async function hasEnoughBalance(client: RESTClient, currency: string, amount: number): Promise<boolean> {
    try {
        const accounts = await client.listAccounts({});
        const account = accounts.accounts.find(acc => acc.currency === currency);
        if (!account) return false;

        const available = parseFloat(account.available_balance.value);
        elizaLogger.info("Available balance:", available);
        return available >= amount;
    } catch (error) {
        elizaLogger.error("Balance check failed:", error);
        return false;
    }
}

export const executeAdvancedTradeAction: Action = {
    name: "EXECUTE_ADVANCED_TRADE",
    description: "Execute a trade using Coinbase Advanced Trading API",
    validate: async (runtime: IAgentRuntime) => {
        return !!(runtime.getSetting("COINBASE_API_KEY") || process.env.COINBASE_API_KEY) &&
               !!(runtime.getSetting("COINBASE_PRIVATE_KEY") || process.env.COINBASE_PRIVATE_KEY);
    },
    similes: [
        "EXECUTE_ADVANCED_TRADE",
        "ADVANCED_MARKET_ORDER",
        "ADVANCED_LIMIT_ORDER",
        "COINBASE_PRO_TRADE",
        "PROFESSIONAL_TRADE"
    ],
    handler: async (
        runtime: IAgentRuntime,
        _message: Memory,
        state: State,
        _options: any,
        callback: HandlerCallback
    ) => {
        let client: RESTClient;

        // Initialize client
        try {
            client = new RESTClient(
                runtime.getSetting("COINBASE_API_KEY") ?? process.env.COINBASE_API_KEY,
                runtime.getSetting("COINBASE_PRIVATE_KEY") ?? process.env.COINBASE_PRIVATE_KEY
            );
            elizaLogger.info("Advanced trade client initialized");
        } catch (error) {
            elizaLogger.error("Client initialization failed:", error);
            callback({
                text: "Failed to initialize trading client. Please check your API credentials."
            }, []);
            return;
        }

        // Generate trade details
        let tradeDetails;
        try {
            tradeDetails = await generateObjectV2({
                runtime,
                context: composeContext({ state, template: advancedTradeTemplate }),
                modelClass: ModelClass.LARGE,
                schema: AdvancedTradeSchema,
            });
            elizaLogger.info("Trade details generated:", tradeDetails.object);
        } catch (error) {
            elizaLogger.error("Trade details generation failed:", error);
            callback({
                text: "Failed to generate trade details. Please provide valid trading parameters."
            }, []);
            return;
        }

        // Validate trade content
        if (!isAdvancedTradeContent(tradeDetails.object)) {
            elizaLogger.error("Invalid trade content:", tradeDetails.object);
            callback({
                text: "Invalid trade details. Please check your input parameters."
            }, []);
            return;
        }

        const { productId, amount, side, orderType, limitPrice } = tradeDetails.object;

        // Configure order
        let orderConfiguration: OrderConfiguration;
        try {
            if (orderType === "MARKET") {
                orderConfiguration = side === "BUY" ? {
                    market_market_ioc: {
                        quote_size: amount.toString()
                    }
                } : {
                    market_market_ioc: {
                        base_size: amount.toString()
                    }
                };
            } else {
                if (!limitPrice) {
                    throw new Error("Limit price is required for limit orders");
                }
                orderConfiguration = {
                    limit_limit_gtc: {
                        baseSize: amount.toString(),
                        limitPrice: limitPrice.toString(),
                        postOnly: false
                    }
                };
            }
            elizaLogger.info("Order configuration created:", orderConfiguration);
        } catch (error) {
            elizaLogger.error("Order configuration failed:", error);
            callback({
                text: error instanceof Error ? error.message : "Failed to configure order parameters."
            }, []);
            return;
        }

        // Execute trade
        let order;
        try {
            // if (!(await hasEnoughBalance(client, side === "BUY" ? "USD" : productId.split('-')[0], amount))) {
            //     callback({
            //         text: "Insufficient balance to execute this trade"
            //     }, []);
            //     return;
            // }

            order = await client.createOrder({
                clientOrderId: "00000001",
                productId,
                side: side === "BUY" ? OrderSide.BUY : OrderSide.SELL,
                orderConfiguration
            });

            elizaLogger.info("Trade executed successfully:", order);
        } catch (error) {
            elizaLogger.error("Trade execution failed:", error?.message);
            callback({
                text: `Failed to execute trade: ${error instanceof Error ? error.message : "Unknown error occurred"}`
            }, []);
            return;
        }
            // Log trade to CSV
            try {
                await appendTradeToCsv({
                    ...order,
                    product_id: productId,
                    side,
                    size: amount,
                    price: limitPrice || "MARKET",
                });
                elizaLogger.info("Trade logged to CSV");
            } catch (csvError) {
                elizaLogger.warn("Failed to log trade to CSV:", csvError);
                // Continue execution as this is non-critical
            }

            callback({
                text: `Advanced Trade executed successfully:
- Product: ${productId}
- Type: ${orderType} Order
- Side: ${side}
- Amount: ${amount}
- ${orderType === "LIMIT" ? `- Limit Price: ${limitPrice}\n` : ""}- Order ID: ${order.order_id}
- Status: ${order.status}`
            }, []);
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Place an advanced market order to buy $1 worth of BTC" }
            },
            {
                user: "{{agentName}}",
                content: {
                    text: `Advanced Trade executed successfully:
- Product: BTC-USD
- Type: Market Order
- Side: BUY
- Amount: 1000
- Order ID: CB-ADV-12345
- Status: FILLED`
                }
            }
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Set a limit order to sell 0.5 ETH at $2000" }
            },
            {
                user: "{{agentName}}",
                content: {
                    text: `Advanced Trade executed successfully:
- Product: ETH-USD
- Type: Limit Order
- Side: SELL
- Amount: 0.5
- Limit Price: 2000
- Order ID: CB-ADV-67890
- Status: PENDING`
                }
            }
        ]
    ]
};

export const advancedTradePlugin: Plugin = {
    name: "advancedTradePlugin",
    description: "Enables advanced trading using Coinbase Advanced Trading API",
    actions: [executeAdvancedTradeAction],
    providers: [tradeProvider],
};