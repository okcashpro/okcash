import { Wallet, WalletData } from "@coinbase/coinbase-sdk";
import { elizaLogger, IAgentRuntime } from "@ai16z/eliza";
import fs from "fs";
import path from "path";

export async function initializeWallet(
    runtime: IAgentRuntime,
    networkId: string
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
