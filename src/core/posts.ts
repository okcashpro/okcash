import type { Actor, Memory } from "./types.ts";

export const formatPosts = ({
  messages,
  actors,
}: {
  messages: Memory[];
  actors: Actor[];
}) => {
  const messageStrings = messages
    .filter((message: Memory) => message.userId)
    .map((message: Memory) => {
      const actor = actors.find((actor: Actor) => actor.id === message.userId);
      const userName = actor?.name || "Unknown User";
      const displayName = actor?.username || "unknown";

      return `Name: ${userName} (@${displayName})
ID: ${message.id}
Date: ${message.createdAt}
Text:
${message.content.text}
---`;
    })
    .join("\n");
  return messageStrings;
};
