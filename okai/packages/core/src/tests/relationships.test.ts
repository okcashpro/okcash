import {
    createRelationship,
    getRelationship,
    getRelationships,
    formatRelationships,
} from "../relationships";
import { IAgentRuntime, type Relationship, type UUID } from "../types";
import { describe, expect, vi } from "vitest";

// Mock runtime and databaseAdapter
const mockDatabaseAdapter = {
    createRelationship: vi.fn(),
    getRelationship: vi.fn(),
    getRelationships: vi.fn(),
};
const mockRuntime: IAgentRuntime = {
    databaseAdapter: mockDatabaseAdapter,
} as unknown as IAgentRuntime;

describe("Relationships Module", () => {
    // Helper function to generate random UUIDs
    const generateRandomUUID = (): UUID => crypto.randomUUID() as UUID;

    // Randomized UUIDs for each test run
    const mockUserA: UUID = generateRandomUUID();
    const mockUserB: UUID = generateRandomUUID();
    const mockUserId: UUID = generateRandomUUID();

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("createRelationship", () => {
        it("should call createRelationship on the databaseAdapter with correct parameters", async () => {
            mockDatabaseAdapter.createRelationship.mockResolvedValue(true);

            const result = await createRelationship({
                runtime: mockRuntime,
                userA: mockUserA,
                userB: mockUserB,
            });

            expect(mockDatabaseAdapter.createRelationship).toHaveBeenCalledWith(
                {
                    userA: mockUserA,
                    userB: mockUserB,
                }
            );
            expect(result).toBe(true);
        });

        it("should handle errors from databaseAdapter", async () => {
            mockDatabaseAdapter.createRelationship.mockRejectedValue(
                new Error("Database error")
            );

            await expect(
                createRelationship({
                    runtime: mockRuntime,
                    userA: mockUserA,
                    userB: mockUserB,
                })
            ).rejects.toThrow("Database error");
        });
    });

    describe("getRelationship", () => {
        it("should call getRelationship on the databaseAdapter with correct parameters", async () => {
            const mockRelationship: Relationship = {
                userA: mockUserA,
                userB: mockUserB,
                id: generateRandomUUID(),
                userId: generateRandomUUID(),
                roomId: generateRandomUUID(),
                status: "STATUS",
            };
            mockDatabaseAdapter.getRelationship.mockResolvedValue(
                mockRelationship
            );

            const result = await getRelationship({
                runtime: mockRuntime,
                userA: mockUserA,
                userB: mockUserB,
            });

            expect(mockDatabaseAdapter.getRelationship).toHaveBeenCalledWith({
                userA: mockUserA,
                userB: mockUserB,
            });
            expect(result).toEqual(mockRelationship);
        });
    });

    describe("getRelationships", () => {
        it("should call getRelationships on the databaseAdapter with correct parameters", async () => {
            const mockRelationships: Relationship[] = [
                {
                    userA: mockUserA,
                    userB: mockUserB,
                    id: generateRandomUUID(),
                    userId: generateRandomUUID(),
                    roomId: generateRandomUUID(),
                    status: generateRandomUUID(),
                },
                {
                    userA: mockUserB,
                    userB: mockUserId,
                    id: generateRandomUUID(),
                    userId: generateRandomUUID(),
                    roomId: generateRandomUUID(),
                    status: "",
                },
            ];
            mockDatabaseAdapter.getRelationships.mockResolvedValue(
                mockRelationships
            );

            const result = await getRelationships({
                runtime: mockRuntime,
                userId: mockUserA,
            });

            expect(mockDatabaseAdapter.getRelationships).toHaveBeenCalledWith({
                userId: mockUserA,
            });
            expect(result).toEqual(mockRelationships);
        });
    });

    describe("formatRelationships", () => {
        it("should format relationships correctly", async () => {
            const mockRelationships: Relationship[] = [
                {
                    userA: mockUserA,
                    userB: mockUserB,
                    id: generateRandomUUID(),
                    userId: generateRandomUUID(),
                    roomId: generateRandomUUID(),
                    status: "STATUS",
                },
                {
                    userA: mockUserB,
                    userB: mockUserId,
                    id: generateRandomUUID(),
                    userId: generateRandomUUID(),
                    roomId: generateRandomUUID(),
                    status: "STATUS",
                },
            ];
            mockDatabaseAdapter.getRelationships.mockResolvedValue(
                mockRelationships
            );

            const result = await formatRelationships({
                runtime: mockRuntime,
                userId: mockUserA,
            });

            expect(mockDatabaseAdapter.getRelationships).toHaveBeenCalledWith({
                userId: mockUserA,
            });
            expect(result[0]).toEqual(mockUserB);
        });

        it("should return an empty array if no relationships exist", async () => {
            mockDatabaseAdapter.getRelationships.mockResolvedValue([]);

            const result = await formatRelationships({
                runtime: mockRuntime,
                userId: mockUserId,
            });

            expect(mockDatabaseAdapter.getRelationships).toHaveBeenCalledWith({
                userId: mockUserId,
            });
            expect(result).toEqual([]);
        });
    });
});
