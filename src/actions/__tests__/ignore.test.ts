import dotenv from "dotenv";
import { createRuntime } from "../../test_resources/createRuntime.ts";
import {
  GetTellMeAboutYourselfConversationTroll1,
  GetTellMeAboutYourselfConversationTroll2,
  Goodbye1,
} from "../../test_resources/data.ts";
import { getOrCreateRelationship } from "../../test_resources/getOrCreateRelationship.ts";
import { populateMemories } from "../../test_resources/populateMemories.ts";
import { runAiTest } from "../../test_resources/runAiTest.ts";
import { type User } from "../../test_resources/types.ts";
import { zeroUuid } from "../../core/constants.ts";
import { composeContext } from "../../core/context.ts";
import logger from "../../core/logger.ts";
import { embeddingZeroVector } from "../../core/memory.ts";
import { type AgentRuntime } from "../../core/runtime.ts";
import { messageHandlerTemplate } from "../../test_resources/templates.ts";
import { Content, State, type Message, type UUID } from "../../core/types.ts";
import { parseJSONObjectFromText } from "../../core/parsing.ts";
import action from "../ignore.ts";

async function handleMessage(
  runtime: AgentRuntime,
  message: Message,
  state?: State,
) {
  const _saveRequestMessage = async (message: Message, state: State) => {
    const { content: senderContent, user_id, room_id } = message;

    const _senderContent = (senderContent as Content).text?.trim();
    if (_senderContent) {
      await runtime.messageManager.createMemory({
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

  const { user_id, room_id } = message;

  let response = await runtime.messageCompletion({
    context,
    stop: [],
  });

  await runtime.databaseAdapter.log({
    body: { message, context, response },
    user_id: user_id,
    room_id,
    type: "ignore_test_completion",
  });

  const _saveResponseMessage = async (
    message: Message,
    state: State,
    responseContent: Content,
  ) => {
    const { room_id } = message;

    responseContent.content = responseContent.text?.trim();

    if (responseContent.content) {
      await runtime.messageManager.createMemory({
        user_id: runtime.agentId,
        content: responseContent,
        room_id,
        embedding: embeddingZeroVector,
      });
      await runtime.evaluate(message, { ...state, responseContent });
    } else {
      console.warn("Empty response, skipping");
    }
  };

  await _saveResponseMessage(message, state, response);
  await runtime.processActions(message, response);

  return response;
}

// use .dev.vars for local testing
dotenv.config({ path: ".dev.vars" });

describe("Ignore action tests", () => {
  let user: User;
  let runtime: AgentRuntime;
  let room_id: UUID;

  afterAll(async () => {
    await cleanup();
  });

  beforeAll(async () => {
    const setup = await createRuntime({
      env: process.env as Record<string, string>,
      actions: [action],
    });
    user = setup.session.user;
    runtime = setup.runtime;

    const data = await getOrCreateRelationship({
      runtime,
      userA: user?.id as UUID,
      userB: zeroUuid,
    });

    console.log("data is", data);

    room_id = data?.room_id;
    console.log("*** data", data);
    console.log("Room ID", room_id);

    await cleanup();
  });

  beforeEach(async () => {
    await cleanup();
  });

  async function cleanup() {
    await runtime.factManager.removeAllMemories(room_id);
    await runtime.messageManager.removeAllMemories(room_id);
  }

  test("Test ignore action", async () => {
    await runAiTest("Test ignore action", async () => {
      const message: Message = {
        user_id: user?.id as UUID,
        content: { text: "Never talk to me again" },
        room_id: room_id as UUID,
      };

      await populateMemories(runtime, user, room_id, [
        GetTellMeAboutYourselfConversationTroll1,
      ]);

      const result = await handleMessage(runtime, message);

      return result.action === "IGNORE";
    });
  }, 120000);

  test("Action handler test 1: response should be ignore", async () => {
    await runAiTest(
      "Action handler test 1: response should be ignore",
      async () => {
        const message: Message = {
          user_id: user.id as UUID,
          content: { text: "", action: "IGNORE" },
          room_id: room_id as UUID,
        };

        await populateMemories(runtime, user, room_id, [
          GetTellMeAboutYourselfConversationTroll1,
        ]);

        await handleMessage(runtime, message);

        const state = await runtime.composeState(message);

        const lastMessage = state.recentMessagesData[0];

        return (lastMessage.content as Content).action === "IGNORE";
      },
    );
  }, 120000);

  test("Action handler test 2: response should be ignore", async () => {
    await runAiTest(
      "Action handler test 2: response should be ignore",
      async () => {
        const message: Message = {
          user_id: user.id as UUID,
          content: { text: "", action: "IGNORE" },
          room_id: room_id as UUID,
        };

        await populateMemories(runtime, user, room_id, [
          GetTellMeAboutYourselfConversationTroll2,
        ]);

        await handleMessage(runtime, message);

        const state = await runtime.composeState(message);

        const lastMessage = state.recentMessagesData[0];

        return (lastMessage.content as Content).action === "IGNORE";
      },
    );
  }, 120000);

  test("Expect ignore", async () => {
    await runAiTest("Expect ignore", async () => {
      const message: Message = {
        user_id: user.id as UUID,
        content: { text: "Bye" },
        room_id: room_id as UUID,
      };

      await populateMemories(runtime, user, room_id, [Goodbye1]);

      await handleMessage(runtime, message);

      const state = await runtime.composeState(message);

      const lastMessage = state.recentMessagesData[0];

      return (lastMessage.content as Content).action === "IGNORE";
    });
  }, 120000);
});
