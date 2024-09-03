import dotenv from "dotenv";
import { createRuntime } from "../test_resources/createRuntime.ts";
import { getOrCreateRelationship } from "../test_resources/getOrCreateRelationship.ts";
import { runAiTest } from "../test_resources/runAiTest.ts";
import { messageHandlerTemplate } from "../test_resources/templates.ts";
import { TEST_ACTION, TEST_ACTION_FAIL } from "../test_resources/testAction.ts";
import { type User } from "../test_resources/types.ts";
import { composeContext } from "./context.ts";
import { embeddingZeroVector } from "./memory.ts";
import { type AgentRuntime } from "./runtime.ts";
import { Content, State, type Memory, type UUID } from "./types.ts";
import { stringToUuid } from "./uuid.ts";

async function handleMessage(
  runtime: AgentRuntime,
  message: Memory,
  state?: State,
) {
  const _saveRequestMessage = async (message: Memory, state: State) => {
    const { content: senderContent, user_id, room_id } = message;

    const _senderContent = (senderContent as Content).text?.trim();
    if (_senderContent) {
      await runtime.messageManager.createMemory({
        id: stringToUuid(message.id),
        user_id: user_id!,
        content: {
          text: _senderContent,
          action: (message.content as Content)?.action ?? "null",
        },
        room_id,
        embedding: embeddingZeroVector,
      });
      await runtime.evaluate(message, state);
    }
  };

  await _saveRequestMessage(message, state as State);
  if (!state) {
    state = (await runtime.composeState(message)) as State;
  }

  const context = composeContext({
    state,
    template: messageHandlerTemplate,
  });

  let responseContent: Content | null = null;
  const { user_id, room_id } = message;

  for (let triesLeft = 3; triesLeft > 0; triesLeft--) {
    const response = await runtime.messageCompletion({
      context,
      stop: [],
    });

    runtime.databaseAdapter.log({
      body: { message, context, response },
      user_id: user_id,
      room_id,
      type: "actions_test_completion",
    });
    return response;
  }

  if (!responseContent) {
    responseContent = {
      text: "",
      action: "IGNORE",
    };
  }

  if (responseContent.text) {
    const response = {
      user_id: runtime.agentId,
      content: responseContent,
      room_id,
      embedding: embeddingZeroVector,
    };
    await runtime.messageManager.createMemory(response);

    state = await this.runtime.updateRecentMessageState(state);
    await runtime.processActions(message, [response], state);
    await runtime.evaluate(message, state);
  } else {
    console.warn("Empty response, skipping");
  }

  return responseContent;
}

// use .dev.vars for local testing
dotenv.config({ path: ".dev.vars" });

describe("Actions", () => {
  let user: User;
  let runtime: AgentRuntime;
  let room_id: UUID;

  beforeAll(async () => {
    const { session, runtime: _runtime } = await createRuntime({
      env: process.env as Record<string, string>,
      actions: [TEST_ACTION, TEST_ACTION_FAIL],
    });

    user = session.user!;
    runtime = _runtime;

    // check if the user id exists in the 'accounts' table
    // if it doesn't, create it with the name 'Test User'
    let account = await runtime.databaseAdapter.getAccountById(user.id as UUID);

    if (!account) {
      account = await runtime.databaseAdapter.getAccountById(user.id as UUID);
      if (!account) {
        await runtime.databaseAdapter.createAccount({
          id: user.id as UUID,
          username: "Test User",
          name: "Test User",
          email: user.email,
          avatar_url: "",
        });
      }
    }

    // get all relationships for user
    const data = await getOrCreateRelationship({
      runtime,
      userA: user.id as UUID,
      userB: "00000000-0000-0000-0000-000000000000" as UUID,
    });

    if (!data) {
      throw new Error("Relationship not found");
    }

    room_id = data!.room_id;

    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
  });

  async function cleanup() {
    await runtime.factManager.removeAllMemories(room_id);
    await runtime.messageManager.removeAllMemories(room_id);
  }

  // Test that actions are being loaded into context properly
  test("Actions are loaded into context", async () => {
    const actions = runtime.actions;
    expect(actions).toBeDefined();
    expect(actions.length).toBeGreaterThan(0);
    // Ensure the TEST_ACTION action is part of the loaded actions
    const testAction = actions.find((action) => action.name === "TEST_ACTION");
    expect(testAction).toBeDefined();
  });

  // Test that actions are validated properly
  test("Test action is always valid", async () => {
    const testAction = runtime.actions.find(
      (action) => action.name === "TEST_ACTION",
    );
    expect(testAction).toBeDefined();
    if (testAction && testAction.validate) {
      const isValid = await testAction.validate(runtime, {
        user_id: user.id as UUID,
        content: { text: "Test message" },
        room_id: room_id,
      });
      expect(isValid).toBeTruthy();
    } else {
      throw new Error(
        "Continue action or its validation function is undefined",
      );
    }
  });

  test("Test that actions are properly validated in state", async () => {
    const message: Memory = {
      user_id: user.id as UUID,
      content: {
        text: "Please respond with the message 'ok' and the action TEST_ACTION",
      },
      room_id,
    };

    const state = await runtime.composeState(message);
    expect(state.actionNames).not.toContain("TEST_ACTION_FAIL");

    expect(state.actionNames).toContain("TEST_ACTION");
  });

  // Validate that TEST_ACTION is in the state
  test("Validate that TEST_ACTION is in the state", async () => {
    await runAiTest("Validate TEST_ACTION is in the state", async () => {
      const message: Memory = {
        user_id: user.id as UUID,
        content: {
          text: "Please respond with the message 'ok' and the action TEST_ACTION",
        },
        room_id,
      };

      const response = await handleMessage(runtime, message);
      return response.action === "TEST_ACTION"; // Return true if the expected action matches
    });
  }, 60000);

  // Test that TEST_ACTION action handler is called properly
  test("Test action handler is called", async () => {
    await runAiTest("Test action handler is called", async () => {
      const testAction = runtime.actions.find(
        (action) => action.name === "TEST_ACTION",
      );
      if (!testAction || !testAction.handler) {
        console.error("Continue action or its handler function is undefined");
        return false; // Return false to indicate the test setup failed
      }

      const mockMessage: Memory = {
        user_id: user.id as UUID,
        content: {
          text: "Test message for TEST action",
        },
        room_id,
      };

      const response = await testAction.handler(runtime, mockMessage);
      return response !== undefined; // Return true if the handler returns a defined response
    });
  }, 60000); // You can adjust the timeout if needed
});
