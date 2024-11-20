import {
    formatActors,
    formatMessages,
    getActorDetails,
    formatTimestamp,
} from "../messages.ts";
import { IAgentRuntime, Actor, Content, Memory, UUID } from "../types.ts";
import { describe, test, expect, vi, beforeAll } from "vitest";

describe("Messages Library", () => {
    let runtime: IAgentRuntime;
    let actors: Actor[];
    let userId: UUID;

    beforeAll(() => {
        // Mock runtime with necessary methods
        runtime = {
            databaseAdapter: {
                // Using vi.fn() instead of jest.fn()
                getParticipantsForRoom: vi.fn(),
                getAccountById: vi.fn(),
            },
        } as unknown as IAgentRuntime;

        // Mock user data with proper UUID format
        userId = "12345678-1234-1234-1234-123456789abc" as UUID;
        actors = [
            {
                id: userId,
                name: "Test User",
                username: "testuser",
                details: {
                    tagline: "A test user",
                    summary: "This is a test user for the system.",
                    quote: "",
                },
            },
        ];
    });

    test("getActorDetails should return actors based on roomId", async () => {
        const roomId: UUID = "room1234-1234-1234-1234-123456789abc" as UUID;

        // Using vi.mocked() type assertion instead of jest.Mock casting
        vi.mocked(
            runtime.databaseAdapter.getParticipantsForRoom
        ).mockResolvedValue([userId]);
        vi.mocked(runtime.databaseAdapter.getAccountById).mockResolvedValue({
            id: userId,
            name: "Test User",
            username: "testuser",
            details: {
                tagline: "A test user",
                summary: "This is a test user for the system.",
            },
        });

        const result = await getActorDetails({ runtime, roomId });

        expect(result.length).toBeGreaterThan(0);
        expect(result[0].name).toBe("Test User");
        expect(result[0].details?.tagline).toBe("A test user");
    });

    test("formatActors should format actors into a readable string", () => {
        const formattedActors = formatActors({ actors });

        expect(formattedActors).toContain("Test User");
        expect(formattedActors).toContain("A test user");
        expect(formattedActors).toContain(
            "This is a test user for the system."
        );
    });

    test("formatMessages should format messages into a readable string", () => {
        const messages: Memory[] = [
            {
                content: { text: "Hello, world!" } as Content,
                userId: userId,
                roomId: "room1234-1234-1234-1234-123456789abc" as UUID,
                createdAt: new Date().getTime(),
                agentId: "" as UUID, // assuming agentId is an empty string here
            },
        ];

        const formattedMessages = formatMessages({ messages, actors });

        // Assertions
        expect(formattedMessages).toContain("Hello, world!");
        expect(formattedMessages).toContain("Test User");
    });

    test("formatTimestamp should return correct time string", () => {
        const timestamp = new Date().getTime() - 60000; // 1 minute ago
        const result = formatTimestamp(timestamp);

        // Assertions
        expect(result).toBe("1 minute ago");
    });

    test("formatMessages should include attachments if present", () => {
        const messages: Memory[] = [
            {
                content: {
                    text: "Check this attachment",
                    attachments: [
                        {
                            id: "1",
                            title: "Image",
                            url: "http://example.com/image.jpg",
                        },
                    ],
                } as Content,
                userId: userId,
                roomId: "room1234-1234-1234-1234-123456789abc" as UUID,
                createdAt: new Date().getTime(),
                agentId: "" as UUID, // assuming agentId is an empty string here
            },
        ];

        const formattedMessages = formatMessages({ messages, actors });

        // Assertions
        expect(formattedMessages).toContain("Check this attachment");
        expect(formattedMessages).toContain(
            "Attachments: [1 - Image (http://example.com/image.jpg)]"
        );
    });

    test("formatMessages should handle empty attachments gracefully", () => {
        const messages: Memory[] = [
            {
                content: {
                    text: "No attachments here",
                } as Content,
                userId: userId,
                roomId: "room1234-1234-1234-1234-123456789abc" as UUID,
                createdAt: new Date().getTime(),
                agentId: "" as UUID, // assuming agentId is an empty string here
            },
        ];

        const formattedMessages = formatMessages({ messages, actors });

        // Assertions
        expect(formattedMessages).toContain("No attachments here");
        expect(formattedMessages).not.toContain("Attachments");
    });
});
