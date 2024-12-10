import { Coinbase, Trade, Transfer, Wallet, WalletData, Webhook } from "@coinbase/coinbase-sdk";
import { okaiLogger, IAgentRuntime } from "@okcashpro/okai";
import fs from "fs";
import path from "path";
import { EthereumTransaction } from "@coinbase/coinbase-sdk/dist/client";
import { fileURLToPath } from "url";
import { createArrayCsvWriter } from "csv-writer";
import { Transaction } from "./types";

// Dynamically resolve the file path to the src/plugins directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = path.resolve(__dirname, "../../plugin-coinbase/src/plugins");
const tradeCsvFilePath = path.join(baseDir, "trades.csv");
const transactionCsvFilePath = path.join(baseDir, "transactions.csv");
const webhookCsvFilePath = path.join(baseDir, "webhooks.csv");

export async function initializeWallet(
    runtime: IAgentRuntime,
    networkId: string = Coinbase.networks.EthereumMainnet
) {
    let wallet: Wallet;
    const storedSeed =
        runtime.getSetting("COINBASE_GENERATED_WALLET_HEX_SEED") ??
        process.env.COINBASE_GENERATED_WALLET_HEX_SEED;

    const storedWalletId =
        runtime.getSetting("COINBASE_GENERATED_WALLET_ID") ??
        process.env.COINBASE_GENERATED_WALLET_ID;
    if (!storedSeed || !storedWalletId) {
        // No stored seed or wallet ID, creating a new wallet
        wallet = await Wallet.create({ networkId });

        // Export wallet data directly
        const walletData: WalletData = wallet.export();
        const walletAddress = await wallet.getDefaultAddress();
        try {
            const characterFilePath = `characters/${runtime.character.name.toLowerCase()}.character.json`;
            const walletIDSave = await updateCharacterSecrets(
                characterFilePath,
                "COINBASE_GENERATED_WALLET_ID",
                walletData.walletId
            );
            const seedSave = await updateCharacterSecrets(
                characterFilePath,
                "COINBASE_GENERATED_WALLET_HEX_SEED",
                walletData.seed
            );
            if (walletIDSave && seedSave) {
                okaiLogger.log("Successfully updated character secrets.");
            } else {
                const seedFilePath = `characters/${runtime.character.name.toLowerCase()}-seed.txt`;
                okaiLogger.error(
                    `Failed to update character secrets so adding gitignored ${seedFilePath} file please add it your env or character file and delete:`
                );
                // save it to gitignored file
                wallet.saveSeed(seedFilePath);
            }
            okaiLogger.log("Wallet created and stored new wallet:", walletAddress);
        } catch (error) {
            okaiLogger.error("Error updating character secrets:", error);
            throw error;
        }

        // Logging wallet creation
        okaiLogger.log("Created and stored new wallet:", walletAddress);
    } else {
        // Importing existing wallet using stored seed and wallet ID
        // Always defaults to base-mainnet we can't select the network here
        wallet = await Wallet.import({
            seed: storedSeed,
            walletId: storedWalletId,
        });
        const networkId = wallet.getNetworkId();
        okaiLogger.log("Imported existing wallet for network:", networkId);

        // Logging wallet import
        okaiLogger.log(
            "Imported existing wallet:",
            await wallet.getDefaultAddress()
        );
    }

    return wallet;
}

/**
 * Executes a trade and a charity transfer.
 * @param {IAgentRuntime} runtime - The runtime for wallet initialization.
 * @param {string} network - The network to use.
 * @param {number} amount - The amount to trade and transfer.
 * @param {string} sourceAsset - The source asset to trade.
 * @param {string} targetAsset - The target asset to trade.
 */
