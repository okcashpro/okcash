import { type AgentRuntime } from "../core/runtime.ts";
import { Evaluator, type Message, type State } from "../core/types.ts";

async function handler(runtime: AgentRuntime, message: Message) {
  const state = (await runtime.composeState(message)) as State;
  return state;
}

export const TEST_EVALUATOR = {
  name: "TEST_EVALUATOR",
  validate: async (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _runtime: AgentRuntime,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _message: Message,
  ): Promise<boolean> => {
    return await Promise.resolve(true);
  },
  description: "Test evaluator.",
  condition: "When we are evualating whether tests work.",
  handler,
  examples: [
    {
      context: "Testing, testing, 123 123",
      messages: [
        {
          user: "{{user1}}",
          content: {
            content: "Testing, testing, 123 123",
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _runtime: AgentRuntime,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _message: Message,
  ): Promise<boolean> => {
    return await Promise.resolve(false);
  },
  description: "Test failure of the evaluator and validation.",
  condition: "When we are evualating whether tests work.",
  handler,
  examples: [
    {
      context: "Testing, testing, 123 123",
      messages: [
        {
          user: "{{user1}}",
          content: {
            content: "Testing, testing, 123 123",
            action: "TEST_EVALUATOR_FAIL",
          },
        },
      ],
      outcome: "Things have been tested to have maybe gone wrong.",
    },
  ],
} as Evaluator;
