import { AgentRuntime } from "./runtime.ts";
import { type Actor, type Content, type Memory, type UUID } from "./types.ts";

/**
 * Get details for a list of actors.
 */
export async function getActorDetails({
  runtime,
  room_id,
}: {
  runtime: AgentRuntime;
  room_id: UUID;
}) {
  const actors = await runtime.databaseAdapter.getActorDetails({ room_id });
  return actors as Actor[];
}

/**
 * Format actors into a string
 * @param actors - list of actors
 * @returns string
 */
export function formatActors({ actors }: { actors: Actor[] }) {
  const actorStrings = actors.map((actor: Actor) => {
    const header = `${actor.name}${actor.details?.tagline ? ": " + actor.details?.tagline : ""}${actor.details?.summary ? "\n" + actor.details?.summary : ""}`;
    return header;
  });
  const finalActorStrings = actorStrings.join("\n");
  return finalActorStrings;
}

/**
 * Format messages into a string
 * @param messages - list of messages
 * @param actors - list of actors
 * @returns string
 */
export const formatMessages = ({
  messages,
  actors,
}: {
  messages: Memory[];
  actors: Actor[];
}) => {
  const messageStrings = messages
    .reverse()
    .filter((message: Memory) => message.user_id)
    .map((message: Memory) => {
      let messageContent = (message.content as Content).content;
      const messageAction = (message.content as Content).action;
      const formattedName =
        actors.find((actor: Actor) => actor.id === message.user_id)?.name || 
        "Unknown User";

      if (messageAction === "IGNORE") {
        messageContent = "*Ignored*";
      }

      const attachments = (message.content as Content).attachments

      const attachmentString = attachments && attachments.length > 0
        ? ` (Attachments: ${attachments.map(media => `[${media.title}]`).join(", ")})`
        : "";

      return `${formattedName} (${message.user_id.slice(-5)}): ${messageContent}${attachmentString}${messageAction && messageAction !== "null" ? ` (${messageAction})` : ""}`;
    })
    .join("\n");
  return messageStrings;
};