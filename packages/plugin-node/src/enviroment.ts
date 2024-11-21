import { IAgentRuntime } from "@ai16z/eliza";
import { z } from "zod";

export const nodeEnvSchema = z.object({
    OPENAI_API_KEY: z.string().min(1, "OpenAI API key is required"),
    ELEVENLABS_XI_API_KEY: z.string().optional(),
    ELEVENLABS_MODEL_ID: z.string().min(1, "ElevenLabs model ID is required"),
    ELEVENLABS_VOICE_ID: z.string().min(1, "ElevenLabs voice ID is required"),
    ELEVENLABS_VOICE_STABILITY: z
        .string()
        .min(1, "ElevenLabs voice stability is required"),
    ELEVENLABS_VOICE_SIMILARITY_BOOST: z
        .string()
        .min(1, "ElevenLabs voice similarity boost is required"),
    ELEVENLABS_VOICE_STYLE: z
        .string()
        .min(1, "ElevenLabs voice style is required"),
    ELEVENLABS_VOICE_USE_SPEAKER_BOOST: z
        .string()
        .min(1, "ElevenLabs voice speaker boost setting is required"),
    ELEVENLABS_OPTIMIZE_STREAMING_LATENCY: z
        .string()
        .min(1, "ElevenLabs streaming latency optimization is required"),
    ELEVENLABS_OUTPUT_FORMAT: z
        .string()
        .min(1, "ElevenLabs output format is required"),
});

export type NodeConfig = z.infer<typeof nodeEnvSchema>;

export async function validateNodeConfig(
    runtime: IAgentRuntime
): Promise<NodeConfig> {
    try {
        const config = {
            OPENAI_API_KEY:
                runtime.getSetting("OPENAI_API_KEY") ||
                process.env.OPENAI_API_KEY,
            ELEVENLABS_MODEL_ID:
                runtime.getSetting("ELEVENLABS_MODEL_ID") ||
                process.env.ELEVENLABS_MODEL_ID,
            ELEVENLABS_VOICE_ID:
                runtime.getSetting("ELEVENLABS_VOICE_ID") ||
                process.env.ELEVENLABS_VOICE_ID,
            ELEVENLABS_VOICE_STABILITY:
                runtime.getSetting("ELEVENLABS_VOICE_STABILITY") ||
                process.env.ELEVENLABS_VOICE_STABILITY,
            ELEVENLABS_VOICE_SIMILARITY_BOOST:
                runtime.getSetting("ELEVENLABS_VOICE_SIMILARITY_BOOST") ||
                process.env.ELEVENLABS_VOICE_SIMILARITY_BOOST,
            ELEVENLABS_VOICE_STYLE:
                runtime.getSetting("ELEVENLABS_VOICE_STYLE") ||
                process.env.ELEVENLABS_VOICE_STYLE,
            ELEVENLABS_VOICE_USE_SPEAKER_BOOST:
                runtime.getSetting("ELEVENLABS_VOICE_USE_SPEAKER_BOOST") ||
                process.env.ELEVENLABS_VOICE_USE_SPEAKER_BOOST,
            ELEVENLABS_OPTIMIZE_STREAMING_LATENCY:
                runtime.getSetting("ELEVENLABS_OPTIMIZE_STREAMING_LATENCY") ||
                process.env.ELEVENLABS_OPTIMIZE_STREAMING_LATENCY,
            ELEVENLABS_OUTPUT_FORMAT:
                runtime.getSetting("ELEVENLABS_OUTPUT_FORMAT") ||
                process.env.ELEVENLABS_OUTPUT_FORMAT,
        };

        return nodeEnvSchema.parse(config);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors
                .map((err) => `${err.path.join(".")}: ${err.message}`)
                .join("\n");
            throw new Error(
                `Node configuration validation failed:\n${errorMessages}`
            );
        }
        throw error;
    }
}
