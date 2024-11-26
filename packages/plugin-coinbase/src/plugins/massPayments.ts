import { Coinbase } from "@coinbase/coinbase-sdk";
import {
    composeContext,
    elizaLogger,
    generateObjectV2,
    ModelClass,
    Action,
    IAgentRuntime,
    Memory,
    Provider,
    State,
    HandlerCallback,
    Plugin,
} from "@ai16z/eliza";
import {
    TransferSchema,
    isTransferContent,
    TransferContent,
    Transaction,
} from "../types";
import { transferTemplate } from "../templates";
import { readFile } from "fs/promises";
import { parse } from "csv-parse/sync";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { createArrayCsvWriter } from "csv-writer";
import { initializeWallet } from "../utils";

// Dynamically resolve the file path to the src/plugins directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = path.resolve(__dirname, "../../plugin-coinbase/src/plugins");
const csvFilePath = path.join(baseDir, "transactions.csv");

export const massPayoutProvider: Provider = {
    get: async (_runtime: IAgentRuntime, _message: Memory) => {
        try {
            elizaLogger.log("Reading CSV file from:", csvFilePath);

            // Check if the file exists; if not, create it with headers
            if (!fs.existsSync(csvFilePath)) {
                elizaLogger.warn("CSV file not found. Creating a new one.");
                const csvWriter = createArrayCsvWriter({
                    path: csvFilePath,
                    header: [
                        "Address",
                        "Amount",
                        "Status",
                        "Error Code",
                        "Transaction URL",
                    ],
                });
                await csvWriter.writeRecords([]); // Create an empty file with headers
                elizaLogger.log("New CSV file created with headers.");
            }

            // Read and parse the CSV file
            const csvData = await readFile(csvFilePath, "utf-8");
            const records = parse(csvData, {
                columns: true,
                skip_empty_lines: true,
            });

            elizaLogger.log("Parsed CSV records:", records);
            return records.map((record: any) => ({
                address: record["Address"] || undefined,
                amount: parseFloat(record["Amount"]) || undefined,
                status: record["Status"] || undefined,
                errorCode: record["Error Code"] || "",
                transactionUrl: record["Transaction URL"] || "",
            }));
        } catch (error) {
            elizaLogger.error("Error in massPayoutProvider:", error);
            return [];
        }
    },
};

export async function appendTransactionsToCsv(transactions: Transaction[]) {
    try {
        const csvWriter = createArrayCsvWriter({
            path: csvFilePath,
            header: [
                "Address",
                "Amount",
                "Status",
                "Error Code",
                "Transaction URL",
            ],
            append: true,
        });

        const formattedTransactions = transactions.map((transaction) => [
            transaction.address,
            transaction.amount.toString(),
            transaction.status,
            transaction.errorCode || "",
            transaction.transactionUrl || "",
        ]);

        elizaLogger.log("Writing transactions to CSV:", formattedTransactions);
        await csvWriter.writeRecords(formattedTransactions);
        elizaLogger.log("All transactions written to CSV successfully.");
    } catch (error) {
        elizaLogger.error("Error writing transactions to CSV:", error);
    }
}

async function executeMassPayout(
    runtime: IAgentRuntime,
    networkId: string,
    receivingAddresses: string[],
    transferAmount: number,
    assetId: string
): Promise<Transaction[]> {
    const transactions: Transaction[] = [];
    try {
        const sendingWallet = await initializeWallet(runtime, networkId);
        for (const address of receivingAddresses) {
            elizaLogger.log("Processing payout for address:", address);
            if (address) {
                try {
                    // Check balance before initiating transfer
                    const assetIdLowercase = assetId.toLowerCase();
                    const walletBalance =
                        await sendingWallet.getBalance(assetIdLowercase);

                    elizaLogger.log("Wallet balance for asset:", {
                        assetId,
                        walletBalance,
                    });

                    if (walletBalance.lessThan(transferAmount)) {
                        const insufficientFunds = `Insufficient funds for address ${address}. Required: ${transferAmount}, Available: ${walletBalance}`;
                        elizaLogger.error(insufficientFunds);

                        transactions.push({
                            address,
                            amount: transferAmount,
                            status: "Failed",
                            errorCode: insufficientFunds,
                            transactionUrl: null,
                        });
                        continue;
                    }
                    const transferDetails = {
                        amount: transferAmount,
                        assetId: assetIdLowercase,
                        destination: address,
                        gasless: assetIdLowercase === "usdc" ? true : false,
                    };
                    elizaLogger.log("Initiating transfer:", transferDetails);

                    const transfer =
                        await sendingWallet.createTransfer(transferDetails);
                    await transfer.wait();

                    const transactionUrl = transfer.getTransactionLink();
                    elizaLogger.log("Transfer successful:", {
                        address,
                        transactionUrl,
                    });

                    transactions.push({
                        address,
                        amount: transferAmount,
                        status: "Success",
                        errorCode: null,
                        transactionUrl,
                    });
                } catch (error) {
                    elizaLogger.error(
                        "Error during transfer for address:",
                        address,
                        error
                    );
                    transactions.push({
                        address,
                        amount: transferAmount,
                        status: "Failed",
                        errorCode: error?.code || "Unknown Error",
                        transactionUrl: null,
                    });
                }
            } else {
                elizaLogger.log("Skipping invalid or empty address.");
                transactions.push({
                    address: "Invalid or Empty",
                    amount: transferAmount,
                    status: "Failed",
                    errorCode: "Invalid Address",
                    transactionUrl: null,
                });
            }
        }

        await appendTransactionsToCsv(transactions);
        elizaLogger.log("Finished processing mass payouts.");
        return transactions;
    } catch (error) {
        elizaLogger.error(
            "Error initializing sending wallet or processing payouts:",
            error
        );
        throw error; // Re-throw the error to be caught in the handler
    }
}

