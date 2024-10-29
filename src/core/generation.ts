import {
    parseBooleanFromText,
    parseJsonArrayFromText,
    parseJSONObjectFromText,
    parseShouldRespondFromText,
} from "./parsing.ts";
import {
    Content,
    IAgentRuntime,
    ModelProvider
} from "./types.ts";

import {
    default as tiktoken,
    default as TikToken,
    TiktokenModel,
} from "tiktoken";
import { wordsToPunish } from "../services/wordsToPunish.ts";
import models from "./models.ts";


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
    context = "",
    modelClass,
    stop
}: {
    runtime: IAgentRuntime,
    context: string,
    modelClass: string
    stop?: string[]
}): Promise<string> {
    let retryLength = 1000; // exponential backoff
    console.log("model class is", modelClass)
    const model = models[modelClass];
    console.log("model is", model)
    const max_context_length = model.settings.maxInputTokens;
    const max_response_length = model.settings.maxOutputTokens;
    const _stop = stop || model.settings.stop;
    const temperature = model.settings.temperature;
    const frequency_penalty = model.settings.frequency_penalty;
    const presence_penalty = model.settings.presence_penalty;
    const serverUrl = model.endpoint;
    const token = runtime.token;

    for (let triesLeft = 5; triesLeft > 0; triesLeft--) {
        try {
            context = await trimTokens(
                context,
                max_context_length,
                "gpt-4o-mini",
            );
            if (model === ModelProvider.LLAMALOCAL) {
                console.log("queueing text generateText");
                const result = await runtime.llamaService.queueTextCompletion(
                    context,
                    temperature,
                    stop,
                    frequency_penalty,
                    presence_penalty,
                    max_response_length,
                );
                return result;
            } else {
                // TODO: this needs to change based on model
                const biasValue = -20.0;
                const encoding = TikToken.encoding_for_model("gpt-4o-mini");

                const mappedWords = wordsToPunish.map(
                    (word) => encoding.encode(word, [], "all")[0],
                );

                const tokenIds = [...new Set(mappedWords)];

                const logit_bias = tokenIds.reduce((acc, tokenId) => {
                    acc[tokenId] = biasValue;
                    return acc;
                }, {});

                const requestOptions = {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: {
                        stop: _stop,
                        model,
                        // frequency_penalty,
                        // presence_penalty,
                        temperature,
                        max_tokens: max_response_length,
                        // logit_bias,
                        messages: [
                            {
                                role: "user",
                                content: context,
                            },
                        ],
                    },
                };

                // if the model includes llama, set reptition_penalty to frequency_penalty
                if (model.includes("llama")) {
                    (requestOptions.body as any).repetition_penalty = frequency_penalty ?? 1.4;
                    // delete presence_penalty and frequency_penalty
                    delete (requestOptions.body as any).presence_penalty;
                    delete (requestOptions.body as any).logit_bias;
                    delete (requestOptions.body as any).frequency_penalty;
                } else {
                    (requestOptions.body as any).frequency_penalty = frequency_penalty;
                    (requestOptions.body as any).presence_penalty = presence_penalty;
                    (requestOptions.body as any).logit_bias = logit_bias;
                }

                // stringify the body
                (requestOptions as any).body = JSON.stringify(requestOptions.body);
                console.log("requestOptions", requestOptions)
                const response = await fetch(
                    `${serverUrl}/chat/completions`,
                    requestOptions as any,
                );

                if (!response.ok) {
                    console.log("response is", response)
                    throw new Error(
                        "OpenAI API Error: " +
                        response.status +
                        " " +
                        response.statusText,
                    );
                }

                const body = await response.json();

                interface OpenAIResponse {
                    choices: Array<{ message: { content: string } }>;
                }

                console.log("context is", context)

                const content = (body as OpenAIResponse).choices?.[0]?.message?.content

                console.log("Message is", content)

                if (!content) {
                    throw new Error("No content in response");
                }
                return content;
            }
        } catch (error) {
            console.error("ERROR:", error);
            // wait for 2 seconds
            retryLength *= 2;
            await new Promise((resolve) => setTimeout(resolve, retryLength));
            console.log("Retrying...");
        }
    }
    throw new Error(
        "Failed to complete message after 5 tries, probably a network connectivity, model or API key issue",
    );
}

