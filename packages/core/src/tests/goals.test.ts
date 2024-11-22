import {
    createGoal,
    formatGoalsAsString,
    getGoals,
    updateGoal,
} from "../goals";
import {
    type Goal,
    type IAgentRuntime,
    type UUID,
    Action,
    GoalStatus,
    HandlerCallback,
    IMemoryManager,
    Memory,
    ModelProviderName,
    Service,
    ServiceType,
    State,
} from "../types";

import { describe, expect, vi } from "vitest";

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
    token: "",
    modelProvider: ModelProviderName.OPENAI,
    character: {
        id: "qweqew-qweqwe-qweqwe-qweqwe-qweeqw",
        name: "",
        system: "",
        modelProvider: ModelProviderName.OPENAI,
        modelEndpointOverride: "",
        templates: {},
        bio: "",
        lore: [],
        messageExamples: [],
        postExamples: [],
        people: [],
        topics: [],
        adjectives: [],
        knowledge: [],
        clients: [],
        plugins: [],
        settings: {
            secrets: {},
            voice: {
                model: "",
                url: "",
            },
            model: "",
            embeddingModel: "",
        },
        clientConfig: {
            discord: {
                shouldIgnoreBotMessages: false,
                shouldIgnoreDirectMessages: false,
            },
            telegram: {
                shouldIgnoreBotMessages: false,
                shouldIgnoreDirectMessages: false,
            },
        },
        style: {
            all: [],
            chat: [],
            post: [],
        },
    },
    providers: [],
    actions: [],
    evaluators: [],
    messageManager: undefined,
    descriptionManager: undefined,
    loreManager: undefined,
    services: undefined,
    registerMemoryManager: function (_manager: IMemoryManager): void {
        throw new Error("Function not implemented.");
    },
    getMemoryManager: function (_name: string): IMemoryManager | null {
        throw new Error("Function not implemented.");
    },
    registerService: function (service: Service): void {
        services.set(service.serviceType, service);
    },
    getSetting: function (_key: string): string | null {
        throw new Error("Function not implemented.");
    },
    getConversationLength: function (): number {
        throw new Error("Function not implemented.");
    },
    processActions: function (
        _message: Memory,
        _responses: Memory[],
        _state?: State,
        _callback?: HandlerCallback
    ): Promise<void> {
        throw new Error("Function not implemented.");
    },
    evaluate: function (
        _message: Memory,
        _state?: State,
        _didRespond?: boolean
    ): Promise<string[]> {
        throw new Error("Function not implemented.");
    },
    ensureParticipantExists: function (
        _userId: UUID,
        _roomId: UUID
    ): Promise<void> {
        throw new Error("Function not implemented.");
    },
    ensureUserExists: function (
        _userId: UUID,
        _userName: string | null,
        _name: string | null,
        _source: string | null
    ): Promise<void> {
        throw new Error("Function not implemented.");
    },
    registerAction: function (_action: Action): void {
        throw new Error("Function not implemented.");
    },
    ensureConnection: function (
        _userId: UUID,
        _roomId: UUID,
        _userName?: string,
        _userScreenName?: string,
        _source?: string
    ): Promise<void> {
        throw new Error("Function not implemented.");
    },
    ensureParticipantInRoom: function (
        _userId: UUID,
        _roomId: UUID
    ): Promise<void> {
        throw new Error("Function not implemented.");
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
};

// Sample data
const sampleGoal: Goal = {
    id: "goal-id" as UUID,
    name: "Test Goal",
    roomId: "room-id" as UUID,
    userId: "user-id" as UUID,
    objectives: [
        { description: "Objective 1", completed: false },
        { description: "Objective 2", completed: true },
    ],
    status: GoalStatus.IN_PROGRESS,
};

describe("getGoals", () => {
    it("retrieves goals successfully", async () => {
        mockDatabaseAdapter.getGoals.mockResolvedValue([sampleGoal]);

        const result = await getGoals({
            runtime: mockRuntime,
            roomId: "room-id" as UUID,
        });

        expect(result).toEqual([sampleGoal]);
        expect(mockDatabaseAdapter.getGoals).toHaveBeenCalledWith({
            roomId: "room-id",
            userId: undefined,
            onlyInProgress: true,
            count: 5,
        });
    });

    it("handles failure to retrieve goals", async () => {
        mockDatabaseAdapter.getGoals.mockRejectedValue(
            new Error("Failed to retrieve goals")
        );

        await expect(
            getGoals({ runtime: mockRuntime, roomId: "room-id" as UUID })
        ).rejects.toThrow("Failed to retrieve goals");
    });
});

describe("formatGoalsAsString", () => {
    it("formats goals correctly", () => {
        const formatted = formatGoalsAsString({ goals: [sampleGoal] });
        expect(formatted).toContain("Goal: Test Goal");
        expect(formatted).toContain("- [ ] Objective 1  (IN PROGRESS)");
        expect(formatted).toContain("- [x] Objective 2  (DONE)");
    });

    it("handles empty goal list", () => {
        const formatted = formatGoalsAsString({ goals: [] });
        expect(formatted).toBe("");
    });
});

describe("updateGoal", () => {
    it("updates a goal successfully", async () => {
        mockDatabaseAdapter.updateGoal.mockResolvedValue(undefined);

        await expect(
            updateGoal({ runtime: mockRuntime, goal: sampleGoal })
        ).resolves.toBeUndefined();
        expect(mockDatabaseAdapter.updateGoal).toHaveBeenCalledWith(sampleGoal);
    });

    it("handles failure to update a goal", async () => {
        mockDatabaseAdapter.updateGoal.mockRejectedValue(
            new Error("Failed to update goal")
        );

        await expect(
            updateGoal({ runtime: mockRuntime, goal: sampleGoal })
        ).rejects.toThrow("Failed to update goal");
    });
});

describe("createGoal", () => {
    it("creates a goal successfully", async () => {
        mockDatabaseAdapter.createGoal.mockResolvedValue(undefined);

        await expect(
            createGoal({ runtime: mockRuntime, goal: sampleGoal })
        ).resolves.toBeUndefined();
        expect(mockDatabaseAdapter.createGoal).toHaveBeenCalledWith(sampleGoal);
    });

    it("handles failure to create a goal", async () => {
        mockDatabaseAdapter.createGoal.mockRejectedValue(
            new Error("Failed to create goal")
        );

        await expect(
            createGoal({ runtime: mockRuntime, goal: sampleGoal })
        ).rejects.toThrow("Failed to create goal");
    });
});