// Action for sending mass payouts
export const sendMassPayoutAction: Action = {
    name: "SEND_MASS_PAYOUT",
    similes: ["BULK_TRANSFER", "DISTRIBUTE_FUNDS", "SEND_PAYMENTS"],
    description:
        "Sends mass payouts to a list of receiving addresses using a predefined sending wallet and logs all transactions to a CSV file.",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        elizaLogger.log("Validating runtime and message...");
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
        elizaLogger.log("Starting SEND_MASS_PAYOUT handler...");
        try {
            Coinbase.configure({
                apiKeyName:
                    runtime.getSetting("COINBASE_API_KEY") ??
                    process.env.COINBASE_API_KEY,
                privateKey:
                    runtime.getSetting("COINBASE_PRIVATE_KEY") ??
                    process.env.COINBASE_PRIVATE_KEY,
            });
            if (!state) {
                state = (await runtime.composeState(message, {
                    providers: [massPayoutProvider],
                })) as State;
            } else {
                state = await runtime.updateRecentMessageState(state);
            }

            const context = composeContext({
                state,
                template: transferTemplate,
            });

            const transferDetails = await generateObjectV2({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
                schema: TransferSchema,
            });

            elizaLogger.log(
                "Transfer details generated:",
                transferDetails.object
            );

            if (!isTransferContent(transferDetails.object)) {
                callback(
                    {
                        text: "Invalid transfer details. Please check the inputs.",
                    },
                    []
                );
                return;
            }

            const { receivingAddresses, transferAmount, assetId, network } =
                transferDetails.object as TransferContent;

            const allowedNetworks = Object.values(Coinbase.networks);

            if (
                !network ||
                !allowedNetworks.includes(network.toLowerCase() as any) ||
                !receivingAddresses?.length ||
                transferAmount <= 0 ||
                !assetId
            ) {
                elizaLogger.error("Missing or invalid input parameters:", {
                    network,
                    receivingAddresses,
                    transferAmount,
                    assetId,
                });
                callback(
                    {
                        text: `Invalid input parameters. Please ensure:
- Network is one of: ${allowedNetworks.join(", ")}.
- Receiving addresses are provided.
- Transfer amount is greater than zero.
- Asset ID is valid.`,
                    },
                    []
                );
                return;
            }

            elizaLogger.log("◎ Starting mass payout...");
            const transactions = await executeMassPayout(
                runtime,
                network,
                receivingAddresses,
                transferAmount,
                assetId
            );

            const successTransactions = transactions.filter(
                (tx) => tx.status === "Success"
            );
            const failedTransactions = transactions.filter(
                (tx) => tx.status === "Failed"
            );
            const successDetails = successTransactions
                .map(
                    (tx) =>
                        `Address: ${tx.address}, Amount: ${tx.amount}, Transaction URL: ${
                            tx.transactionUrl || "N/A"
                        }`
                )
                .join("\n");
            const failedDetails = failedTransactions
                .map(
                    (tx) =>
                        `Address: ${tx.address}, Amount: ${tx.amount}, Error Code: ${
                            tx.errorCode || "Unknown Error"
                        }`
                )
                .join("\n");
            callback(
                {
                    text: `Mass payouts completed successfully.
- Successful Transactions: ${successTransactions.length}
- Failed Transactions: ${failedTransactions.length}

Details:
${successTransactions.length > 0 ? `✅ Successful Transactions:\n${successDetails}` : "No successful transactions."}
${failedTransactions.length > 0 ? `❌ Failed Transactions:\n${failedDetails}` : "No failed transactions."}

Check the CSV file for full details.`,
                },
                []
            );
        } catch (error) {
            elizaLogger.error("Error during mass payouts:", error);
            callback(
                { text: "Failed to complete payouts. Please try again." },
                []
            );
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Distribute 0.0001 ETH on base network to 0xA0ba2ACB5846A54834173fB0DD9444F756810f06 and 0xF14F2c49aa90BaFA223EE074C1C33b59891826bF",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: `Mass payouts completed successfully.
- Successful Transactions: {{2}}
- Failed Transactions: {{1}}

Details:
✅ Successful Transactions:
Address: 0xABC123..., Amount: 0.005, Transaction URL: https://etherscan.io/tx/...
Address: 0xDEF456..., Amount: 0.005, Transaction URL: https://etherscan.io/tx/...

❌ Failed Transactions:
Address: 0xGHI789..., Amount: 0.005, Error Code: Insufficient Funds

Check the CSV file for full details.`,
                    action: "SEND_MASS_PAYOUT",
                },
            },
        ],
    ],
};

export const coinbaseMassPaymentsPlugin: Plugin = {
    name: "automatedPayments",
    description:
        "Processes mass payouts using Coinbase SDK and logs all transactions (success and failure) to a CSV file. Provides dynamic transaction data through a provider.",
    actions: [sendMassPayoutAction],
    providers: [massPayoutProvider],
};
