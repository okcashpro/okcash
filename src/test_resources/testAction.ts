import { type AgentRuntime } from "../core/runtime.ts";
import { type Action, type Memory } from "../core/types.ts";

export const TEST_ACTION = {
  name: "TEST_ACTION",
  validate: async (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _runtime: AgentRuntime,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _message: Memory,
  ) => {
    return true;
  },
  description: "This is a test action, for use in testing.",
  handler: async (runtime: AgentRuntime, message: Memory): Promise<boolean> => {
    return true;
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          content:
            "Please respond with the message 'testing 123' and the action TEST_ACTION",
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
  validate: async (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _runtime: AgentRuntime,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _message: Memory,
  ) => {
    return false;
  },
  description: "This is a test action, for use in testing.",
  handler: async (runtime: AgentRuntime, message: Memory): Promise<boolean> => {
    return false;
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Testing failure", action: "TEST_ACTIONFALSE" },
      },
    ],
  ],
} as Action;
