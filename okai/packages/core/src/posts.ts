import { formatTimestamp } from "./messages.ts";
import type { Actor, Memory } from "./types.ts";

export const formatPosts = ({
    messages,
    actors,
    conversationHeader = true,
}: {
    messages: Memory[];
    actors: Actor[];
    conversationHeader?: boolean;
}) => {
    // Group messages by roomId
    const groupedMessages: { [roomId: string]: Memory[] } = {};
    messages.forEach((message) => {
        if (message.roomId) {
            if (!groupedMessages[message.roomId]) {
                groupedMessages[message.roomId] = [];
            }
            groupedMessages[message.roomId].push(message);
        }
    });

    // Sort messages within each roomId by createdAt (oldest to newest)
    Object.values(groupedMessages).forEach((roomMessages) => {
        roomMessages.sort((a, b) => a.createdAt - b.createdAt);
    });

    // Sort rooms by the newest message's createdAt
    const sortedRooms = Object.entries(groupedMessages).sort(
        ([, messagesA], [, messagesB]) =>
            messagesB[messagesB.length - 1].createdAt -
            messagesA[messagesA.length - 1].createdAt
    );

    const formattedPosts = sortedRooms.map(([roomId, roomMessages]) => {
        const messageStrings = roomMessages
            .filter((message: Memory) => message.userId)
            .map((message: Memory) => {
                const actor = actors.find(
                    (actor: Actor) => actor.id === message.userId
                );
                const userName = actor?.name || "Unknown User";
                const displayName = actor?.username || "unknown";

                return `Name: ${userName} (@${displayName})
ID: ${message.id}${message.content.inReplyTo ? `\nIn reply to: ${message.content.inReplyTo}` : ""}
Date: ${formatTimestamp(message.createdAt)}
Text:
${message.content.text}`;
            });

        const header = conversationHeader
            ? `Conversation: ${roomId.slice(-5)}\n`
            : "";
        return `${header}${messageStrings.join("\n\n")}`;
    });

    return formattedPosts.join("\n\n");
};
