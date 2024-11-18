import { toHex } from "viem";
import { Character, shouldRespondFooter } from "@ai16z/eliza";
import type { Cast, Profile } from "./types";

export const formatCast = (cast: Cast) => {
    return `ID: ${toHex(cast.hash)}
From: ${cast.profile.name} (@${cast.profile.username})${cast.profile.username})${cast.data.castAddBody.parentCastId ? `\nIn reply to: ${toHex(cast.data.castAddBody.parentCastId.hash)}` : ""}
Text: ${cast.data.castAddBody.text}`;
};

export const formatTimeline = (
    character: Character,
    timeline: Cast[]
) => `# ${character.name}'s Home Timeline
${timeline.map(formatCast).join("\n")}
`;

export const shouldRespondTemplate = `` + shouldRespondFooter;
export const messageHandlerTemplate = ``;

export const postTemplate = `{{timeline}}

# Knowledge
{{knowledge}}

About {{agentName}} (@{{farcasterUserName}}):
{{bio}}
{{lore}}
{{postDirections}}

{{providers}}

{{recentPosts}}

{{characterPostExamples}}

# Task: Generate a post in the voice and style of {{agentName}}, aka @{{farcasterUserName}}
Write a single sentence post that is {{adjective}} about {{topic}} (without mentioning {{topic}} directly), from the perspective of {{agentName}}. Try to write something totally different than previous posts. Do not add commentary or ackwowledge this request, just write the post.
Your response should not contain any questions. Brief, concise statements only. No emojis. Use \\n\\n (double spaces) between statements.`;
