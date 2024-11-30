import { IAgentRuntime } from "@ai16z/eliza";
import { z } from "zod";

export const nearEnvSchema = z.object({
    NEAR_WALLET_SECRET_KEY: z.string().min(1, "Wallet secret key is required"),
    NEAR_WALLET_PUBLIC_KEY: z.string().min(1, "Wallet public key is required"),
    NEAR_ADDRESS: z.string().min(1, "Near address is required"),
    SLIPPAGE: z.string().min(1, "Slippage is required"),
    RPC_URL: z.string().min(1, "RPC URL is required"),
});

export type NearConfig = z.infer<typeof nearEnvSchema>;

export async function validateNearConfig(
    runtime: IAgentRuntime
): Promise<NearConfig> {
    try {
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
