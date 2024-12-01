import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

import { Memory, Provider, State, type IAgentRuntime } from "@ai16z/eliza";
import { viem } from "@goat-sdk/wallet-viem";


// Add the chain you want to use, remember to update also
// the EVM_PROVIDER_URL to the correct one for the chain
export const chain = base;

/**
 * Create a wallet client for the given runtime.
 *
 * You can change it to use a different wallet client such as Crossmint smart wallets or others.
 *
 * See all available wallet clients at https://ohmygoat.dev/wallets
 *
 * @param runtime
 * @returns Wallet client
 */
export async function getWalletClient(runtime: IAgentRuntime) {
    const privateKey = runtime.getSetting("EVM_PRIVATE_KEY");
    if (!privateKey) throw new Error("EVM_PRIVATE_KEY not configured");

    const provider = runtime.getSetting("EVM_PROVIDER_URL");
    if (!provider) throw new Error("EVM_PROVIDER_URL not configured");

    const walletClient = createWalletClient({
        account: privateKeyToAccount(privateKey as `0x${string}`),
        chain: chain,
        transport: http(provider),
    });
    return viem(walletClient);
}

export const walletProvider: Provider = {
    async get(
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ): Promise<string | null> {
        try {
            const walletClient = await getWalletClient(runtime);
            const address = walletClient.getAddress();
            const balance = await walletClient.balanceOf(address);
            return `EVM Wallet Address: ${address}\nBalance: ${balance} ETH`;
        } catch (error) {
            console.error("Error in EVM wallet provider:", error);
            return null;
        }
    },
};
