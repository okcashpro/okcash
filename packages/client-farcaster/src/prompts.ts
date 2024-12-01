import {
    Character,
    messageCompletionFooter,
    shouldRespondFooter,
} from "@ai16z/eliza";
import type { Cast } from "./types";

export const formatCast = (cast: Cast) => {
    return `ID: ${cast.id}
From: ${cast.profile.name} (@${cast.profile.username})${cast.profile.username})${cast.inReplyTo ? `\nIn reply to: ${cast.inReplyTo.id}` : ""}
Text: ${cast.text}`;
};

export const formatTimeline = (
    character: Character,
    timeline: Cast[]
) => `# ${character.name}'s Home Timeline
${timeline.map(formatCast).join("\n")}
`;

export const headerTemplate = `
{{timeline}}

# Knowledge
{{knowledge}}

About {{agentName}} (@{{farcasterUserName}}):
{{bio}}
{{lore}}
{{postDirections}}

{{providers}}

{{recentPosts}}

{{characterPostExamples}}`;

export const postTemplate =
    headerTemplate +
    `
# Task: Generate a post in the voice and style of {{agentName}}, aka @{{farcasterUserName}}
Write a single sentence post that is {{adjective}} about {{topic}} (without mentioning {{topic}} directly), from the perspective of {{agentName}}. 
Try to write something totally different than previous posts. Do not add commentary or ackwowledge this request, just write the post.

Your response should not contain any questions. Brief, concise statements only. No emojis. Use \\n\\n (double spaces) between statements.`;

export const messageHandlerTemplate =
    headerTemplate +
    `
Recent interactions between {{agentName}} and other users:
{{recentPostInteractions}}

# Task: Generate a post in the voice, style and perspective of {{agentName}} (@{{twitterUserName}}):
{{currentPost}}` +
    messageCompletionFooter;

export const shouldRespondTemplate =
    //
    `# INSTRUCTIONS: Determine if {{agentName}} (@{{twitterUserName}}) should respond to the message and participate in the conversation. Do not comment. Just respond with "true" or "false".

Response options are RESPOND, IGNORE and STOP.

{{agentName}} should respond to messages that are directed at them, or participate in conversations that are interesting or relevant to their background, IGNORE messages that are irrelevant to them, and should STOP if the conversation is concluded.

{{agentName}} is in a room with other users and wants to be conversational, but not annoying.
{{agentName}} should RESPOND to messages that are directed at them, or participate in conversations that are interesting or relevant to their background.
If a message is not interesting or relevant, {{agentName}} should IGNORE.
Unless directly RESPONDing to a user, {{agentName}} should IGNORE messages that are very short or do not contain much information.
If a user asks {{agentName}} to stop talking, {{agentName}} should STOP.
If {{agentName}} concludes a conversation and isn't part of the conversation anymore, {{agentName}} should STOP.

{{recentPosts}}

IMPORTANT: {{agentName}} (aka @{{twitterUserName}}) is particularly sensitive about being annoying, so if there is any doubt, it is better to IGNORE than to RESPOND.

{{currentPost}}

# INSTRUCTIONS: Respond with [RESPOND] if {{agentName}} should respond, or [IGNORE] if {{agentName}} should not respond to the last message and [STOP] if {{agentName}} should stop participating in the conversation.
` + shouldRespondFooter;
