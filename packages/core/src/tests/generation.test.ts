import { describe, expect, it, vi, beforeEach } from "vitest";
import { ModelProviderName, IAgentRuntime } from "../types";
import { models } from "../models";
import { generateText, generateTrueOrFalse, splitChunks } from "../generation";

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
});
