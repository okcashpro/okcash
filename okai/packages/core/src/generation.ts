import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import {
    generateObject as aiGenerateObject,
    generateText as aiGenerateText,
    GenerateObjectResult,
} from "ai";
import { Buffer } from "buffer";
import { createOllama } from "ollama-ai-provider";
import OpenAI from "openai";
import { encodingForModel, TiktokenModel } from "js-tiktoken";
import Together from "together-ai";
import { ZodSchema } from "zod";
import { okaiLogger } from "./index.ts";
import { getModel, models } from "./models.ts";
import {
    parseBooleanFromText,
    parseJsonArrayFromText,
    parseJSONObjectFromText,
    parseShouldRespondFromText,
} from "./parsing.ts";
import settings from "./settings.ts";
import {
    Content,
    IAgentRuntime,
    IImageDescriptionService,
    ITextGenerationService,
    ModelClass,
    ModelProviderName,
    ServiceType,
    SearchResponse,
} from "./types.ts";
import { fal } from "@fal-ai/client";

/**
 * Send a message to the model for a text generateText - receive a string back and parse how you'd like
 * @param opts - The options for the generateText request.
 * @param opts.context The context of the message to be completed.
 * @param opts.stop A list of strings to stop the generateText at.
 * @param opts.model The model to use for generateText.
 * @param opts.frequency_penalty The frequency penalty to apply to the generateText.
 * @param opts.presence_penalty The presence penalty to apply to the generateText.
 * @param opts.temperature The temperature to apply to the generateText.
 * @param opts.max_context_length The maximum length of the context to apply to the generateText.
 * @returns The completed message.
 */

