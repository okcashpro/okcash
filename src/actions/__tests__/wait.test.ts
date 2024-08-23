import dotenv from "dotenv";
import { createRuntime } from "../../test_resources/createRuntime.ts";
import { GetTellMeAboutYourselfConversation1 } from "../../test_resources/data.ts";
import { getOrCreateRelationship } from "../../test_resources/getOrCreateRelationship.ts";
import { populateMemories } from "../../test_resources/populateMemories.ts";
import { runAiTest } from "../../test_resources/runAiTest.ts";
import { type User } from "../../test_resources/types.ts";
import { zeroUuid } from "../../core/constants.ts";
import { type AgentRuntime } from "../../core/runtime.ts";
import { type Message, type UUID } from "../../core/types.ts";
import action from "../wait.ts"; // Import the wait action

dotenv.config({ path: ".dev.vars" });

describe("Wait Action Behavior", () => {
  let user: User;
  let runtime: AgentRuntime;
  let room_id: UUID;

  afterAll(async () => {
    await cleanup();
  });

  beforeEach(async () => {
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

    if (!data) {
      throw new Error("Relationship not found");
    }

    room_id = data?.room_id;

    await cleanup();
  });

  async function cleanup() {
    await runtime.factManager.removeAllMemories(room_id);
    await runtime.messageManager.removeAllMemories(room_id);
  }

  test("Test wait action behavior", async () => {
    await runAiTest("Test wait action behavior", async () => {
      const message: Message = {
        user_id: zeroUuid as UUID,
        content: {
          content: "Please wait a moment, I need to think about this...",
          action: "WAIT",
        },
        room_id: room_id as UUID,
      };

      const handler = action.handler!;

      await populateMemories(runtime, user, room_id, [
        GetTellMeAboutYourselfConversation1,
      ]);

      const result = (await handler(runtime, message)) as boolean;
      // Expectation depends on the implementation of the wait action.
      // For instance, it might be that there's no immediate output,
      // or the output indicates waiting, so adjust the expectation accordingly.
      return result === true;
    });
  }, 60000);
});
