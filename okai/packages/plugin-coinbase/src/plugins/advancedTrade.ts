import { RESTClient } from "../../advanced-sdk-ts/src/rest";
import {
    Action,
    Plugin,
    okaiLogger,
    IAgentRuntime,
    Memory,
    HandlerCallback,
    State,
    composeContext,
    generateObject,
    ModelClass,
    Provider,
} from "@okcashpro/okai";
import { advancedTradeTemplate } from "../templates";
import { isAdvancedTradeContent, AdvancedTradeSchema } from "../types";
import { readFile } from "fs/promises";
import { parse } from "csv-parse/sync";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { createArrayCsvWriter } from "csv-writer";
import {
    OrderSide,
    OrderConfiguration,
} from "../../advanced-sdk-ts/src/rest/types/common-types";
import { CreateOrderResponse } from "../../advanced-sdk-ts/src/rest/types/orders-types";

// File path setup remains the same
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = path.resolve(__dirname, "../../plugin-coinbase/src/plugins");
const tradeCsvFilePath = path.join(baseDir, "advanced_trades.csv");

const tradeProvider: Provider = {
    get: async (runtime: IAgentRuntime, _message: Memory) => {
        try {
            const client = new RESTClient(
                runtime.getSetting("COINBASE_API_KEY") ??
                    process.env.COINBASE_API_KEY,
                runtime.getSetting("COINBASE_PRIVATE_KEY") ??
                    process.env.COINBASE_PRIVATE_KEY
            );

            // Get accounts and products information
            let accounts, products;
            try {
                accounts = await client.listAccounts({});
            } catch (error) {
                okaiLogger.error("Error fetching accounts:", error);
                return [];
            }

            try {
                products = await client.listProducts({});
            } catch (error) {
                okaiLogger.error("Error fetching products:", error);
                return [];
            }

            // Read CSV file logic remains the same
            if (!fs.existsSync(tradeCsvFilePath)) {
                const csvWriter = createArrayCsvWriter({
                    path: tradeCsvFilePath,
                    header: [
                        "Order ID",
                        "Success",
                        "Order Configuration",
                        "Response",
                    ],
                });
                await csvWriter.writeRecords([]);
            }

            let csvData, records;
            try {
                csvData = await readFile(tradeCsvFilePath, "utf-8");
            } catch (error) {
                okaiLogger.error("Error reading CSV file:", error);
                return [];
            }

            try {
                records = parse(csvData, {
                    columns: true,
                    skip_empty_lines: true,
                });
            } catch (error) {
                okaiLogger.error("Error parsing CSV data:", error);
                return [];
            }

            return {
                accounts: accounts.accounts,
                products: products.products,
                trades: records,
            };
        } catch (error) {
            okaiLogger.error("Error in tradeProvider:", error);
            return [];
        }
    },
};

export async function appendTradeToCsv(tradeResult: any) {
    try {
        const csvWriter = createArrayCsvWriter({
            path: tradeCsvFilePath,
            header: ["Order ID", "Success", "Order Configuration", "Response"],
            append: true,
        });
        okaiLogger.info("Trade result:", tradeResult);

        // Format trade data based on success/failure
        const formattedTrade = [
            tradeResult.success_response?.order_id ||
                tradeResult.failure_response?.order_id ||
                "",
            tradeResult.success,
            // JSON.stringify(tradeResult.order_configuration || {}),
            // JSON.stringify(tradeResult.success_response || tradeResult.failure_response || {})
        ];

        okaiLogger.info("Formatted trade for CSV:", formattedTrade);
        await csvWriter.writeRecords([formattedTrade]);
        okaiLogger.info("Trade written to CSV successfully");
    } catch (error) {
        okaiLogger.error("Error writing trade to CSV:", error);
        // Log the actual error for debugging
        if (error instanceof Error) {
            okaiLogger.error("Error details:", error.message);
        }
    }
}

async function hasEnoughBalance(
    client: RESTClient,
    currency: string,
    amount: number,
    side: string
): Promise<boolean> {
    try {
        const response = await client.listAccounts({});
        const accounts = JSON.parse(response);
        okaiLogger.info("Accounts:", accounts);
        const checkCurrency = side === "BUY" ? "USD" : currency;
        okaiLogger.info(
            `Checking balance for ${side} order of ${amount} ${checkCurrency}`
        );

        // Find account with exact currency match
        const account = accounts?.accounts.find(
            (acc) =>
                acc.currency === checkCurrency &&
                (checkCurrency === "USD"
                    ? acc.type === "ACCOUNT_TYPE_FIAT"
                    : acc.type === "ACCOUNT_TYPE_CRYPTO")
        );

        if (!account) {
            okaiLogger.error(`No ${checkCurrency} account found`);
            return false;
        }

        const available = parseFloat(account.available_balance.value);
        // Add buffer for fees only on USD purchases
        const requiredAmount = side === "BUY" ? amount * 1.01 : amount;
        okaiLogger.info(
            `Required amount (including buffer): ${requiredAmount} ${checkCurrency}`
        );

        const hasBalance = available >= requiredAmount;
        okaiLogger.info(`Has sufficient balance: ${hasBalance}`);

        return hasBalance;
    } catch (error) {
        okaiLogger.error("Balance check failed with error:", {
            error: error instanceof Error ? error.message : "Unknown error",
            currency,
            amount,
            side,
        });
        return false;
    }
}