export async function generateText({
    runtime,
    context,
    modelClass,
    stop,
}: {
    runtime: IAgentRuntime;
    context: string;
    modelClass: string;
    stop?: string[];
}): Promise<string> {
    if (!context) {
        console.error("generateText context is empty");
        return "";
    }

    okaiLogger.log("Generating text...");

    okaiLogger.info("Generating text with options:", {
        modelProvider: runtime.modelProvider,
        model: modelClass,
    });

    const provider = runtime.modelProvider;
    const endpoint =
        runtime.character.modelEndpointOverride || models[provider].endpoint;
    let model = models[provider].model[modelClass];

    // if runtime.getSetting("LLAMACLOUD_MODEL_LARGE") is true and modelProvider is LLAMACLOUD, then use the large model
    if (
        (runtime.getSetting("LLAMACLOUD_MODEL_LARGE") &&
            provider === ModelProviderName.LLAMACLOUD) ||
        (runtime.getSetting("TOGETHER_MODEL_LARGE") &&
            provider === ModelProviderName.TOGETHER)
    ) {
        model =
            runtime.getSetting("LLAMACLOUD_MODEL_LARGE") ||
            runtime.getSetting("TOGETHER_MODEL_LARGE");
    }

    if (
        (runtime.getSetting("LLAMACLOUD_MODEL_SMALL") &&
            provider === ModelProviderName.LLAMACLOUD) ||
        (runtime.getSetting("TOGETHER_MODEL_SMALL") &&
            provider === ModelProviderName.TOGETHER)
    ) {
        model =
            runtime.getSetting("LLAMACLOUD_MODEL_SMALL") ||
            runtime.getSetting("TOGETHER_MODEL_SMALL");
    }

    okaiLogger.info("Selected model:", model);

    const temperature = models[provider].settings.temperature;
    const frequency_penalty = models[provider].settings.frequency_penalty;
    const presence_penalty = models[provider].settings.presence_penalty;
    const max_context_length = models[provider].settings.maxInputTokens;
    const max_response_length = models[provider].settings.maxOutputTokens;

    const apiKey = runtime.token;

    try {
        okaiLogger.debug(
            `Trimming context to max length of ${max_context_length} tokens.`
        );
        context = await trimTokens(context, max_context_length, "gpt-4o");

        let response: string;

        const _stop = stop || models[provider].settings.stop;
        okaiLogger.debug(
            `Using provider: ${provider}, model: ${model}, temperature: ${temperature}, max response length: ${max_response_length}`
        );

        switch (provider) {
            // OPENAI & LLAMACLOUD shared same structure.
            case ModelProviderName.OPENAI:
            case ModelProviderName.ETERNALAI:
            case ModelProviderName.ALI_BAILIAN:
            case ModelProviderName.VOLENGINE:
            case ModelProviderName.LLAMACLOUD:
            case ModelProviderName.HYPERBOLIC:
            case ModelProviderName.TOGETHER: {
                okaiLogger.debug("Initializing OpenAI model.");
                const openai = createOpenAI({ apiKey, baseURL: endpoint });

                const { text: openaiResponse } = await aiGenerateText({
                    model: openai.languageModel(model),
                    prompt: context,
                    system:
                        runtime.character.system ??
                        settings.SYSTEM_PROMPT ??
                        undefined,
                    temperature: temperature,
                    maxTokens: max_response_length,
                    frequencyPenalty: frequency_penalty,
                    presencePenalty: presence_penalty,
                });

                response = openaiResponse;
                okaiLogger.debug("Received response from OpenAI model.");
                break;
            }

            case ModelProviderName.GOOGLE: {
                const google = createGoogleGenerativeAI();

                const { text: googleResponse } = await aiGenerateText({
                    model: google(model),
                    prompt: context,
                    system:
                        runtime.character.system ??
                        settings.SYSTEM_PROMPT ??
                        undefined,
                    temperature: temperature,
                    maxTokens: max_response_length,
                    frequencyPenalty: frequency_penalty,
                    presencePenalty: presence_penalty,
                });

                response = googleResponse;
                okaiLogger.debug("Received response from Google model.");
                break;
            }

            case ModelProviderName.ANTHROPIC: {
                okaiLogger.debug("Initializing Anthropic model.");

                const anthropic = createAnthropic({ apiKey });

                const { text: anthropicResponse } = await aiGenerateText({
                    model: anthropic.languageModel(model),
                    prompt: context,
                    system:
                        runtime.character.system ??
                        settings.SYSTEM_PROMPT ??
                        undefined,
                    temperature: temperature,
                    maxTokens: max_response_length,
                    frequencyPenalty: frequency_penalty,
                    presencePenalty: presence_penalty,
                });

                response = anthropicResponse;
                okaiLogger.debug("Received response from Anthropic model.");
                break;
            }

            case ModelProviderName.CLAUDE_VERTEX: {
                okaiLogger.debug("Initializing Claude Vertex model.");

                const anthropic = createAnthropic({ apiKey });

                const { text: anthropicResponse } = await aiGenerateText({
                    model: anthropic.languageModel(model),
                    prompt: context,
                    system:
                        runtime.character.system ??
                        settings.SYSTEM_PROMPT ??
                        undefined,
                    temperature: temperature,
                    maxTokens: max_response_length,
                    frequencyPenalty: frequency_penalty,
                    presencePenalty: presence_penalty,
                });

                response = anthropicResponse;
                okaiLogger.debug(
                    "Received response from Claude Vertex model."
                );
                break;
            }

            case ModelProviderName.GROK: {
                okaiLogger.debug("Initializing Grok model.");
                const grok = createOpenAI({ apiKey, baseURL: endpoint });

                const { text: grokResponse } = await aiGenerateText({
                    model: grok.languageModel(model, {
                        parallelToolCalls: false,
                    }),
                    prompt: context,
                    system:
                        runtime.character.system ??
                        settings.SYSTEM_PROMPT ??
                        undefined,
                    temperature: temperature,
                    maxTokens: max_response_length,
                    frequencyPenalty: frequency_penalty,
                    presencePenalty: presence_penalty,
                });

                response = grokResponse;
                okaiLogger.debug("Received response from Grok model.");
                break;
            }

            case ModelProviderName.GROQ: {
                const groq = createGroq({ apiKey });

                const { text: groqResponse } = await aiGenerateText({
                    model: groq.languageModel(model),
                    prompt: context,
                    temperature: temperature,
                    system:
                        runtime.character.system ??
                        settings.SYSTEM_PROMPT ??
                        undefined,
                    maxTokens: max_response_length,
                    frequencyPenalty: frequency_penalty,
                    presencePenalty: presence_penalty,
                });

                response = groqResponse;
                break;
            }

            case ModelProviderName.LLAMALOCAL: {
                okaiLogger.debug(
                    "Using local Llama model for text completion."
                );
                const textGenerationService =
                    runtime.getService<ITextGenerationService>(
                        ServiceType.TEXT_GENERATION
                    );

                if (!textGenerationService) {
                    throw new Error("Text generation service not found");
                }

                response = await textGenerationService.queueTextCompletion(
                    context,
                    temperature,
                    _stop,
                    frequency_penalty,
                    presence_penalty,
                    max_response_length
                );
                okaiLogger.debug("Received response from local Llama model.");
                break;
            }

            case ModelProviderName.REDPILL: {
                okaiLogger.debug("Initializing RedPill model.");
                const serverUrl = models[provider].endpoint;
                const openai = createOpenAI({ apiKey, baseURL: serverUrl });

                const { text: redpillResponse } = await aiGenerateText({
                    model: openai.languageModel(model),
                    prompt: context,
                    temperature: temperature,
                    system:
                        runtime.character.system ??
                        settings.SYSTEM_PROMPT ??
                        undefined,
                    maxTokens: max_response_length,
                    frequencyPenalty: frequency_penalty,
                    presencePenalty: presence_penalty,
                });

                response = redpillResponse;
                okaiLogger.debug("Received response from redpill model.");
                break;
            }

            case ModelProviderName.OPENROUTER: {
                okaiLogger.debug("Initializing OpenRouter model.");
                const serverUrl = models[provider].endpoint;
                const openrouter = createOpenAI({ apiKey, baseURL: serverUrl });

                const { text: openrouterResponse } = await aiGenerateText({
                    model: openrouter.languageModel(model),
                    prompt: context,
                    temperature: temperature,
                    system:
                        runtime.character.system ??
                        settings.SYSTEM_PROMPT ??
                        undefined,
                    maxTokens: max_response_length,
                    frequencyPenalty: frequency_penalty,
                    presencePenalty: presence_penalty,
                });

                response = openrouterResponse;
                okaiLogger.debug("Received response from OpenRouter model.");
                break;
            }

            case ModelProviderName.OLLAMA:
                {
                    okaiLogger.debug("Initializing Ollama model.");

                    const ollamaProvider = createOllama({
                        baseURL: models[provider].endpoint + "/api",
                    });
                    const ollama = ollamaProvider(model);

                    okaiLogger.debug("****** MODEL\n", model);

                    const { text: ollamaResponse } = await aiGenerateText({
                        model: ollama,
                        prompt: context,
                        temperature: temperature,
                        maxTokens: max_response_length,
                        frequencyPenalty: frequency_penalty,
                        presencePenalty: presence_penalty,
                    });

                    response = ollamaResponse;
                }
                okaiLogger.debug("Received response from Ollama model.");
                break;

            case ModelProviderName.HEURIST: {
                okaiLogger.debug("Initializing Heurist model.");
                const heurist = createOpenAI({
                    apiKey: apiKey,
                    baseURL: endpoint,
                });

                const { text: heuristResponse } = await aiGenerateText({
                    model: heurist.languageModel(model),
                    prompt: context,
                    system:
                        runtime.character.system ??
                        settings.SYSTEM_PROMPT ??
                        undefined,
                    temperature: temperature,
                    maxTokens: max_response_length,
                    frequencyPenalty: frequency_penalty,
                    presencePenalty: presence_penalty,
                });

                response = heuristResponse;
                okaiLogger.debug("Received response from Heurist model.");
                break;
            }
            case ModelProviderName.GAIANET: {
                okaiLogger.debug("Initializing GAIANET model.");

                var baseURL = models[provider].endpoint;
                if(!baseURL){
                    switch(modelClass){
                        case ModelClass.SMALL:
                            baseURL = settings.SMALL_GAIANET_SERVER_URL || "https://llama3b.gaia.domains/v1";
                            break;
                        case ModelClass.MEDIUM:
                            baseURL = settings.MEDIUM_GAIANET_SERVER_URL || "https://llama8b.gaia.domains/v1";
                            break;
                        case ModelClass.LARGE:
                            baseURL = settings.LARGE_GAIANET_SERVER_URL || "https://qwen72b.gaia.domains/v1";
                            break;
                    }
                }

                okaiLogger.debug("Using GAIANET model with baseURL:", baseURL);

                const openai = createOpenAI({ apiKey, baseURL: endpoint });

                const { text: openaiResponse } = await aiGenerateText({
                    model: openai.languageModel(model),
                    prompt: context,
                    system:
                        runtime.character.system ??
                        settings.SYSTEM_PROMPT ??
                        undefined,
                    temperature: temperature,
                    maxTokens: max_response_length,
                    frequencyPenalty: frequency_penalty,
                    presencePenalty: presence_penalty,
                });

                response = openaiResponse;
                okaiLogger.debug("Received response from GAIANET model.");
                break;
            }

            case ModelProviderName.GALADRIEL: {
                okaiLogger.debug("Initializing Galadriel model.");
                const galadriel = createOpenAI({
                    apiKey: apiKey,
                    baseURL: endpoint,
                });

                const { text: galadrielResponse } = await aiGenerateText({
                    model: galadriel.languageModel(model),
                    prompt: context,
                    system:
                        runtime.character.system ??
                        settings.SYSTEM_PROMPT ??
                        undefined,
                    temperature: temperature,
                    maxTokens: max_response_length,
                    frequencyPenalty: frequency_penalty,
                    presencePenalty: presence_penalty,
                });

                response = galadrielResponse;
                okaiLogger.debug("Received response from Galadriel model.");
                break;
            }

            default: {
                const errorMessage = `Unsupported provider: ${provider}`;
                okaiLogger.error(errorMessage);
                throw new Error(errorMessage);
            }
        }

        return response;
    } catch (error) {
        okaiLogger.error("Error in generateText:", error);
        throw error;
    }
}

