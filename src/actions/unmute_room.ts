import { composeContext } from "../core/context.ts";
import { AgentRuntime } from "../core/runtime.ts";
import { Action, Message, State } from "../core/types.ts";

export const shouldUnmuteTemplate = `Based on the conversation so far:

{{recentMessages}}  

Should {{agentName}} unmute this previously muted room and start considering it for responses again?
Respond with YES if:  
- The user has explicitly asked {{agentName}} to start responding again
- The user seems to want to re-engage with {{agentName}} in a respectful manner
- The tone of the conversation has improved and {{agentName}}'s input would be welcome

Otherwise, respond with NO.
Only respond with YES or NO.`;

export default {
  name: "UNMUTE_ROOM",
  description:
    "Unmutes a room, allowing the agent to consider responding to messages again.",
  validate: async (runtime: AgentRuntime, message: Message) => {
    const roomId = message.room_id;
    const userState = await runtime.databaseAdapter.getParticipantUserState(
      roomId,
      runtime.agentId,
    );
    return userState === "MUTED";
  },
  handler: async (runtime: AgentRuntime, message: Message) => {

    async function _shouldUnmute(state: State): Promise<boolean> {
      const shouldUnmuteContext = composeContext({
        state,
        template: shouldUnmuteTemplate, // Define this template separately
      });

      let response = "";

      for (let triesLeft = 3; triesLeft > 0; triesLeft--) {
        try {
          response = await runtime.completion({
            context: shouldUnmuteContext,
            stop: ["\n"],
            max_response_length: 5,
          });
          break;
        } catch (error) {
          console.error("Error in _shouldUnmute:", error);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          console.log("Retrying...");
        }
      }

      const lowerResponse = response.toLowerCase().trim();
      return lowerResponse.includes("yes");
    }

    const state = await runtime.composeState(message);

    if (await _shouldUnmute(state)) {
      await runtime.databaseAdapter.setParticipantUserState(
        message.room_id,
        runtime.agentId,
        null,
      );
    }
  },
  condition:
    "The user wants to re-enable the agent to consider responding in a previously muted room.",
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          content:
            "{{agentName}}, you can unmute this channel now. Feel free to participate again.",
        },
      },
      {
        user: "{{user3}}",
        content: {
          content:
            "Alright, unmuting this room. I'll start considering it for responses again.",
          action: "UNMUTE_ROOM",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content:
            "I could use some help troubleshooting this bug. The error message isn't making sense.",
        },
      },
      {
        user: "{{user3}}",
        content: {
          content:
            "Can you share the specific error message you're seeing? I'd be happy to take a look.",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content:
            "{{agentName}}, please unmute this room. We could use your input again.",
        },
      },
      {
        user: "{{user3}}",
        content: {
          content:
            "Unmuting now. I'm ready to assist and participate here once again.",
          action: "UNMUTE_ROOM",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content:
            "Does anyone have experience with this new API we're supposed to integrate? It's not well documented.",
        },
      },
      {
        user: "{{user3}}",
        content: {
          content:
            "I've worked with that API before. The key is to authenticate with an OAuth2 token before making any requests. I can walk you through the setup.",
        },
      },
    ],
  ],
} as Action;
