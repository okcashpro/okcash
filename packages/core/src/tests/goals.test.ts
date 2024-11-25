import {
    getGoals,
    formatGoalsAsString,
    updateGoal,
    createGoal,
} from "../goals.ts";
import {
    Goal,
    GoalStatus,
    IAgentRuntime,
    Memory,
    State,
    UUID,
    Service,
    ServiceType,
} from "../types";
import { CacheManager, MemoryCacheAdapter } from "../cache.ts";
import { describe, expect, vi, beforeEach } from "vitest";

// Mock the database adapter
export const mockDatabaseAdapter = {
    getGoals: vi.fn(),
    updateGoal: vi.fn(),
    createGoal: vi.fn(),
};

const services = new Map<ServiceType, Service>();

// Mock the runtime
export const mockRuntime: IAgentRuntime = {
    databaseAdapter: mockDatabaseAdapter as any,
    cacheManager: new CacheManager(new MemoryCacheAdapter()),
    agentId: "qweqew-qweqwe-qweqwe-qweqwe-qweeqw",
    serverUrl: "",
    token: null,
    messageManager: {
        addEmbeddingToMemory: function (_memory: Memory): Promise<Memory> {
            throw new Error("Function not implemented.");
        },
        getMemories: function (_opts: {
            roomId: UUID;
            count?: number;
            unique?: boolean;
            agentId?: UUID;
            start?: number;
            end?: number;
        }): Promise<Memory[]> {
            throw new Error("Function not implemented.");
        },
        getCachedEmbeddings: function (
            _content: string
        ): Promise<{ embedding: number[]; levenshtein_score: number }[]> {
            throw new Error("Function not implemented.");
        },
        getMemoryById: function (_id: UUID): Promise<Memory | null> {
            throw new Error("Function not implemented.");
        },
        getMemoriesByRoomIds: function (_params: {
            roomIds: UUID[];
            agentId?: UUID;
        }): Promise<Memory[]> {
            throw new Error("Function not implemented.");
        },
        searchMemoriesByEmbedding: function (
            _embedding: number[],
            _opts: {
                match_threshold?: number;
                count?: number;
                roomId: UUID;
                unique?: boolean;
                agentId?: UUID;
            }
        ): Promise<Memory[]> {
            throw new Error("Function not implemented.");
        },
        createMemory: function (
            _memory: Memory,
            _unique?: boolean
        ): Promise<void> {
            throw new Error("Function not implemented.");
        },
        removeMemory: function (_memoryId: UUID): Promise<void> {
            throw new Error("Function not implemented.");
        },
        removeAllMemories: function (_roomId: UUID): Promise<void> {
            throw new Error("Function not implemented.");
        },
        countMemories: function (
            _roomId: UUID,
            _unique?: boolean
        ): Promise<number> {
            throw new Error("Function not implemented.");
        },
    },
    descriptionManager: {
        addEmbeddingToMemory: function (_memory: Memory): Promise<Memory> {
            throw new Error("Function not implemented.");
        },
        getMemories: function (_opts: {
            roomId: UUID;
            count?: number;
            unique?: boolean;
            agentId?: UUID;
            start?: number;
            end?: number;
        }): Promise<Memory[]> {
            throw new Error("Function not implemented.");
        },
        getCachedEmbeddings: function (
            _content: string
        ): Promise<{ embedding: number[]; levenshtein_score: number }[]> {
            throw new Error("Function not implemented.");
        },
        getMemoryById: function (_id: UUID): Promise<Memory | null> {
            throw new Error("Function not implemented.");
        },
        getMemoriesByRoomIds: function (_params: {
            roomIds: UUID[];
            agentId?: UUID;
        }): Promise<Memory[]> {
            throw new Error("Function not implemented.");
        },
        searchMemoriesByEmbedding: function (
            _embedding: number[],
            _opts: {
                match_threshold?: number;
                count?: number;
                roomId: UUID;
                unique?: boolean;
                agentId?: UUID;
            }
        ): Promise<Memory[]> {
            throw new Error("Function not implemented.");
        },
        createMemory: function (
            _memory: Memory,
            _unique?: boolean
        ): Promise<void> {
            throw new Error("Function not implemented.");
        },
        removeMemory: function (_memoryId: UUID): Promise<void> {
            throw new Error("Function not implemented.");
        },
        removeAllMemories: function (_roomId: UUID): Promise<void> {
            throw new Error("Function not implemented.");
        },
        countMemories: function (
            _roomId: UUID,
            _unique?: boolean
        ): Promise<number> {
            throw new Error("Function not implemented.");
        },
    },
    loreManager: {
        addEmbeddingToMemory: function (_memory: Memory): Promise<Memory> {
            throw new Error("Function not implemented.");
        },
        getMemories: function (_opts: {
            roomId: UUID;
            count?: number;
            unique?: boolean;
            agentId?: UUID;
            start?: number;
            end?: number;
        }): Promise<Memory[]> {
            throw new Error("Function not implemented.");
        },
        getCachedEmbeddings: function (
            _content: string
        ): Promise<{ embedding: number[]; levenshtein_score: number }[]> {
            throw new Error("Function not implemented.");
        },
        getMemoryById: function (_id: UUID): Promise<Memory | null> {
            throw new Error("Function not implemented.");
        },
        getMemoriesByRoomIds: function (_params: {
            roomIds: UUID[];
            agentId?: UUID;
        }): Promise<Memory[]> {
            throw new Error("Function not implemented.");
        },
        searchMemoriesByEmbedding: function (
            _embedding: number[],
            _opts: {
                match_threshold?: number;
                count?: number;
                roomId: UUID;
                unique?: boolean;
                agentId?: UUID;
            }
        ): Promise<Memory[]> {
            throw new Error("Function not implemented.");
        },
        createMemory: function (
            _memory: Memory,
            _unique?: boolean
        ): Promise<void> {
            throw new Error("Function not implemented.");
        },
        removeMemory: function (_memoryId: UUID): Promise<void> {
            throw new Error("Function not implemented.");
        },
        removeAllMemories: function (_roomId: UUID): Promise<void> {
            throw new Error("Function not implemented.");
        },
        countMemories: function (
            _roomId: UUID,
            _unique?: boolean
        ): Promise<number> {
            throw new Error("Function not implemented.");
        },
    },
    ensureRoomExists: function (_roomId: UUID): Promise<void> {
        throw new Error("Function not implemented.");
    },
    composeState: function (
        _message: Memory,
        _additionalKeys?: { [key: string]: unknown }
    ): Promise<State> {
        throw new Error("Function not implemented.");
    },
    updateRecentMessageState: function (_state: State): Promise<State> {
        throw new Error("Function not implemented.");
    },
    getService: function <T extends Service>(
        serviceType: ServiceType
    ): T | null {
        return (services.get(serviceType) as T) || null;
    },
    plugins: [],
    initialize: function (): Promise<void> {
        throw new Error("Function not implemented.");
    },
};

