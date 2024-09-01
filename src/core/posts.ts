import { formatTimestamp } from "./messages.ts";
import type { Actor, Content, Memory } from "./types.ts";

export const formatPosts = ({
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
      let messageContent = (message.content as Content).text;
      const messageAction = (message.content as Content).action;
      const formattedName =
        actors.find((actor: Actor) => actor.id === message.user_id)?.name ||
        "Unknown User";

      const attachments = (message.content as Content).attachments;

      const attachmentString =
        attachments && attachments.length > 0
          ? ` (Attachments: ${attachments.map((media) => `[${media.id} - ${media.title} (${media.url})]`).join(", ")})`
          : "";

      const timestamp = message.created_at
        ? formatTimestamp(message.created_at)
        : "";
      const shortId = message.user_id.slice(-5);

      return `(${timestamp}) [${shortId}] ${formattedName}: ${messageContent}${attachmentString}${messageAction && messageAction !== "null" ? ` (${messageAction})` : ""}`;
    })
    .join("\n");
  return messageStrings;
};
