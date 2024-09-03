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
  userId,
}: {
  runtime: AgentRuntime;
  userId: UUID;
}) {
  return runtime.databaseAdapter.getRelationships({ userId });
}

export async function formatRelationships({
  runtime,
  userId,
}: {
  runtime: AgentRuntime;
  userId: UUID;
}) {
  const relationships = await getRelationships({ runtime, userId });

  const formattedRelationships = relationships.map(
    (relationship: Relationship) => {
      const { userA, userB } = relationship;

      if (userA === userId) {
        return userB;
      }

      return userA;
    },
  );

  return formattedRelationships;
}
