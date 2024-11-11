import { EmbeddingModel, FlagEmbedding } from "fastembed";
import path from "path";
import { fileURLToPath } from "url";
import models from "./models.ts";
import {
    IAgentRuntime,
    ModelProviderName
} from "./types.ts";
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

async function getRemoteEmbedding(input: string, options: EmbeddingOptions): Promise<number[]> {
    const requestOptions = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(options.apiKey ? {
                Authorization: `Bearer ${options.apiKey}`,
            } : {}),
        },
        body: JSON.stringify({
            input,
            model: options.model,
            length: options.length || 384,
        }),
    };

    try {
        const response = await fetch(
            `${options.endpoint}${options.isOllama ? "/v1" : ""}/embeddings`,
            requestOptions
        );

        if (!response.ok) {
            throw new Error(
                "Embedding API Error: " +
                response.status +
                " " +
                response.statusText
            );
        }

        interface EmbeddingResponse {
            data: Array<{ embedding: number[] }>;
        }

        const data: EmbeddingResponse = await response.json();
        return data?.data?.[0].embedding;
    } catch (e) {
        console.error(e);
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
    const embeddingModel = modelProvider.model.embedding;

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
        endpoint: runtime.character.modelEndpointOverride || modelProvider.endpoint,
        apiKey: runtime.token,
        isOllama: runtime.character.modelProvider === ModelProviderName.OLLAMA && !settings.USE_OPENAI_EMBEDDING
    });
}

async function getLocalEmbedding(input: string): Promise<number[]> {
    const cacheDir = getRootPath() + "/cache/";
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }

    const embeddingModel = await FlagEmbedding.init({
        cacheDir: cacheDir
    });

    const trimmedInput = trimTokens(input, 8000, "gpt-4o-mini");
    const embedding = await embeddingModel.queryEmbed(trimmedInput);
    console.log("Embedding dimensions: ", embedding.length);
    return embedding;
}

export async function retrieveCachedEmbedding(
    runtime: IAgentRuntime,
    input: string
) {
    if(!input) {
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

