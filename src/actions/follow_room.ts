import { composeContext } from "../core/context.ts";
import { AgentRuntime } from "../core/runtime.ts";
import { Action, Message, State } from "../core/types.ts";

export const shouldFollowTemplate = `Based on the conversation so far:

{{recentMessages}}

Should {{agentName}} start following this room, eagerly participating without explicit mentions?  
Respond with YES if:
- The user has directly asked {{agentName}} to follow the conversation or participate more actively  
- The conversation topic is highly engaging and {{agentName}}'s input would add significant value
- {{agentName}} has unique insights to contribute and the users seem receptive

Otherwise, respond with NO.
Only respond with YES or NO.`;

export default {
  name: "FOLLOW_ROOM",
  description:
    "Start following this channel with great interest, chiming in without needing to be explicitly mentioned. Only do this if explicitly asked to.",
  validate: async (runtime: AgentRuntime, message: Message) => {
    const keywords = [
      "follow",
      "participate",
      "engage",
      "listen",
      "take interest",
      "join",
    ];
    if (
      !keywords.some((keyword) =>
        message.content.content.toLowerCase().includes(keyword),
      )
    ) {
      return false;
    }
    const roomId = message.room_id;
    const userState = await runtime.databaseAdapter.getParticipantUserState(
      roomId,
      runtime.agentId,
    );
    return userState !== "FOLLOWED" && userState !== "MUTED";
  },
  handler: async (runtime: AgentRuntime, message: Message) => {

    async function _shouldFollow(state: State): Promise<boolean> {
      const shouldFollowContext = composeContext({
        state,
        template: shouldFollowTemplate, // Define this template separately  
      });

      let response = "";

      for (let triesLeft = 3; triesLeft > 0; triesLeft--) {
        try {
          response = await runtime.completion({
            context: shouldFollowContext,
            stop: ["\n"],
            max_response_length: 5,
          });
          break;
        } catch (error) {
          console.error("Error in _shouldFollow:", error);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          console.log("Retrying...");
        }
      }

      const lowerResponse = response.toLowerCase().trim();
      return lowerResponse.includes("yes");
    }

    const state = await runtime.composeState(message);

    if (await _shouldFollow(state)) {
      await runtime.databaseAdapter.setParticipantUserState(
        message.room_id,
        runtime.agentId,
        "FOLLOWED",
      );
    }
  },

  condition:
    "The user wants to always respond in a room without first checking with the completion call.",
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          content:
            "Hey {{agentName}}, I'd like you to follow this channel and participate in conversations automatically.",
        },
      },
      {
        user: "{{user3}}",
        content: {
          content:
            "Understood, I will now follow this room and chime in without needing to be explicitly mentioned.",
          action: "FOLLOW_ROOM",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "What does everyone think about the new project proposal?",
        },
      },
      {
        user: "{{user3}}",
        content: {
          content:
            "I think the proposal looks promising. I especially liked the part about leveraging AI to streamline our workflows.",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content:
            "{{agentName}}, please start automatically participating in discussions in this channel.",
        },
      },
      {
        user: "{{user3}}",
        content: {
          content:
            "Got it, I'll start following along and engaging in conversations here.",
          action: "FOLLOW_ROOM",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "I'm struggling with the new database migration. Any tips?",
        },
      },
      {
        user: "{{user3}}",
        content: {
          content:
            "Make sure to backup your data first. Then I recommend using a tool like Flyway or Liquibase to manage the migration scripts.",
        },
      },
    ],
  ],
} as Action;
