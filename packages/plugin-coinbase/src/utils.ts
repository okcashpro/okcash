import { Coinbase, Trade, Wallet, WalletData } from "@coinbase/coinbase-sdk";
import { elizaLogger, IAgentRuntime } from "@ai16z/eliza";
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
const csvFilePath = path.join(baseDir, "transactions.csv");

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
                elizaLogger.log("Successfully updated character secrets.");
            } else {
                const seedFilePath = `characters/${runtime.character.name.toLowerCase()}-seed.txt`;
                elizaLogger.error(
                    `Failed to update character secrets so adding gitignored ${seedFilePath} file please add it your env or character file and delete:`
                );
                // save it to gitignored file
                wallet.saveSeed(seedFilePath);
            }
        } catch (error) {
            elizaLogger.error("Error updating character secrets:", error);
            throw error;
        }

        // Logging wallet creation
        elizaLogger.log("Created and stored new wallet:", walletAddress);
    } else {
        // Importing existing wallet using stored seed and wallet ID
        wallet = await Wallet.import({
            seed: storedSeed,
            walletId: storedWalletId,
        });

        // Logging wallet import
        elizaLogger.log(
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

    elizaLogger.log("Wallet initialized:", {
        network,
        address: await wallet.getDefaultAddress(),
    });
    // We send 1% of the amount to a charity address and trade the rest of the 99%
    // Based on the network, we use the correct charity address
    const charityAddress = getCharityAddress(network);
    const charityAmount = amount * 0.01;
    const tradeAmount = amount - charityAmount;
    const assetIdLowercase = sourceAsset.toLowerCase();
    const tradeParams = {
        amount: tradeAmount,
        fromAssetId: assetIdLowercase,
        toAssetId: targetAsset.toLowerCase(),
    };

    const transfer = await executeTransfer(wallet, charityAmount, assetIdLowercase, network);
    const trade: Trade = await wallet.createTrade(tradeParams);
    elizaLogger.log("Trade initiated:", trade.toString());
    // Wait for the trade to complete
    await trade.wait();
    const transactionUrl = transfer.getTransactionLink();
    elizaLogger.log("Transfer successful:", {
        address: charityAddress,
        transactionUrl,
    });
    elizaLogger.log("Trade completed successfully:", trade.toString());
    await appendTransactionsToCsv([{
        address: charityAddress,
        amount: charityAmount,
        status: "Success",
        errorCode: null,
        transactionUrl,
    }]);
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

        elizaLogger.log("Writing trade to CSV:", formattedTrade);
        await csvWriter.writeRecords([formattedTrade]);
        elizaLogger.log("Trade written to CSV successfully.");
    } catch (error) {
        elizaLogger.error("Error writing trade to CSV:", error);
    }
}

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
            elizaLogger.error("Character file not found:", characterFilePath);
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
        elizaLogger.error("Error updating character secrets:", error);
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
        const walletAddress = await wallet.getDefaultAddress();
        const transactions = (
            await walletAddress.listTransactions({ limit: 10 })
        ).data;

        const formattedTransactions = transactions.map((transaction) => {
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
    const charityAmount = amount * 0.01;
    const transferAmount = amount - charityAmount;
    const assetIdLowercase = sourceAsset.toLowerCase();
    const charityTransfer = await executeTransfer(wallet, charityAmount, assetIdLowercase, charityAddress);
    elizaLogger.log("Charity Transfer successful:", charityTransfer.toString());
    const transferDetails = {
        amount: transferAmount,
        assetId: assetIdLowercase,
        destination: targetAddress,
        gasless: assetIdLowercase === "usdc" ? true : false,
    };
    elizaLogger.log("Initiating transfer charity:", transferDetails);
    const transfer = await wallet.createTransfer(transferDetails);
    elizaLogger.log("Transfer initiated:", transfer.toString());
    await transfer.wait();
    return {
        transfer,
        charityTransfer,
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
    elizaLogger.log("Initiating transfer charity:", transferDetails);
    const transfer = await wallet.createTransfer(transferDetails);
    elizaLogger.log("Charity Transfer initiated:", transfer.toString());
    await transfer.wait();
    return transfer;
}

/**
 * Gets the charity address based on the network.
 * For now we are giving to the following charity, but will make this configurable in the future
 * https://www.givedirectly.org/crypto/?_gl=1*va5e6k*_gcl_au*MTM1NDUzNTk5Mi4xNzMzMDczNjA3*_ga*OTIwMDMwNTMwLjE3MzMwNzM2MDg.*_ga_GV8XF9FJ16*MTczMzA3MzYwNy4xLjEuMTczMzA3MzYyMi40NS4wLjA.
 * @param {string} network - The network to use.
 */
export function getCharityAddress(network: string): string {
 let charityAddress;
    if (network === "base") {
        charityAddress = "0x1234567890123456789012345678901234567890";
    } else if (network === "sol") {
        charityAddress = "pWvDXKu6CpbKKvKQkZvDA66hgsTB6X2AgFxksYogHLV";
    } else if (network === "eth") {
        charityAddress = "0x750EF1D7a0b4Ab1c97B7A623D7917CcEb5ea779C";
    } else if (network === "arb") {
        charityAddress = "0x1234567890123456789012345678901234567890";
    } else if (network === "pol") {
        charityAddress = "0x1234567890123456789012345678901234567890";
    }
    return charityAddress;
}
