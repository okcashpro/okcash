import { type AgentRuntime } from "../core/runtime.ts";
import { type Action, type Message } from "../core/types.ts";

export const TEST_ACTION = {
  name: "TEST_ACTION",
  validate: async (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _runtime: AgentRuntime,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _message: Message,
  ) => {
    return true;
  },
  description: "This is a test action, for use in testing.",
  handler: async (
    runtime: AgentRuntime,
    message: Message,
  ): Promise<boolean> => {
    return true;
  },
  condition:
    "We are in a testing environment and want to test the action handler.",
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
        content: { content: "testing 123", action: "TEST_ACTION" },
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
    _message: Message,
  ) => {
    return false;
  },
  description: "This is a test action, for use in testing.",
  handler: async (
    runtime: AgentRuntime,
    message: Message,
  ): Promise<boolean> => {
    return false;
  },
  condition:
    "We are in a testing environment and want to test the action handler failing.",
  examples: [
    [
      {
        user: "{{user1}}",
        content: { content: "Testing failure", action: "TEST_ACTIONFALSE" },
      },
    ],
  ],
} as Action;
