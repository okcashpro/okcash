import type { Actor, Memory } from "./types.ts";

export const formatPosts = ({
  messages,
  actors,
}: {
  messages: Memory[];
  actors: Actor[];
}) => {
  const messageStrings = messages
    .filter((message: Memory) => message.user_id)
    .map((message: Memory) => {
      console.log("********* message", JSON.stringify(message, null, 2));

      console.log("Message user id is", message.user_id);
      console.log("Actors are", actors);
      console.log("Username is", message.content.username);

      const actor = actors.find((actor: Actor) => actor.id === message.user_id);
      const userName = actor?.name || "Unknown User";
      const displayName = actor?.username || "unknown";

      return `Name: ${userName} (@${displayName})
ID: ${message.id}
Date: ${message.created_at}
Text:
${message.content.text}
---`;
    })
    .join("\n");
  return messageStrings;
};