export async function executeTradeAndCharityTransfer(runtime: IAgentRuntime, network: string, amount: number, sourceAsset: string, targetAsset: string) {
    const wallet = await initializeWallet(runtime, network);

    okaiLogger.log("Wallet initialized:", {
        network,
        address: await wallet.getDefaultAddress(),
    });

    const charityAddress = getCharityAddress(network);
    const charityAmount = charityAddress ? amount * 0.01 : 0;
    const tradeAmount = charityAddress ? amount - charityAmount : amount;
    const assetIdLowercase = sourceAsset.toLowerCase();
    const tradeParams = {
        amount: tradeAmount,
        fromAssetId: assetIdLowercase,
        toAssetId: targetAsset.toLowerCase(),
    };

    let transfer: Transfer;
    if (charityAddress && charityAmount > 0) {
        transfer = await executeTransfer(wallet, charityAmount, assetIdLowercase, charityAddress);
        okaiLogger.log("Charity Transfer successful:", {
            address: charityAddress,
            transactionUrl: transfer.getTransactionLink(),
        });
        await appendTransactionsToCsv([{
            address: charityAddress,
            amount: charityAmount,
            status: "Success",
            errorCode: null,
            transactionUrl: transfer.getTransactionLink(),
        }]);
    }

    const trade: Trade = await wallet.createTrade(tradeParams);
    okaiLogger.log("Trade initiated:", trade.toString());
    await trade.wait();
    okaiLogger.log("Trade completed successfully:", trade.toString());
    await appendTradeToCsv(trade);
    return {
        trade,
        transfer,
    };
}

export async function appendTradeToCsv(trade: Trade) {
    try {
        const csvWriter = createArrayCsvWriter({
            path: tradeCsvFilePath,
            header: [
                "Network",
                "From Amount",
                "Source Asset",
                "To Amount",
                "Target Asset",
                "Status",
                "Transaction URL",
            ],
            append: true,
        });

        const formattedTrade = [
            trade.getNetworkId(),
            trade.getFromAmount(),
            trade.getFromAssetId(),
            trade.getToAmount(),
            trade.getToAssetId(),
            trade.getStatus(),
            trade.getTransaction().getTransactionLink() || "",
        ];

        okaiLogger.log("Writing trade to CSV:", formattedTrade);
        await csvWriter.writeRecords([formattedTrade]);
        okaiLogger.log("Trade written to CSV successfully.");
    } catch (error) {
        okaiLogger.error("Error writing trade to CSV:", error);
    }
}

