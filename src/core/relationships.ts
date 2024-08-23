import { type AgentRuntime } from "./runtime.ts";
import { type Relationship, type UUID } from "./types.ts";

export async function createRelationship({
  runtime,
  userA,
  userB,
}: {
  runtime: AgentRuntime;
  userA: UUID;
  userB: UUID;
}): Promise<boolean> {
  return runtime.databaseAdapter.createRelationship({
    userA,
    userB,
  });
}

export async function getRelationship({
  runtime,
  userA,
  userB,
}: {
  runtime: AgentRuntime;
  userA: UUID;
  userB: UUID;
}) {
  return runtime.databaseAdapter.getRelationship({
    userA,
    userB,
  });
}

export async function getRelationships({
  runtime,
  user_id,
}: {
  runtime: AgentRuntime;
  user_id: UUID;
}) {
  return runtime.databaseAdapter.getRelationships({ user_id });
}

export async function formatRelationships({
  runtime,
  user_id,
}: {
  runtime: AgentRuntime;
  user_id: UUID;
}) {
  const relationships = await getRelationships({ runtime, user_id });

  const formattedRelationships = relationships.map(
    (relationship: Relationship) => {
      const { user_a, user_b } = relationship;

      if (user_a === user_id) {
        return user_b;
      }

      return user_a;
    },
  );

  return formattedRelationships;
}