/**
 * Truncate the context to the maximum length allowed by the model.
 * @param context The text to truncate
 * @param maxTokens Maximum number of tokens to keep
 * @param model The tokenizer model to use
 * @returns The truncated text
 */
export function trimTokens(
    context: string,
    maxTokens: number,
    model: TiktokenModel
): string {
    if (!context) return "";
    if (maxTokens <= 0) throw new Error("maxTokens must be positive");

    // Get the tokenizer for the model
    const encoding = encodingForModel(model);

    try {
        // Encode the text into tokens
        const tokens = encoding.encode(context);

        // If already within limits, return unchanged
        if (tokens.length <= maxTokens) {
            return context;
        }

        // Keep the most recent tokens by slicing from the end
        const truncatedTokens = tokens.slice(-maxTokens);

        // Decode back to text - js-tiktoken decode() returns a string directly
        return encoding.decode(truncatedTokens);
    } catch (error) {
        console.error("Error in trimTokens:", error);
        // Return truncated string if tokenization fails
        return context.slice(-maxTokens * 4); // Rough estimate of 4 chars per token
    }
}

/**
 * Sends a message to the model to determine if it should respond to the given context.
 * @param opts - The options for the generateText request
 * @param opts.context The context to evaluate for response
 * @param opts.stop A list of strings to stop the generateText at
 * @param opts.model The model to use for generateText
 * @param opts.frequency_penalty The frequency penalty to apply (0.0 to 2.0)
 * @param opts.presence_penalty The presence penalty to apply (0.0 to 2.0)
 * @param opts.temperature The temperature to control randomness (0.0 to 2.0)
 * @param opts.serverUrl The URL of the API server
 * @param opts.max_context_length Maximum allowed context length in tokens
 * @param opts.max_response_length Maximum allowed response length in tokens
 * @returns Promise resolving to "RESPOND", "IGNORE", "STOP" or null
 */
