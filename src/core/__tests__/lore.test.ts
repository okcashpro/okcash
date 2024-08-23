import dotenv from "dotenv";
import { createRuntime } from "../../test_resources/createRuntime.ts";
import { getOrCreateRelationship } from "../../test_resources/getOrCreateRelationship.ts";
import { type User } from "../../test_resources/types.ts";
import { zeroUuid } from "../constants.ts";
import { composeContext } from "../context.ts";
import { addLore, getLore } from "../lore.ts";
import { AgentRuntime } from "../runtime.ts";
import { Memory, type Content, type UUID } from "../types.ts";
import { messageHandlerTemplate } from "../../test_resources/templates.ts";

dotenv.config({ path: ".dev.vars" });
describe("Lore", () => {
  let runtime: AgentRuntime;
  let room_id: UUID;

  async function ensureRoomExists(runtime: AgentRuntime, user_id: UUID) {
    const rooms = await runtime.databaseAdapter.getRoomsForParticipants([
      user_id,
      runtime.agentId,
    ]);

    if (rooms.length === 0) {
      const room_id = await runtime.databaseAdapter.createRoom();
      runtime.databaseAdapter.addParticipant(user_id, room_id);
      runtime.databaseAdapter.addParticipant(runtime.agentId, room_id);
      return room_id;
    }
    // else return the first room
    else {
      return rooms[0];
    }
  }

  beforeAll(async () => {
    const result = await createRuntime({
      env: process.env as Record<string, string>,
    });
    runtime = result.runtime;
    const user = result?.session?.user as User;
    await ensureRoomExists(runtime, user?.id as UUID);
    const data = await getOrCreateRelationship({
      runtime,
      userA: user?.id as UUID,
      userB: zeroUuid,
    });

    // create a room at zeroUuid
    await runtime.databaseAdapter.createRoom(zeroUuid);

    if (!data) {
      throw new Error("Relationship not found");
    }

    room_id = data?.room_id;
  });

  beforeEach(async () => {
    await runtime.loreManager.removeAllMemories(room_id);
  });

  afterAll(async () => {
    await runtime.loreManager.removeAllMemories(room_id);
  });

  test("Add and get lore", async () => {
    const content: Content = { content: "Test", source: "/Test.md" };
    let lore: Memory[] = [];
    try {
      await addLore({
        runtime,
        source: "/Test.md",
        content: { content: "Test" },
        user_id: zeroUuid,
        room_id: zeroUuid,
      });

      lore = await getLore({
        runtime,
        message: "Test",
      });
    } catch (error) {
      console.error(error);
    }
    expect(lore[0].content).toEqual(content);
  }, 60000);

  // TODO: Test that the lore is in the context of the agent

  test("Test that lore is in the context of the agent", async () => {
    await addLore({
      runtime,
      source: "Test Lore Source",
      content: { content: "Test Lore Content" },
      user_id: zeroUuid as UUID,
      room_id: zeroUuid,
    });

    const message = {
      user_id: zeroUuid as UUID,
      content: { content: "Test Lore Content" },
      room_id: zeroUuid,
    };

    const state = await runtime.composeState(message);

    const context = composeContext({
      state,
      template: messageHandlerTemplate,
    });

    // expect context to contain 'Test Lore Source' and 'Test Lore Content'
    expect(context).toContain("Test Lore Source");
    expect(context).toContain("Test Lore Content");
  }, 60000);
});