/**
 * Truncate the context to the maximum length allowed by the model.
 * @param model The model to use for generateText.
 * @param context The context of the message to be completed.
 * @param max_context_length The maximum length of the context to apply to the generateText.
 * @returns
 */
export function trimTokens(context, maxTokens, model) {
    // Count tokens and truncate context if necessary
    const encoding = tiktoken.encoding_for_model(model as TiktokenModel);
    let tokens = encoding.encode(context);
    const textDecoder = new TextDecoder();
    if (tokens.length > maxTokens) {
        tokens = tokens.reverse().slice(maxTokens).reverse();

        context = textDecoder.decode(encoding.decode(tokens));
    }
    return context;
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
    context = "",
    modelClass,
}): Promise<"RESPOND" | "IGNORE" | "STOP" | null> {
    let retryDelay = 1000;
    while (true) {
        try {
            const response = await generateText({
                runtime,
                context,
                modelClass,
            });

            const parsedResponse = parseShouldRespondFromText(response.trim());
            if (parsedResponse) {
                return parsedResponse;
            } else {
                console.log("generateShouldRespond no response");
            }
        } catch (error) {
            console.error("Error in generateShouldRespond:", error);
        }

        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        retryDelay *= 2;
    }
}

/**
 * Splits content into chunks of specified size with optional overlapping bleed sections
 * @param content - The text content to split into chunks
 * @param chunkSize - The maximum size of each chunk in tokens
 * @param bleed - Number of characters to overlap between chunks (default: 100)
 * @param model - The model name to use for tokenization (default: runtime.model)
 * @returns Promise resolving to array of text chunks with bleed sections
 */
export async function splitChunks(
    runtime,
    content: string,
    chunkSize: number,
    bleed: number = 100,
    modelClass: string,
): Promise<string[]> {
    const model = runtime.model[modelClass];
    const encoding = tiktoken.encoding_for_model(model.model.embedding as TiktokenModel);
    const tokens = encoding.encode(content);
    const chunks: string[] = [];
    const textDecoder = new TextDecoder();

    for (let i = 0; i < tokens.length; i += chunkSize) {
        const chunk = tokens.slice(i, i + chunkSize);
        const decodedChunk = textDecoder.decode(encoding.decode(chunk));

        // Append bleed characters from the previous chunk
        const startBleed = i > 0 ? content.slice(i - bleed, i) : "";
        // Append bleed characters from the next chunk
        const endBleed =
            i + chunkSize < tokens.length
                ? content.slice(i + chunkSize, i + chunkSize + bleed)
                : "";

        chunks.push(startBleed + decodedChunk + endBleed);
    }

    return chunks;
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
}): Promise<boolean> {
    let retryDelay = 1000;

    const stop = Array.from(new Set([
        ... (models[modelClass].settings.stop || []),
        ['\n']
    ])) as string[];

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
            console.error("Error in generateTrueOrFalse:", error);
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
    context = "",
    modelClass, // "tiny", "fast", "slow"
}): Promise<string[]> {
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
            console.error("Error in generateTextArray:", error);
        }

        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        retryDelay *= 2;
    }
}

export async function generateObjectArray({
    runtime,
    context = "",
    modelClass,
}): Promise<any[]> {
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
            console.error("Error in generateTextArray:", error);
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
    context = "",
    modelClass
}): Promise<Content> {
    console.log("modelClass", modelClass)
    const model = models[modelClass];
    console.log("model is", model)
    const max_context_length = model.settings.maxInputTokens;
    context = runtime.trimTokens(context, max_context_length, "gpt-4o-mini");
    let retryLength = 1000; // exponential backoff
    while (true) {
        try {
            const response = await generateText({
                runtime,
                context,
                modelClass,
            });
            console.log("response is", response)
            // try parsing the response as JSON, if null then try again
            const parsedContent = parseJSONObjectFromText(response) as Content;
            console.log("parsedContent is", parsedContent)
            if (!parsedContent) {
                console.log("parsedContent is null, retrying")
                continue;
            }

            return parsedContent;
        } catch (error) {
            console.error("ERROR:", error);
            // wait for 2 seconds
            retryLength *= 2;
            await new Promise((resolve) => setTimeout(resolve, retryLength));
            console.log("Retrying...");
        }
    }
    throw new Error(
        "Failed to complete message after 5 tries, probably a network connectivity, model or API key issue",
    );
}