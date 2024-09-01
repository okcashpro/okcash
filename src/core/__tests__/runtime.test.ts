import dotenv from "dotenv";
import {
  getCachedEmbeddings,
  writeCachedEmbedding,
} from "../../test_resources/cache.ts";
import { createRuntime } from "../../test_resources/createRuntime.ts";
import { getOrCreateRelationship } from "../../test_resources/getOrCreateRelationship.ts";
import { type User } from "../../test_resources/types.ts";
import { zeroUuid } from "../constants.ts";
import { AgentRuntime } from "../runtime.ts";
import { type Message, type UUID } from "../types.ts";

dotenv.config({ path: ".dev.vars" });

describe("Agent Runtime", () => {
  let user: User;
  let runtime: AgentRuntime;
  let room_id: UUID = zeroUuid;

  // Helper function to clear memories
  async function clearMemories() {
    await runtime.messageManager.removeAllMemories(room_id);
  }

  // Helper function to create memories
  async function createMemories() {
    const memories = [
      {
        user_id: user?.id as UUID,
        content: { text: "test memory from user" },
      },
      { user_id: zeroUuid, content: { text: "test memory from agent" } },
    ];

    for (const { user_id, content } of memories) {
      try {
        const embedding = await getCachedEmbeddings(content.text);
        const memory = await runtime.messageManager.addEmbeddingToMemory({
          user_id: user_id,
          content,
          room_id,
          embedding,
        });
        if (!embedding) {
          writeCachedEmbedding(content.text, memory.embedding as number[]);
        }
        await runtime.messageManager.createMemory(memory);
      } catch (error) {
        console.error("Error creating memory", error);
      }
    }
  }

  // Set up before each test
  beforeEach(async () => {
    const result = await createRuntime({
      env: process.env as Record<string, string>,
    });

    runtime = result.runtime;
    user = result.session.user;

    const data = await getOrCreateRelationship({
      runtime,
      userA: user?.id as UUID,
      userB: zeroUuid,
    });

    if (!data) {
      throw new Error("Relationship not found");
    }
    room_id = data.room_id;
    await clearMemories(); // Clear memories before each test
  });

  // Clean up after each test
  afterEach(async () => {
    await clearMemories(); // Clear memories after each test to ensure a clean state
  });

  test("Create an agent runtime instance and use the basic functionality", () => {
    expect(user).toBeDefined();
    expect(runtime).toBeDefined();
  });

  test("Demonstrate idempotency by creating an agent runtime instance again", () => {
    expect(user).toBeDefined();
    expect(runtime).toBeDefined();
  });

  test("Memory lifecycle: create, retrieve, and destroy", async () => {
    try {
      await createMemories(); // Create new memories
    } catch (error) {
      console.error("Error creating memories", error);
    }

    const message: Message = {
      user_id: user.id as UUID,
      content: { text: "test message" },
      room_id: room_id as UUID,
    };

    const state = await runtime.composeState(message);

    expect(state.recentMessagesData.length).toBeGreaterThan(1);

    await clearMemories();
  }, 60000);
});
