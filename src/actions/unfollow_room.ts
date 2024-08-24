// TODO: This has issues and needs to be fixed

import { AgentRuntime } from "../core/runtime.ts";
import { Action, Message } from "../core/types.ts";

export default {
  name: "UNFOLLOW_ROOM",
  description:
    "Unfollows a room, requiring the completion call before responding.",
  validate: async (runtime: AgentRuntime, message: Message) => {
    const roomId = message.room_id;
    const userState = await runtime.databaseAdapter.getParticipantUserState(
      roomId,
      runtime.agentId,
    );
    return userState === "FOLLOWED";
  },
  handler: async (runtime: AgentRuntime, message: Message) => {
    await runtime.databaseAdapter.setParticipantUserState(
      message.room_id,
      runtime.agentId,
      null,
    );
  },
  condition:
    "The user no longer wants to auto-respond to all messages in a channel.",
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          content:
            "Hey {{agentName}}, let's have you stop automatically participating in this channel for now.",
          action: "WAIT",
        },
      },
      {
        user: "{{agentName}}",
        content: {
          content:
            "Alright, I will unfollow this room and only respond when directly mentioned.",
          action: "UNFOLLOW_ROOM",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content:
            "I'm thinking we should revisit the budget for Q3. Thoughts?",
          action: "WAIT",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content:
            "@{{agentName}} What do you think about increasing the budget?",
          action: "WAIT",
        },
      },
      {
        user: "{{agentName}}",
        content: {
          content:
            "I believe a moderate budget increase could be justified given our strong Q2 results and growth projections.",
          action: "WAIT",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content:
            "{{agentName}}, please stop following this room for the time being.",
          action: "WAIT",
        },
      },
      {
        user: "{{agentName}}",
        content: {
          content:
            "Understood, I will cease automatically engaging here and only respond when explicitly asked to.",
          action: "UNFOLLOW_ROOM",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content:
            "Has anyone tried the new testing framework? How are you liking it?",
          action: "WAIT",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "@{{agentName}} I'd be curious to get your take on it!",
          action: "WAIT",
        },
      },
      {
        user: "{{agentName}}",
        content: {
          content:
            "I've found the new testing framework to be intuitive and it has helped improve our test coverage. The parallel test execution is a nice addition.",
          action: "WAIT",
        },
      },
    ],
  ],
} as Action;
