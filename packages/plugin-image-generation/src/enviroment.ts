import { IAgentRuntime } from "@ai16z/eliza";
import { z } from "zod";

export const imageGenEnvSchema = z
    .object({
        ANTHROPIC_API_KEY: z.string().optional(),
        TOGETHER_API_KEY: z.string().optional(),
        HEURIST_API_KEY: z.string().optional(),
    })
    .refine(
        (data) => {
            return !!(
                data.ANTHROPIC_API_KEY ||
                data.TOGETHER_API_KEY ||
                data.HEURIST_API_KEY
            );
        },
        {
            message:
                "At least one of ANTHROPIC_API_KEY, TOGETHER_API_KEY, or HEURIST_API_KEY is required",
        }
    );

export type ImageGenConfig = z.infer<typeof imageGenEnvSchema>;

export async function validateImageGenConfig(
    runtime: IAgentRuntime
): Promise<ImageGenConfig> {
    try {
        const config = {
            ANTHROPIC_API_KEY:
                runtime.getSetting("ANTHROPIC_API_KEY") ||
                process.env.ANTHROPIC_API_KEY,
            TOGETHER_API_KEY:
                runtime.getSetting("TOGETHER_API_KEY") ||
                process.env.TOGETHER_API_KEY,
            HEURIST_API_KEY:
                runtime.getSetting("HEURIST_API_KEY") ||
                process.env.HEURIST_API_KEY,
        };

        return imageGenEnvSchema.parse(config);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors
                .map((err) => `${err.path.join(".")}: ${err.message}`)
                .join("\n");
            throw new Error(
                `Image generation configuration validation failed:\n${errorMessages}`
            );
        }
        throw error;
    }
}