// Sample data
const sampleGoal: Goal = {
    id: "goal-id" as UUID,
    roomId: "room-id" as UUID,
    userId: "user-id" as UUID,
    name: "Test Goal",
    objectives: [
        { description: "Objective 1", completed: false },
        { description: "Objective 2", completed: true },
    ],
    status: GoalStatus.IN_PROGRESS,
};

describe("getGoals", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("retrieves goals successfully", async () => {
        mockDatabaseAdapter.getGoals.mockResolvedValue([sampleGoal]);

        const result = await getGoals({
            runtime: mockRuntime,
            roomId: "room-id" as UUID,
        });

        expect(result).toEqual([sampleGoal]);
    });

    it("handles errors when retrieving goals", async () => {
        mockDatabaseAdapter.getGoals.mockRejectedValue(
            new Error("Failed to retrieve goals")
        );

        await expect(
            getGoals({
                runtime: mockRuntime,
                roomId: "room-id" as UUID,
            })
        ).rejects.toThrow("Failed to retrieve goals");
    });
});

describe("formatGoalsAsString", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("formats goals correctly", () => {
        const formatted = formatGoalsAsString({ goals: [sampleGoal] });
        expect(formatted).toContain("Goal: Test Goal");
        expect(formatted).toContain("- [ ] Objective 1  (IN PROGRESS)");
        expect(formatted).toContain("- [x] Objective 2  (DONE)");
    });

    it("handles empty goals array", () => {
        const formatted = formatGoalsAsString({ goals: [] });
        expect(formatted).toBe("");
    });
});

describe("updateGoal", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("updates a goal successfully", async () => {
        mockDatabaseAdapter.updateGoal.mockResolvedValue(undefined);

        await expect(
            updateGoal({ runtime: mockRuntime, goal: sampleGoal })
        ).resolves.not.toThrow();

        expect(mockDatabaseAdapter.updateGoal).toHaveBeenCalledWith(sampleGoal);
    });

    it("handles errors when updating a goal", async () => {
        mockDatabaseAdapter.updateGoal.mockRejectedValue(
            new Error("Failed to update goal")
        );

        await expect(
            updateGoal({ runtime: mockRuntime, goal: sampleGoal })
        ).rejects.toThrow("Failed to update goal");
    });
});

describe("createGoal", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("creates a goal successfully", async () => {
        mockDatabaseAdapter.createGoal.mockResolvedValue(undefined);

        await expect(
            createGoal({ runtime: mockRuntime, goal: sampleGoal })
        ).resolves.not.toThrow();

        expect(mockDatabaseAdapter.createGoal).toHaveBeenCalledWith(sampleGoal);
    });

    it("handles errors when creating a goal", async () => {
        mockDatabaseAdapter.createGoal.mockRejectedValue(
            new Error("Failed to create goal")
        );

        await expect(
            createGoal({ runtime: mockRuntime, goal: sampleGoal })
        ).rejects.toThrow("Failed to create goal");
    });
});
