import { EmbeddingModel, FlagEmbedding } from "fastembed";
import path from "path";
import { fileURLToPath } from "url";
import models from "./models.ts";
import { IAgentRuntime, ModelProviderName, ModelClass } from "./types.ts";
import fs from "fs";
import { trimTokens } from "./generation.ts";
import settings from "./settings.ts";

function getRootPath() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const rootPath = path.resolve(__dirname, "..");
    if (rootPath.includes("/eliza/")) {
        return rootPath.split("/eliza/")[0] + "/eliza/";
    }

    return path.resolve(__dirname, "..");
}

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

    //console.log("Calling embedding API at:", fullUrl); // Debug log

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
            input,
            model: options.model,
            length: options.length || 384,
        }),
    };

    try {
        const response = await fetch(fullUrl, requestOptions);

        if (!response.ok) {
            console.error("API Response:", await response.text()); // Debug log
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
        console.error("Full error details:", e);
        throw e;
    }
}

/**
 * Send a message to the OpenAI API for embedding.
 * @param input The input to be embedded.
 * @returns The embedding of the input.
 */
export async function embed(runtime: IAgentRuntime, input: string) {
    const modelProvider = models[runtime.character.modelProvider];
    //need to have env override for this to select what to use for embedding if provider doesnt provide or using openai
    const embeddingModel = settings.USE_OPENAI_EMBEDDING
        ? "text-embedding-3-small" // Use OpenAI if specified
        : modelProvider.model?.[ModelClass.EMBEDDING] || // Use provider's embedding model if available
          models[ModelProviderName.OPENAI].model[ModelClass.EMBEDDING]; // Fallback to OpenAI

    if (!embeddingModel) {
        throw new Error("No embedding model configured");
    }

    // Try local embedding first
    if (
        runtime.character.modelProvider !== ModelProviderName.OPENAI &&
        runtime.character.modelProvider !== ModelProviderName.OLLAMA &&
        !settings.USE_OPENAI_EMBEDDING
    ) {
        return await getLocalEmbedding(input);
    }

    // Check cache
    const cachedEmbedding = await retrieveCachedEmbedding(runtime, input);
    if (cachedEmbedding) {
        return cachedEmbedding;
    }

    // Get remote embedding
    return await getRemoteEmbedding(input, {
        model: embeddingModel,
        endpoint: settings.USE_OPENAI_EMBEDDING
            ? "https://api.openai.com/v1" // Always use OpenAI endpoint when USE_OPENAI_EMBEDDING is true
            : runtime.character.modelEndpointOverride || modelProvider.endpoint,
        apiKey: settings.USE_OPENAI_EMBEDDING
            ? settings.OPENAI_API_KEY // Use OpenAI key from settings when USE_OPENAI_EMBEDDING is true
            : runtime.token, // Use runtime token for other providers
        isOllama:
            runtime.character.modelProvider === ModelProviderName.OLLAMA &&
            !settings.USE_OPENAI_EMBEDDING,
    });
}

async function getLocalEmbedding(input: string): Promise<number[]> {
    const cacheDir = getRootPath() + "/cache/";
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }

    const embeddingModel = await FlagEmbedding.init({
        cacheDir: cacheDir,
    });

    const trimmedInput = trimTokens(input, 8000, "gpt-4o-mini");
    const embedding = await embeddingModel.queryEmbed(trimmedInput);
    //console.log("Embedding dimensions: ", embedding.length);
    return embedding;
}

export async function retrieveCachedEmbedding(
    runtime: IAgentRuntime,
    input: string
) {
    if (!input) {
        console.log("No input to retrieve cached embedding for");
        return null;
    }

    const similaritySearchResult =
        await runtime.messageManager.getCachedEmbeddings(input);
    if (similaritySearchResult.length > 0) {
        return similaritySearchResult[0].embedding;
    }
    return null;
}