export async function generateShouldRespond({
    runtime,
    context,
    modelClass,
}: {
    runtime: IAgentRuntime;
    context: string;
    modelClass: string;
}): Promise<"RESPOND" | "IGNORE" | "STOP" | null> {
    let retryDelay = 1000;
    while (true) {
        try {
            okaiLogger.debug(
                "Attempting to generate text with context:",
                context
            );
            const response = await generateText({
                runtime,
                context,
                modelClass,
            });

            okaiLogger.debug("Received response from generateText:", response);
            const parsedResponse = parseShouldRespondFromText(response.trim());
            if (parsedResponse) {
                okaiLogger.debug("Parsed response:", parsedResponse);
                return parsedResponse;
            } else {
                okaiLogger.debug("generateShouldRespond no response");
            }
        } catch (error) {
            okaiLogger.error("Error in generateShouldRespond:", error);
            if (
                error instanceof TypeError &&
                error.message.includes("queueTextCompletion")
            ) {
                okaiLogger.error(
                    "TypeError: Cannot read properties of null (reading 'queueTextCompletion')"
                );
            }
        }

        okaiLogger.log(`Retrying in ${retryDelay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        retryDelay *= 2;
    }
}

/**
 * Splits content into chunks of specified size with optional overlapping bleed sections
 * @param content - The text content to split into chunks
 * @param chunkSize - The maximum size of each chunk in tokens
 * @param bleed - Number of characters to overlap between chunks (default: 100)
 * @returns Promise resolving to array of text chunks with bleed sections
 */
export async function splitChunks(
    content: string,
    chunkSize: number = 512,
    bleed: number = 20
): Promise<string[]> {
    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: Number(chunkSize),
        chunkOverlap: Number(bleed),
    });

    return textSplitter.splitText(content);
}

/**
 * Sends a message to the model and parses the response as a boolean value
 * @param opts - The options for the generateText request
 * @param opts.context The context to evaluate for the boolean response
 * @param opts.stop A list of strings to stop the generateText at
 * @param opts.model The model to use for generateText
 * @param opts.frequency_penalty The frequency penalty to apply (0.0 to 2.0)
 * @param opts.presence_penalty The presence penalty to apply (0.0 to 2.0)
 * @param opts.temperature The temperature to control randomness (0.0 to 2.0)
 * @param opts.serverUrl The URL of the API server
 * @param opts.token The API token for authentication
 * @param opts.max_context_length Maximum allowed context length in tokens
 * @param opts.max_response_length Maximum allowed response length in tokens
 * @returns Promise resolving to a boolean value parsed from the model's response
 */
export async function generateTrueOrFalse({
    runtime,
    context = "",
    modelClass,
}: {
    runtime: IAgentRuntime;
    context: string;
    modelClass: string;
}): Promise<boolean> {
    let retryDelay = 1000;

    const stop = Array.from(
        new Set([
            ...(models[runtime.modelProvider].settings.stop || []),
            ["\n"],
        ])
    ) as string[];

    while (true) {
        try {
            const response = await generateText({
                stop,
                runtime,
                context,
                modelClass,
            });

            const parsedResponse = parseBooleanFromText(response.trim());
            if (parsedResponse !== null) {
                return parsedResponse;
            }
        } catch (error) {
            okaiLogger.error("Error in generateTrueOrFalse:", error);
        }

        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        retryDelay *= 2;
    }
}

/**
 * Send a message to the model and parse the response as a string array
 * @param opts - The options for the generateText request
 * @param opts.context The context/prompt to send to the model
 * @param opts.stop Array of strings that will stop the model's generation if encountered
 * @param opts.model The language model to use
 * @param opts.frequency_penalty The frequency penalty to apply (0.0 to 2.0)
 * @param opts.presence_penalty The presence penalty to apply (0.0 to 2.0)
 * @param opts.temperature The temperature to control randomness (0.0 to 2.0)
 * @param opts.serverUrl The URL of the API server
 * @param opts.token The API token for authentication
 * @param opts.max_context_length Maximum allowed context length in tokens
 * @param opts.max_response_length Maximum allowed response length in tokens
 * @returns Promise resolving to an array of strings parsed from the model's response
 */
export async function generateTextArray({
    runtime,
    context,
    modelClass,
}: {
    runtime: IAgentRuntime;
    context: string;
    modelClass: string;
}): Promise<string[]> {
    if (!context) {
        okaiLogger.error("generateTextArray context is empty");
        return [];
    }
    let retryDelay = 1000;

    while (true) {
        try {
            const response = await generateText({
                runtime,
                context,
                modelClass,
            });

            const parsedResponse = parseJsonArrayFromText(response);
            if (parsedResponse) {
                return parsedResponse;
            }
        } catch (error) {
            okaiLogger.error("Error in generateTextArray:", error);
        }

        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        retryDelay *= 2;
    }
}

export async function generateObjectDEPRECATED({
    runtime,
    context,
    modelClass,
}: {
    runtime: IAgentRuntime;
    context: string;
    modelClass: string;
}): Promise<any> {
    if (!context) {
        okaiLogger.error("generateObjectDEPRECATED context is empty");
        return null;
    }
    let retryDelay = 1000;

    while (true) {
        try {
            // this is slightly different than generateObjectArray, in that we parse object, not object array
            const response = await generateText({
                runtime,
                context,
                modelClass,
            });
            const parsedResponse = parseJSONObjectFromText(response);
            if (parsedResponse) {
                return parsedResponse;
            }
        } catch (error) {
            okaiLogger.error("Error in generateObject:", error);
        }

        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        retryDelay *= 2;
    }
}

export async function generateObjectArray({
    runtime,
    context,
    modelClass,
}: {
    runtime: IAgentRuntime;
    context: string;
    modelClass: string;
}): Promise<any[]> {
    if (!context) {
        okaiLogger.error("generateObjectArray context is empty");
        return [];
    }
    let retryDelay = 1000;

    while (true) {
        try {
            const response = await generateText({
                runtime,
                context,
                modelClass,
            });

            const parsedResponse = parseJsonArrayFromText(response);
            if (parsedResponse) {
                return parsedResponse;
            }
        } catch (error) {
            okaiLogger.error("Error in generateTextArray:", error);
        }

        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        retryDelay *= 2;
    }
}

/**
 * Send a message to the model for generateText.
 * @param opts - The options for the generateText request.
 * @param opts.context The context of the message to be completed.
 * @param opts.stop A list of strings to stop the generateText at.
 * @param opts.model The model to use for generateText.
 * @param opts.frequency_penalty The frequency penalty to apply to the generateText.
 * @param opts.presence_penalty The presence penalty to apply to the generateText.
 * @param opts.temperature The temperature to apply to the generateText.
 * @param opts.max_context_length The maximum length of the context to apply to the generateText.
 * @returns The completed message.
 */
export async function generateMessageResponse({
    runtime,
    context,
    modelClass,
}: {
    runtime: IAgentRuntime;
    context: string;
    modelClass: string;
}): Promise<Content> {
    const max_context_length =
        models[runtime.modelProvider].settings.maxInputTokens;
    context = trimTokens(context, max_context_length, "gpt-4o");
    let retryLength = 1000; // exponential backoff
    while (true) {
        try {
            okaiLogger.log("Generating message response..");

            const response = await generateText({
                runtime,
                context,
                modelClass,
            });

            // try parsing the response as JSON, if null then try again
            const parsedContent = parseJSONObjectFromText(response) as Content;
            if (!parsedContent) {
                okaiLogger.debug("parsedContent is null, retrying");
                continue;
            }

            return parsedContent;
        } catch (error) {
            okaiLogger.error("ERROR:", error);
            // wait for 2 seconds
            retryLength *= 2;
            await new Promise((resolve) => setTimeout(resolve, retryLength));
            okaiLogger.debug("Retrying...");
        }
    }
}

export const generateImage = async (
    data: {
        prompt: string;
        width: number;
        height: number;
        count?: number;
        negativePrompt?: string;
        numIterations?: number;
        guidanceScale?: number;
        seed?: number;
        modelId?: string;
        jobId?: string;
    },
    runtime: IAgentRuntime
): Promise<{
    success: boolean;
    data?: string[];
    error?: any;
}> => {
    const model = getModel(runtime.imageModelProvider, ModelClass.IMAGE);
    const modelSettings = models[runtime.imageModelProvider].imageSettings;

    okaiLogger.info("Generating image with options:", {
        imageModelProvider: model,
    });

    const apiKey =
        runtime.imageModelProvider === runtime.modelProvider
            ? runtime.token
            : (runtime.getSetting("HEURIST_API_KEY") ??
              runtime.getSetting("TOGETHER_API_KEY") ??
              runtime.getSetting("FAL_API_KEY") ??
              runtime.getSetting("OPENAI_API_KEY"));

    try {
        if (runtime.imageModelProvider === ModelProviderName.HEURIST) {
            const response = await fetch(
                "http://sequencer.heurist.xyz/submit_job",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        job_id: data.jobId || crypto.randomUUID(),
                        model_input: {
                            SD: {
                                prompt: data.prompt,
                                neg_prompt: data.negativePrompt,
                                num_iterations: data.numIterations || 20,
                                width: data.width || 512,
                                height: data.height || 512,
                                guidance_scale: data.guidanceScale || 3,
                                seed: data.seed || -1,
                            },
                        },
                        model_id: data.modelId || "FLUX.1-dev",
                        deadline: 60,
                        priority: 1,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(
                    `Heurist image generation failed: ${response.statusText}`
                );
            }

            const imageURL = await response.json();
            return { success: true, data: [imageURL] };
        } else if (
            runtime.imageModelProvider === ModelProviderName.TOGETHER ||
            // for backwards compat
            runtime.imageModelProvider === ModelProviderName.LLAMACLOUD
        ) {
            const together = new Together({ apiKey: apiKey as string });
            const response = await together.images.create({
                model: "black-forest-labs/FLUX.1-schnell",
                prompt: data.prompt,
                width: data.width,
                height: data.height,
                steps: modelSettings?.steps ?? 4,
                n: data.count,
            });

            // Add type assertion to handle the response properly
            const togetherResponse =
                response as unknown as TogetherAIImageResponse;

            if (
                !togetherResponse.data ||
                !Array.isArray(togetherResponse.data)
            ) {
                throw new Error("Invalid response format from Together AI");
            }

            // Rest of the code remains the same...
            const base64s = await Promise.all(
                togetherResponse.data.map(async (image) => {
                    if (!image.url) {
                        okaiLogger.error("Missing URL in image data:", image);
                        throw new Error("Missing URL in Together AI response");
                    }

                    // Fetch the image from the URL
                    const imageResponse = await fetch(image.url);
                    if (!imageResponse.ok) {
                        throw new Error(
                            `Failed to fetch image: ${imageResponse.statusText}`
                        );
                    }

                    // Convert to blob and then to base64
                    const blob = await imageResponse.blob();
                    const arrayBuffer = await blob.arrayBuffer();
                    const base64 = Buffer.from(arrayBuffer).toString("base64");

                    // Return with proper MIME type
                    return `data:image/jpeg;base64,${base64}`;
                })
            );

            if (base64s.length === 0) {
                throw new Error("No images generated by Together AI");
            }

            okaiLogger.debug(`Generated ${base64s.length} images`);
            return { success: true, data: base64s };
        } else if (runtime.imageModelProvider === ModelProviderName.FAL) {
            fal.config({
                credentials: apiKey as string,
            });

            // Prepare the input parameters according to their schema
            const input = {
                prompt: data.prompt,
                image_size: "square" as const,
                num_inference_steps: modelSettings?.steps ?? 50,
                guidance_scale: data.guidanceScale || 3.5,
                num_images: data.count,
                enable_safety_checker: true,
                output_format: "png" as const,
                seed: data.seed ?? 6252023,
                ...(runtime.getSetting("FAL_AI_LORA_PATH")
                    ? {
                          loras: [
                              {
                                  path: runtime.getSetting("FAL_AI_LORA_PATH"),
                                  scale: 1,
                              },
                          ],
                      }
                    : {}),
            };

            // Subscribe to the model
            const result = await fal.subscribe(model, {
                input,
                logs: true,
                onQueueUpdate: (update) => {
                    if (update.status === "IN_PROGRESS") {
                        okaiLogger.info(update.logs.map((log) => log.message));
                    }
                },
            });

            // Convert the returned image URLs to base64 to match existing functionality
            const base64Promises = result.data.images.map(async (image) => {
                const response = await fetch(image.url);
                const blob = await response.blob();
                const buffer = await blob.arrayBuffer();
                const base64 = Buffer.from(buffer).toString("base64");
                return `data:${image.content_type};base64,${base64}`;
            });

            const base64s = await Promise.all(base64Promises);
            return { success: true, data: base64s };
        } else {
            let targetSize = `${data.width}x${data.height}`;
            if (
                targetSize !== "1024x1024" &&
                targetSize !== "1792x1024" &&
                targetSize !== "1024x1792"
            ) {
                targetSize = "1024x1024";
            }
            const openaiApiKey = runtime.getSetting("OPENAI_API_KEY") as string;
            if (!openaiApiKey) {
                throw new Error("OPENAI_API_KEY is not set");
            }
            const openai = new OpenAI({
                apiKey: openaiApiKey as string,
            });
            const response = await openai.images.generate({
                model,
                prompt: data.prompt,
                size: targetSize as "1024x1024" | "1792x1024" | "1024x1792",
                n: data.count,
                response_format: "b64_json",
            });
            const base64s = response.data.map(
                (image) => `data:image/png;base64,${image.b64_json}`
            );
            return { success: true, data: base64s };
        }
    } catch (error) {
        console.error(error);
        return { success: false, error: error };
    }
};

export const generateCaption = async (
    data: { imageUrl: string },
    runtime: IAgentRuntime
): Promise<{
    title: string;
    description: string;
}> => {
    const { imageUrl } = data;
    const imageDescriptionService =
        runtime.getService<IImageDescriptionService>(
            ServiceType.IMAGE_DESCRIPTION
        );

    if (!imageDescriptionService) {
        throw new Error("Image description service not found");
    }

    const resp = await imageDescriptionService.describeImage(imageUrl);
    return {
        title: resp.title.trim(),
        description: resp.description.trim(),
    };
};

export const generateWebSearch = async (
    query: string,
    runtime: IAgentRuntime
): Promise<SearchResponse> => {
    const apiUrl = "https://api.tavily.com/search";
    const apiKey = runtime.getSetting("TAVILY_API_KEY");

    try {
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                api_key: apiKey,
                query,
                include_answer: true,
            }),
        });

        if (!response.ok) {
            throw new okaiLogger.error(
                `HTTP error! status: ${response.status}`
            );
        }

        const data: SearchResponse = await response.json();
        return data;
    } catch (error) {
        okaiLogger.error("Error:", error);
    }
};
/**
 * Configuration options for generating objects with a model.
 */
export interface GenerationOptions {
    runtime: IAgentRuntime;
    context: string;
    modelClass: ModelClass;
    schema?: ZodSchema;
    schemaName?: string;
    schemaDescription?: string;
    stop?: string[];
    mode?: "auto" | "json" | "tool";
    experimental_providerMetadata?: Record<string, unknown>;
}

/**
 * Base settings for model generation.
 */
interface ModelSettings {
    prompt: string;
    temperature: number;
    maxTokens: number;
    frequencyPenalty: number;
    presencePenalty: number;
    stop?: string[];
}

/**
 * Generates structured objects from a prompt using specified AI models and configuration options.
 *
 * @param {GenerationOptions} options - Configuration options for generating objects.
 * @returns {Promise<any[]>} - A promise that resolves to an array of generated objects.
 * @throws {Error} - Throws an error if the provider is unsupported or if generation fails.
 */
export const generateObjectV2 = async ({
    runtime,
    context,
    modelClass,
    schema,
    schemaName,
    schemaDescription,
    stop,
    mode = "json",
}: GenerationOptions): Promise<GenerateObjectResult<unknown>> => {
    if (!context) {
        const errorMessage = "generateObjectV2 context is empty";
        console.error(errorMessage);
        throw new Error(errorMessage);
    }

    const provider = runtime.modelProvider;
    const model = models[provider].model[modelClass] as TiktokenModel;
    if (!model) {
        throw new Error(`Unsupported model class: ${modelClass}`);
    }
    const temperature = models[provider].settings.temperature;
    const frequency_penalty = models[provider].settings.frequency_penalty;
    const presence_penalty = models[provider].settings.presence_penalty;
    const max_context_length = models[provider].settings.maxInputTokens;
    const max_response_length = models[provider].settings.maxOutputTokens;
    const apiKey = runtime.token;

    try {
        context = trimTokens(context, max_context_length, model);

        const modelOptions: ModelSettings = {
            prompt: context,
            temperature,
            maxTokens: max_response_length,
            frequencyPenalty: frequency_penalty,
            presencePenalty: presence_penalty,
            stop: stop || models[provider].settings.stop,
        };

        const response = await handleProvider({
            provider,
            model,
            apiKey,
            schema,
            schemaName,
            schemaDescription,
            mode,
            modelOptions,
            runtime,
            context,
            modelClass,
        });

        return response;
    } catch (error) {
        console.error("Error in generateObject:", error);
        throw error;
    }
};

/**
 * Interface for provider-specific generation options.
 */
interface ProviderOptions {
    runtime: IAgentRuntime;
    provider: ModelProviderName;
    model: any;
    apiKey: string;
    schema?: ZodSchema;
    schemaName?: string;
    schemaDescription?: string;
    mode?: "auto" | "json" | "tool";
    experimental_providerMetadata?: Record<string, unknown>;
    modelOptions: ModelSettings;
    modelClass: string;
    context: string;
}

/**
 * Handles AI generation based on the specified provider.
 *
 * @param {ProviderOptions} options - Configuration options specific to the provider.
 * @returns {Promise<any[]>} - A promise that resolves to an array of generated objects.
 */
export async function handleProvider(
    options: ProviderOptions
): Promise<GenerateObjectResult<unknown>> {
    const { provider, runtime, context, modelClass } = options;
    switch (provider) {
        case ModelProviderName.OPENAI:
        case ModelProviderName.ETERNALAI:
        case ModelProviderName.ALI_BAILIAN:
        case ModelProviderName.VOLENGINE:
        case ModelProviderName.LLAMACLOUD:
        case ModelProviderName.TOGETHER:
            return await handleOpenAI(options);
        case ModelProviderName.ANTHROPIC:
            return await handleAnthropic(options);
        case ModelProviderName.GROK:
            return await handleGrok(options);
        case ModelProviderName.GROQ:
            return await handleGroq(options);
        case ModelProviderName.LLAMALOCAL:
            return await generateObjectDEPRECATED({
                runtime,
                context,
                modelClass,
            });
        case ModelProviderName.GOOGLE:
            return await handleGoogle(options);
        case ModelProviderName.REDPILL:
            return await handleRedPill(options);
        case ModelProviderName.OPENROUTER:
            return await handleOpenRouter(options);
        case ModelProviderName.OLLAMA:
            return await handleOllama(options);
        default: {
            const errorMessage = `Unsupported provider: ${provider}`;
            okaiLogger.error(errorMessage);
            throw new Error(errorMessage);
        }
    }
}
/**
 * Handles object generation for OpenAI.
 *
 * @param {ProviderOptions} options - Options specific to OpenAI.
 * @returns {Promise<GenerateObjectResult<unknown>>} - A promise that resolves to generated objects.
 */
async function handleOpenAI({
    model,
    apiKey,
    schema,
    schemaName,
    schemaDescription,
    mode,
    modelOptions,
}: ProviderOptions): Promise<GenerateObjectResult<unknown>> {
    const baseURL = models.openai.endpoint || undefined;
    const openai = createOpenAI({ apiKey, baseURL });
    return await aiGenerateObject({
        model: openai.languageModel(model),
        schema,
        schemaName,
        schemaDescription,
        mode,
        ...modelOptions,
    });
}

/**
 * Handles object generation for Anthropic models.
 *
 * @param {ProviderOptions} options - Options specific to Anthropic.
 * @returns {Promise<GenerateObjectResult<unknown>>} - A promise that resolves to generated objects.
 */
async function handleAnthropic({
    model,
    apiKey,
    schema,
    schemaName,
    schemaDescription,
    mode,
    modelOptions,
}: ProviderOptions): Promise<GenerateObjectResult<unknown>> {
    const anthropic = createAnthropic({ apiKey });
    return await aiGenerateObject({
        model: anthropic.languageModel(model),
        schema,
        schemaName,
        schemaDescription,
        mode,
        ...modelOptions,
    });
}

/**
 * Handles object generation for Grok models.
 *
 * @param {ProviderOptions} options - Options specific to Grok.
 * @returns {Promise<GenerateObjectResult<unknown>>} - A promise that resolves to generated objects.
 */
async function handleGrok({
    model,
    apiKey,
    schema,
    schemaName,
    schemaDescription,
    mode,
    modelOptions,
}: ProviderOptions): Promise<GenerateObjectResult<unknown>> {
    const grok = createOpenAI({ apiKey, baseURL: models.grok.endpoint });
    return await aiGenerateObject({
        model: grok.languageModel(model, { parallelToolCalls: false }),
        schema,
        schemaName,
        schemaDescription,
        mode,
        ...modelOptions,
    });
}

/**
 * Handles object generation for Groq models.
 *
 * @param {ProviderOptions} options - Options specific to Groq.
 * @returns {Promise<GenerateObjectResult<unknown>>} - A promise that resolves to generated objects.
 */
async function handleGroq({
    model,
    apiKey,
    schema,
    schemaName,
    schemaDescription,
    mode,
    modelOptions,
}: ProviderOptions): Promise<GenerateObjectResult<unknown>> {
    const groq = createGroq({ apiKey });
    return await aiGenerateObject({
        model: groq.languageModel(model),
        schema,
        schemaName,
        schemaDescription,
        mode,
        ...modelOptions,
    });
}

/**
 * Handles object generation for Google models.
 *
 * @param {ProviderOptions} options - Options specific to Google.
 * @returns {Promise<GenerateObjectResult<unknown>>} - A promise that resolves to generated objects.
 */
async function handleGoogle({
    model,
    apiKey: _apiKey,
    schema,
    schemaName,
    schemaDescription,
    mode,
    modelOptions,
}: ProviderOptions): Promise<GenerateObjectResult<unknown>> {
    const google = createGoogleGenerativeAI();
    return await aiGenerateObject({
        model: google(model),
        schema,
        schemaName,
        schemaDescription,
        mode,
        ...modelOptions,
    });
}

/**
 * Handles object generation for Redpill models.
 *
 * @param {ProviderOptions} options - Options specific to Redpill.
 * @returns {Promise<GenerateObjectResult<unknown>>} - A promise that resolves to generated objects.
 */
async function handleRedPill({
    model,
    apiKey,
    schema,
    schemaName,
    schemaDescription,
    mode,
    modelOptions,
}: ProviderOptions): Promise<GenerateObjectResult<unknown>> {
    const redPill = createOpenAI({ apiKey, baseURL: models.redpill.endpoint });
    return await aiGenerateObject({
        model: redPill.languageModel(model),
        schema,
        schemaName,
        schemaDescription,
        mode,
        ...modelOptions,
    });
}

/**
 * Handles object generation for OpenRouter models.
 *
 * @param {ProviderOptions} options - Options specific to OpenRouter.
 * @returns {Promise<GenerateObjectResult<unknown>>} - A promise that resolves to generated objects.
 */
async function handleOpenRouter({
    model,
    apiKey,
    schema,
    schemaName,
    schemaDescription,
    mode,
    modelOptions,
}: ProviderOptions): Promise<GenerateObjectResult<unknown>> {
    const openRouter = createOpenAI({
        apiKey,
        baseURL: models.openrouter.endpoint,
    });
    return await aiGenerateObject({
        model: openRouter.languageModel(model),
        schema,
        schemaName,
        schemaDescription,
        mode,
        ...modelOptions,
    });
}

/**
 * Handles object generation for Ollama models.
 *
 * @param {ProviderOptions} options - Options specific to Ollama.
 * @returns {Promise<GenerateObjectResult<unknown>>} - A promise that resolves to generated objects.
 */
async function handleOllama({
    model,
    schema,
    schemaName,
    schemaDescription,
    mode,
    modelOptions,
    provider,
}: ProviderOptions): Promise<GenerateObjectResult<unknown>> {
    const ollamaProvider = createOllama({
        baseURL: models[provider].endpoint + "/api",
    });
    const ollama = ollamaProvider(model);
    return await aiGenerateObject({
        model: ollama,
        schema,
        schemaName,
        schemaDescription,
        mode,
        ...modelOptions,
    });
}

// Add type definition for Together AI response
interface TogetherAIImageResponse {
    data: Array<{
        url: string;
        content_type?: string;
        image_type?: string;
    }>;
}
