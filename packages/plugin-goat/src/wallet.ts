import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

import { type IAgentRuntime } from "@ai16z/eliza";
import { viem } from "@goat-sdk/wallet-viem";

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
        chain: base,
        transport: http(provider),
    });
    return viem(walletClient);
}
