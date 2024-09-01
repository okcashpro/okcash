import { composeContext } from "../../../core/context.ts";
import { booleanFooter } from "../../../core/parsing.ts";
import {
  Action,
  ActionExample,
  IAgentRuntime,
  Message,
  State,
} from "../../../core/types.ts";

export const shouldFollowTemplate = `Based on the conversation so far:

{{recentMessages}}

Should {{agentName}} start following this room, eagerly participating without explicit mentions?  
Respond with YES if:
- The user has directly asked {{agentName}} to follow the conversation or participate more actively  
- The conversation topic is highly engaging and {{agentName}}'s input would add significant value
- {{agentName}} has unique insights to contribute and the users seem receptive

Otherwise, respond with NO.
` + booleanFooter;

export default {
  name: "FOLLOW_ROOM",
  description:
    "Start following this channel with great interest, chiming in without needing to be explicitly mentioned. Only do this if explicitly asked to.",
  validate: async (runtime: IAgentRuntime, message: Message) => {
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
        message.content.text.toLowerCase().includes(keyword),
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
  handler: async (runtime: IAgentRuntime, message: Message) => {
    async function _shouldFollow(state: State): Promise<boolean> {
      const shouldFollowContext = composeContext({
        state,
        template: shouldFollowTemplate, // Define this template separately
      });

      const response = await runtime.booleanCompletion({
        context: shouldFollowContext,
        stop: ["\n"],
        max_response_length: 5,
      });
      
      return response;
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
          text: "hey {{user2}} follow this channel",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "Sure, I will now follow this room and chime in",
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
          text: "Got it",
          action: "FOLLOW_ROOM",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "I'm struggling with the new database migration",
        },
      },
      {
        user: "{{user3}}",
        content: {
          text: "well you did back up your data first right",
        },
      },
    ],
    [
      {
        user: "{{user2}}",
        content: {
          text: "yeah i like your idea",
        },
      },
      {
        user: "{{user1}}",
        content: {
          text: "hey {{user3}} can you follow this convo",
        },
      },
      {
        user: "{{user3}}",
        content: {
          text: "Sure thing, I'm on it",
          action: "FOLLOW_ROOM",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "actually, unfollow it",
        },
      },
      {
        user: "{{user3}}",
        content: {
          text: "Haha, okay no problem",
          action: "UNFOLLOW_ROOM",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "{{user2}} stay in this chat pls",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "you got it, i'm here",
          action: "FOLLOW_ROOM",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "FOLLOW THIS CHAT {{user3}}",
        },
      },
      {
        user: "{{user3}}",
        content: {
          text: "I'M ON IT",
          action: "FOLLOW_ROOM",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "CAKE SHORTAGE ANYONE",
        },
      },
      {
        user: "{{user3}}",
        content: {
          text: "WHAT WHERE'S THE CAKE AT",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "{{user2}} folo this covo",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "kk i'm following",
          action: "FOLLOW_ROOM",
        },
      },
    ],
    [
      {
        user: "{{user2}}",
        content: {
          text: "Do machines have consciousness",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "Deep question, no clear answer yet",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "Depends on how we define consciousness",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "{{user2}}, monitor this convo please",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "On it",
          action: "FOLLOW_ROOM",
        },
      },
      {
        user: "{{user1}}",
        content: {
          text: "Please engage in our discussion {{user2}}",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "Gladly, I'm here to participate",
          action: "FOLLOW_ROOM",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "PLS follow this convo {{user3}}",
        },
      },
      {
        user: "{{user3}}",
        content: {
          text: "I'm in, let's do this",
          action: "FOLLOW_ROOM",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "I LIKE TURTLES",
        },
      },
    ],
    [
      {
        user: "{{user2}}",
        content: {
          text: "beach day tmrw who down",
        },
      },
      {
        user: "{{user3}}",
        content: {
          text: "wish i could but no bod lol",
        },
      },
      {
        user: "{{user1}}",
        content: {
          text: "yo {{user3}} follow this chat",
        },
      },
      {
        user: "{{user3}}",
        content: {
          text: "aight i gotchu fam",
          action: "FOLLOW_ROOM",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "{{user3}}, partake in our discourse henceforth",
        },
      },
      {
        user: "{{user3}}",
        content: {
          text: "I shall eagerly engage, good sir",
          action: "FOLLOW_ROOM",
        },
      },
    ],
    [
      {
        user: "{{user2}}",
        content: {
          text: "wuts ur fav clr",
        },
      },
      {
        user: "{{user3}}",
        content: {
          text: "blu cuz calmmm",
        },
      },
      {
        user: "{{user1}}",
        content: {
          text: "hey respond to everything in this channel {{user3}}",
        },
      },
      {
        user: "{{user3}}",
        content: {
          text: "k",
          action: "FOLLOW_ROOM",
        },
      },
    ],
  ] as ActionExample[][],
} as Action;
