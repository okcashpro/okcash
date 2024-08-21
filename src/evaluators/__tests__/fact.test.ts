import dotenv from "dotenv";
import { getCachedEmbeddings, writeCachedEmbedding } from "../../test/cache.ts"
import { createRuntime } from "../../test/createRuntime.ts"
import {
  GetTellMeAboutYourselfConversation1,
  GetTellMeAboutYourselfConversation2,
  GetTellMeAboutYourselfConversation3,
  jimFacts,
} from "../../test/data.ts"
import { getOrCreateRelationship } from "../../test/getOrCreateRelationship.ts"
import { populateMemories } from "../../test/populateMemories.ts"
import { runAiTest } from "../../test/runAiTest.ts"
import { type User } from "../../test/types.ts"
import { defaultActions } from "../../actions.ts"
import { zeroUuid } from "../../constants.ts"
import { type AgentRuntime } from "../../runtime.ts"
import { type Message, type UUID } from "../../types.ts"
import evaluator from "../fact.ts"

dotenv.config({ path: ".dev.vars" });

describe("Facts Evaluator", () => {
  let user: User;
  let runtime: AgentRuntime;
  let room_id = zeroUuid;

  beforeAll(async () => {
    const setup = await createRuntime({
      env: process.env as Record<string, string>,
      evaluators: [evaluator],
      actions: defaultActions,
    });
    user = setup.session.user;
    runtime = setup.runtime;

    if (!user.id) {
      throw new Error("User ID is undefined");
    }

    const data = await getOrCreateRelationship({
      runtime,
      userA: user.id as UUID,
      userB: zeroUuid,
    });

    if (!data) {
      throw new Error("Relationship not found");
    }

    room_id = data.room_id;
  });

  afterAll(async () => {
    await cleanup(runtime, user.id as UUID);
  });

  test("Extract facts from conversations", async () => {
    await runAiTest("Extract programmer and startup facts", async () => {
      await populateMemories(runtime, user, room_id, [
        GetTellMeAboutYourselfConversation1,
      ]);

      const message: Message = {
        user_id: user.id as UUID,
        content: { content: "" },
        room_id,
      };

      const result = await evaluator.handler(runtime, message);
      const resultConcatenated = result.join("\n");

      return (
        resultConcatenated.toLowerCase().includes("programmer") &&
        resultConcatenated.toLowerCase().includes("startup")
      );
    });

    await runAiTest("Extract married fact, ignoring known facts", async () => {
      await populateMemories(runtime, user, room_id, [
        GetTellMeAboutYourselfConversation2,
        GetTellMeAboutYourselfConversation3,
      ]);

      await addFacts(runtime, user.id as UUID, room_id, jimFacts);

      const message: Message = {
        user_id: user.id as UUID,
        content: { content: "" },
        room_id,
      };

      const result = await evaluator.handler(runtime, message);
      const resultConcatenated = result.join("\n");

      return (
        !resultConcatenated.toLowerCase().includes("francisco") &&
        !resultConcatenated.toLowerCase().includes("38") &&
        resultConcatenated.toLowerCase().includes("married")
      );
    });
  }, 120000); // Adjust the timeout as needed for your tests
});

async function cleanup(runtime: AgentRuntime, room_id: UUID) {
  await runtime.factManager.removeAllMemories(room_id);
  await runtime.messageManager.removeAllMemories(room_id);
}

async function addFacts(
  runtime: AgentRuntime,
  user_id: UUID,
  room_id: UUID,
  facts: string[],
) {
  for (const fact of facts) {
    const existingEmbedding = await getCachedEmbeddings(fact);
    const bakedMemory = await runtime.factManager.addEmbeddingToMemory({
      user_id: user_id,
      content: { content: fact },
      room_id: room_id,
      embedding: existingEmbedding,
    });
    await runtime.factManager.createMemory(bakedMemory);
    if (!existingEmbedding) {
      writeCachedEmbedding(fact, bakedMemory.embedding as number[]);
      // Ensure there's a slight delay for asynchronous operations to complete
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
}
