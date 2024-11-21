import { z } from "zod";

export const twitterEnvSchema = z.object({
    TWITTER_DRY_RUN: z
        .string()
        .transform((val) => val.toLowerCase() === "true"),
    TWITTER_USERNAME: z.string().min(1),
    TWITTER_PASSWORD: z.string().min(1),
    TWITTER_EMAIL: z.string().email(),
    TWITTER_COOKIES: z.string().optional(),
});

export type TwitterConfig = z.infer<typeof twitterEnvSchema>;

// Validate and export the config
export const twitterConfig = twitterEnvSchema.parse({
    TWITTER_DRY_RUN: process.env.TWITTER_DRY_RUN,
    TWITTER_USERNAME: process.env.TWITTER_USERNAME,
    TWITTER_PASSWORD: process.env.TWITTER_PASSWORD,
    TWITTER_EMAIL: process.env.TWITTER_EMAIL,
    TWITTER_COOKIES: process.env.TWITTER_COOKIES,
});

export function validateTwitterConfig(): TwitterConfig {
    try {
        return twitterEnvSchema.parse(process.env);
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
