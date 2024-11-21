import { IAgentRuntime } from "@ai16z/eliza";
import { z } from "zod";

export const twitterEnvSchema = z.object({
    TWITTER_DRY_RUN: z
        .string()
        .transform((val) => val.toLowerCase() === "true"),
    TWITTER_USERNAME: z.string().min(1, "Twitter username is required"),
    TWITTER_PASSWORD: z.string().min(1, "Twitter password is required"),
    TWITTER_EMAIL: z.string().email("Valid Twitter email is required"),
    TWITTER_COOKIES: z.string().optional(),
});

export type TwitterConfig = z.infer<typeof twitterEnvSchema>;

export async function validateTwitterConfig(
    runtime: IAgentRuntime
): Promise<TwitterConfig> {
    try {
        const config = {
            TWITTER_DRY_RUN:
                runtime.getSetting("TWITTER_DRY_RUN") ||
                process.env.TWITTER_DRY_RUN,
            TWITTER_USERNAME:
                runtime.getSetting("TWITTER_USERNAME") ||
                process.env.TWITTER_USERNAME,
            TWITTER_PASSWORD:
                runtime.getSetting("TWITTER_PASSWORD") ||
                process.env.TWITTER_PASSWORD,
            TWITTER_EMAIL:
                runtime.getSetting("TWITTER_EMAIL") ||
                process.env.TWITTER_EMAIL,
            TWITTER_COOKIES:
                runtime.getSetting("TWITTER_COOKIES") ||
                process.env.TWITTER_COOKIES,
        };

        return twitterEnvSchema.parse(config);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors
                .map((err) => `${err.path.join(".")}: ${err.message}`)
                .join("\n");
            throw new Error(
                `Twitter configuration validation failed:\n${errorMessages}`
            );
        }
        throw error;
    }
}
