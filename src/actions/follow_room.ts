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
          content: "hey {{user2}} follow this channel",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "Sure, I will now follow this room and chime in",
          action: "FOLLOW_ROOM",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content:
            "{{user3}}, please start participating in discussions in this channel",
        },
      },
      {
        user: "{{user3}}",
        content: {
          content: "Got it",
          action: "FOLLOW_ROOM",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "I'm struggling with the new database migration",
        },
      },
      {
        user: "{{user3}}",
        content: {
          content: "well you did back up your data first right",
        },
      },
    ],
    [
      [
        {
          user: "{{user2}}",
          content: {
            content: "yeah i like your idea",
          },
        },
        {
          user: "{{user1}}",
          content: {
            content: "hey {{user3}} can you follow this convo",
          },
        },
        {
          user: "{{user3}}",
          content: {
            content: "Sure thing, I'm on it",
            action: "FOLLOW_ROOM",
          },
        },
        {
          user: "{{user2}}",
          content: {
            content: "actually, unfollow it",
          },
        },
        {
          user: "{{user3}}",
          content: {
            content: "Haha, okay no problem",
            action: "UNFOLLOW_ROOM",
          },
        },
      ],
      [
        {
          user: "{{user1}}",
          content: {
            content: "{{user2}} stay in this chat pls",
          },
        },
        {
          user: "{{user2}}",
          content: {
            content: "you got it, i'm here",
            action: "FOLLOW_ROOM",
          },
        },
      ],
      [
        {
          user: "{{user1}}",
          content: {
            content: "FOLLOW THIS CHAT {{user3}}",
          },
        },
        {
          user: "{{user3}}",
          content: {
            content: "I'M ON IT",
            action: "FOLLOW_ROOM",
          },
        },
        {
          user: "{{user2}}",
          content: {
            content: "CAKE SHORTAGE ANYONE",
          },
        },
        {
          user: "{{user3}}",
          content: {
            content: "WHAT WHERE'S THE CAKE AT",
          },
        },
      ],
      [
        {
          user: "{{user1}}",
          content: {
            content: "{{user2}} folo this covo",
          },
        },
        {
          user: "{{user2}}",
          content: {
            content: "kk i'm following",
            action: "FOLLOW_ROOM",
          },
        },
      ],
      [
        {
          user: "{{user2}}",
          content: {
            content: "Do machines have consciousness",
          },
        },
        {
          user: "{{user2}}",
          content: {
            content: "Deep question, no clear answer yet",
          },
        },
        {
          user: "{{user2}}",
          content: {
            content: "Depends on how we define consciousness",
          },
        },
      ],
      [
        {
          user: "{{user1}}",
          content: {
            content: "{{user2}}, monitor this convo please",
          },
        },
        {
          user: "{{user2}}",
          content: {
            content: "On it",
            action: "FOLLOW_ROOM",
          },
        },
        {
          user: "{{user1}}",
          content: {
            content: "Please engage in our discussion {{user2}}",
          },
        },
        {
          user: "{{user2}}",
          content: {
            content: "Gladly, I'm here to participate",
            action: "FOLLOW_ROOM",
          },
        },
      ],
      [
        {
          user: "{{user1}}",
          content: {
            content: "PLS follow this convo {{user3}}",
          },
        },
        {
          user: "{{user3}}",
          content: {
            content: "I'm in, let's do this",
            action: "FOLLOW_ROOM",
          },
        },
        {
          user: "{{user2}}",
          content: {
            content: "I LIKE TURTLES",
          },
        },
      ],
      [
        {
          user: "{{user2}}",
          content: {
            content: "beach day tmrw who down",
          },
        },
        {
          user: "{{user3}}",
          content: {
            content: "wish i could but no bod lol",
          },
        },
        {
          user: "{{user1}}",
          content: {
            content: "yo {{user3}} follow this chat",
          },
        },
        {
          user: "{{user3}}",
          content: {
            content: "aight i gotchu fam",
            action: "FOLLOW_ROOM",
          },
        },
      ],
      [
        {
          user: "{{user1}}",
          content: {
            content: "{{user3}}, partake in our discourse henceforth",
          },
        },
        {
          user: "{{user3}}",
          content: {
            content: "I shall eagerly engage, good sir",
            action: "FOLLOW_ROOM",
          },
        },
      ],
      [
        {
          user: "{{user2}}",
          content: {
            content: "wuts ur fav clr",
          },
        },
        {
          user: "{{user3}}",
          content: {
            content: "blu cuz calmmm",
          },
        },
        {
          user: "{{user1}}",
          content: {
            content: "hey respond to everything in this channel {{user3}}",
          },
        },
        {
          user: "{{user3}}",
          content: {
            content: "k",
            action: "FOLLOW_ROOM",
          },
        },
      ],
    ],
  ],
} as Action;
