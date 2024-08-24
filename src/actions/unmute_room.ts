// TODO: This has issues and needs to be fixed

import { AgentRuntime } from "../core/runtime.ts";
import { Action, Message } from "../core/types.ts";

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
    await runtime.databaseAdapter.setParticipantUserState(
      message.room_id,
      runtime.agentId,
      null,
    );
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
          action: "WAIT",
        },
      },
      {
        user: "{{agentName}}",
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
          action: "WAIT",
        },
      },
      {
        user: "{{agentName}}",
        content: {
          content:
            "Can you share the specific error message you're seeing? I'd be happy to take a look.",
          action: "WAIT",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content:
            "{{agentName}}, please unmute this room. We could use your input again.",
          action: "WAIT",
        },
      },
      {
        user: "{{agentName}}",
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
          action: "WAIT",
        },
      },
      {
        user: "{{agentName}}",
        content: {
          content:
            "I've worked with that API before. The key is to authenticate with an OAuth2 token before making any requests. I can walk you through the setup.",
          action: "WAIT",
        },
      },
    ],
  ],
} as Action;
