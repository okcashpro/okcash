import { Model, ModelProvider, ModelClass } from "./types.ts";

type Models = {
    [ModelProvider.OPENAI]: Model;
    [ModelProvider.ANTHROPIC]: Model;
    [ModelProvider.GROK]: Model;
    [ModelProvider.LLAMACLOUD]: Model;
    [ModelProvider.LLAMALOCAL]: Model;
    [ModelProvider.GOOGLE]: Model;
    [ModelProvider.CLAUDE_VERTEX]: Model;
    // TODO: add OpenRouter - feel free to do this :)
};

const models: Models = {
    [ModelProvider.OPENAI]: {
        endpoint: "https://api.openai.com/v1",
        settings: {
            stop: [],
            maxInputTokens: 128000,
            maxOutputTokens: 8192,
            frequency_penalty: 0.0,
            presence_penalty: 0.0,
            temperature: 0.3,
        },
        model: {
            [ModelClass.SMALL]: "gpt-4o-mini",
            [ModelClass.MEDIUM]: "gpt-4o",
            [ModelClass.LARGE]: "gpt-4o",
            [ModelClass.EMBEDDING]: "text-embedding-3-small",
        },
    },
    [ModelProvider.ANTHROPIC]: {
        settings: {
            stop: [],
            maxInputTokens: 200000,
            maxOutputTokens: 8192,
            frequency_penalty: 0.0,
            presence_penalty: 0.0,
            temperature: 0.3,
        },
        endpoint: "https://api.anthropic.com/v1",
        model: {
            [ModelClass.SMALL]: "claude-3-haiku",
            [ModelClass.MEDIUM]: "claude-3-5-sonnet",
            [ModelClass.LARGE]: "claude-3-opus",
        },
    },
    [ModelProvider.CLAUDE_VERTEX]: {
        settings: {
            stop: [],
            maxInputTokens: 200000,
            maxOutputTokens: 8192,
            frequency_penalty: 0.0,
            presence_penalty: 0.0,
            temperature: 0.3,
        },
        endpoint: "https://api.anthropic.com/v1", // TODO: check
        model: {
            [ModelClass.SMALL]: "claude-3-haiku",
            [ModelClass.MEDIUM]: "claude-3-5-sonnet",
            [ModelClass.LARGE]: "claude-3-opus",
        },
    },
    [ModelProvider.GROK]: {
        settings: {
            stop: [],
            maxInputTokens: 128000,
            maxOutputTokens: 8192,
            frequency_penalty: 0.0,
            presence_penalty: 0.0,
            temperature: 0.3,
        },
        endpoint: "https://api.x.ai/v1",
        model: {
            [ModelClass.SMALL]: "grok-2-beta",
            [ModelClass.MEDIUM]: "grok-2-beta",
            [ModelClass.LARGE]: "grok-2-beta",
            [ModelClass.EMBEDDING]: "grok-2-beta", // not sure about this one
        },
    },
    [ModelProvider.LLAMACLOUD]: {
        settings: {
            stop: [],
            maxInputTokens: 128000,
            maxOutputTokens: 8192,
            repetition_penalty: 0.0,
            temperature: 0.3,
        },
        endpoint: "https://api.together.ai/v1",
        model: {
            [ModelClass.SMALL]: "meta-llama/Llama-3.2-3B-Instruct-Turbo",
            [ModelClass.MEDIUM]: "meta-llama-3.1-8b-instruct",
            [ModelClass.LARGE]: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
            [ModelClass.EMBEDDING]:
                "togethercomputer/m2-bert-80M-32k-retrieval",
        },
    },
    [ModelProvider.LLAMALOCAL]: {
        settings: {
            stop: ["<|eot_id|>", "<|eom_id|>"],
            maxInputTokens: 32768,
            maxOutputTokens: 8192,
            repetition_penalty: 0.0,
            temperature: 0.3,
        },
        model: {
            [ModelClass.SMALL]: "NousResearch/Hermes-3-Llama-3.1-8B-GGUF/resolve/main/Hermes-3-Llama-3.1-8B.Q8_0.gguf?download=true",
            [ModelClass.MEDIUM]:
                "NousResearch/Hermes-3-Llama-3.1-8B-GGUF/resolve/main/Hermes-3-Llama-3.1-8B.Q8_0.gguf?download=true", // TODO: ?download=true
            [ModelClass.LARGE]:
            "NousResearch/Hermes-3-Llama-3.1-8B-GGUF/resolve/main/Hermes-3-Llama-3.1-8B.Q8_0.gguf?download=true",
                // "RichardErkhov/NousResearch_-_Meta-Llama-3.1-70B-gguf", // TODO: 
            [ModelClass.EMBEDDING]: "togethercomputer/m2-bert-80M-32k-retrieval"
        },
    },
    [ModelProvider.GOOGLE]: {
        settings: {
            stop: [],
            maxInputTokens: 128000,
            maxOutputTokens: 8192,
            frequency_penalty: 0.0,
            presence_penalty: 0.0,
            temperature: 0.3,
        },
        model: {
            [ModelClass.SMALL]: "gemini-1.5-flash",
            [ModelClass.MEDIUM]: "gemini-1.5-flash",
            [ModelClass.LARGE]: "gemini-1.5-pro",
            [ModelClass.EMBEDDING]: "text-embedding-004",
        },
    },
};

export function getModel(provider: ModelProvider, type: ModelClass) {
    return models[provider].model[type];
}

export function getEndpoint(provider: ModelProvider) {
    return models[provider].endpoint;
}

export default models;
