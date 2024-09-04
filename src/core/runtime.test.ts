import dotenv from "dotenv";
import {
  getCachedEmbeddings,
  writeCachedEmbedding,
} from "../test_resources/cache.ts";
import { createRuntime } from "../test_resources/createRuntime.ts";
import { getOrCreateRelationship } from "../test_resources/getOrCreateRelationship.ts";
import { type User } from "../test_resources/types.ts";
import { zeroUuid } from "./constants.ts";
import { AgentRuntime } from "./runtime.ts";
import { type Memory, type UUID } from "./types.ts";

dotenv.config({ path: ".dev.vars" });

describe("Agent Runtime", () => {
  let user: User;
  let runtime: AgentRuntime;
  let roomId: UUID = zeroUuid;

  // Helper function to clear memories
  async function clearMemories() {
    await runtime.messageManager.removeAllMemories(roomId);
  }

  // Helper function to create memories
  async function createMemories() {
    const memories = [
      {
        userId: user?.id as UUID,
        content: { text: "test memory from user" },
      },
      { userId: zeroUuid, content: { text: "test memory from agent" } },
    ];

    for (const { userId, content } of memories) {
      try {
        const embedding = await getCachedEmbeddings(content.text);
        const memory = await runtime.messageManager.addEmbeddingToMemory({
          userId: userId,
          content,
          roomId,
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
    roomId = data.roomId;
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

    const message: Memory = {
      userId: user.id as UUID,
      content: { text: "test message" },
      roomId: roomId as UUID,
    };

    const state = await runtime.composeState(message);

    expect(state.recentMessagesData.length).toBeGreaterThan(1);

    await clearMemories();
  }, 60000);
});
