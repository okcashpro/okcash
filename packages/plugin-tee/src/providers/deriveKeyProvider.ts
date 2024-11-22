import { IAgentRuntime, Memory, Provider, State } from "@ai16z/eliza";
import { Keypair } from "@solana/web3.js";
import crypto from "crypto";
import { TappdClient } from "@phala/dstack-sdk";

const deriveKeyProvider: Provider = {
    get: async (runtime: IAgentRuntime, _message?: Memory, _state?: State) => {
        const endpoint = runtime.getSetting("DSTACK_SIMULATOR_ENDPOINT");
        const client = endpoint ? new TappdClient(endpoint) : new TappdClient();
        try {
            // Validate wallet configuration
            if (!runtime.getSetting("WALLET_SECRET_SALT")) {
                console.error(
                    "Wallet secret salt is not configured in settings"
                );
                return "";
            }

            let keypair: Keypair;
            try {
                const secretSalt =
                    runtime.getSetting("WALLET_SECRET_SALT") || "secret_salt";
                const derivedKey = await client.deriveKey("/", secretSalt);
                console.log("Deriving Key in TEE...");
                const uint8ArrayDerivedKey = derivedKey.asUint8Array();
                const hash = crypto.createHash("sha256");
                hash.update(uint8ArrayDerivedKey);
                const seed = hash.digest();
                const seedArray = new Uint8Array(seed);
                keypair = Keypair.fromSeed(seedArray.slice(0, 32));
                console.log("Key Derived Successfully!");
            } catch (error) {
                console.error("Error creating PublicKey:", error);
                return "";
            }

            return keypair;
        } catch (error) {
            console.error("Error in derive key provider:", error.message);
            return `Failed to fetch derive key information: ${error instanceof Error ? error.message : "Unknown error"}`;
        }
    },
};

export { deriveKeyProvider };
