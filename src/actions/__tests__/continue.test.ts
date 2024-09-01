import dotenv from "dotenv";
import { zeroUuid } from "../../core/constants.ts";
import { type AgentRuntime } from "../../core/runtime.ts";
import { createRuntime } from "../../test_resources/createRuntime.ts";
import { Goodbye1 } from "../../test_resources/data.ts";
import { getOrCreateRelationship } from "../../test_resources/getOrCreateRelationship.ts";
import { populateMemories } from "../../test_resources/populateMemories.ts";
import { runAiTest } from "../../test_resources/runAiTest.ts";
import { type User } from "../../test_resources/types.ts";
import { Content, type Message, type UUID } from "../../core/types.ts";
import action from "../continue.ts";
import ignore from "../ignore.ts";

dotenv.config({ path: ".dev.vars" });

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const GetContinueExample1 = (_user_id: UUID) => [
  {
    user_id: zeroUuid,
    content: {
      text: "Hmm, let think for a second, I was going to tell you about something...",
      action: "CONTINUE",
    },
  },
  {
    user_id: zeroUuid,
    content: {
      text: "I remember now, I was going to tell you about my favorite food, which is pizza.",
      action: "CONTINUE",
    },
  },
  {
    user_id: zeroUuid,
    content: {
      text: "I love pizza, it's so delicious.",
      action: "CONTINUE",
    },
  },
];

describe("User Profile", () => {
  let user: User;
  let runtime: AgentRuntime;
  let room_id: UUID = zeroUuid;

  afterAll(async () => {
    await cleanup();
  });

  beforeAll(async () => {
    const setup = await createRuntime({
      env: process.env as Record<string, string>,
      actions: [action, ignore],
    });
    user = setup.session.user;
    runtime = setup.runtime;

    const data = await getOrCreateRelationship({
      runtime,
      userA: user.id as UUID,
      userB: zeroUuid,
    });

    room_id = data.room_id;

    await cleanup();
  });

  beforeEach(async () => {
    await cleanup();
  });

  async function cleanup() {
    await runtime.factManager.removeAllMemories(room_id);
    await runtime.messageManager.removeAllMemories(room_id);
  }

  // test validate function response

  test("Test validate function response", async () => {
    await runAiTest("Test validate function response", async () => {
      const message: Message = {
        user_id: user.id as UUID,
        content: { text: "Hello" },
        room_id: room_id as UUID,
      };

      const validate = action.validate!;

      const result = await validate(runtime, message);

      // try again with GetContinueExample1, expect to be false
      await populateMemories(runtime, user, room_id, [GetContinueExample1]);

      const message2: Message = {
        user_id: zeroUuid as UUID,
        content: {
          text: "Hello",
          action: "CONTINUE",
        },
        room_id: room_id as UUID,
      };

      const result2 = await validate(runtime, message2);

      return result === true && result2 === false;
    });
  }, 60000);

  test("Test repetition check on continue", async () => {
    await runAiTest("Test repetition check on continue", async () => {
      const message: Message = {
        user_id: zeroUuid as UUID,
        content: {
          text: "Hmm, let think for a second, I was going to tell you about something...",
          action: "CONTINUE",
        },
        room_id,
      };

      const handler = action.handler!;

      await populateMemories(runtime, user, room_id, [GetContinueExample1]);

      const result = (await handler(runtime, message)) as Content;

      return result.action !== "CONTINUE";
    });
  }, 60000);

  test("Test multiple continue messages in a conversation", async () => {
    await runAiTest(
      "Test multiple continue messages in a conversation",
      async () => {
        const message: Message = {
          user_id: user?.id as UUID,
          content: {
            text: "Write a short story in three parts, using the CONTINUE action for each part.",
          },
          room_id: room_id,
        };

        const initialMessageCount = await runtime.messageManager.countMemories(
          room_id,
          false,
        );

        await action.handler!(runtime, message);

        const finalMessageCount = await runtime.messageManager.countMemories(
          room_id,
          false,
        );

        const agentMessages = await runtime.messageManager.getMemories({
          room_id,
          count: finalMessageCount - initialMessageCount,
          unique: false,
        });

        const continueMessages = agentMessages.filter(
          (m) =>
            m.user_id === zeroUuid &&
            (m.content as Content).action === "CONTINUE",
        );

        // Check if the agent sent more than one message
        const sentMultipleMessages =
          finalMessageCount - initialMessageCount > 2;

        // Check if the agent used the CONTINUE action for each part
        const usedContinueAction = continueMessages.length === 3;
        // Check if the agent's responses are not empty
        const responsesNotEmpty = agentMessages.every(
          (m) => (m.content as Content).text !== "",
        );

        return sentMultipleMessages && usedContinueAction && responsesNotEmpty;
      },
    );
  }, 60000);

  test("Test if message is added to database", async () => {
    await runAiTest("Test if message is added to database", async () => {
      const message: Message = {
        user_id: user?.id as UUID,
        content: {
          text: "Tell me more about your favorite food.",
        },
        room_id: room_id as UUID,
      };

      const initialMessageCount = await runtime.messageManager.countMemories(
        room_id,
        false,
      );

      await action.handler!(runtime, message);

      const finalMessageCount = await runtime.messageManager.countMemories(
        room_id,
        false,
      );

      return finalMessageCount - initialMessageCount === 2;
    });
  }, 60000);
  test("Test if not continue", async () => {
    await runAiTest("Test if not continue", async () => {
      // this is basically the same test as the one in ignore.test
      const message: Message = {
        user_id: user?.id as UUID,
        content: { text: "Bye" },
        room_id: room_id as UUID,
      };

      const handler = action.handler!;

      await populateMemories(runtime, user, room_id, [Goodbye1]);

      const result = (await handler(runtime, message)) as Content;

      return result.action === "IGNORE";
    });
  }, 60000);

  // test conditions where we would expect a wait or an ignore
});
