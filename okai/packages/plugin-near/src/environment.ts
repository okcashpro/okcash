import { IAgentRuntime } from "@okcashpro/okai";
import { z } from "zod";

// Add ENV variable at the top
let ENV: string = "testnet";

export const nearEnvSchema = z.object({
    NEAR_WALLET_SECRET_KEY: z.string().min(1, "Wallet secret key is required"),
    NEAR_WALLET_PUBLIC_KEY: z.string().min(1, "Wallet public key is required"),
    NEAR_ADDRESS: z.string().min(1, "Near address is required"),
    SLIPPAGE: z.string().min(1, "Slippage is required"),
    RPC_URL: z.string().min(1, "RPC URL is required"),
    networkId: z.string(),
    nodeUrl: z.string(),
    walletUrl: z.string(),
    WRAP_NEAR_CONTRACT_ID: z.string(),
    REF_FI_CONTRACT_ID: z.string(),
    REF_TOKEN_ID: z.string(),
    indexerUrl: z.string(),
    explorerUrl: z.string(),
    REF_DCL_SWAP_CONTRACT_ID: z.string(),
});

export type NearConfig = z.infer<typeof nearEnvSchema>;

export function getConfig(
    env: string | undefined | null = ENV ||
        process.env.NEAR_ENV ||
        process.env.REACT_APP_REF_SDK_ENV
) {
    ENV = env || "testnet";
    switch (env) {
        case 'mainnet':
            return {
                networkId: 'mainnet',
                nodeUrl: 'https://rpc.mainnet.near.org',
                walletUrl: 'https://wallet.near.org',
                WRAP_NEAR_CONTRACT_ID: 'wrap.near',
                REF_FI_CONTRACT_ID: 'v2.ref-finance.near',
                REF_TOKEN_ID: 'token.v2.ref-finance.near',
                indexerUrl: 'https://indexer.ref.finance',
                explorerUrl: 'https://testnet.nearblocks.io',
                REF_DCL_SWAP_CONTRACT_ID: 'dclv2.ref-labs.near',
            };
        case 'testnet':
            return {
                networkId: 'testnet',
                nodeUrl: 'https://rpc.testnet.near.org',
                walletUrl: 'https://wallet.testnet.near.org',
                indexerUrl: 'https://testnet-indexer.ref-finance.com',
                WRAP_NEAR_CONTRACT_ID: 'wrap.testnet',
                REF_FI_CONTRACT_ID: 'ref-finance-101.testnet',
                REF_TOKEN_ID: 'ref.fakes.testnet',
                explorerUrl: 'https://testnet.nearblocks.io',
                REF_DCL_SWAP_CONTRACT_ID: 'dclv2.ref-dev.testnet',
            };
        default:
            return {
                networkId: 'mainnet',
                nodeUrl: 'https://rpc.mainnet.near.org',
                walletUrl: 'https://wallet.near.org',
                REF_FI_CONTRACT_ID: 'v2.ref-finance.near',
                WRAP_NEAR_CONTRACT_ID: 'wrap.near',
                REF_TOKEN_ID: 'token.v2.ref-finance.near',
                indexerUrl: 'https://indexer.ref.finance',
                explorerUrl: 'https://nearblocks.io',
                REF_DCL_SWAP_CONTRACT_ID: 'dclv2.ref-labs.near',
            };
    }
}

export async function validateNearConfig(
    runtime: IAgentRuntime
): Promise<NearConfig> {
    try {
        const envConfig = getConfig(runtime.getSetting("NEAR_ENV") ?? undefined);
        const config = {
            NEAR_WALLET_SECRET_KEY:
                runtime.getSetting("NEAR_WALLET_SECRET_KEY") ||
                process.env.NEAR_WALLET_SECRET_KEY,
            NEAR_WALLET_PUBLIC_KEY:
                runtime.getSetting("NEAR_PUBLIC_KEY") ||
                runtime.getSetting("NEAR_WALLET_PUBLIC_KEY") ||
                process.env.NEAR_WALLET_PUBLIC_KEY,
            NEAR_ADDRESS:
                runtime.getSetting("NEAR_ADDRESS") || process.env.NEAR_ADDRESS,
            SLIPPAGE: runtime.getSetting("SLIPPAGE") || process.env.SLIPPAGE,
            RPC_URL: runtime.getSetting("RPC_URL") || process.env.RPC_URL,
            ...envConfig // Spread the environment-specific config
        };

        return nearEnvSchema.parse(config);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors
                .map((err) => `${err.path.join(".")}: ${err.message}`)
                .join("\n");
            throw new Error(
                `Near configuration validation failed:\n${errorMessages}`
            );
        }
        throw error;
    }
}
