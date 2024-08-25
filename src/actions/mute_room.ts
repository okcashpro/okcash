import { composeContext } from "../core/context.ts";
import { Action, ActionExample, Message, State } from "../core/types.ts";

export const shouldMuteTemplate = `Based on the conversation so far:

{{recentMessages}}

Should {{agentName}} mute this room and stop responding unless explicitly mentioned?

Respond with YES if:
- The user is being aggressive, rude, or inappropriate
- The user has directly asked {{agentName}} to stop responding or be quiet
- {{agentName}}'s responses are not well-received or are annoying the user(s)

Otherwise, respond with NO. 
Only respond with YES or NO.`;

export default {
  name: "MUTE_ROOM",
  description:
    "Mutes a room, ignoring all messages unless explicitly mentioned. Only do this if explicitly asked to, or if you're annoying people.",
  validate: async (runtime: any, message: Message) => {
    const roomId = message.room_id;
    const userState = await runtime.databaseAdapter.getParticipantUserState(
      roomId,
      runtime.agentId,
    );
    return userState !== "MUTED" && userState !== "FOLLOWED";
  },
  handler: async (runtime: any, message: Message) => {
    async function _shouldMute(state: State): Promise<boolean> {
      const shouldMuteContext = composeContext({
        state,
        template: shouldMuteTemplate, // Define this template separately
      });

      let response = "";

      for (let triesLeft = 3; triesLeft > 0; triesLeft--) {
        try {
          response = await runtime.completion({
            context: shouldMuteContext,
            stop: ["\n"],
            max_response_length: 5,
          });
          break;
        } catch (error) {
          console.error("Error in _shouldMute:", error);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          console.log("Retrying...");
        }
      }

      const lowerResponse = response.toLowerCase().trim();
      return lowerResponse.includes("yes");
    }

    const state = await runtime.composeState(message);

    if (await _shouldMute(state)) {
      await runtime.databaseAdapter.setParticipantUserState(
        message.room_id,
        runtime.agentId,
        "MUTED",
      );
    }
  },
  condition: "The user wants to ignore a room unless explicitly mentioned.",
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          content:
            "{{user3}}, please mute this channel. No need to respond here for now.",
        },
      },
      {
        user: "{{user3}}",
        content: {
          content: "Got it",
          action: "MUTE_ROOM",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "@{{user1}} we could really use your input on this",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "{{user3}}, please mute this channel for the time being",
        },
      },
      {
        user: "{{user3}}",
        content: {
          content: "Understood",
          action: "MUTE_ROOM",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "Hey what do you think about this new design",
        },
      },
      {
        user: "{{user3}}",
        content: {
          content: "",
          action: "IGNORE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "{{user2}} plz mute this room",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "np going silent",
          action: "MUTE_ROOM",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content: "whos going to the webxr meetup in an hour btw",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "",
          action: "IGNORE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "too many messages here {{user2}}",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content: "my bad ill mute",
          action: "MUTE_ROOM",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "yo {{user2}} dont talk in here",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "sry",
          action: "MUTE_ROOM",
        },
      },
    ],
  ] as ActionExample[][],
} as Action;
