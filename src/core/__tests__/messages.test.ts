import dotenv from "dotenv";
import { createRuntime } from "../test/createRuntime.ts";
import { getOrCreateRelationship } from "../test/getOrCreateRelationship.ts";
import { type User } from "../test/types.ts";
import { zeroUuid } from "../core/constants.ts";
import { formatFacts } from "../evaluators/fact.ts";
import {
  formatActors,
  formatMessages,
  getActorDetails,
} from "../core/messages.ts";
import { createRelationship } from "../core/relationships.ts";
import { type AgentRuntime } from "../core/runtime.ts";
import {
  type Actor,
  type Content,
  type Memory,
  type UUID,
} from "../core/types.ts";

dotenv.config({ path: ".dev.vars" });

describe("Messages Library", () => {
  let runtime: AgentRuntime, user: User, actors: Actor[];

  beforeAll(async () => {
    const setup = await createRuntime({
      env: process.env as Record<string, string>,
    });
    runtime = setup.runtime;
    user = setup.session.user;
    actors = await getActorDetails({
      runtime,
      room_id: "00000000-0000-0000-0000-000000000000",
    });
  });

  test("getActorDetails should return actors based on given room_id", async () => {
    // create a room and add a user to it
    const userA = user?.id as UUID;
    const userB = zeroUuid;

    await createRelationship({
      runtime,
      userA,
      userB,
    });

    const { room_id } = await getOrCreateRelationship({
      runtime,
      userA,
      userB,
    });

    const result = await getActorDetails({
      runtime,
      room_id,
    });

    expect(result.length).toBeGreaterThan(0);
    result.forEach((actor: Actor) => {
      expect(actor).toHaveProperty("name");
      expect(actor).toHaveProperty("details");
      expect(actor).toHaveProperty("id");
    });
  });

  test("formatActors should format actors into a readable string", () => {
    const formattedActors = formatActors({ actors });
    actors.forEach((actor) => {
      expect(formattedActors).toContain(actor.name);
    });
  });

  test("formatMessages should format messages into a readable string", async () => {
    const messages: Memory[] = [
      {
        content: { content: "Hello" },
        user_id: user.id as UUID,
        room_id: "00000000-0000-0000-0000-000000000000",
      },
      {
        content: { content: "How are you?" },
        user_id: "00000000-0000-0000-0000-000000000000",
        room_id: "00000000-0000-0000-0000-000000000000",
      },
    ];
    const formattedMessages = formatMessages({ messages, actors });
    messages.forEach((message: Memory) => {
      expect(formattedMessages).toContain((message.content as Content).content);
    });
  });

  test("formatFacts should format facts into a readable string", async () => {
    const facts: Memory[] = [
      {
        content: { content: "Reflecting on the day" },
        user_id: user.id as UUID,
        room_id: "00000000-0000-0000-0000-000000000000",
      },
      {
        content: { content: "Thoughts and musings" },
        user_id: "00000000-0000-0000-0000-000000000000",
        room_id: "00000000-0000-0000-0000-000000000000room",
      },
    ];
    const formattedFacts = formatFacts(facts);
    facts.forEach((fact) => {
      expect(formattedFacts).toContain(fact.content.content);
    });
  });
});
