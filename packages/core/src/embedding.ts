import path from "node:path";

import { trimTokens } from "./generation.ts";
import elizaLogger from "./logger.ts";
import { models } from "./models.ts";
import settings from "./settings.ts";
import { IAgentRuntime, ModelClass, ModelProviderName } from "./types.ts";

interface EmbeddingOptions {
    model: string;
    endpoint: string;
    apiKey?: string;
    length?: number;
    isOllama?: boolean;
}

async function getRemoteEmbedding(
    input: string,
    options: EmbeddingOptions
): Promise<number[]> {
    // Ensure endpoint ends with /v1 for OpenAI
    const baseEndpoint = options.endpoint.endsWith("/v1")
        ? options.endpoint
        : `${options.endpoint}${options.isOllama ? "/v1" : ""}`;

    // Construct full URL
    const fullUrl = `${baseEndpoint}/embeddings`;

    const requestOptions = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(options.apiKey
                ? {
                      Authorization: `Bearer ${options.apiKey}`,
                  }
                : {}),
        },
        body: JSON.stringify({
            input: trimTokens(input, 8191, "gpt-4o-mini"),
            model: options.model,
            length: options.length || 384,
        }),
    };

    try {
        const response = await fetch(fullUrl, requestOptions);

        if (!response.ok) {
            elizaLogger.error("API Response:", await response.text()); // Debug log
            throw new Error(
                `Embedding API Error: ${response.status} ${response.statusText}`
            );
        }

        interface EmbeddingResponse {
            data: Array<{ embedding: number[] }>;
        }

        const data: EmbeddingResponse = await response.json();
        return data?.data?.[0].embedding;
    } catch (e) {
        elizaLogger.error("Full error details:", e);
        throw e;
    }
}

/**
 * Send a message to the OpenAI API for embedding.
 * @param input The input to be embedded.
 * @returns The embedding of the input.
 */
/**
 * Generate embeddings for input text using configured model provider
 * @param runtime The agent runtime containing model configuration
 * @param input The text to generate embeddings for
 * @returns Array of embedding numbers
 */
export async function embed(runtime: IAgentRuntime, input: string) {
    // Get model provider configuration
    const modelProvider = models[runtime.character.modelProvider];

    // Determine which embedding model to use:
    // 1. OpenAI if USE_OPENAI_EMBEDDING is true
    // 2. Provider's own embedding model if available
    // 3. Fallback to OpenAI embedding model
    const embeddingModel = settings.USE_OPENAI_EMBEDDING
        ? "text-embedding-3-small"
        : modelProvider.model?.[ModelClass.EMBEDDING] ||
          models[ModelProviderName.OPENAI].model[ModelClass.EMBEDDING];

    if (!embeddingModel) {
        throw new Error("No embedding model configured");
    }

    // Check if running in Node.js environment
    const isNode =
        typeof process !== "undefined" &&
        process.versions != null &&
        process.versions.node != null;

    // Use local embedding if:
    // - Running in Node.js
    // - Not using OpenAI provider
    // - Not forcing OpenAI embeddings
    if (
        isNode &&
        runtime.character.modelProvider !== ModelProviderName.OPENAI &&
        !settings.USE_OPENAI_EMBEDDING
    ) {
        return await getLocalEmbedding(input);
    }

    // Try to get cached embedding first
    const cachedEmbedding = await retrieveCachedEmbedding(runtime, input);
    if (cachedEmbedding) {
        return cachedEmbedding;
    }

    // Generate new embedding remotely
    return await getRemoteEmbedding(input, {
        model: embeddingModel,
        // Use OpenAI endpoint if specified, otherwise use provider endpoint
        endpoint: settings.USE_OPENAI_EMBEDDING
            ? "https://api.openai.com/v1"
            : runtime.character.modelEndpointOverride || modelProvider.endpoint,
        // Use OpenAI API key if specified, otherwise use runtime token
        apiKey: settings.USE_OPENAI_EMBEDDING
            ? settings.OPENAI_API_KEY
            : runtime.token,
        // Special handling for Ollama provider
        isOllama:
            runtime.character.modelProvider === ModelProviderName.OLLAMA &&
            !settings.USE_OPENAI_EMBEDDING,
    });
}

async function getLocalEmbedding(input: string): Promise<number[]> {
    // Check if we're in Node.js environment
    const isNode =
        typeof process !== "undefined" &&
        process.versions != null &&
        process.versions.node != null;

    if (isNode) {
        const fs = await import("fs");
        const { FlagEmbedding } = await import("fastembed");
        const { fileURLToPath } = await import("url");

        function getRootPath() {
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = path.dirname(__filename);

            const rootPath = path.resolve(__dirname, "..");
            if (rootPath.includes("/eliza/")) {
                return rootPath.split("/eliza/")[0] + "/eliza/";
            }

            return path.resolve(__dirname, "..");
        }

        const cacheDir = getRootPath() + "/cache/";

        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }

        const embeddingModel = await FlagEmbedding.init({
            cacheDir: cacheDir,
        });

        const trimmedInput = trimTokens(input, 8191, "gpt-4o-mini");
        const embedding = await embeddingModel.queryEmbed(trimmedInput);
        return embedding;
    } else {
        // Browser implementation - fallback to remote embedding
        elizaLogger.warn(
            "Local embedding not supported in browser, falling back to remote embedding"
        );
        throw new Error("Local embedding not supported in browser");
    }
}

export async function retrieveCachedEmbedding(
    runtime: IAgentRuntime,
    input: string
) {
    if (!input) {
        elizaLogger.log("No input to retrieve cached embedding for");
        return null;
    }

    const similaritySearchResult =
        await runtime.messageManager.getCachedEmbeddings(input);
    if (similaritySearchResult.length > 0) {
        return similaritySearchResult[0].embedding;
    }
    return null;
}
