import path from "path";
import models from "./models.ts";
import {
    IAgentRuntime,
    ITextGenerationService,
    ModelProviderName,
    ServiceType,
} from "./types.ts";
import fs from "fs";
import { EmbeddingModel, FlagEmbedding } from "fastembed";

/**
 * Send a message to the OpenAI API for embedding.
 * @param input The input to be embedded.
 * @returns The embedding of the input.
 */
export async function embed(runtime: IAgentRuntime, input: string) {
    // get the charcter, and handle by model type
    const modelProvider = models[runtime.character.modelProvider];
    const embeddingModel = modelProvider.model.embedding;

    if (
        runtime.character.modelProvider !== ModelProviderName.OPENAI &&
        runtime.character.modelProvider !== ModelProviderName.OLLAMA
    ) {

        // make sure to trim tokens to 8192

        const embeddingModel = await FlagEmbedding.init({
            model: EmbeddingModel.BGEBaseEN
        });
        
        const embedding: number[] = await embeddingModel.queryEmbed(input);
        console.log("Embedding dimensions: ", embedding.length);
        return embedding;

        // commented out the text generation service that uses llama
        // const service = runtime.getService<ITextGenerationService>(
        //     ServiceType.TEXT_GENERATION
        // );
        
        // const instance = service?.getInstance();

        // if (instance) {
        //     return await instance.getEmbeddingResponse(input);
        // }
    }

    // TODO: Fix retrieveCachedEmbedding
    // Check if we already have the embedding in the lore
    const cachedEmbedding = await retrieveCachedEmbedding(runtime, input);
    if (cachedEmbedding) {
        return cachedEmbedding;
    }

    const requestOptions = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            // TODO: make this not hardcoded
            ...(runtime.modelProvider !== ModelProviderName.OLLAMA && {
                Authorization: `Bearer ${runtime.token}`,
            }),
        },
        body: JSON.stringify({
            input,
            model: embeddingModel,
            length: 768, // we are squashing dimensions to 768 for openai, even thought the model supports 1536
            // -- this is ok for matryoshka embeddings but longterm, we might want to support 1536
        }),
    };
    try {
        const response = await fetch(
            // TODO: make this not hardcoded
            `${runtime.character.modelEndpointOverride || modelProvider.endpoint}${runtime.character.modelProvider === ModelProviderName.OLLAMA ? "/v1" : ""}/embeddings`,
            requestOptions
        );

        if (!response.ok) {
            throw new Error(
                "OpenAI API Error: " +
                    response.status +
                    " " +
                    response.statusText
            );
        }

        interface OpenAIEmbeddingResponse {
            data: Array<{ embedding: number[] }>;
        }

        const data: OpenAIEmbeddingResponse = await response.json();

        return data?.data?.[0].embedding;
    } catch (e) {
        console.error(e);
        throw e;
    }
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
