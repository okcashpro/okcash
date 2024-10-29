// TODO:
// get modelType from runtime, and init runtime with modeltype, maybe we can do a smort thing and check the available models by key
// figure out embedding solution for claude... you're gonna need openai for embeddings lol
// add openrouter? someone else can do that


// 3 kinds of models
// - tiny for things that happen every time we do something, like handleResponse
// - fast for things like summarize, ethics
// - slow for things like creative writing and responses
// - not all model providers provide embeddings

import { Model, ModelProvider } from "./types";

// TODO: add openrouter ;)
type Models = {
    [ModelProvider.OPENAI]: Model;
    [ModelProvider.CLAUDE]: Model;
    [ModelProvider.GROK]: Model;
    [ModelProvider.LLAMACLOUD]: Model;
    [ModelProvider.LLAMALOCAL]: Model;
    [ModelProvider.GOOGLE]: Model;
    [ModelProvider.CLAUDE_VERTEX]: Model;
};

const models: Models = {
    [ModelProvider.OPENAI]: {
        "endpoint": "https://api.openai.com/v1",
        "settings": {
            "stop": [],
            "maxInputTokens": 128000,
            "maxOutputTokens": 8192,
            "frequency_penalty": 0.0,
            "presence_penalty": 0.0,
            "temperature": 0.3,
        },
        "model": {
            "tiny": {
                "model": "gpt-4o-mini",
            },
            "fast": {
                "model": "gpt-4o-mini",
            },
            "slow": {
                "model": "gpt-4o",
            },
            "embedding": "text-embedding-3-small"
        }
    },
    [ModelProvider.CLAUDE]: {
        "settings": {
            "stop": [],
            "maxInputTokens": 200000,
            "maxOutputTokens": 8192,
            "frequency_penalty": 0.0,
            "presence_penalty": 0.0,
            "temperature": 0.3,
        },
        "endpoint": "https://api.anthropic.com/v1",
        "model": {
            "tiny": {
                "model": "claude-3-haiku",
            },
            "fast": {
                "model": "claude-3-5-sonnet",
            },
            "slow": {
                "model": "claude-3-opus",
            },
            "embedding": "grok-2-beta"
        },
    },
    [ModelProvider.CLAUDE_VERTEX]: {
        "settings": {
            "stop": [],
            "maxInputTokens": 200000,
            "maxOutputTokens": 8192,
            "frequency_penalty": 0.0,
            "presence_penalty": 0.0,
            "temperature": 0.3,
        },
        "endpoint": "https://api.anthropic.com/v1", // TODO: check
        "model": {
            "tiny": {
                "model": "claude-3-haiku",
            },
            "fast": {
                "model": "claude-3-5-sonnet",
            },
            "slow": {
                "model": "claude-3-opus",
            },
            "embedding": "grok-2-beta"
        },
    },
    [ModelProvider.GROK]: {
        "settings": {
            "stop": [],
            "maxInputTokens": 128000,
            "maxOutputTokens": 8192,
            "frequency_penalty": 0.0,
            "presence_penalty": 0.0,
            "temperature": 0.3,
        },
        "endpoint": "https://api.x.ai/v1",
        "model": {
            "tiny": {
                "model": "grok-2-beta",
            },
            "fast": {
                "model": "grok-2-beta",
            },
            "slow": {
                "model": "grok-2-beta",
            },
            "embedding": "grok-2-beta"
        },
    },
    [ModelProvider.LLAMACLOUD]: {
        "settings": {
            "stop": [],
            "maxInputTokens": 128000,
            "maxOutputTokens": 8192,
            "repetition_penalty": 0.0,
            "temperature": 0.3,
        },
        "endpoint": "https://api.llamacloud.com/v1",
        "model": {
            "tiny": {
                "model": "meta-llama/Llama-3.2-3B-Instruct-Turbo",
            },
            "fast": {
                "model": "meta-llama-3.1-8b-instruct",
            },
            "slow": {
                "model": "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
            },
            "embedding": "togethercomputer/m2-bert-80M-32k-retrieval"
        },
    },
    [ModelProvider.LLAMALOCAL]: {
        "settings": {
            "stop": ["<|eot_id|>","<|eom_id|>"],
            "maxInputTokens": 200000,
            "maxOutputTokens": 8192,
            "repetition_penalty": 0.0,
            "temperature": 0.3,
        },
        "model": {
            "tiny": {
                "model": "bartowski/Llama-3.2-3B-Instruct-GGUF",
            },
            "fast": {
                "model": "NousResearch/Hermes-3-Llama-3.1-8B-GGUF/resolve/main/Hermes-3-Llama-3.1-8B.Q8_0.gguf", // TODO: ?download=true
            },
            "slow": {
                "model": "NousResearch/Hermes-3-Llama-3.1-8B-GGUF/resolve/main/Hermes-3-Llama-3.1-8B.Q8_0.gguf", // TODO: ?download=true
            },
            "embedding": "togethercomputer/m2-bert-80M-32k-retrieval"
        },
    },
    [ModelProvider.GOOGLE]: {
        "settings": {
            "stop": [],
            "maxInputTokens": 128000,
            "maxOutputTokens": 8192,
            "frequency_penalty": 0.0,
            "presence_penalty": 0.0,
            "temperature": 0.3,
        },
        "model": {
            "tiny": {
                "model": "gemini-1.5-flash",
            },
            "fast": {
                "model": "gemini-1.5-flash",
            },
            "slow": {
                "model": "gemini-1.5-pro",
            },
            "embedding": "text-embedding-004",
        }
    }
}

export function getModel(provider: ModelProvider, type: "tiny" | "fast" | "slow" | "embedding") {
    return models[provider].model[type];
}

export function getEndpoint(provider: ModelProvider) {
    return models[provider].endpoint;
}

export default models;