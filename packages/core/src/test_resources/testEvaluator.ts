import {
    Evaluator,
    IAgentRuntime,
    type Memory,
    type State,
} from "@ai16z/eliza/src/types.ts";

async function handler(runtime: IAgentRuntime, message: Memory) {
    const state = (await runtime.composeState(message)) as State;
    return state;
}

export const TEST_EVALUATOR = {
    name: "TEST_EVALUATOR",
    validate: async (
        _runtime: IAgentRuntime,

        _message: Memory
    ): Promise<boolean> => {
        return await Promise.resolve(true);
    },
    description: "Test evaluator.",
    handler,
    examples: [
        {
            context: "Testing, testing, 123 123",
            messages: [
                {
                    user: "{{user1}}",
                    content: {
                        text: "Testing, testing, 123 123",
                        action: "TEST_EVALUATOR",
                    },
                },
            ],
            outcome: "There is an outcome.",
        },
    ],
} as Evaluator;

export const TEST_EVALUATOR_FAIL = {
    name: "TEST_EVALUATOR_FAIL",
    validate: async (
        _runtime: IAgentRuntime,

        _message: Memory
    ): Promise<boolean> => {
        return await Promise.resolve(false);
    },
    description: "Test failure of the evaluator and validation.",
    handler,
    examples: [
        {
            context: "Testing, testing, 123 123",
            messages: [
                {
                    user: "{{user1}}",
                    content: {
                        text: "Testing, testing, 123 123",
                        action: "TEST_EVALUATOR_FAIL",
                    },
                },
            ],
            outcome: "Things have been tested to have maybe gone wrong.",
        },
    ],
} as Evaluator;