export async function appendTransactionsToCsv(transactions: Transaction[]) {
    try {
        const csvWriter = createArrayCsvWriter({
            path: transactionCsvFilePath,
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

        okaiLogger.log("Writing transactions to CSV:", formattedTransactions);
        await csvWriter.writeRecords(formattedTransactions);
        okaiLogger.log("All transactions written to CSV successfully.");
    } catch (error) {
        okaiLogger.error("Error writing transactions to CSV:", error);
    }
}
// create a function to append webhooks to a csv
export async function appendWebhooksToCsv(webhooks: Webhook[]) {
    try {
        // Ensure the CSV file exists
        if (!fs.existsSync(webhookCsvFilePath)) {
            okaiLogger.warn("CSV file not found. Creating a new one.");
            const csvWriter = createArrayCsvWriter({
                path: webhookCsvFilePath,
                header: [
                    "Webhook ID",
                    "Network ID",
                    "Event Type",
                    "Event Filters",
                    "Event Type Filter",
                    "Notification URI",
                ],
            });
            await csvWriter.writeRecords([]); // Create an empty file with headers
            okaiLogger.log("New CSV file created with headers.");
                    }
        const csvWriter = createArrayCsvWriter({
            path: webhookCsvFilePath,
            header: [
                "Webhook ID",
                "Network ID",
                "Event Type",
                "Event Filters",
                "Event Type Filter",
                "Notification URI",
            ],
            append: true,
        });

        const formattedWebhooks = webhooks.map((webhook) => [
            webhook.getId(),
            webhook.getNetworkId(),
            webhook.getEventType(),
            JSON.stringify(webhook.getEventFilters()),
            JSON.stringify(webhook.getEventTypeFilter()),
            webhook.getNotificationURI(),
        ]);

        okaiLogger.log("Writing webhooks to CSV:", formattedWebhooks);
        await csvWriter.writeRecords(formattedWebhooks);
        okaiLogger.log("All webhooks written to CSV successfully.");
    } catch (error) {
        okaiLogger.error("Error writing webhooks to CSV:", error);
    }
}

/**
 * Updates a key-value pair in character.settings.secrets.
 * @param {string} characterfilePath - The file path to the character.
 * @param {string} key - The secret key to update or add.
 * @param {string} value - The new value for the secret key.
 */
export async function updateCharacterSecrets(
    characterfilePath: string,
    key: string,
    value: string
): Promise<boolean> {
    try {
        const characterFilePath = path.resolve(
            process.cwd(),
            characterfilePath
        );

        // Check if the character file exists
        if (!fs.existsSync(characterFilePath)) {
            okaiLogger.error("Character file not found:", characterFilePath);
            return false;
        }

        // Read the existing character file
        const characterData = JSON.parse(
            fs.readFileSync(characterFilePath, "utf-8")
        );

        // Ensure settings and secrets exist in the character file
        if (!characterData.settings) {
            characterData.settings = {};
        }
        if (!characterData.settings.secrets) {
            characterData.settings.secrets = {};
        }

        // Update or add the key-value pair
        characterData.settings.secrets[key] = value;

        // Write the updated data back to the file
        fs.writeFileSync(
            characterFilePath,
            JSON.stringify(characterData, null, 2),
            "utf-8"
        );

        console.log(
            `Updated ${key} in character.settings.secrets for ${characterFilePath}.`
        );
    } catch (error) {
        okaiLogger.error("Error updating character secrets:", error);
        return false;
    }
    return true;
}

export const getAssetType = (transaction: EthereumTransaction) => {
    // Check for ETH
    if (transaction.value && transaction.value !== "0") {
        return "ETH";
    }

    // Check for ERC-20 tokens
    if (transaction.token_transfers && transaction.token_transfers.length > 0) {
        return transaction.token_transfers
            .map((transfer) => {
                return transfer.token_id;
            })
            .join(", ");
    }

    return "N/A";
};

/**
 * Fetches and formats wallet balances and recent transactions.
 *
 * @param {IAgentRuntime} runtime - The runtime for wallet initialization.
 * @param {string} networkId - The network ID (optional, defaults to ETH mainnet).
 * @returns {Promise<{balances: Array<{asset: string, amount: string}>, transactions: Array<any>}>} - An object with formatted balances and transactions.
 */
export async function getWalletDetails(
    runtime: IAgentRuntime,
    networkId: string = Coinbase.networks.EthereumMainnet
): Promise<{
    balances: Array<{ asset: string; amount: string }>;
    transactions: Array<{
        timestamp: string;
        amount: string;
        asset: string; // Ensure getAssetType is implemented
        status: string;
        transactionUrl: string;
    }>;
}> {
    try {
        // Initialize the wallet, defaulting to the specified network or ETH mainnet
        const wallet = await initializeWallet(runtime, networkId);

        // Fetch balances
        const balances = await wallet.listBalances();
        const formattedBalances = Array.from(balances, (balance) => ({
            asset: balance[0],
            amount: balance[1].toString(),
        }));

        // Fetch the wallet's recent transactions

        const transactionsData = [];
        const formattedTransactions = transactionsData.map((transaction) => {
            const content = transaction.content();
            return {
                timestamp: content.block_timestamp || "N/A",
                amount: content.value || "N/A",
                asset: getAssetType(content) || "N/A", // Ensure getAssetType is implemented
                status: transaction.getStatus(),
                transactionUrl: transaction.getTransactionLink() || "N/A",
            };
        });

        // Return formatted data
        return {
            balances: formattedBalances,
            transactions: formattedTransactions,
        };
    } catch (error) {
        console.error("Error fetching wallet details:", error);
        throw new Error("Unable to retrieve wallet details.");
    }
}

/**
 * Executes a transfer.
 * @param {Wallet} wallet - The wallet to use.
 * @param {number} amount - The amount to transfer.
 * @param {string} sourceAsset - The source asset to transfer.
 * @param {string} targetAddress - The target address to transfer to.
 */
export async function executeTransferAndCharityTransfer(wallet: Wallet, amount: number, sourceAsset: string, targetAddress: string, network: string) {
    const charityAddress = getCharityAddress(network);
    const charityAmount = charityAddress ? amount * 0.01 : 0;
    const transferAmount = charityAddress ? amount - charityAmount : amount;
    const assetIdLowercase = sourceAsset.toLowerCase();

    let charityTransfer: Transfer;
    if (charityAddress && charityAmount > 0) {
        charityTransfer = await executeTransfer(wallet, charityAmount, assetIdLowercase, charityAddress);
        okaiLogger.log("Charity Transfer successful:", charityTransfer.toString());
    }

    const transferDetails = {
        amount: transferAmount,
        assetId: assetIdLowercase,
        destination: targetAddress,
        gasless: assetIdLowercase === "usdc" ? true : false,
    };
    okaiLogger.log("Initiating transfer:", transferDetails);
    const transfer = await wallet.createTransfer(transferDetails);
    okaiLogger.log("Transfer initiated:", transfer.toString());
    await transfer.wait();

    let responseText = `Transfer executed successfully:
- Amount: ${transfer.getAmount()}
- Asset: ${assetIdLowercase}
- Destination: ${targetAddress}
- Transaction URL: ${transfer.getTransactionLink() || ""}`;

    if (charityTransfer) {
        responseText += `
- Charity Amount: ${charityTransfer.getAmount()}
- Charity Transaction URL: ${charityTransfer.getTransactionLink() || ""}`;
    } else {
        responseText += "\n(Note: Charity transfer was not completed)";
    }

    okaiLogger.log(responseText);

    return {
        transfer,
        charityTransfer,
        responseText,
    }
}

/**
 * Executes a transfer.
 * @param {Wallet} wallet - The wallet to use.
 * @param {number} amount - The amount to transfer.
 * @param {string} sourceAsset - The source asset to transfer.
 * @param {string} targetAddress - The target address to transfer to.
 */
export async function executeTransfer(wallet: Wallet, amount: number, sourceAsset: string, targetAddress: string) {
    const assetIdLowercase = sourceAsset.toLowerCase();
    const transferDetails = {
        amount,
        assetId: assetIdLowercase,
        destination: targetAddress,
        gasless: assetIdLowercase === "usdc" ? true : false,
    };
    okaiLogger.log("Initiating transfer:", transferDetails);
    let transfer: Transfer | undefined;
    try {
        transfer = await wallet.createTransfer(transferDetails);
        okaiLogger.log("Transfer initiated:", transfer.toString());
        await transfer.wait({
        intervalSeconds: 1,
        timeoutSeconds: 20,
        });
    } catch (error) {
        okaiLogger.error("Error executing transfer:", error);
    }
    return transfer;
}

/**
 * Gets the charity address based on the network.
 * For now we are giving to the following charity, but will make this configurable in the future
 * https://www.givedirectly.org/crypto/?_gl=1*va5e6k*_gcl_au*MTM1NDUzNTk5Mi4xNzMzMDczNjA3*_ga*OTIwMDMwNTMwLjE3MzMwNzM2MDg.*_ga_GV8XF9FJ16*MTczMzA3MzYwNy4xLjEuMTczMzA3MzYyMi40NS4wLjA.
 * @param {string} network - The network to use.
 */
export function getCharityAddress(network: string): string | null {
    let charityAddress = null;
    if (network === "base") {
        charityAddress = "0x750EF1D7a0b4Ab1c97B7A623D7917CcEb5ea779C";
    } else if (network === "sol") {
        charityAddress = "pWvDXKu6CpbKKvKQkZvDA66hgsTB6X2AgFxksYogHLV";
    } else if (network === "eth") {
        charityAddress = "0x750EF1D7a0b4Ab1c97B7A623D7917CcEb5ea779C";
    } else {
        return null;
    }
    return charityAddress;
}
