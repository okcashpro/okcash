import { IAgentRuntime } from "@ai16z/eliza";
import { z } from "zod";

export const buttplugEnvSchema = z
    .object({
        INTIFACE_URL: z.string().default("ws://localhost:12345"),
        INTIFACE_NAME: z.string().default("Eliza Buttplug Client"),
        DEVICE_NAME: z.string().default("Lovense Nora"),
    })
    .refine(
        (data) => {
            return (
                data.INTIFACE_URL.startsWith("ws://") ||
                data.INTIFACE_URL.startsWith("wss://")
            );
        },
        {
            message:
                "INTIFACE_URL must be a valid WebSocket URL (ws:// or wss://)",
        }
    );

export type ButtplugConfig = z.infer<typeof buttplugEnvSchema>;

export async function validateButtplugConfig(
    runtime: IAgentRuntime
): Promise<ButtplugConfig> {
    try {
        const config = {
            INTIFACE_URL:
                runtime.getSetting("INTIFACE_URL") || process.env.INTIFACE_URL,
            INTIFACE_NAME:
                runtime.getSetting("INTIFACE_NAME") ||
                process.env.INTIFACE_NAME,
            DEVICE_NAME:
                runtime.getSetting("DEVICE_NAME") || process.env.DEVICE_NAME,
        };

        return buttplugEnvSchema.parse(config);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors
                .map((err) => `${err.path.join(".")}: ${err.message}`)
                .join("\n");
            throw new Error(
                `Buttplug configuration validation failed:\n${errorMessages}`
            );
        }
        throw error;
    }
}
