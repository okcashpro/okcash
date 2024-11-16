import {
    IAgentRuntime,
    type Action,
    type Memory,
} from "@ai16z/eliza/src/types.ts";

export const TEST_ACTION = {
    name: "TEST_ACTION",
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },
    description: "This is a test action, for use in testing.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory
    ): Promise<boolean> => {
        return true;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Please respond with the message 'testing 123' and the action TEST_ACTION",
                    action: "TEST_ACTION",
                },
            },
            {
                user: "{{user2}}",
                content: { text: "testing 123", action: "TEST_ACTION" },
            },
        ],
    ],
} as Action;

export const TEST_ACTION_FAIL = {
    name: "TEST_ACTION_FAIL",
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return false;
    },
    description: "This is a test action, for use in testing.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory
    ): Promise<boolean> => {
        return false;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Testing failure",
                    action: "TEST_ACTIONFALSE",
                },
            },
        ],
    ],
} as Action;
