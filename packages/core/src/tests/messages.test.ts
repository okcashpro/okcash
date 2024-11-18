import {
    formatActors,
    formatMessages,
    getActorDetails,
    formatTimestamp,
} from "../messages.ts";
import { IAgentRuntime, Actor, Content, Memory, UUID } from "../types.ts";

describe("Messages Library", () => {
    let runtime: IAgentRuntime;
    let actors: Actor[];
    let userId: UUID;

    beforeAll(() => {
        // Mock runtime with necessary methods
        runtime = {
            databaseAdapter: {
                // Casting to a Jest mock function
                getParticipantsForRoom: jest.fn(),
                getAccountById: jest.fn(),
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
        // Mocking the database adapter methods
        const roomId: UUID = "room1234-1234-1234-1234-123456789abc" as UUID;

        // Properly mocking the resolved values of the mocked methods
        (
            runtime.databaseAdapter.getParticipantsForRoom as jest.Mock
        ).mockResolvedValue([userId]);
        (runtime.databaseAdapter.getAccountById as jest.Mock).mockResolvedValue(
            {
                id: userId,
                name: "Test User",
                username: "testuser",
                details: {
                    tagline: "A test user",
                    summary: "This is a test user for the system.",
                },
            }
        );

        // Calling the function under test
        const result = await getActorDetails({ runtime, roomId });

        // Assertions
        expect(result.length).toBeGreaterThan(0);
        expect(result[0].name).toBe("Test User");
        expect(result[0].details?.tagline).toBe("A test user");
    });

    test("formatActors should format actors into a readable string", () => {
        const formattedActors = formatActors({ actors });

        // Assertions
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