export const executeAdvancedTradeAction: Action = {
    name: "EXECUTE_ADVANCED_TRADE",
    description: "Execute a trade using Coinbase Advanced Trading API",
    validate: async (runtime: IAgentRuntime) => {
        return (
            !!(
                runtime.getSetting("COINBASE_API_KEY") ||
                process.env.COINBASE_API_KEY
            ) &&
            !!(
                runtime.getSetting("COINBASE_PRIVATE_KEY") ||
                process.env.COINBASE_PRIVATE_KEY
            )
        );
    },
    similes: [
        "EXECUTE_ADVANCED_TRADE",
        "ADVANCED_MARKET_ORDER",
        "ADVANCED_LIMIT_ORDER",
        "COINBASE_PRO_TRADE",
        "PROFESSIONAL_TRADE",
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
                runtime.getSetting("COINBASE_API_KEY") ??
                    process.env.COINBASE_API_KEY,
                runtime.getSetting("COINBASE_PRIVATE_KEY") ??
                    process.env.COINBASE_PRIVATE_KEY
            );
            okaiLogger.info("Advanced trade client initialized");
        } catch (error) {
            okaiLogger.error("Client initialization failed:", error);
            callback(
                {
                    text: "Failed to initialize trading client. Please check your API credentials.",
                },
                []
            );
            return;
        }

        // Generate trade details
        let tradeDetails;
        try {
            tradeDetails = await generateObject({
                runtime,
                context: composeContext({
                    state,
                    template: advancedTradeTemplate,
                }),
                modelClass: ModelClass.LARGE,
                schema: AdvancedTradeSchema,
            });
            okaiLogger.info("Trade details generated:", tradeDetails.object);
        } catch (error) {
            okaiLogger.error("Trade details generation failed:", error);
            callback(
                {
                    text: "Failed to generate trade details. Please provide valid trading parameters.",
                },
                []
            );
            return;
        }

        // Validate trade content
        if (!isAdvancedTradeContent(tradeDetails.object)) {
            okaiLogger.error("Invalid trade content:", tradeDetails.object);
            callback(
                {
                    text: "Invalid trade details. Please check your input parameters.",
                },
                []
            );
            return;
        }

        const { productId, amount, side, orderType, limitPrice } =
            tradeDetails.object;

        // Configure order
        let orderConfiguration: OrderConfiguration;
        try {
            if (orderType === "MARKET") {
                orderConfiguration =
                    side === "BUY"
                        ? {
                              market_market_ioc: {
                                  quote_size: amount.toString(),
                              },
                          }
                        : {
                              market_market_ioc: {
                                  base_size: amount.toString(),
                              },
                          };
            } else {
                if (!limitPrice) {
                    throw new Error("Limit price is required for limit orders");
                }
                orderConfiguration = {
                    limit_limit_gtc: {
                        baseSize: amount.toString(),
                        limitPrice: limitPrice.toString(),
                        postOnly: false,
                    },
                };
            }
            okaiLogger.info(
                "Order configuration created:",
                orderConfiguration
            );
        } catch (error) {
            okaiLogger.error("Order configuration failed:", error);
            callback(
                {
                    text:
                        error instanceof Error
                            ? error.message
                            : "Failed to configure order parameters.",
                },
                []
            );
            return;
        }

        // Execute trade
        let order: CreateOrderResponse;
        try {
            if (
                !(await hasEnoughBalance(
                    client,
                    productId.split("-")[0],
                    amount,
                    side
                ))
            ) {
                callback(
                    {
                        text: `Insufficient ${side === "BUY" ? "USD" : productId.split("-")[0]} balance to execute this trade`,
                    },
                    []
                );
                return;
            }

            order = await client.createOrder({
                clientOrderId: crypto.randomUUID(),
                productId,
                side: side === "BUY" ? OrderSide.BUY : OrderSide.SELL,
                orderConfiguration,
            });

            okaiLogger.info("Trade executed successfully:", order);
        } catch (error) {
            okaiLogger.error("Trade execution failed:", error?.message);
            callback(
                {
                    text: `Failed to execute trade: ${error instanceof Error ? error.message : "Unknown error occurred"}`,
                },
                []
            );
            return;
        }
        // Log trade to CSV
        try {
            // await appendTradeToCsv(order);
            okaiLogger.info("Trade logged to CSV");
        } catch (csvError) {
            okaiLogger.warn("Failed to log trade to CSV:", csvError);
            // Continue execution as this is non-critical
        }

        callback(
            {
                text: `Advanced Trade executed successfully:
- Product: ${productId}
- Type: ${orderType} Order
- Side: ${side}
- Amount: ${amount}
- ${orderType === "LIMIT" ? `- Limit Price: ${limitPrice}\n` : ""}- Order ID: ${order.order_id}
- Status: ${order.success}
- Order Id:  ${order.order_id}
- Response: ${JSON.stringify(order.response)}
- Order Configuration: ${JSON.stringify(order.order_configuration)}`,
            },
            []
        );
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Place an advanced market order to buy $1 worth of BTC",
                },
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
- Success: true
- Response: {"success_response":{}}
- Order Configuration: {"market_market_ioc":{"quote_size":"1000"}}`,
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Set a limit order to sell 0.5 ETH at $2000" },
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
- Success: true
- Response: {"success_response":{}}
- Order Configuration: {"limit_limit_gtc":{"baseSize":"0.5","limitPrice":"2000","postOnly":false}}`,
                },
            },
        ],
    ],
};

export const advancedTradePlugin: Plugin = {
    name: "advancedTradePlugin",
    description: "Enables advanced trading using Coinbase Advanced Trading API",
    actions: [executeAdvancedTradeAction],
    providers: [tradeProvider],
};
