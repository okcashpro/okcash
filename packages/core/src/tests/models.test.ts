import { getModel, getEndpoint } from "../models.ts";
import { ModelProviderName, ModelClass } from "../types.ts";
import { describe, test, expect, vi } from "vitest";

vi.mock("../settings", () => {
    return {
        default: {
            SMALL_OPENROUTER_MODEL: "mock-small-model",
            OPENROUTER_MODEL: "mock-default-model",
            OPENAI_API_KEY: "mock-openai-key",
            ANTHROPIC_API_KEY: "mock-anthropic-key",
            OPENROUTER_API_KEY: "mock-openrouter-key",
        },
        loadEnv: vi.fn(),
    };
});

describe("Model Provider Tests", () => {
    test("should retrieve the correct model for OpenAI SMALL", () => {
        const model = getModel(ModelProviderName.OPENAI, ModelClass.SMALL);
        expect(model).toBe("gpt-4o-mini");
    });

    test("should retrieve the correct model for Google MEDIUM", () => {
        const model = getModel(ModelProviderName.GOOGLE, ModelClass.MEDIUM);
        expect(model).toBe("gemini-1.5-flash-latest");
    });

    test("should retrieve the correct model for Groq LARGE", () => {
        const model = getModel(ModelProviderName.GROQ, ModelClass.LARGE);
        expect(model).toBe("llama-3.2-90b-text-preview");
    });

    test("should retrieve the correct model for OpenRouter SMALL", () => {
        const model = getModel(ModelProviderName.OPENROUTER, ModelClass.SMALL);
        expect(model).toBe("mock-small-model");
    });

    test("should retrieve the correct endpoint for OpenAI", () => {
        const endpoint = getEndpoint(ModelProviderName.OPENAI);
        expect(endpoint).toBe("https://api.openai.com/v1");
    });

    test("should retrieve the correct endpoint for Anthropic", () => {
        const endpoint = getEndpoint(ModelProviderName.ANTHROPIC);
        expect(endpoint).toBe("https://api.anthropic.com/v1");
    });

    test("should handle invalid model provider for getModel", () => {
        expect(() =>
            getModel("INVALID_PROVIDER" as any, ModelClass.SMALL)
        ).toThrow();
    });
});
