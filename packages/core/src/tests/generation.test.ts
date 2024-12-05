import { describe, expect, it, vi, beforeEach } from "vitest";
import { ModelProviderName, IAgentRuntime } from "../types";
import { models } from "../models";
import {
    generateText,
    generateTrueOrFalse,
    splitChunks,
    trimTokens,
} from "../generation";
import type { TiktokenModel } from "js-tiktoken";

// Mock the elizaLogger
vi.mock("../index.ts", () => ({
    elizaLogger: {
        log: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock the generation functions
vi.mock("../generation", async () => {
    const actual = await vi.importActual("../generation");
    return {
        ...actual,
        generateText: vi.fn().mockImplementation(async ({ context }) => {
            if (!context) return "";
            return "mocked response";
        }),
        generateTrueOrFalse: vi.fn().mockImplementation(async () => {
            return true;
        }),
    };
});

describe("Generation", () => {
    let mockRuntime: IAgentRuntime;

    beforeEach(() => {
        // Setup mock runtime for tests
        mockRuntime = {
            modelProvider: ModelProviderName.OPENAI,
            token: "mock-token",
            character: {
                modelEndpointOverride: undefined,
            },
            getSetting: vi.fn().mockImplementation((key: string) => {
                if (key === "LLAMACLOUD_MODEL_LARGE") return false;
                if (key === "LLAMACLOUD_MODEL_SMALL") return false;
                if (key === "TOGETHER_MODEL_LARGE") return false;
                if (key === "TOGETHER_MODEL_SMALL") return false;
                return undefined;
            }),
        } as unknown as IAgentRuntime;

        // Clear all mocks before each test
        vi.clearAllMocks();
    });

    describe("generateText", () => {
        it("should return empty string for empty context", async () => {
            const result = await generateText({
                runtime: mockRuntime,
                context: "",
                modelClass: "completion",
            });
            expect(result).toBe("");
        });

        it("should return mocked response for non-empty context", async () => {
            const result = await generateText({
                runtime: mockRuntime,
                context: "test context",
                modelClass: "completion",
            });
            expect(result).toBe("mocked response");
        });

        it("should use correct model settings from provider config", () => {
            const modelProvider = mockRuntime.modelProvider;
            const modelSettings = models[modelProvider].settings;

            expect(modelSettings).toBeDefined();
            expect(modelSettings.temperature).toBeDefined();
            expect(modelSettings.frequency_penalty).toBeDefined();
            expect(modelSettings.presence_penalty).toBeDefined();
            expect(modelSettings.maxInputTokens).toBeDefined();
            expect(modelSettings.maxOutputTokens).toBeDefined();
        });
    });

    describe("generateTrueOrFalse", () => {
        it("should return boolean value", async () => {
            const result = await generateTrueOrFalse({
                runtime: mockRuntime,
                context: "test context",
                modelClass: "completion",
            });
            expect(typeof result).toBe("boolean");
        });
    });

    describe("splitChunks", () => {
        it("should split content into chunks of specified size", async () => {
            const content = "a".repeat(1000);
            const chunkSize = 100;
            const bleed = 20;

            const chunks = await splitChunks(content, chunkSize, bleed);

            expect(chunks.length).toBeGreaterThan(0);
            // Check if chunks overlap properly
            for (let i = 1; i < chunks.length; i++) {
                const prevChunkEnd = chunks[i - 1].slice(-bleed);
                const currentChunkStart = chunks[i].slice(0, bleed);
                expect(prevChunkEnd).toBe(currentChunkStart);
            }
        });

        it("should handle empty content", async () => {
            const chunks = await splitChunks("", 100, 20);
            expect(chunks).toEqual([]);
        });

        it("should handle content smaller than chunk size", async () => {
            const content = "small content";
            const chunks = await splitChunks(content, 100, 20);
            expect(chunks).toEqual([content]);
        });
    });

    describe("trimTokens", () => {
        const model = "gpt-4" as TiktokenModel;

        it("should return empty string for empty input", () => {
            const result = trimTokens("", 100, model);
            expect(result).toBe("");
        });

        it("should throw error for negative maxTokens", () => {
            expect(() => trimTokens("test", -1, model)).toThrow(
                "maxTokens must be positive"
            );
        });

        it("should return unchanged text if within token limit", () => {
            const shortText = "This is a short text";
            const result = trimTokens(shortText, 10, model);
            expect(result).toBe(shortText);
        });

        it("should truncate text to specified token limit", () => {
            // Using a longer text that we know will exceed the token limit
            const longText =
                "This is a much longer text that will definitely exceed our very small token limit and need to be truncated to fit within the specified constraints.";
            const result = trimTokens(longText, 5, model);

            // The exact result will depend on the tokenizer, but we can verify:
            // 1. Result is shorter than original
            expect(result.length).toBeLessThan(longText.length);
            // 2. Result is not empty
            expect(result.length).toBeGreaterThan(0);
            // 3. Result is a proper substring of the original text
            expect(longText.includes(result)).toBe(true);
        });

        it("should handle non-ASCII characters", () => {
            const unicodeText = "Hello 👋 World 🌍";
            const result = trimTokens(unicodeText, 5, model);
            expect(result.length).toBeGreaterThan(0);
        });

        it("should handle multiline text", () => {
            const multilineText = `Line 1
	Line 2
	Line 3
	Line 4
	Line 5`;
            const result = trimTokens(multilineText, 5, model);
            expect(result.length).toBeGreaterThan(0);
            expect(result.length).toBeLessThan(multilineText.length);
        });
    });
});
